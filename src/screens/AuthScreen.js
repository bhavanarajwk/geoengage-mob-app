import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    StatusBar,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { signInWithGoogle } from '../services/AuthService';
import FCMService from '../services/FCMService';
import APIService from '../services/APIService';

export default function AuthScreen() {
    const [loading, setLoading] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const slideUpAnim = useRef(new Animated.Value(50)).current;

    // Animate on mount
    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(slideUpAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            // Step 1: Authenticate with Google + Firebase
            const authResult = await signInWithGoogle();
            
            // Log everything Firebase returns
            console.log('\n╔══════════════════════════════════════════════════════════════════╗');
            console.log('║           FIREBASE AUTHENTICATION SUCCESS ✅                     ║');
            console.log('╠══════════════════════════════════════════════════════════════════╣');
            console.log('║ Email:        ', authResult.user.email.padEnd(46), '║');
            console.log('║ Display Name: ', (authResult.user.displayName || 'N/A').padEnd(46), '║');
            console.log('║ User UID:     ', authResult.user.uid.padEnd(46), '║');
            console.log('╠══════════════════════════════════════════════════════════════════╣');
            console.log('║ JWT TOKEN FROM SIGN-IN (Copy this to test in Swagger):          ║');
            console.log('╠══════════════════════════════════════════════════════════════════╣');
            console.log(authResult.firebaseIdToken);
            console.log('╠══════════════════════════════════════════════════════════════════╣');
            console.log('║ Additional User Details:                                         ║');
            console.log('╠══════════════════════════════════════════════════════════════════╣');
            console.log('║ Photo URL:      ', (authResult.user.photoURL || 'N/A').substring(0, 44).padEnd(46), '║');
            console.log('║ Email Verified: ', (authResult.user.emailVerified ? 'Yes' : 'No').padEnd(46), '║');
            console.log('║ Phone Number:   ', (authResult.user.phoneNumber || 'None').padEnd(46), '║');
            console.log('║ Creation Time:  ', (authResult.user.metadata?.creationTime || 'N/A').padEnd(46), '║');
            console.log('║ Last Sign In:   ', (authResult.user.metadata?.lastSignInTime || 'N/A').padEnd(46), '║');
            console.log('╚══════════════════════════════════════════════════════════════════╝\n');

            // CRITICAL: Wait for Firebase auth state to fully update
            // This ensures auth().currentUser is set before API calls
            console.log('\n╔══════════════════════════════════════════════════════════════════╗');
            console.log('║              WAITING FOR AUTH STATE TO SETTLE                    ║');
            console.log('╚══════════════════════════════════════════════════════════════════╝');
            console.log('⏳ Waiting for auth().currentUser to be updated...\n');
            
            await new Promise(resolve => {
                const unsubscribe = auth().onAuthStateChanged(user => {
                    if (user && user.uid === authResult.user.uid) {
                        console.log('✅ Auth state confirmed!');
                        console.log('✅ auth().currentUser is now set');
                        console.log('✅ Ready to make authenticated API calls\n');
                        unsubscribe();
                        resolve();
                    }
                });
                // Fallback timeout in case listener doesn't fire (shouldn't happen)
                setTimeout(() => {
                    console.log('⚠️ Auth state timeout - proceeding anyway');
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        console.log('✅ But auth().currentUser IS set:', currentUser.email);
                    } else {
                        console.error('❌ auth().currentUser is STILL NULL - this will cause 401!');
                    }
                    resolve();
                }, 2000);
            });

            // Step 2: Request notification permission and get FCM token
            const fcmToken = await FCMService.requestPermissionAndGetToken();

            // Step 3: Register device with backend
            if (fcmToken) {
                console.log('\n========== FCM TOKEN RETRIEVED ==========');
                console.log('🔔 FCM Token:', fcmToken);
                console.log('📱 Device registered for push notifications');
                console.log('=========================================\n');
                
                try {
                    console.log('📡 Calling POST /api/v1/register-device...');
                    console.log('📦 Payload:', { fcm_token: fcmToken });
                    console.log('🔐 Authorization: Bearer <jwt> (attached automatically)');
                    
                    const response = await APIService.post('/api/v1/register-device', { fcm_token: fcmToken });
                    
                    console.log('\n========== BACKEND RESPONSE ==========');
                    console.log('✅ Status:', response.status);
                    console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
                    console.log('======================================\n');
                    console.log('✅ Device successfully registered with backend');
                } catch (apiErr) {
                    console.log('\n========== BACKEND ERROR ==========');
                    console.error('❌ Error:', apiErr.message);
                    console.error('📛 Status:', apiErr.response?.status);
                    console.error('📥 Response:', JSON.stringify(apiErr.response?.data, null, 2));
                    console.log('===================================\n');
                }
            } else {
                console.log('⚠️ FCM Token is null - notification permission may be denied');
            }

            // Navigation is handled automatically by onAuthStateChanged in AppNavigator
        } catch (error) {
            console.error('[Auth] Sign-in error:', error);
            if (error.code === 'SIGN_IN_CANCELLED') {
                // User cancelled — do nothing
            } else {
                Alert.alert(
                    'Sign-In Failed',
                    error.message || 'Something went wrong. Please try again.',
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

            {/* Header / Branding */}
            <Animated.View 
                style={[
                    styles.brandingContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <View style={styles.logoCircle}>
                    <Icon name="map-marker-radius" size={48} color="#e94560" />
                </View>
                <Text style={styles.appName}>GeoEngage</Text>
                <Text style={styles.tagline}>
                    Smart indoor experiences,{'\n'}delivered to your device.
                </Text>
            </Animated.View>

            {/* Sign-In Section */}
            <Animated.View 
                style={[
                    styles.signInContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideUpAnim }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={[styles.googleButton, loading && styles.googleButtonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                    activeOpacity={0.85}>
                    {loading ? (
                        <>
                            <ActivityIndicator size="small" color="#4285F4" />
                            <Text style={[styles.googleButtonText, { marginLeft: 12 }]}>
                                Signing in...
                            </Text>
                        </>
                    ) : (
                        <>
                            {/* Google "G" logo with icon */}
                            <View style={styles.googleIconContainer}>
                                <Icon name="google" size={20} color="#4285F4" />
                            </View>
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.termsText}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.linkText}>Terms</Text> and{' '}
                    <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        justifyContent: 'space-between',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    brandingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#0f3460',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 3,
        borderColor: '#e94560',
        elevation: 8,
        shadowColor: '#e94560',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    appName: {
        fontSize: 34,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    tagline: {
        fontSize: 15,
        color: '#a8a8b3',
        textAlign: 'center',
        lineHeight: 22,
    },
    signInContainer: {
        alignItems: 'center',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        width: '100%',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        minHeight: 52,
    },
    googleButtonDisabled: {
        opacity: 0.7,
    },
    googleIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f8f9fa',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e',
        letterSpacing: 0.3,
    },
    termsText: {
        fontSize: 12,
        color: '#a8a8b3',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
    },
    linkText: {
        color: '#e94560',
        fontWeight: '600',
    },
});
