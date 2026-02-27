import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    SafeAreaView,
    StatusBar,
    ImageBackground,
    Dimensions,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { signOut } from '../services/AuthService';
import FCMService from '../services/FCMService';
import IndoorAtlasService from '../services/IndoorAtlasService';
import BlueDot from '../components/BlueDot';
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
    
    // Use refs to store current values for use in callbacks
    const floorPlanRef = useRef(null);
    const imageLayoutRef = useRef(null);
    
    // Update refs when states change
    useEffect(() => {
        floorPlanRef.current = floorPlan;
        console.log('[MapScreen] floorPlanRef updated:', !!floorPlan);
    }, [floorPlan]);
    
    useEffect(() => {
        imageLayoutRef.current = imageLayout;
        console.log('[MapScreen] imageLayoutRef updated:', !!imageLayout);
    }, [imageLayout]);

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
            Alert.alert(
                remoteMessage.notification?.title || '📍 New Offer!',
                remoteMessage.notification?.body || 'You have a new notification.',
                [
                    { text: 'Dismiss', style: 'cancel' },
                    {
                        text: 'View',
                        onPress: () => navigation.navigate('NotificationHistory'),
                    },
                ],
            );
        });

        // ── Background tap (app was alive in background) ──────────────────────────
        const unsubscribeBackground = FCMService.subscribeBackgroundOpen(() => {
            navigation.navigate('NotificationHistory');
        });

        // ── Killed state tap (app just launched from notification) ────────────────
        FCMService.checkInitialNotification(() => {
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
                
                // Request location permissions first
                console.log('[MapScreen] Checking permissions...');
                
                const hasPermissions = await requestLocationPermissions();
                if (!hasPermissions) {
                    return;
                }
                
                console.log('[MapScreen] Setting status: Initializing SDK...');
                
                // Initialize SDK
                console.log('[MapScreen] Calling IndoorAtlasService.initialize()...');
                await IndoorAtlasService.initialize();
                console.log('[MapScreen] Initialize complete! Setting status...');
                console.log('[MapScreen] Status set to: SDK Initialized ✓');
                
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
                    
                    // Check if we're getting updates after 15 seconds
                    setTimeout(() => {
                        if (isActive) {
                            console.log('[MapScreen] ⚠️ Timeout: No location after 15s');
                            console.warn('[MapScreen] No location updates after 15 seconds');
                        }
                    }, 15000);
                }
                
                console.log('[MapScreen] ========== INITIALIZATION COMPLETE ==========');
                
            } catch (error) {
                console.error('[MapScreen] ❌ Indoor Atlas initialization failed:', error);
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

    const handleSignOut = async () => {
        try {
            await signOut();
            // onAuthStateChanged in AppNavigator handles navigation back to AuthScreen
        } catch (error) {
            Alert.alert('Sign-Out Failed', error.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.greeting}>
                        Hello, {user?.displayName?.split(' ')[0] || 'User'} 👋
                    </Text>
                    <Text style={styles.subGreeting}>{user?.email}</Text>
                </View>
                <TouchableOpacity
                    style={styles.notificationBtn}
                    onPress={() => navigation.navigate('NotificationHistory')}>
                    <Text style={styles.notificationIcon}>🔔</Text>
                </TouchableOpacity>
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
                    <BlueDot x={position.x} y={position.y} size={24} />
                </ImageBackground>
            </View>

            {/* Status Bar */}
            <View style={styles.statusBar}>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, styles.statusActive]} />
                    <Text style={styles.statusText}>Firebase Auth ✓</Text>
                </View>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, styles.statusActive]} />
                    <Text style={styles.statusText}>FCM Ready ✓</Text>
                </View>
            </View>

            {/* Sign Out */}
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
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
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0f3460',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationIcon: {
        fontSize: 20,
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
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusActive: {
        backgroundColor: '#22c55e',
    },
    statusText: {
        fontSize: 12,
        color: '#a8a8b3',
    },
    signOutBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e94560',
        alignItems: 'center',
    },
    signOutText: {
        color: '#e94560',
        fontSize: 15,
        fontWeight: '600',
    },
});
