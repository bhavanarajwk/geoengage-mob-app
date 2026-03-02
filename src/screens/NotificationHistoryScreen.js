import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ZoneService from '../services/ZoneService';

export default function NotificationHistoryScreen({ navigation }) {
    const [refreshing, setRefreshing] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    // Multi-select state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    // Bottom action bar slide-up animation
    const actionBarAnim = useRef(new Animated.Value(80)).current;

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

        loadHistory();
    }, []);

    // Animate action bar in/out when selectionMode changes
    useEffect(() => {
        Animated.spring(actionBarAnim, {
            toValue: selectionMode ? 0 : 80,
            useNativeDriver: true,
            tension: 60,
            friction: 10,
        }).start();
    }, [selectionMode]);

    // ─── DATA LOGIC (untouched) ───────────────────────────────────────────────

    const loadHistory = async () => {
        try {
            setLoading(true);
            const entries = await ZoneService.getZoneHistory(50, 0);
            setHistory(entries);
        } catch (error) {

            Alert.alert('Error', 'Failed to load notification history. Please try again.');
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
            'Clear All History',
            'Are you sure you want to clear all zone visit history?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ZoneService.clearHistory();
                            setHistory([]);
                            exitSelectionMode();
                        } catch (error) {

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

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `${mins} min${mins > 1 ? 's' : ''} ago`;
        }
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
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

    // ─── SELECTION LOGIC ──────────────────────────────────────────────────────

    const exitSelectionMode = useCallback(() => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    }, []);

    const handleLongPress = useCallback((itemKey) => {
        setSelectionMode(true);
        setSelectedIds(new Set([itemKey]));
    }, []);

    const handleTapInSelection = useCallback((itemKey) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(itemKey)) {
                next.delete(itemKey);
                if (next.size === 0) {
                    // Delay so state settles before exiting
                    setTimeout(() => setSelectionMode(false), 0);
                }
            } else {
                next.add(itemKey);
            }
            return next;
        });
    }, []);

    const handleDeleteSelected = () => {
        Alert.alert(
            'Delete Selected',
            `Delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setHistory(prev =>
                            prev.filter((item, index) => {
                                const key = `${item.zoneId}-${item.timestamp}-${index}`;
                                return !selectedIds.has(key);
                            })
                        );
                        exitSelectionMode();
                    },
                },
            ]
        );
    };

    const handleDeleteSingle = (itemKey) => {
        setHistory(prev =>
            prev.filter((item, index) => {
                const key = `${item.zoneId}-${item.timestamp}-${index}`;
                return key !== itemKey;
            })
        );
    };

    const handleSelectAll = () => {
        const allKeys = history.map(
            (item, index) => `${item.zoneId}-${item.timestamp}-${index}`
        );
        setSelectedIds(new Set(allKeys));
    };

    // ─── RENDER ───────────────────────────────────────────────────────────────

    const renderHistoryItem = ({ item, index }) => {
        const itemKey = `${item.zoneId}-${item.timestamp}-${index}`;
        const isSelected = selectedIds.has(itemKey);

        return (
            <Pressable
                onLongPress={() => handleLongPress(itemKey)}
                onPress={() => selectionMode && handleTapInSelection(itemKey)}
                android_ripple={{ color: 'rgba(99, 179, 237, 0.08)' }}
                style={[
                    styles.historyItem,
                    isSelected && styles.historyItemSelected,
                ]}
            >
                {/* Left: checkbox (selection mode) or icon */}
                {selectionMode ? (
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Icon name="check" size={14} color="#0d1117" />}
                    </View>
                ) : (
                    <View style={styles.historyIconContainer}>
                        <Icon name="map-marker-circle" size={24} color="#16a34a" />
                    </View>
                )}

                {/* Content */}
                <View style={styles.historyContent}>
                    <Text style={styles.zoneName} numberOfLines={1}>
                        {item.zoneName}
                    </Text>
                    <View style={styles.historyMeta}>
                        {item.floorLevel !== null && (
                            <View style={styles.floorBadge}>
                                <Icon name="stairs" size={11} color="#7c8db0" />
                                <Text style={styles.floorText}>Floor {item.floorLevel}</Text>
                            </View>
                        )}
                        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                    </View>
                </View>

                {/* Right: date or X button */}
                {selectionMode ? (
                    <Text style={styles.timeDetail}>{formatFullDate(item.timestamp)}</Text>
                ) : (
                    <View style={styles.rightSection}>
                        <Text style={styles.timeDetail}>{formatFullDate(item.timestamp)}</Text>
                        <TouchableOpacity
                            onPress={() => handleDeleteSingle(itemKey)}
                            style={styles.deleteBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Icon name="close" size={16} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                )}
            </Pressable>
        );
    };

    const allSelected = selectedIds.size === history.length && history.length > 0;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                {selectionMode ? (
                    /* Cancel button in selection mode */
                    <TouchableOpacity onPress={exitSelectionMode} style={styles.headerBtn}>
                        <Icon name="close" size={22} color="#94a3b8" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.headerBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="arrow-left" size={22} color="#e2e8f0" />
                    </TouchableOpacity>
                )}

                <Text style={styles.headerTitle}>
                    {selectionMode
                        ? `${selectedIds.size} Selected`
                        : 'Zone History'}
                </Text>

                <View style={styles.headerRight}>
                    {selectionMode && (
                        <TouchableOpacity
                            onPress={allSelected ? exitSelectionMode : handleSelectAll}
                            style={[styles.headerBtn, styles.headerBtnSpaced]}
                        >
                            <Text style={styles.selectAllText}>
                                {allSelected ? 'None' : 'All'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {history.length > 0 && (
                        <TouchableOpacity
                            onPress={handleClearHistory}
                            style={styles.headerBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="delete-outline" size={22} color="#ef4444" />
                        </TouchableOpacity>
                    )}
                    {history.length === 0 && <View style={styles.headerSpacer} />}
                </View>
            </View>

            {/* Subtle count badge */}
            {history.length > 0 && !selectionMode && (
                <View style={styles.countRow}>
                    <Text style={styles.countText}>{history.length} entries</Text>
                </View>
            )}

            {/* ── List / Empty ────────────────────────────────────────────── */}
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
                            tintColor="#63b3ed"
                            colors={['#63b3ed']}
                            progressBackgroundColor="#161b27"
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
                            tintColor="#63b3ed"
                            colors={['#63b3ed']}
                            progressBackgroundColor="#161b27"
                        />
                    }
                >
                    <Animated.View
                        style={[
                            styles.emptyContainer,
                            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                        ]}
                    >
                        <View style={styles.iconCircle}>
                            <Icon name="map-marker-off-outline" size={48} color="#3d5070" />
                        </View>
                        <Text style={styles.emptyTitle}>No zone visits yet</Text>
                        <Text style={styles.emptyText}>
                            Your zone entry history will{'\n'}appear here when you visit zones.
                        </Text>
                        <View style={styles.hintContainer}>
                            <Icon name="gesture-swipe-down" size={18} color="#3d5070" />
                            <Text style={styles.hintText}>Pull down to refresh</Text>
                        </View>
                    </Animated.View>
                </ScrollView>
            )}

            {/* ── Bottom Action Bar (multi-select) ────────────────────────── */}
            <Animated.View
                style={[
                    styles.actionBar,
                    { transform: [{ translateY: actionBarAnim }] },
                ]}
                pointerEvents={selectionMode ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    style={styles.deleteSelectedBtn}
                    onPress={handleDeleteSelected}
                    disabled={selectedIds.size === 0}
                >
                    <Icon name="trash-can-outline" size={18} color="#ffffff" />
                    <Text style={styles.deleteSelectedText}>
                        Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
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
        backgroundColor: '#0d1117',
    },
    headerBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    headerBtnSpaced: {
        marginRight: 4,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#e2e8f0',
        letterSpacing: 0.3,
    },
    headerSpacer: {
        width: 36,
    },
    selectAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#63b3ed',
    },

    // ── Count row ──
    countRow: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    countText: {
        fontSize: 12,
        color: '#4a5568',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },

    // ── List ──
    listContent: {
        paddingBottom: 100,
        paddingTop: 4,
    },
    separator: {
        height: 0,
    },

    // ── History item ──
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#131c2c',
        marginHorizontal: 14,
        marginVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1e2d3d',
    },
    historyItemSelected: {
        backgroundColor: '#0e2a3d',
        borderColor: '#63b3ed',
        shadowColor: '#63b3ed',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },

    // ── Checkbox ──
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#334155',
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    checkboxChecked: {
        backgroundColor: '#63b3ed',
        borderColor: '#63b3ed',
    },

    // ── Icon ──
    historyIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    // ── Content ──
    historyContent: {
        flex: 1,
    },
    zoneName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#e2e8f0',
        marginBottom: 5,
    },
    historyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    floorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(99, 179, 237, 0.08)',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1e303f',
    },
    floorText: {
        fontSize: 10,
        color: '#7c8db0',
        fontWeight: '500',
    },
    timestamp: {
        fontSize: 12,
        color: '#4a5568',
    },

    // ── Right section ──
    rightSection: {
        alignItems: 'flex-end',
        gap: 6,
    },
    timeDetail: {
        fontSize: 11,
        color: '#4a5568',
        fontWeight: '500',
    },
    deleteBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#1e2d3d',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Empty state ──
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
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#131c2c',
        borderWidth: 1,
        borderColor: '#1e2d3d',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#e2e8f0',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#4a5568',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#131c2c',
        borderWidth: 1,
        borderColor: '#1e2d3d',
    },
    hintText: {
        fontSize: 12,
        color: '#4a5568',
        fontWeight: '500',
    },

    // ── Bottom action bar ──
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#131c2c',
        borderTopWidth: 1,
        borderTopColor: '#1e2d3d',
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingBottom: 24,
    },
    deleteSelectedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ef4444',
        borderRadius: 12,
        paddingVertical: 13,
    },
    deleteSelectedText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 0.3,
    },
});
