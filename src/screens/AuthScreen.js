import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    StatusBar,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { statusCodes } from '@react-native-google-signin/google-signin';
import { signInWithGoogle } from '../services/AuthService';
import FCMService from '../services/FCMService';
import APIService from '../services/APIService';
import { useCustomAlert } from '../components/CustomAlert';
import GELogo from '../components/GELogo';

const { width: SW, height: SH } = Dimensions.get('window');

// New color palette
const COLORS = {
    gradientStart: '#0F172A',
    gradientEnd: '#1E293B',
    purple: '#8B5CF6',
    cyan: '#06B6D4',
    textGray: '#94A3B8',
    textDark: '#64748B',
    white: '#FFFFFF',
    surface: '#1E293B',
};

export default function AuthScreen() {
    const [loading, setLoading] = useState(false);
    const alert = useCustomAlert();

    // Staggered animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.75)).current;
    const titleAnim = useRef(new Animated.Value(0)).current;
    const tagAnim = useRef(new Animated.Value(0)).current;
    const btnAnim = useRef(new Animated.Value(0)).current;
    const termsAnim = useRef(new Animated.Value(0)).current;

    // Floating particles
    const particles = useMemo(() =>
        Array(8).fill(0).map(() => ({
            x: Math.random() * SW,
            y: Math.random() * SH,
            size: 4 + Math.random() * 6,
            opacity: new Animated.Value(0.1 + Math.random() * 0.2),
            translateY: new Animated.Value(0),
        })),
    []);

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

        // Animate particles
        particles.forEach((particle, index) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(index * 300),
                    Animated.parallel([
                        Animated.timing(particle.opacity, {
                            toValue: 0.3,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.translateY, {
                            toValue: -40,
                            duration: 3000,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.parallel([
                        Animated.timing(particle.opacity, {
                            toValue: 0.1,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(particle.translateY, {
                            toValue: 0,
                            duration: 3000,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            ).start();
        });
    }, []);

    // ── All auth logic unchanged ─────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const authResult = await signInWithGoogle();

            console.log('[AuthScreen] Firebase user UID:', authResult.user?.uid);
            console.log('[AuthScreen] Firebase JWT Token:', authResult.firebaseIdToken);
            console.log('[AuthScreen] Sign-in successful, waiting for auth state...');

            // CRITICAL: Wait for Firebase auth state to fully update
            // This ensures auth().currentUser is set before API calls

            await new Promise(resolve => {
                const unsubscribe = auth().onAuthStateChanged(user => {
                    if (user && user.uid === authResult.user.uid) {
                        console.log('[AuthScreen] Auth state confirmed for user:', user.uid);
                        unsubscribe();
                        resolve();
                    }
                });
                // Fallback timeout in case listener doesn't fire (shouldn't happen)
                setTimeout(() => {
                    const currentUser = auth().currentUser;
                    if (currentUser) {
                        console.log('[AuthScreen] Timeout reached - user is authenticated');
                    } else {
                        console.warn('[AuthScreen] Timeout reached - auth state not ready after 5s');
                    }
                    resolve();
                }, 5000);
            });

            // Request FCM permission and get token
            console.log('[AuthScreen] Requesting FCM permission...');
            const fcmToken = await FCMService.requestPermissionAndGetToken();

            if (fcmToken) {
                console.log('[AuthScreen] FCM token obtained, registering with backend...');
                
                // Use the new registration method with retry logic
                const success = await FCMService.registerTokenWithBackend(fcmToken);
                
                if (success) {
                    console.log('[AuthScreen] Device registered successfully');
                } else {
                    console.error('[AuthScreen] Device registration failed after retries');
                    alert.show(
                        'Notification Setup Issue',
                        'You are signed in, but notifications may not work properly. Please check your connection.',
                        [{ text: 'OK' }]
                    );
                }
            } else {
                console.warn('[AuthScreen] No FCM token - user may have denied notification permission');
                // User denied notification permission or error occurred
                // Don't show alert since this is a valid user choice
            }
        } catch (error) {
            console.error('[AuthScreen] Sign-in error:', error);

            // Use proper Google Sign-In status codes instead of string matching
            const errorCode = error?.code;
            const errorMessage = error?.message || '';

            // Handle user cancellation silently (proper locale-independent detection)
            if (errorCode === statusCodes.SIGN_IN_CANCELLED) {
                console.log('[AuthScreen] User cancelled sign-in (status code)');
                return; // Silent dismiss
            }

            // Also handle edge case where Google Sign-In returns without idToken (likely user cancelled)
            if (errorMessage.includes('no idToken returned')) {
                console.log('[AuthScreen] User cancelled sign-in (no idToken)');
                return; // Silent dismiss
            }

            // Provide context-specific error messages
            let title = 'Sign-In Failed';
            let message = '';

            switch (errorCode) {
                case statusCodes.IN_PROGRESS:
                    console.warn('[AuthScreen] Sign-in already in progress');
                    message = 'Sign-in already in progress. Please wait.';
                    break;

                case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                    message = 'Google Play Services is not available or outdated. Please update Google Play Services and try again.';
                    break;

                default:
                    // Check for network-related errors
                    const lowerMessage = errorMessage.toLowerCase();

                    if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
                        title = 'Network Error';
                        message = 'Unable to connect. Please check your internet connection and try again.';
                    } else if (lowerMessage.includes('auth') || lowerMessage.includes('credential')) {
                        title = 'Authentication Error';
                        message = 'Unable to authenticate with Google. Please try again.';
                    } else {
                        // Generic fallback with user-friendly message
                        message = 'Unable to sign in at this time. Please try again.';
                    }
                    break;
            }

            alert.show(title, message);
        } finally {
            setLoading(false);
        }
    };

    // ── Feature pills data ───────────────────────────────────────────────────
    const features = [
        { icon: 'map-marker-radius', label: 'Indoor Positioning', color: COLORS.cyan },
        { icon: 'bell-ring-outline', label: 'Smart Alerts', color: COLORS.purple },
        { icon: 'shield-check-outline', label: 'Secure Auth', color: COLORS.cyan },
    ];

    // Google "G" Logo SVG Component
    const GoogleLogo = () => (
        <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <Path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <Path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <Path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </Svg>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
                    {/* Floating particles */}
                    {particles.map((particle, index) => (
                        <Animated.View
                            key={index}
                            pointerEvents="none"
                            style={[
                                styles.particle,
                                {
                                    left: particle.x,
                                    top: particle.y,
                                    width: particle.size,
                                    height: particle.size,
                                    borderRadius: particle.size / 2,
                                    opacity: particle.opacity,
                                    transform: [{ translateY: particle.translateY }],
                                },
                            ]}
                        />
                    ))}

                    {/* ── Branding ── */}
                    <View style={styles.brandingWrapper}>
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                            <GELogo size={130} animated={true} />
                        </Animated.View>

                        <Animated.View style={[styles.appNameContainer, { opacity: titleAnim }]}>
                            <Text style={styles.appNamePurple}>Geo</Text>
                            <Text style={styles.appNameCyan}>Engage</Text>
                        </Animated.View>

                        <Animated.Text style={[styles.tagline, { opacity: tagAnim }]}>
                            Navigate Indoors. Discover More.
                        </Animated.Text>

                        {/* Feature pills */}
                        <Animated.View style={[styles.pillsRow, { opacity: tagAnim }]}>
                            {features.map((f, i) => (
                                <View key={i} style={styles.pill}>
                                    <Icon name={f.icon} size={13} color={f.color} />
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
                                        <GoogleLogo />
                                    </View>
                                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                                    <Icon name="arrow-right" size={18} color="#64748B" style={styles.arrowIcon} />
                                </>
                            )}
                        </TouchableOpacity>

                        <Animated.Text style={[styles.termsText, { opacity: termsAnim }]}>
                            By continuing, you agree to our{' '}
                            <Text style={styles.linkText}>Terms</Text> and{' '}
                            <Text style={styles.linkText}>Privacy Policy</Text>
                        </Animated.Text>
                    </Animated.View>

                    {/* Custom Alert */}
                    <alert.AlertComponent />
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: 40,
    },

    // ── Particles ──
    particle: {
        position: 'absolute',
        backgroundColor: COLORS.cyan,
    },

    // ── Branding ──
    brandingWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    appNameContainer: {
        flexDirection: 'row',
        marginTop: 16,
        marginBottom: 8,
    },
    appNamePurple: {
        fontSize: 34,
        fontWeight: '800',
        color: COLORS.purple,
        letterSpacing: 0.5,
    },
    appNameCyan: {
        fontSize: 34,
        fontWeight: '800',
        color: COLORS.cyan,
        letterSpacing: 0.5,
    },
    tagline: {
        fontSize: 15,
        color: COLORS.textGray,
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
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    pillText: {
        fontSize: 12,
        color: COLORS.textGray,
        fontWeight: '500',
    },

    // ── Sign-In ──
    signInSection: {
        paddingHorizontal: 24,
    },
    signInHeading: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: 4,
    },
    signInSub: {
        fontSize: 13,
        color: COLORS.textDark,
        marginBottom: 24,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
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
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        letterSpacing: 0.2,
    },
    arrowIcon: {
        opacity: 0.5,
    },
    termsText: {
        fontSize: 12,
        color: COLORS.textDark,
        textAlign: 'center',
        marginTop: 18,
        lineHeight: 18,
    },
    linkText: {
        color: COLORS.cyan,
        fontWeight: '600',
    },
});
