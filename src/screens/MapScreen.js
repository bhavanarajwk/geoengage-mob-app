import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { signOut } from '../services/AuthService';
import FCMService from '../services/FCMService';

export default function MapScreen({ navigation }) {
    const user = auth().currentUser;

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

            {/* Map Placeholder */}
            <View style={styles.mapPlaceholder}>
                <View style={styles.mapPlaceholderInner}>
                    <Text style={styles.mapIcon}>🗺️</Text>
                    <Text style={styles.mapPlaceholderTitle}>Indoor Map</Text>
                    <Text style={styles.mapPlaceholderText}>
                        IndoorAtlas SDK integration{'\n'}coming in the next phase.
                    </Text>
                </View>
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
    mapPlaceholder: {
        flex: 1,
        borderRadius: 16,
        backgroundColor: '#0f3460',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1e3a5f',
        marginBottom: 20,
    },
    mapPlaceholderInner: {
        alignItems: 'center',
        padding: 32,
    },
    mapIcon: {
        fontSize: 56,
        marginBottom: 16,
    },
    mapPlaceholderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
    },
    mapPlaceholderText: {
        fontSize: 14,
        color: '#a8a8b3',
        textAlign: 'center',
        lineHeight: 20,
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
