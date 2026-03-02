import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from 'react-native-paper';
import auth from '@react-native-firebase/auth';
import { signOut } from '../services/AuthService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ProfileScreen({ navigation }) {
    const user = auth().currentUser;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]).start();
    }, []);

    // ── All logic unchanged ───────────────────────────────────────────────────
    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                        } catch (error) {
                            Alert.alert('Sign-Out Failed', error.message);
                        }
                    },
                },
            ],
        );
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(parseInt(timestamp));
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // ── Data rows ─────────────────────────────────────────────────────────────
    const accountRows = [
        {
            icon: 'identifier',
            label: 'User ID',
            value: user?.uid ? `${user.uid.slice(0, 12)}…` : 'N/A',
            fullValue: user?.uid,
            iconColor: '#63b3ed',
        },
        {
            icon: user?.emailVerified ? 'check-decagram' : 'alert-decagram',
            label: 'Email Verified',
            value: user?.emailVerified ? 'Verified' : 'Not Verified',
            iconColor: user?.emailVerified ? '#22c55e' : '#fbbf24',
            badge: user?.emailVerified,
        },
        {
            icon: 'calendar-plus',
            label: 'Account Created',
            value: formatDate(user?.metadata?.creationTime),
            iconColor: '#a78bfa',
        },
        {
            icon: 'clock-check-outline',
            label: 'Last Sign In',
            value: formatDate(user?.metadata?.lastSignInTime),
            iconColor: '#34d399',
        },
    ];

    const appRows = [
        { icon: 'tag-outline', label: 'Version', value: '1.0.0', iconColor: '#63b3ed' },
        { icon: 'package-variant-closed', label: 'Build', value: 'Phase 1 — MVP', iconColor: '#f59e0b' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="arrow-left" size={22} color="#94a3b8" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* ── Avatar section ──────────────────────────────────── */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarRing}>
                            {user?.photoURL ? (
                                <Avatar.Image
                                    size={92}
                                    source={{ uri: user.photoURL }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <Avatar.Text
                                    size={92}
                                    label={user?.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                                    style={styles.avatar}
                                    color="#ffffff"
                                />
                            )}
                        </View>

                        <Text style={styles.displayName}>{user?.displayName || 'User'}</Text>
                        <Text style={styles.email}>{user?.email}</Text>

                        {/* Email verified pill */}
                        <View style={[
                            styles.verifiedPill,
                            user?.emailVerified && styles.verifiedPillActive,
                        ]}>
                            <Icon
                                name={user?.emailVerified ? 'check-circle' : 'alert-circle'}
                                size={13}
                                color={user?.emailVerified ? '#22c55e' : '#fbbf24'}
                            />
                            <Text style={[
                                styles.verifiedPillText,
                                user?.emailVerified && styles.verifiedPillTextActive,
                            ]}>
                                {user?.emailVerified ? 'Email verified' : 'Email not verified'}
                            </Text>
                        </View>
                    </View>

                    {/* ── Account info card ───────────────────────────────── */}
                    <View style={styles.sectionLabel}>
                        <Icon name="account-outline" size={13} color="#4a5568" />
                        <Text style={styles.sectionLabelText}>Account Information</Text>
                    </View>
                    <View style={styles.card}>
                        {accountRows.map((row, i) => (
                            <View key={i} style={[styles.row, i < accountRows.length - 1 && styles.rowBorder]}>
                                <View style={[styles.rowIcon, { backgroundColor: `${row.iconColor}14` }]}>
                                    <Icon name={row.icon} size={18} color={row.iconColor} />
                                </View>
                                <View style={styles.rowContent}>
                                    <Text style={styles.rowLabel}>{row.label}</Text>
                                    <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
                                </View>
                                {row.badge !== undefined && (
                                    <View style={[styles.badgePill, row.badge ? styles.badgePillGreen : styles.badgePillYellow]}>
                                        <Text style={[styles.badgeText, row.badge ? styles.badgeTextGreen : styles.badgeTextYellow]}>
                                            {row.badge ? '✓' : '!'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* ── App info card ────────────────────────────────────── */}
                    <View style={styles.sectionLabel}>
                        <Icon name="information-outline" size={13} color="#4a5568" />
                        <Text style={styles.sectionLabelText}>App Information</Text>
                    </View>
                    <View style={styles.card}>
                        {appRows.map((row, i) => (
                            <View key={i} style={[styles.row, i < appRows.length - 1 && styles.rowBorder]}>
                                <View style={[styles.rowIcon, { backgroundColor: `${row.iconColor}14` }]}>
                                    <Icon name={row.icon} size={18} color={row.iconColor} />
                                </View>
                                <View style={styles.rowContent}>
                                    <Text style={styles.rowLabel}>{row.label}</Text>
                                    <Text style={styles.rowValue}>{row.value}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* ── Sign Out button ─────────────────────────────────── */}
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                        activeOpacity={0.85}
                    >
                        <View style={styles.signOutIconWrap}>
                            <Icon name="logout-variant" size={18} color="#ef4444" />
                        </View>
                        <Text style={styles.signOutText}>Sign Out</Text>
                        <Icon name="chevron-right" size={18} color="#4a5568" />
                    </TouchableOpacity>

                    <View style={styles.bottomSpacer} />
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d1117',
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1e2d3d',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#131c2c',
        borderWidth: 1,
        borderColor: '#1e2d3d',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#e2e8f0',
        letterSpacing: 0.3,
    },
    headerSpacer: { width: 36 },

    // ── Scroll ──
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

    // ── Avatar section ──
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    avatarRing: {
        padding: 3,
        borderRadius: 60,
        borderWidth: 1.5,
        borderColor: '#1e2d3d',
        marginBottom: 16,
        shadowColor: '#63b3ed',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    avatar: { backgroundColor: '#131c2c' },
    displayName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#e2e8f0',
        marginBottom: 4,
    },
    email: {
        fontSize: 13,
        color: '#4a5568',
        marginBottom: 14,
    },
    verifiedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1e2d3d',
        backgroundColor: '#131c2c',
    },
    verifiedPillActive: {
        borderColor: 'rgba(34, 197, 94, 0.25)',
        backgroundColor: 'rgba(34, 197, 94, 0.06)',
    },
    verifiedPillText: {
        fontSize: 12,
        color: '#4a5568',
        fontWeight: '500',
    },
    verifiedPillTextActive: {
        color: '#22c55e',
    },

    // ── Section label ──
    sectionLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        marginTop: 4,
        paddingLeft: 2,
    },
    sectionLabelText: {
        fontSize: 11,
        color: '#4a5568',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.9,
    },

    // ── Card ──
    card: {
        backgroundColor: '#131c2c',
        borderWidth: 1,
        borderColor: '#1e2d3d',
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 13,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#1e2d3d',
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowContent: { flex: 1 },
    rowLabel: {
        fontSize: 12,
        color: '#4a5568',
        fontWeight: '500',
        marginBottom: 2,
    },
    rowValue: {
        fontSize: 14,
        color: '#cbd5e1',
        fontWeight: '500',
    },
    badgePill: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgePillGreen: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
    badgePillYellow: { backgroundColor: 'rgba(251, 191, 36, 0.15)' },
    badgeText: { fontSize: 12, fontWeight: '700' },
    badgeTextGreen: { color: '#22c55e' },
    badgeTextYellow: { color: '#fbbf24' },

    // ── Sign Out ──
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#131c2c',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 12,
        marginBottom: 8,
    },
    signOutIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    signOutText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#ef4444',
    },
    bottomSpacer: { height: 24 },
});
