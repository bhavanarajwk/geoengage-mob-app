import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    StatusBar,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { signInWithGoogle } from '../services/AuthService';
import FCMService from '../services/FCMService';
import APIService from '../services/APIService';

const { width: SW, height: SH } = Dimensions.get('window');

export default function AuthScreen() {
    const [loading, setLoading] = useState(false);

    // Staggered animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.75)).current;
    const titleAnim = useRef(new Animated.Value(0)).current;
    const tagAnim = useRef(new Animated.Value(0)).current;
    const btnAnim = useRef(new Animated.Value(0)).current;
    const termsAnim = useRef(new Animated.Value(0)).current;

    // Floating orb pulse
    const orb1 = useRef(new Animated.Value(1)).current;
    const orb2 = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Stagger entry
        Animated.sequence([
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
            ]),
            Animated.timing(titleAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(tagAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(btnAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(termsAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();

        // Pulse orbs
        const pulse = (orb, delay) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(orb, { toValue: 1.18, duration: 3000, useNativeDriver: true }),
                    Animated.timing(orb, { toValue: 1, duration: 3000, useNativeDriver: true }),
                ])
            ).start();
        pulse(orb1, 0);
        pulse(orb2, 1500);
    }, []);

    // ── All auth logic unchanged ─────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const authResult = await signInWithGoogle();

            console.log('\n========== FIREBASE AUTHENTICATION SUCCESS ==========');
            console.log('📧 Email:', authResult.user.email);
            console.log('👤 Display Name:', authResult.user.displayName);
            console.log('🆔 User UID:', authResult.user.uid);
            console.log('🔑 Firebase ID Token (JWT):', authResult.firebaseIdToken);
            console.log('\n--- Additional User Details ---');
            console.log('Photo URL:', authResult.user.photoURL);
            console.log('Email Verified:', authResult.user.emailVerified);
            console.log('Phone Number:', authResult.user.phoneNumber || 'None');
            console.log('Creation Time:', authResult.user.metadata?.creationTime);
            console.log('Last Sign In:', authResult.user.metadata?.lastSignInTime);
            console.log('\n--- Provider Data ---');
            console.log(JSON.stringify(authResult.user.providerData, null, 2));
            console.log('\n--- Full User Object (JSON) ---');
            console.log(JSON.stringify({
                uid: authResult.user.uid,
                email: authResult.user.email,
                displayName: authResult.user.displayName,
                photoURL: authResult.user.photoURL,
                emailVerified: authResult.user.emailVerified,
                phoneNumber: authResult.user.phoneNumber,
                metadata: authResult.user.metadata,
                providerData: authResult.user.providerData,
            }, null, 2));
            console.log('====================================================\n');

            const fcmToken = await FCMService.requestPermissionAndGetToken();

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
        } catch (error) {
            console.error('[Auth] Sign-in error:', error);
            if (error.code === 'SIGN_IN_CANCELLED') {
                // User cancelled — do nothing
            } else {
                Alert.alert('Sign-In Failed', error.message || 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Feature pills data ───────────────────────────────────────────────────
    const features = [
        { icon: 'map-marker-radius', label: 'Indoor Positioning' },
        { icon: 'bell-ring-outline', label: 'Smart Alerts' },
        { icon: 'shield-check-outline', label: 'Secure Auth' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

            {/* Decorative background orbs */}
            <Animated.View
                style={[styles.orb, styles.orb1, { transform: [{ scale: orb1 }] }]}
                pointerEvents="none"
            />
            <Animated.View
                style={[styles.orb, styles.orb2, { transform: [{ scale: orb2 }] }]}
                pointerEvents="none"
            />

            {/* ── Branding ── */}
            <View style={styles.brandingWrapper}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                    <View style={styles.logoRing}>
                        <View style={styles.logoInner}>
                            <Icon name="map-marker-radius" size={44} color="#63b3ed" />
                        </View>
                    </View>
                </Animated.View>

                <Animated.Text style={[styles.appName, { opacity: titleAnim }]}>
                    GeoEngage
                </Animated.Text>

                <Animated.Text style={[styles.tagline, { opacity: tagAnim }]}>
                    Smart indoor experiences,{'\n'}delivered to your device.
                </Animated.Text>

                {/* Feature pills */}
                <Animated.View style={[styles.pillsRow, { opacity: tagAnim }]}>
                    {features.map((f, i) => (
                        <View key={i} style={styles.pill}>
                            <Icon name={f.icon} size={13} color="#63b3ed" />
                            <Text style={styles.pillText}>{f.label}</Text>
                        </View>
                    ))}
                </Animated.View>
            </View>

            {/* ── Sign-In Section ── */}
            <Animated.View style={[styles.signInSection, { opacity: btnAnim }]}>
                <Text style={styles.signInHeading}>Get started</Text>
                <Text style={styles.signInSub}>Sign in to access your indoor workspace</Text>

                <TouchableOpacity
                    style={[styles.googleButton, loading && styles.googleButtonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                    activeOpacity={0.88}
                >
                    {loading ? (
                        <>
                            <ActivityIndicator size="small" color="#4285F4" />
                            <Text style={styles.googleButtonText}>Signing in...</Text>
                        </>
                    ) : (
                        <>
                            <View style={styles.googleIconWrap}>
                                <Icon name="google" size={20} color="#4285F4" />
                            </View>
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                            <Icon name="arrow-right" size={18} color="#334155" style={styles.arrowIcon} />
                        </>
                    )}
                </TouchableOpacity>

                <Animated.Text style={[styles.termsText, { opacity: termsAnim }]}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.linkText}>Terms</Text> and{' '}
                    <Text style={styles.linkText}>Privacy Policy</Text>
                </Animated.Text>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d1117',
        justifyContent: 'space-between',
        paddingBottom: 40,
    },

    // ── Orbs ──
    orb: {
        position: 'absolute',
        borderRadius: 999,
    },
    orb1: {
        width: 280,
        height: 280,
        backgroundColor: 'rgba(99, 179, 237, 0.06)',
        top: -60,
        right: -80,
    },
    orb2: {
        width: 220,
        height: 220,
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        bottom: 120,
        left: -60,
    },

    // ── Branding ──
    brandingWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    logoRing: {
        width: 108,
        height: 108,
        borderRadius: 54,
        borderWidth: 1.5,
        borderColor: 'rgba(99, 179, 237, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#63b3ed',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    logoInner: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: '#131c2c',
        borderWidth: 1,
        borderColor: '#1e2d3d',
        alignItems: 'center',
        justifyContent: 'center',
    },
    appName: {
        fontSize: 36,
        fontWeight: '800',
        color: '#e2e8f0',
        letterSpacing: 1,
        marginBottom: 10,
        textAlign: 'center',
    },
    tagline: {
        fontSize: 15,
        color: '#4a5568',
        textAlign: 'center',
        lineHeight: 23,
        marginBottom: 28,
    },
    pillsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#131c2c',
        borderWidth: 1,
        borderColor: '#1e2d3d',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    pillText: {
        fontSize: 12,
        color: '#7c8db0',
        fontWeight: '500',
    },

    // ── Sign-In ──
    signInSection: {
        paddingHorizontal: 24,
    },
    signInHeading: {
        fontSize: 22,
        fontWeight: '700',
        color: '#e2e8f0',
        marginBottom: 4,
    },
    signInSub: {
        fontSize: 13,
        color: '#4a5568',
        marginBottom: 24,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        paddingVertical: 15,
        paddingHorizontal: 20,
        width: '100%',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        minHeight: 54,
        gap: 12,
    },
    googleButtonDisabled: {
        opacity: 0.65,
    },
    googleIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleButtonText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        letterSpacing: 0.2,
    },
    arrowIcon: {
        opacity: 0.4,
    },
    termsText: {
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        marginTop: 18,
        lineHeight: 18,
    },
    linkText: {
        color: '#63b3ed',
        fontWeight: '600',
    },
});
