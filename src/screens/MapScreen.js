import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    StatusBar,
    Dimensions,
    PermissionsAndroid,
    Platform,
    Animated,
    ActivityIndicator,
    AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Badge } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import auth from '@react-native-firebase/auth';
import FCMService from '../services/FCMService';
import IndoorAtlasService from '../services/IndoorAtlasService';
import ZoneService from '../services/ZoneService';
import NotificationStore from '../services/NotificationStore';
import APIService from '../services/APIService';
import BlueDot from '../components/BlueDot';
import NotificationBadge from '../components/NotificationBadge';
import InAppNotificationBanner from '../components/InAppNotificationBanner';
import IndoorMapView from '../components/IndoorMapView';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// IndoorAtlas region types (from IARegion / native module). We only send events for floor and POI zones, not building (venue).
const REGION_TYPE_VENUE = 2;       // Building — do not trigger event or zone UI
const REGION_TYPE_FLOOR_PLAN = 1;  // Floor — send event + zone UI
const REGION_TYPE_POI = 99;        // Zone within floor (Pantry, Meeting Room, etc.) — send event + zone UI

export default function MapScreen({ navigation }) {
    const user = auth().currentUser;

    // ── All state unchanged ───────────────────────────────────────────────────
    const [position, setPosition] = useState({ x: SCREEN_WIDTH / 2, y: 300 });
    const [floorPlan, setFloorPlan] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [hasLocationFix, setHasLocationFix] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [showLocationWarning, setShowLocationWarning] = useState(false);
    const [loadingDismissed, setLoadingDismissed] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [currentZone, setCurrentZone] = useState(null);
    const [currentFloorLevel, setCurrentFloorLevel] = useState(null);
    const [bannerQueue, setBannerQueue] = useState([]);
    const [currentBanner, setCurrentBanner] = useState(null);
    const [isOnline, setIsOnline] = useState(true);
    const [apiHealthy, setApiHealthy] = useState(true);

    const floorPlanRef = useRef(null);
    const hasLocationFixRef = useRef(false);
    const currentZoneRef = useRef(null);
    const currentFloorLevelRef = useRef(null);
    const bannerAnim = useRef(new Animated.Value(0)).current;
    const bannerTimerRef = useRef(null);

    // UI animation refs
    const zoneAnim = useRef(new Animated.Value(0)).current;
    const headerFade = useRef(new Animated.Value(0)).current;
    const emptyStateFade = useRef(new Animated.Value(0)).current;
    const emptyStateFloat = useRef(new Animated.Value(0)).current;

    // ── Sync refs ─────────────────────────────────────────────────────────────
    useEffect(() => {
        floorPlanRef.current = floorPlan;

    }, [floorPlan]);

    useEffect(() => {
        currentFloorLevelRef.current = currentFloorLevel;

    }, [currentFloorLevel]);

    useEffect(() => { hasLocationFixRef.current = hasLocationFix; }, [hasLocationFix]);
    useEffect(() => { currentZoneRef.current = currentZone; }, [currentZone]);

    // Animate zone banner in/out
    useEffect(() => {
        Animated.spring(zoneAnim, {
            toValue: currentZone ? 1 : 0,
            useNativeDriver: true,
            tension: 70,
            friction: 11,
        }).start();
    }, [currentZone]);

    // Header fade in
    useEffect(() => {
        Animated.timing(headerFade, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    // Empty state animations
    useEffect(() => {
        if (loadingDismissed && !floorPlan) {
            // Fade in empty state
            Animated.timing(emptyStateFade, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();

            // Floating animation loop
            Animated.loop(
                Animated.sequence([
                    Animated.timing(emptyStateFloat, {
                        toValue: 1,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(emptyStateFloat, {
                        toValue: 0,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            emptyStateFade.setValue(0);
        }
    }, [loadingDismissed, floorPlan]);

    // ── Foreground notification banner helpers ───────────────────────────────
    const showNextBanner = () => {
        if (currentBanner || bannerQueue.length === 0) return;
        const next = bannerQueue[0];
        setCurrentBanner(next);

        bannerAnim.setValue(0);
        Animated.timing(bannerAnim, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
        }).start();
    };

    const handleBannerDismiss = () => {
        if (!currentBanner) return;
        Animated.timing(bannerAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            setBannerQueue(prev => prev.slice(1));
            setCurrentBanner(null);
        });
    };

    const handleBannerView = async () => {
        if (!currentBanner) return;

        const banner = currentBanner;

        Animated.timing(bannerAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start(async () => {
            setBannerQueue(prev => prev.slice(1));
            setCurrentBanner(null);
            setUnreadNotifications(0);
            navigation.navigate('NotificationHistory');

            if (banner.campaignId != null) {
                try {
                    await APIService.post('/api/v1/notification-click', {
                        campaign_id: banner.campaignId,
                    });
                    await NotificationStore.markClicked(banner.id);
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.log('[MapScreen] Failed to send notification-click for foreground view', e);
                }
            }

            await NotificationStore.markAsRead(banner.id);
        });
    };

    // Auto-dismiss banner after 5 seconds if user does nothing
    useEffect(() => {
        if (!currentBanner) {
            return;
        }

        // Clear any existing timer
        if (bannerTimerRef.current) {
            clearTimeout(bannerTimerRef.current);
        }

        // Set new timer for auto-dismiss
        bannerTimerRef.current = setTimeout(() => {
            handleBannerDismiss();
        }, 5000);

        // Cleanup function: clear timer on unmount or banner change
        return () => {
            if (bannerTimerRef.current) {
                clearTimeout(bannerTimerRef.current);
                bannerTimerRef.current = null;
            }
        };
    }, [currentBanner]);

    useEffect(() => {
        if (!currentBanner && bannerQueue.length > 0) {
            showNextBanner();
        }
    }, [bannerQueue, currentBanner]);

    // ── Network connectivity monitoring ───────────────────────────────────────
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = state.isConnected && state.isInternetReachable !== false;
            setIsOnline(connected);
        });
        return () => unsubscribe();
    }, []);

    // ── API health monitoring ─────────────────────────────────────────────────
    useEffect(() => {
        const checkAPIHealth = async () => {
            try {
                // Lightweight health check - try to reach the API with minimal request
                const response = await APIService.get('/api/v1/notifications', {
                    params: { limit: 1 },
                    timeout: 5000,
                });
                setApiHealthy(response.status === 200);
            } catch (error) {
                // API is unreachable or erroring
                setApiHealthy(false);
            }
        };

        // Check immediately on mount
        checkAPIHealth();

        // Then check every 30 seconds
        const interval = setInterval(checkAPIHealth, 30000);

        return () => clearInterval(interval);
    }, []);

    // ── FCM (foreground + background handling) ────────────────────────────────
    useEffect(() => {
        const handleRemoteMessage = async (remoteMessage, { openedFromNotification } = { openedFromNotification: false }) => {
            if (!remoteMessage) return;

            const notif = remoteMessage.notification || {};
            const data = remoteMessage.data || {};

            const title = notif.title || 'GeoEngage';
            const message = notif.body || '';

            const campaignId = data.campaign_id ? parseInt(data.campaign_id, 10) : null;
            const zoneName = data.zone_name || null;
            const floor = data.floor_id ? parseInt(data.floor_id, 10) : null;
            const notificationId = data.notification_id || null;

            const stored = await NotificationStore.addNotification({
                id: remoteMessage.messageId,
                campaignId,
                notificationId,
                zoneName,
                floor,
                title,
                message,
                receivedAt: Date.now(),
                read: !!openedFromNotification,
                clicked: !!openedFromNotification,
                messageId: remoteMessage.messageId,
            });

            if (openedFromNotification) {
                setUnreadNotifications(0);
                navigation.navigate('NotificationHistory');
                return;
            }

            setUnreadNotifications(prev => prev + 1);
            
            // Limit banner queue to 5 items maximum to prevent memory leaks
            setBannerQueue(prev => {
                const newQueue = [...prev, stored];
                if (newQueue.length > 5) {
                    console.warn('[MapScreen] Banner queue full (5 max), dropping oldest notification');
                    return newQueue.slice(-5); // Keep last 5 items
                }
                return newQueue;
            });
        };

        const unsubscribeForeground = FCMService.subscribeForeground(async remoteMessage => {
            await handleRemoteMessage(remoteMessage, { openedFromNotification: false });
        });

        const unsubscribeBackground = FCMService.subscribeBackgroundOpen(async remoteMessage => {
            await handleRemoteMessage(remoteMessage, { openedFromNotification: true });
        });

        // Check if app was opened from notification in killed state
        (async () => {
            try {
                await FCMService.checkInitialNotification(async remoteMessage => {
                    await handleRemoteMessage(remoteMessage, { openedFromNotification: true });
                });
            } catch (error) {
                console.error('[MapScreen] Error checking initial notification:', error);
            }
        })();

        return () => { unsubscribeForeground(); unsubscribeBackground(); };
    }, [navigation]);

    // ── FCM Token Management (refresh + app resume) ───────────────────────────
    useEffect(() => {
        let tokenRefreshUnsubscribe = null;
        let appStateSubscription = null;

        // Subscribe to FCM token refresh events
        tokenRefreshUnsubscribe = FCMService.onTokenRefresh((newToken, registrationSuccess) => {
            if (registrationSuccess) {
                console.log('[MapScreen] FCM token refreshed and registered successfully');
            } else {
                console.error('[MapScreen] FCM token refreshed but registration failed');
            }
        });

        // Re-register token when app comes to foreground
        const handleAppStateChange = async (nextAppState) => {
            if (nextAppState === 'active') {
                console.log('[MapScreen] App resumed - checking FCM token...');
                try {
                    const currentToken = await FCMService.requestPermissionAndGetToken();
                    if (currentToken) {
                        const success = await FCMService.registerTokenWithBackend(currentToken);
                        if (success) {
                            console.log('[MapScreen] FCM token re-validated on app resume');
                        } else {
                            console.warn('[MapScreen] Failed to re-register token on app resume');
                        }
                    }
                } catch (error) {
                    console.error('[MapScreen] Error checking FCM token on resume:', error);
                }
            }
        };

        appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            if (tokenRefreshUnsubscribe) {
                tokenRefreshUnsubscribe();
            }
            if (appStateSubscription) {
                appStateSubscription.remove();
            }
        };
    }, []);

    // ── Indoor Atlas (unchanged) ──────────────────────────────────────────────
    useEffect(() => {
        let isActive = true;
        let locationUnsubscribe = null;
        let statusUnsubscribe = null;
        let floorPlanUnsubscribe = null;
        let geofenceEnterUnsubscribe = null;
        let geofenceExitUnsubscribe = null;

        const requestLocationPermissions = async () => {
            if (Platform.OS !== 'android') return true;
            try {

                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                ]);
                const fineGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
                const coarseGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

                if (fineGranted || coarseGranted) return true;
                Alert.alert('Location Permission Required', 'Indoor positioning requires location access. Please grant location permissions in Settings.', [{ text: 'OK' }]);
                return false;
            } catch (err) {  return false; }
        };

        const initializeIndoorAtlas = async () => {
            try {
                setIsInitializing(true);
                const hasPermissions = await requestLocationPermissions();
                if (!hasPermissions) { 
                    setIsInitializing(false);
                    setPermissionDenied(true); // Track that permission was denied
                    setShowLocationWarning(true); // Show warning immediately when permission denied
                    return; 
                }

                await IndoorAtlasService.initialize();
                setIsInitializing(false);

                floorPlanUnsubscribe = IndoorAtlasService.onFloorPlanChanged((fp) => { if (!isActive) return; setFloorPlan(fp); });
                statusUnsubscribe = IndoorAtlasService.onStatusChanged((s) => { if (!isActive) return; });

                geofenceEnterUnsubscribe = IndoorAtlasService.onGeofenceEnter((region) => {
                    if (!isActive) return;

                    const regionType = region.type ?? -1;

                    // Skip building (venue) — do not call event endpoint or show zone alert/banner
                    if (regionType === REGION_TYPE_VENUE) {
                        return;
                    }

                    // Only floor and POI zones trigger events and zone UI
                    if (regionType !== REGION_TYPE_FLOOR_PLAN && regionType !== REGION_TYPE_POI) {
                        return;
                    }

                    const eventType = regionType === REGION_TYPE_FLOOR_PLAN ? 'floor' : 'zone';

                    // eslint-disable-next-line no-console
                    console.log('[MapScreen] Geofence enter detected:', {
                        zoneId: region.id,
                        zoneName: region.name || 'Unknown Zone',
                        floorLevel: currentFloorLevelRef.current,
                        type: regionType,
                    });

                    if (ZoneService.shouldNotify(region.id)) {
                        ZoneService.markNotified(region.id);
                        ZoneService.saveZoneEntry({
                            eventType,
                            zoneId: region.id,
                            zoneName: region.name || 'Unknown Zone',
                            timestamp: Date.now(),
                            floorLevel: currentFloorLevelRef.current,
                        }).catch(() => {});
                    }
                    setCurrentZone({ id: region.id, name: region.name || 'Unknown Zone', type: region.type });
                    ZoneService.setCurrentZone({ id: region.id, name: region.name, type: region.type });
                });

                geofenceExitUnsubscribe = IndoorAtlasService.onGeofenceExit((region) => {
                    if (!isActive) return;

                    if (currentZoneRef.current && currentZoneRef.current.id === region.id) {
                        setCurrentZone(null);
                        ZoneService.setCurrentZone(null);
                    }
                });

                locationUnsubscribe = IndoorAtlasService.onLocationChanged((location) => {
                    if (!isActive) return;
                    setHasLocationFix(true);
                    if (location.floorLevel !== undefined && location.floorLevel !== null) setCurrentFloorLevel(location.floorLevel);
                    // Only update position if we have pixel coordinates from IndoorAtlas
                    if (location.pixelX !== undefined && location.pixelY !== undefined) {
                        setPosition({ x: location.pixelX, y: location.pixelY });
                    }
                    // Note: lat/lng fallback removed - we only show position when properly calibrated
                });

                if (isActive) {
                    await IndoorAtlasService.startPositioning();
                    // After 5s with no location fix, skip warning and show empty state directly
                    setTimeout(() => { 
                        if (isActive && !hasLocationFixRef.current) {
                            setLoadingDismissed(true);
                        }
                    }, 5000);
                }

            } catch (error) {

                setIsInitializing(false);
                Alert.alert('Indoor Positioning Error', 'Failed to initialize indoor positioning. Some features may not work.', [{ text: 'OK' }]);
            }
        };

        initializeIndoorAtlas();

        return () => {
            isActive = false;
            [locationUnsubscribe, statusUnsubscribe, floorPlanUnsubscribe, geofenceEnterUnsubscribe, geofenceExitUnsubscribe]
                .forEach(u => u?.remove?.());
            IndoorAtlasService.stopPositioning().catch((error) => {
                console.error('[MapScreen] Error stopping IndoorAtlas positioning during cleanup:', error);
            });
        };
    }, []);

    const handleSimulateConferenceZone = async () => {
        try {
            await ZoneService.saveZoneEntry({
                eventType: 'zone',
                zoneId: 'cebf6bb0-126e-11f1-badb-c35cc3d92253',
                zoneName: 'Conference Room',
                timestamp: Date.now(),
                floorLevel: 2,
            });
            // eslint-disable-next-line no-console
            console.log('[MapScreen] Simulated Conference Room zone event sent');
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log('[MapScreen] Failed to simulate Conference Room event', e);
        }
    };

    // ── Status chips ──────────────────────────────────────────────────────────
    const statusChips = [
        {
            icon: hasLocationFix ? 'crosshairs-gps' : 'crosshairs',
            label: hasLocationFix ? 'Positioned' : 'Acquiring...',
            active: hasLocationFix,
        },
        {
            icon: !isOnline ? 'wifi-off' : (apiHealthy ? 'check-circle' : 'alert-circle'),
            label: !isOnline ? 'Offline' : (apiHealthy ? 'API Healthy' : 'API Degraded'),
            active: isOnline && apiHealthy,
        },
    ];

    const firstName = user?.displayName?.split(' ')[0] || 'User';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

            {currentBanner && (
                <InAppNotificationBanner
                    banner={currentBanner}
                    animationValue={bannerAnim}
                    onDismiss={handleBannerDismiss}
                    onView={handleBannerView}
                />
            )}

            {/* ── Offline Banner ─────────────────────────────────────────── */}
            {!isOnline && (
                <View style={styles.offlineBanner}>
                    <Icon name="wifi-off" size={16} color="#f59e0b" />
                    <Text style={styles.offlineBannerText}>You're offline</Text>
                </View>
            )}

            {/* ── Header ─────────────────────────────────────────────────── */}
            <Animated.View style={[styles.topBar, { opacity: headerFade }]}>
                <View style={styles.userInfo}>
                    <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
                    <Text style={styles.subGreeting}>Welcome back</Text>
                </View>

                <View style={styles.headerActions}>
                    {/* Notification bell */}
                    <TouchableOpacity
                        style={styles.headerIconBtn}
                        onPress={() => { setUnreadNotifications(0); navigation.navigate('NotificationHistory'); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="bell-outline" size={22} color="#94a3b8" />
                        <NotificationBadge count={unreadNotifications} />
                    </TouchableOpacity>

                    {/* Avatar */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Profile')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        {user?.photoURL ? (
                            <Avatar.Image size={40} source={{ uri: user.photoURL }} style={styles.avatar} />
                        ) : (
                            <Avatar.Text
                                size={40}
                                label={user?.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                                style={styles.avatar}
                                color="#ffffff"
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* ── Map container ─────────────────────────────────────────── */}
            <View style={styles.mapCard}>
                {/* Map label */}
                <View style={styles.mapLabel}>
                    <Icon name="floor-plan" size={13} color="#63b3ed" />
                    <Text style={styles.mapLabelText}>
                        {floorPlan ? 'Live Floor Plan' : 'Floor Plan'}
                        {currentFloorLevel !== null ? `  ·  Floor ${currentFloorLevel}` : ''}
                    </Text>
                    <View style={[styles.liveDot, hasLocationFix && styles.liveDotActive]} />
                </View>

                <View style={styles.mapContainer}>
                    {floorPlan ? (
                        <IndoorMapView
                            floorPlan={{
                                url: floorPlan.url,
                                width: floorPlan.width,
                                height: floorPlan.height,
                            }}
                            userLocation={{ pixelX: position.x, pixelY: position.y }}
                        />
                    ) : (
                        <View style={styles.emptyMapState}>
                            {/* Loading Overlay - shows while initializing or acquiring location */}
                            {!loadingDismissed && (isInitializing || !hasLocationFix) && (
                                <View style={styles.loadingOverlay}>
                                    {isInitializing ? (
                                        <>
                                            <ActivityIndicator size="large" color="#63b3ed" />
                                            <Text style={styles.loadingText}>Initializing Indoor Positioning...</Text>
                                            <Text style={styles.loadingHint}>Please wait a moment</Text>
                                        </>
                                    ) : (
                                        <>
                                            <ActivityIndicator size="large" color="#63b3ed" />
                                            <Text style={styles.loadingText}>Acquiring location...</Text>
                                            <Text style={styles.loadingHint}>Make sure you're in a mapped venue</Text>
                                        </>
                                    )}
                                </View>
                            )}

                            {/* Empty State - No Floor Plan Available */}
                            {loadingDismissed && !floorPlan && (
                                <Animated.View 
                                    style={[
                                        styles.emptyStateContent,
                                        {
                                            opacity: emptyStateFade,
                                            transform: [{
                                                translateY: emptyStateFade.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [20, 0],
                                                })
                                            }]
                                        }
                                    ]}
                                >
                                    {/* Decorative background circles */}
                                    <View style={styles.emptyBgCircle1} />
                                    <View style={styles.emptyBgCircle2} />

                                    {/* Animated floating icon */}
                                    <Animated.View 
                                        style={[
                                            styles.emptyIconContainer,
                                            {
                                                transform: [{
                                                    translateY: emptyStateFloat.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0, -15],
                                                    })
                                                }]
                                            }
                                        ]}
                                    >
                                        <View style={styles.emptyIconGlow} />
                                        <Icon name="map-search-outline" size={72} color="#4285F4" />
                                        <View style={styles.emptyIconRing} />
                                    </Animated.View>

                                    {/* Main message */}
                                    <Text style={styles.emptyStateTitle}>
                                        You're Exploring{'\n'}Outside the Venue
                                    </Text>
                                    <Text style={styles.emptyStateSubtitle}>
                                        Indoor positioning works when you're at a mapped location. When you enter an office or venue with GeoEngage, the floor plan will appear here automatically.
                                    </Text>

                                    {/* Status badges */}
                                    <View style={styles.emptyStatusRow}>
                                        <View style={styles.emptyStatusBadge}>
                                            <Icon name="check-circle" size={16} color="#22c55e" />
                                            <Text style={styles.emptyStatusText}>GPS Active</Text>
                                        </View>
                                        <View style={styles.emptyStatusBadge}>
                                            <Icon name="bell-ring" size={16} color="#4285F4" />
                                            <Text style={styles.emptyStatusText}>Notifications On</Text>
                                        </View>
                                    </View>

                                    {/* Action buttons */}
                                    <View style={styles.emptyActionsRow}>
                                        <TouchableOpacity
                                            style={styles.emptyActionPrimary}
                                            onPress={() => navigation.navigate('NotificationHistory')}
                                            activeOpacity={0.85}
                                        >
                                            <Icon name="history" size={20} color="#ffffff" />
                                            <Text style={styles.emptyActionPrimaryText}>View History</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity
                                            style={styles.emptyActionSecondary}
                                            onPress={() => navigation.navigate('Profile')}
                                            activeOpacity={0.85}
                                        >
                                            <Icon name="account-circle-outline" size={20} color="#4285F4" />
                                            <Text style={styles.emptyActionSecondaryText}>Profile</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Helpful tip */}
                                    <View style={styles.emptyTipContainer}>
                                        <Icon name="lightbulb-on-outline" size={18} color="#fbbf24" />
                                        <Text style={styles.emptyTipText}>
                                            Tip: You'll receive alerts when you enter geofenced zones
                                        </Text>
                                    </View>
                                </Animated.View>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* ── Status chips ────────────────────────────────────────────── */}
            <View style={styles.statusRow}>
                {statusChips.map((chip, i) => (
                    <View key={i} style={[styles.statusChip, chip.active && styles.statusChipActive]}>
                        <View style={[styles.statusDot, chip.active && styles.statusDotActive]} />
                        <Icon name={chip.icon} size={13} color={chip.active ? '#22c55e' : '#4a5568'} />
                        <Text style={[styles.statusText, chip.active && styles.statusTextActive]}>
                            {chip.label}
                        </Text>
                    </View>
                ))}
            </View>

            {__DEV__ && (
                <TouchableOpacity
                    style={styles.debugButton}
                    onPress={handleSimulateConferenceZone}
                    activeOpacity={0.85}
                >
                    <Text style={styles.debugButtonText}>Simulate Conference Room Event</Text>
                </TouchableOpacity>
            )}
            
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d1117',
        paddingHorizontal: 16,
        paddingBottom: 20,
    },

    // ── Offline Banner ──
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        marginHorizontal: -16,
        marginBottom: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(245, 158, 11, 0.25)',
    },
    offlineBannerText: {
        fontSize: 13,
        color: '#f59e0b',
        fontWeight: '600',
    },

    // ── Header ──
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 16,
    },
    userInfo: { flex: 1 },
    greeting: {
        fontSize: 19,
        fontWeight: '700',
        color: '#e2e8f0',
    },
    subGreeting: {
        fontSize: 12,
        color: '#4a5568',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#131c2c',
        borderWidth: 1,
        borderColor: '#1e2d3d',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        backgroundColor: '#1e2d3d',
    },

    // ── Map card ──
    mapCard: {
        flex: 1,
        marginBottom: 14,
    },
    mapLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    mapLabelText: {
        flex: 1,
        fontSize: 12,
        color: '#4a5568',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#334155',
    },
    liveDotActive: {
        backgroundColor: '#22c55e',
        shadowColor: '#22c55e',
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 3,
    },
    mapContainer: {
        flex: 1,
        borderRadius: 18,
        backgroundColor: '#131c2c',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1e2d3d',
    },
    floorPlan: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Empty map state ──
    emptyMapState: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0e14',
        position: 'relative',
        overflow: 'hidden',
    },
    emptyStateContent: {
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 40,
        zIndex: 10,
    },

    // Decorative background circles
    emptyBgCircle1: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(66, 133, 244, 0.03)',
        top: -100,
        right: -80,
    },
    emptyBgCircle2: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(99, 179, 237, 0.04)',
        bottom: -60,
        left: -70,
    },

    // Animated icon container
    emptyIconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#131c2c',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 2,
        borderColor: '#1e3a5f',
        position: 'relative',
        elevation: 8,
        shadowColor: '#4285F4',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    emptyIconGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(66, 133, 244, 0.08)',
    },
    emptyIconRing: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 1.5,
        borderColor: 'rgba(66, 133, 244, 0.15)',
    },

    // Text styles
    emptyStateTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#f1f5f9',
        marginBottom: 16,
        textAlign: 'center',
        lineHeight: 34,
        letterSpacing: 0.3,
    },
    emptyStateSubtitle: {
        fontSize: 15,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 4,
        maxWidth: 340,
    },

    // Status badges
    emptyStatusRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
    },
    emptyStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: '#131c2c',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1e2d3d',
    },
    emptyStatusText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#cbd5e1',
    },

    // Action buttons
    emptyActionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
        width: '100%',
        maxWidth: 340,
    },
    emptyActionPrimary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        backgroundColor: '#4285F4',
        borderRadius: 14,
        elevation: 4,
        shadowColor: '#4285F4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    emptyActionPrimaryText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 0.3,
    },
    emptyActionSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        backgroundColor: 'rgba(66, 133, 244, 0.08)',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(66, 133, 244, 0.3)',
    },
    emptyActionSecondaryText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4285F4',
        letterSpacing: 0.3,
    },

    // Tip container
    emptyTipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(251, 191, 36, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
        maxWidth: 340,
    },
    emptyTipText: {
        flex: 1,
        fontSize: 13,
        color: '#cbd5e1',
        lineHeight: 18,
    },

    // ── Loading overlay ──
    loadingOverlay: {
        position: 'absolute',
        inset: 0,
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(13,17,23,0.93)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingOverlaySemi: {
        backgroundColor: 'rgba(13,17,23,0.82)',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#e2e8f0',
        fontWeight: '600',
    },
    loadingHint: {
        marginTop: 6,
        fontSize: 12,
        color: '#4a5568',
        textAlign: 'center',
    },
    warningContainer: {
        alignItems: 'center',
        paddingHorizontal: 36,
    },
    warningIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(251, 191, 36, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    warningTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#e2e8f0',
        marginBottom: 8,
        textAlign: 'center',
    },
    warningText: {
        fontSize: 13,
        color: '#4a5568',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#e2e8f0',
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 12,
        minWidth: 180,
        justifyContent: 'center',
    },
    continueButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0d1117',
    },

    // ── Zone indicator ──
    zoneIndicator: {
        position: 'absolute',
        bottom: 16,
        left: 14,
        right: 14,
        backgroundColor: '#0d1f0f',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.35)',
        borderRadius: 14,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#22c55e',
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    zonePulse: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    zoneInfo: { flex: 1 },
    zoneLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: 'rgba(34, 197, 94, 0.7)',
        letterSpacing: 1.2,
        marginBottom: 3,
    },
    zoneName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#e2e8f0',
    },
    zoneTag: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    zoneTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#22c55e',
        letterSpacing: 1,
    },

    // ── Status chips ──
    statusRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#131c2c',
        borderWidth: 1,
        borderColor: '#1e2d3d',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
    },
    statusChipActive: {
        borderColor: 'rgba(34, 197, 94, 0.25)',
        backgroundColor: 'rgba(34, 197, 94, 0.06)',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#334155',
    },
    statusDotActive: {
        backgroundColor: '#22c55e',
    },
    statusText: {
        fontSize: 12,
        color: '#4a5568',
        fontWeight: '500',
    },
    statusTextActive: {
        fontSize: 12,
        color: '#22c55e',
        fontWeight: '500',
    },
    debugButton: {
        marginTop: 10,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
    },
    debugButtonText: {
        fontSize: 12,
        color: '#e2e8f0',
        fontWeight: '500',
    },
}); 