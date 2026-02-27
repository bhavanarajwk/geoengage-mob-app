import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    RefreshControl,
    ScrollView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function NotificationHistoryScreen({ navigation }) {
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    // Animate empty state on mount
    useEffect(() => {
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
        ]).start();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        // Simulate API call - replace with actual backend call when ready
        await new Promise(resolve => setTimeout(resolve, 1500));
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="arrow-left" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Scrollable content with pull-to-refresh */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#ffffff"
                        colors={['#ffffff']}
                        progressBackgroundColor="#0f3460"
                    />
                }
            >
                {/* Empty State with animations */}
                <Animated.View 
                    style={[
                        styles.emptyContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={styles.iconCircle}>
                        <Icon name="bell-off-outline" size={48} color="#a8a8b3" />
                    </View>
                    <Text style={styles.emptyTitle}>No notifications yet</Text>
                    <Text style={styles.emptyText}>
                        Notifications from campaigns will{'\n'}appear here when you enter a zone.
                    </Text>
                    <View style={styles.hintContainer}>
                        <Icon name="gesture-swipe-down" size={20} color="#6b7280" />
                        <Text style={styles.hintText}>Pull down to refresh</Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#0f3460',
    },
    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    headerSpacer: {
        width: 36,
    },
    scrollContent: {
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        minHeight: 500,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#0f3460',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#a8a8b3',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
    },
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#0f3460',
    },
    hintText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
});
