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
import BlueDot from '../components/BlueDot';
import NotificationBadge from '../components/NotificationBadge';
import { latLngToScreen } from '../utils/coordinateConverter';

const floorPlanImage = require('../../assets/floorplan.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MapScreen({ navigation }) {
    const user = auth().currentUser;
    
    // Position state for blue dot
    const [position, setPosition] = useState({
        x: SCREEN_WIDTH / 2,  // Mock position - center of screen
        y: 300,  // Mock position - will be updated by real data
    });
    
    const [floorPlan, setFloorPlan] = useState(null); // Indoor Atlas floor plan
    const [imageLayout, setImageLayout] = useState(null); // Actual rendered image dimensions
    const [isInitializing, setIsInitializing] = useState(true); // Loading state
    const [hasLocationFix, setHasLocationFix] = useState(false); // Whether we have location
    const [unreadNotifications, setUnreadNotifications] = useState(0); // Unread notification count
    const [showLocationWarning, setShowLocationWarning] = useState(false); // Show warning after timeout
    const [loadingDismissed, setLoadingDismissed] = useState(false); // User dismissed loading overlay
    
    // Use refs to store current values for use in callbacks
    const floorPlanRef = useRef(null);
    const imageLayoutRef = useRef(null);
    const hasLocationFixRef = useRef(false);
    
    // Update refs when states change
    useEffect(() => {
        floorPlanRef.current = floorPlan;
        console.log('[MapScreen] floorPlanRef updated:', !!floorPlan);
    }, [floorPlan]);
    
    useEffect(() => {
        imageLayoutRef.current = imageLayout;
        console.log('[MapScreen] imageLayoutRef updated:', !!imageLayout);
    }, [imageLayout]);

    useEffect(() => {
        hasLocationFixRef.current = hasLocationFix;
    }, [hasLocationFix]);

    // Helper function to calculate scaled position
    const calculateScaledPosition = (pixelX, pixelY) => {
        const currentFloorPlan = floorPlanRef.current;
        const currentImageLayout = imageLayoutRef.current;
        
        console.log('[MapScreen] calculateScaledPosition - pixelX:', pixelX, 'pixelY:', pixelY);
        console.log('[MapScreen] currentFloorPlan:', !!currentFloorPlan, 'currentImageLayout:', !!currentImageLayout);
        
        if (!currentFloorPlan || !currentImageLayout) {
            console.log('[MapScreen] ⚠️ Missing floorPlan or imageLayout, using direct pixel coords');
            return { x: pixelX, y: pixelY };
        }
        
        // Calculate actual rendered image size (resizeMode="contain" scales to fit)
        const containerAspect = currentImageLayout.width / currentImageLayout.height;
        const imageAspect = currentFloorPlan.width / currentFloorPlan.height;
        
        let renderedWidth, renderedHeight, offsetX, offsetY;
        
        if (imageAspect > containerAspect) {
            // Image is wider - constrained by width
            renderedWidth = currentImageLayout.width;
            renderedHeight = currentImageLayout.width / imageAspect;
            offsetX = 0;
            offsetY = (currentImageLayout.height - renderedHeight) / 2;
        } else {
            // Image is taller - constrained by height
            renderedHeight = currentImageLayout.height;
            renderedWidth = currentImageLayout.height * imageAspect;
            offsetX = (currentImageLayout.width - renderedWidth) / 2;
            offsetY = 0;
        }
        
        // Scale pixel coordinates to rendered image size
        const scaleX = renderedWidth / currentFloorPlan.width;
        const scaleY = renderedHeight / currentFloorPlan.height;
        const scaledX = (pixelX * scaleX) + offsetX;
        const scaledY = (pixelY * scaleY) + offsetY;
        
        console.log('[MapScreen] 🎯 Scaling:');
        console.log('  Bitmap:', currentFloorPlan.width, 'x', currentFloorPlan.height);
        console.log('  Container:', currentImageLayout.width, 'x', currentImageLayout.height);
        console.log('  Rendered:', renderedWidth.toFixed(0), 'x', renderedHeight.toFixed(0));
        console.log('  Offset:', offsetX.toFixed(0), ',', offsetY.toFixed(0));
        console.log('  Pixel:', pixelX, ',', pixelY);
        console.log('  Scale:', scaleX.toFixed(3), 'x', scaleY.toFixed(3));
        console.log('  ✅ FINAL:', scaledX.toFixed(0), ',', scaledY.toFixed(0));
        
        return { x: scaledX, y: scaledY };
    };

    useEffect(() => {
        // ── Foreground notifications ──────────────────────────────────────────────
        const unsubscribeForeground = FCMService.subscribeForeground(remoteMessage => {
            // Increment unread count
            setUnreadNotifications(prev => prev + 1);
            
            Alert.alert(
                remoteMessage.notification?.title || '📍 New Offer!',
                remoteMessage.notification?.body || 'You have a new notification.',
                [
                    { text: 'Dismiss', style: 'cancel' },
                    {
                        text: 'View',
                        onPress: () => {
                            setUnreadNotifications(0); // Clear count when viewing
                            navigation.navigate('NotificationHistory');
                        },
                    },
                ],
            );
        });

        // ── Background tap (app was alive in background) ──────────────────────────
        const unsubscribeBackground = FCMService.subscribeBackgroundOpen(() => {
            setUnreadNotifications(0); // Clear count when opening from background
            navigation.navigate('NotificationHistory');
        });

        // ── Killed state tap (app just launched from notification) ────────────────
        FCMService.checkInitialNotification(() => {
            setUnreadNotifications(0); // Clear count when opening from killed state
            navigation.navigate('NotificationHistory');
        });

        return () => {
            unsubscribeForeground();
            unsubscribeBackground();
        };
    }, [navigation]);

    // ── Indoor Atlas SDK Initialization ───────────────────────────────────────
    useEffect(() => {
        let isActive = true;
        let locationUnsubscribe = null;
        let statusUnsubscribe = null;
        let floorPlanUnsubscribe = null;

        const requestLocationPermissions = async () => {
            if (Platform.OS !== 'android') {
                return true;
            }

            try {
                console.log('[MapScreen] Requesting location permissions...');
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                ]);

                const fineGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
                const coarseGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

                console.log('[MapScreen] Permission results:', { fineGranted, coarseGranted });

                if (fineGranted || coarseGranted) {
                    console.log('[MapScreen] ✅ Location permissions granted');
                    return true;
                } else {
                    console.error('[MapScreen] ❌ Location permissions denied');
                    Alert.alert(
                        'Location Permission Required',
                        'Indoor positioning requires location access. Please grant location permissions in Settings.',
                        [{ text: 'OK' }]
                    );
                    return false;
                }
            } catch (err) {
                console.error('[MapScreen] Error requesting permissions:', err);
                return false;
            }
        };

        const initializeIndoorAtlas = async () => {
            try {
                console.log('[MapScreen] ========== STARTING INITIALIZATION ==========');
                setIsInitializing(true);
                
                // Request location permissions first
                console.log('[MapScreen] Checking permissions...');
                
                const hasPermissions = await requestLocationPermissions();
                if (!hasPermissions) {
                    setIsInitializing(false);
                    return;
                }
                
                console.log('[MapScreen] Setting status: Initializing SDK...');
                
                // Initialize SDK
                console.log('[MapScreen] Calling IndoorAtlasService.initialize()...');
                await IndoorAtlasService.initialize();
                console.log('[MapScreen] Initialize complete! Setting status...');
                console.log('[MapScreen] Status set to: SDK Initialized ✓');
                setIsInitializing(false);
                
                // Subscribe to floor plan changes
                console.log('[MapScreen] Subscribing to floor plan changes...');
                floorPlanUnsubscribe = IndoorAtlasService.onFloorPlanChanged((floorPlanData) => {
                    if (!isActive) return;
                    console.log('[MapScreen] 🗺️ Floor plan changed:', floorPlanData);
                    setFloorPlan(floorPlanData);
                });
                
                // Subscribe to status changes
                console.log('[MapScreen] Subscribing to status changes...');
                statusUnsubscribe = IndoorAtlasService.onStatusChanged((statusData) => {
                    if (!isActive) return;
                    console.log('[MapScreen] 📊 Status changed EVENT RECEIVED:', statusData);
                    const newStatus = `${statusData.provider}: ${statusData.statusText}`;
                    console.log('[MapScreen] Setting status to:', newStatus);
                });
                console.log('[MapScreen] Status subscription registered');
                
                // Subscribe to location updates
                console.log('[MapScreen] Subscribing to location updates...');
                locationUnsubscribe = IndoorAtlasService.onLocationChanged((location) => {
                    if (!isActive) return;
                    
                    console.log('[MapScreen] 📍 Location update:', location);
                    setHasLocationFix(true); // We have a location fix
                    
                    // Use pixel coordinates from Indoor Atlas if available
                    if (location.pixelX !== undefined && location.pixelY !== undefined) {
                        const scaledPos = calculateScaledPosition(location.pixelX, location.pixelY);
                        console.log('[MapScreen] Setting position to:', scaledPos);
                        setPosition(scaledPos);
                    } else {
                        // Fallback to our coordinate converter
                        const screenPosition = latLngToScreen(location.latitude, location.longitude);
                        setPosition(screenPosition);
                    }
                });
                
                // Start positioning
                if (isActive) {
                    console.log('[MapScreen] Setting status: Starting positioning...');
                    console.log('[MapScreen] Calling startPositioning()...');
                    await IndoorAtlasService.startPositioning();
                    console.log('[MapScreen] ✅ Indoor Atlas ready');
                    console.log('[MapScreen] Setting status: Waiting for location...');
                    console.log('[MapScreen] Status set complete');
                    
                    // Check if we're getting updates after 10 seconds
                    setTimeout(() => {
                        if (isActive && !hasLocationFixRef.current) {
                            console.log('[MapScreen] ⚠️ Timeout: No location after 10s');
                            setShowLocationWarning(true);
                        }
                    }, 10000);
                }
                
                console.log('[MapScreen] ========== INITIALIZATION COMPLETE ==========');
                
            } catch (error) {
                console.error('[MapScreen] ❌ Indoor Atlas initialization failed:', error);
                setIsInitializing(false);
                Alert.alert(
                    'Indoor Positioning Error',
                    'Failed to initialize indoor positioning. Some features may not work.',
                    [{ text: 'OK' }]
                );
            }
        };

        initializeIndoorAtlas();

        // Cleanup on unmount
        return () => {
            isActive = false;
            if (locationUnsubscribe && typeof locationUnsubscribe.remove === 'function') {
                locationUnsubscribe.remove();
            }
            if (statusUnsubscribe && typeof statusUnsubscribe.remove === 'function') {
                statusUnsubscribe.remove();
            }
            if (floorPlanUnsubscribe && typeof floorPlanUnsubscribe.remove === 'function') {
                floorPlanUnsubscribe.remove();
            }
            IndoorAtlasService.stopPositioning().catch(err => 
                console.error('[MapScreen] Error stopping positioning:', err)
            );
        };
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.userInfo}>
                    <Text style={styles.greeting}>
                        Hello, {user?.displayName?.split(' ')[0] || 'User'}
                    </Text>
                    <Text style={styles.subGreeting}>Welcome back</Text>
                </View>
                
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.notificationBtn}
                        onPress={() => {
                            setUnreadNotifications(0); // Clear count when navigating
                            navigation.navigate('NotificationHistory');
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="bell-outline" size={24} color="#ffffff" />
                        <NotificationBadge count={unreadNotifications} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Profile')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        {user?.photoURL ? (
                            <Avatar.Image 
                                size={40} 
                                source={{ uri: user.photoURL }} 
                                style={styles.avatar}
                            />
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
            </View>

            {/* Floor Plan with Blue Dot */}
            <View style={styles.mapContainer}>
                <ImageBackground
                    source={floorPlan ? { uri: floorPlan.url } : floorPlanImage}
                    style={styles.floorPlan}
                    resizeMode="contain"
                    onLayout={(event) => {
                        const { width, height } = event.nativeEvent.layout;
                        console.log('[MapScreen] ImageBackground layout:', width, height);
                        setImageLayout({ width, height });
                    }}
                >
                    {/* Loading Overlay - only show if not dismissed and no location fix */}
                    {!loadingDismissed && (isInitializing || !hasLocationFix) && (
                        <View style={[
                            styles.loadingOverlay,
                            showLocationWarning && styles.loadingOverlaySemiTransparent
                        ]}>
                            {isInitializing ? (
                                <>
                                    <ActivityIndicator size="large" color="#ffffff" />
                                    <Text style={styles.loadingText}>Initializing Indoor Positioning...</Text>
                                </>
                            ) : !hasLocationFix && !showLocationWarning ? (
                                <>
                                    <ActivityIndicator size="large" color="#ffffff" />
                                    <Text style={styles.loadingText}>Acquiring location...</Text>
                                    <Text style={styles.loadingHint}>Make sure you're in a mapped venue</Text>
                                </>
                            ) : showLocationWarning ? (
                                <View style={styles.warningContainer}>
                                    <Icon name="map-marker-question-outline" size={48} color="#fbbf24" />
                                    <Text style={styles.warningTitle}>No Indoor Location Detected</Text>
                                    <Text style={styles.warningText}>
                                        You may not be in a mapped venue.{'\n'}
                                        Indoor positioning will work when you're in the office.
                                    </Text>
                                    <TouchableOpacity 
                                        style={styles.continueButton}
                                        onPress={() => setLoadingDismissed(true)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.continueButtonText}>Continue Anyway</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    )}
                    <BlueDot x={position.x} y={position.y} size={24} />
                </ImageBackground>
            </View>

            {/* Status Bar */}
            <View style={styles.statusBar}>
                <View style={styles.statusItem}>
                    <Icon 
                        name={hasLocationFix ? "check-circle" : "loading"} 
                        size={16} 
                        color={hasLocationFix ? "#22c55e" : "#a8a8b3"} 
                    />
                    <Text style={styles.statusText}>
                        {hasLocationFix ? "Positioned" : "Acquiring..."}
                    </Text>
                </View>
                <View style={styles.statusItem}>
                    <Icon 
                        name={!isInitializing ? "check-circle" : "loading"} 
                        size={16} 
                        color={!isInitializing ? "#22c55e" : "#a8a8b3"} 
                    />
                    <Text style={styles.statusText}>
                        {!isInitializing ? "Connected" : "Connecting..."}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 8,
    },
    userInfo: {
        flex: 1,
    },
    greeting: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
    },
    subGreeting: {
        fontSize: 12,
        color: '#a8a8b3',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0f3460',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        backgroundColor: '#0f3460',
    },
    mapContainer: {
        flex: 1,
        borderRadius: 16,
        backgroundColor: '#0f3460',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1e3a5f',
        marginBottom: 20,
    },
    floorPlan: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    debugOverlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#00ff00',
        minWidth: 250,
    },
    debugTitle: {
        color: '#00ff00',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    debugText: {
        color: '#00ff00',
        fontSize: 12,
        fontFamily: 'monospace',
        marginBottom: 3,
    },
    debugTextSmall: {
        color: '#00ff00',
        fontSize: 10,
        fontFamily: 'monospace',
        marginTop: 5,
        opacity: 0.7,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 16,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusText: {
        fontSize: 12,
        color: '#a8a8b3',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 52, 96, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingOverlaySemiTransparent: {
        backgroundColor: 'rgba(15, 52, 96, 0.85)',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '500',
    },
    loadingHint: {
        marginTop: 8,
        fontSize: 12,
        color: '#a8a8b3',
        textAlign: 'center',
    },
    warningContainer: {
        alignItems: 'center',
        paddingHorizontal: 40,
        maxWidth: '100%',
    },
    warningTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    warningText: {
        fontSize: 14,
        color: '#a8a8b3',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    continueButton: {
        backgroundColor: '#ffffff',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
        minWidth: 200,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    continueButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a2e',
    },
});
