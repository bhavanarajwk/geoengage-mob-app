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
    Alert,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ZoneService from '../services/ZoneService';

export default function NotificationHistoryScreen({ navigation }) {
    const [refreshing, setRefreshing] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
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

        // Load zone history on mount
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const entries = await ZoneService.getZoneHistory();
            setHistory(entries);
        } catch (error) {
            console.error('Failed to load zone history:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadHistory();
        setRefreshing(false);
    };

    const handleClearHistory = () => {
        Alert.alert(
            'Clear History',
            'Are you sure you want to clear all zone visit history?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ZoneService.clearHistory();
                            setHistory([]);
                        } catch (error) {
                            console.error('Failed to clear history:', error);
                            Alert.alert('Error', 'Failed to clear history');
                        }
                    },
                },
            ]
        );
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }
        
        // Less than 1 hour
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `${mins} min${mins > 1 ? 's' : ''} ago`;
        }
        
        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
        
        // Less than 7 days
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
        
        // Format as date
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
        });
    };

    const formatFullDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderHistoryItem = ({ item, index }) => (
        <Animated.View 
            style={[
                styles.historyItem,
                index === 0 && styles.firstItem,
            ]}
        >
            <View style={styles.historyIconContainer}>
                <Icon name="map-marker-circle" size={24} color="#16a34a" />
            </View>
            <View style={styles.historyContent}>
                <Text style={styles.zoneName}>{item.zoneName}</Text>
                <View style={styles.historyMeta}>
                    {item.floorLevel !== null && (
                        <View style={styles.floorBadge}>
                            <Icon name="stairs" size={12} color="#a8a8b3" />
                            <Text style={styles.floorText}>Floor {item.floorLevel}</Text>
                        </View>
                    )}
                    <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                </View>
            </View>
            <Text style={styles.timeDetail}>{formatFullDate(item.timestamp)}</Text>
        </Animated.View>
    );

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
                <Text style={styles.headerTitle}>Zone History</Text>
                {history.length > 0 && (
                    <TouchableOpacity 
                        onPress={handleClearHistory}
                        style={styles.clearBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="delete-outline" size={22} color="#ef4444" />
                    </TouchableOpacity>
                )}
                {history.length === 0 && <View style={styles.headerSpacer} />}
            </View>

            {/* Content */}
            {history.length > 0 ? (
                <FlatList
                    data={history}
                    renderItem={renderHistoryItem}
                    keyExtractor={(item, index) => `${item.zoneId}-${item.timestamp}-${index}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#ffffff"
                            colors={['#ffffff']}
                            progressBackgroundColor="#0f3460"
                        />
                    }
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            ) : (
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
                            <Icon name="map-marker-off-outline" size={48} color="#a8a8b3" />
                        </View>
                        <Text style={styles.emptyTitle}>No zone visits yet</Text>
                        <Text style={styles.emptyText}>
                            Your zone entry history will{'\n'}appear here when you visit zones.
                        </Text>
                        <View style={styles.hintContainer}>
                            <Icon name="gesture-swipe-down" size={20} color="#6b7280" />
                            <Text style={styles.hintText}>Pull down to refresh</Text>
                        </View>
                    </Animated.View>
                </ScrollView>
            )}
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
    clearBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingVertical: 12,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#0f3460',
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
    },
    firstItem: {
        marginTop: 12,
    },
    historyIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    historyContent: {
        flex: 1,
    },
    zoneName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 4,
    },
    historyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    floorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(168, 168, 179, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    floorText: {
        fontSize: 11,
        color: '#a8a8b3',
        fontWeight: '500',
    },
    timestamp: {
        fontSize: 12,
        color: '#6b7280',
    },
    timeDetail: {
        fontSize: 11,
        color: '#6b7280',
        fontWeight: '500',
    },
    separator: {
        height: 0,
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
