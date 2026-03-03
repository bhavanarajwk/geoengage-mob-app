import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    StatusBar,
    ImageBackground,
    Dimensions,
    PermissionsAndroid,
    Platform,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Badge } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import FCMService from '../services/FCMService';
import IndoorAtlasService from '../services/IndoorAtlasService';
import ZoneService from '../services/ZoneService';
import NotificationStore from '../services/NotificationStore';
import APIService from '../services/APIService';
import BlueDot from '../components/BlueDot';
import NotificationBadge from '../components/NotificationBadge';
import { latLngToScreen } from '../utils/coordinateConverter';

const floorPlanImage = require('../../assets/floorplan.png');
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
    const [imageLayout, setImageLayout] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [hasLocationFix, setHasLocationFix] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [showLocationWarning, setShowLocationWarning] = useState(false);
    const [loadingDismissed, setLoadingDismissed] = useState(false);
    const [currentZone, setCurrentZone] = useState(null);
    const [currentFloorLevel, setCurrentFloorLevel] = useState(null);

    const floorPlanRef = useRef(null);
    const imageLayoutRef = useRef(null);
    const hasLocationFixRef = useRef(false);
    const currentZoneRef = useRef(null);
    const currentFloorLevelRef = useRef(null);

    // UI animation refs
    const zoneAnim = useRef(new Animated.Value(0)).current;
    const headerFade = useRef(new Animated.Value(0)).current;

    // ── Sync refs ─────────────────────────────────────────────────────────────
    useEffect(() => {
        floorPlanRef.current = floorPlan;

    }, [floorPlan]);

    useEffect(() => {
        currentFloorLevelRef.current = currentFloorLevel;

    }, [currentFloorLevel]);

    useEffect(() => {
        imageLayoutRef.current = imageLayout;

    }, [imageLayout]);

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

    // ── Position calculation (unchanged) ─────────────────────────────────────
    const calculateScaledPosition = (pixelX, pixelY) => {
        const currentFloorPlan = floorPlanRef.current;
        const currentImageLayout = imageLayoutRef.current;

        if (!currentFloorPlan || !currentImageLayout) return { x: pixelX, y: pixelY };

        const containerAspect = currentImageLayout.width / currentImageLayout.height;
        const imageAspect = currentFloorPlan.width / currentFloorPlan.height;

        let renderedWidth, renderedHeight, offsetX, offsetY;

        if (imageAspect > containerAspect) {
            renderedWidth = currentImageLayout.width;
            renderedHeight = currentImageLayout.width / imageAspect;
            offsetX = 0;
            offsetY = (currentImageLayout.height - renderedHeight) / 2;
        } else {
            renderedHeight = currentImageLayout.height;
            renderedWidth = currentImageLayout.height * imageAspect;
            offsetX = (currentImageLayout.width - renderedWidth) / 2;
            offsetY = 0;
        }

        const scaleX = renderedWidth / currentFloorPlan.width;
        const scaleY = renderedHeight / currentFloorPlan.height;
        return { x: (pixelX * scaleX) + offsetX, y: (pixelY * scaleY) + offsetY };
    };

    // ── FCM (foreground + background handling) ────────────────────────────────
    useEffect(() => {
        const handleRemoteMessage = async (remoteMessage, { openedFromNotification } = { openedFromNotification: false }) => {
            if (!remoteMessage) return;

            const title = remoteMessage.notification?.title || '📍 New Offer!';
            const message = remoteMessage.notification?.body || remoteMessage.data?.message || 'You have a new notification.';

            const data = remoteMessage.data || {};
            const campaignId = data.campaign_id ? parseInt(data.campaign_id, 10) : null;
            const zoneName = data.zone_name || null;
            const floor = data.floor_id ? parseInt(data.floor_id, 10) : null;

            const stored = await NotificationStore.addNotification({
                id: remoteMessage.messageId,
                campaignId,
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

            Alert.alert(
                title,
                message,
                [
                    { text: 'Dismiss', style: 'cancel' },
                    {
                        text: 'View',
                        onPress: async () => {
                            setUnreadNotifications(0);
                            navigation.navigate('NotificationHistory');

                            if (stored.campaignId != null) {
                                try {
                                    await APIService.post('/api/v1/notification-click', {
                                        campaign_id: stored.campaignId,
                                    });
                                    await NotificationStore.markClicked(stored.id);
                                } catch (e) {
                                    // eslint-disable-next-line no-console
                                    console.log('[MapScreen] Failed to send notification-click for foreground view', e);
                                }
                            }

                            await NotificationStore.markAsRead(stored.id);
                        },
                    },
                ],
            );
        };

        const unsubscribeForeground = FCMService.subscribeForeground(async remoteMessage => {
            await handleRemoteMessage(remoteMessage, { openedFromNotification: false });
        });

        const unsubscribeBackground = FCMService.subscribeBackgroundOpen(async remoteMessage => {
            await handleRemoteMessage(remoteMessage, { openedFromNotification: true });
        });

        FCMService.checkInitialNotification(async remoteMessage => {
            await handleRemoteMessage(remoteMessage, { openedFromNotification: true });
        });

        return () => { unsubscribeForeground(); unsubscribeBackground(); };
    }, [navigation]);

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
                if (!hasPermissions) { setIsInitializing(false); return; }

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
                        Alert.alert(
                            '📍 Zone Entered',
                            `You have entered ${region.name || 'a zone'}`,
                            [{ text: 'OK', style: 'default' }],
                            { cancelable: true },
                        );
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
                    if (location.pixelX !== undefined && location.pixelY !== undefined) {
                        setPosition(calculateScaledPosition(location.pixelX, location.pixelY));
                    } else {
                        setPosition(latLngToScreen(location.latitude, location.longitude));
                    }
                });

                if (isActive) {
                    await IndoorAtlasService.startPositioning();
                    setTimeout(() => { if (isActive && !hasLocationFixRef.current) setShowLocationWarning(true); }, 10000);
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
            IndoorAtlasService.stopPositioning().catch(() => {});
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
            icon: !isInitializing ? 'wifi' : 'wifi-off',
            label: !isInitializing ? 'Connected' : 'Connecting...',
            active: !isInitializing,
        },
    ];

    const firstName = user?.displayName?.split(' ')[0] || 'User';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

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
                    <ImageBackground
                        source={floorPlan ? { uri: floorPlan.url } : floorPlanImage}
                        style={styles.floorPlan}
                        resizeMode="contain"
                        onLayout={(event) => {
                            const { width, height } = event.nativeEvent.layout;

                            setImageLayout({ width, height });
                        }}
                    >
                        {/* Zone Banner */}
                        {currentZone && (
                            <Animated.View
                                style={[
                                    styles.zoneIndicator,
                                    {
                                        opacity: zoneAnim,
                                        transform: [{
                                            translateY: zoneAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [30, 0],
                                            }),
                                        }],
                                    },
                                ]}
                            >
                                <View style={styles.zonePulse}>
                                    <Icon name="map-marker-check" size={18} color="#22c55e" />
                                </View>
                                <View style={styles.zoneInfo}>
                                    <Text style={styles.zoneLabel}>CURRENT ZONE</Text>
                                    <Text style={styles.zoneName} numberOfLines={1}>{currentZone.name}</Text>
                                </View>
                                <View style={styles.zoneTag}>
                                    <Text style={styles.zoneTagText}>LIVE</Text>
                                </View>
                            </Animated.View>
                        )}

                        {/* Loading Overlay */}
                        {!loadingDismissed && (isInitializing || !hasLocationFix) && (
                            <View style={[styles.loadingOverlay, showLocationWarning && styles.loadingOverlaySemi]}>
                                {isInitializing ? (
                                    <>
                                        <ActivityIndicator size="large" color="#63b3ed" />
                                        <Text style={styles.loadingText}>Initializing Indoor Positioning...</Text>
                                        <Text style={styles.loadingHint}>Please wait a moment</Text>
                                    </>
                                ) : !hasLocationFix && !showLocationWarning ? (
                                    <>
                                        <ActivityIndicator size="large" color="#63b3ed" />
                                        <Text style={styles.loadingText}>Acquiring location...</Text>
                                        <Text style={styles.loadingHint}>Make sure you're in a mapped venue</Text>
                                    </>
                                ) : showLocationWarning ? (
                                    <View style={styles.warningContainer}>
                                        <View style={styles.warningIconWrap}>
                                            <Icon name="map-marker-question-outline" size={44} color="#fbbf24" />
                                        </View>
                                        <Text style={styles.warningTitle}>No Indoor Location</Text>
                                        <Text style={styles.warningText}>
                                            You may not be in a mapped venue.{'\n'}
                                            Indoor positioning will work when you're in the office.
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.continueButton}
                                            onPress={() => setLoadingDismissed(true)}
                                            activeOpacity={0.8}
                                        >
                                            <Icon name="arrow-right" size={16} color="#0d1117" />
                                            <Text style={styles.continueButtonText}>Continue Anyway</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}
                            </View>
                        )}

                        <BlueDot x={position.x} y={position.y} size={24} />
                    </ImageBackground>
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