import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { signInWithGoogle } from '../services/AuthService';
import FCMService from '../services/FCMService';
import APIService from '../services/APIService';

export default function AuthScreen() {
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            // Step 1: Authenticate with Google + Firebase
            await signInWithGoogle();

            // Step 2: Request notification permission and get FCM token
            const fcmToken = await FCMService.requestPermissionAndGetToken();

            // Step 3: Register device with backend
            if (fcmToken) {
                try {
                    await APIService.post('/register-device', { fcm_token: fcmToken });
                    console.log('[Auth] Device registered with FCM token.');
                } catch (apiErr) {
                    // Backend may not be live in Phase 1 — non-fatal
                    console.warn('[Auth] /register-device failed (backend may be down):', apiErr.message);
                }
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
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

            {/* Header / Branding */}
            <View style={styles.brandingContainer}>
                <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>GE</Text>
                </View>
                <Text style={styles.appName}>GeoEngage</Text>
                <Text style={styles.tagline}>
                    Smart indoor experiences,{'\n'}delivered to your device.
                </Text>
            </View>

            {/* Sign-In Section */}
            <View style={styles.signInContainer}>
                <TouchableOpacity
                    style={[styles.googleButton, loading && styles.googleButtonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                    activeOpacity={0.85}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#4285F4" />
                    ) : (
                        <>
                            {/* Google "G" logo placeholder */}
                            <View style={styles.googleIconContainer}>
                                <Text style={styles.googleIcon}>G</Text>
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
            </View>
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
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#0f3460',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#e94560',
        elevation: 8,
        shadowColor: '#e94560',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#e94560',
        letterSpacing: 1,
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
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4285F4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    googleIcon: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
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
