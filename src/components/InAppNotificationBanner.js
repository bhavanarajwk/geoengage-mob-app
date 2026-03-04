import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InAppNotificationBanner({
    banner,
    animationValue,
    onDismiss,
    onView,
}) {
    const insets = useSafeAreaInsets();
    const swipeY = useRef(new Animated.Value(0)).current;

    if (!banner) return null;

    const onGestureEvent = Animated.event(
        [{ nativeEvent: { translationY: swipeY } }],
        { useNativeDriver: true }
    );

    const onHandlerStateChange = ({ nativeEvent }) => {
        if (nativeEvent.state === State.END) {
            if (nativeEvent.translationY < -60) {
                // Swiped up enough, dismiss
                onDismiss();
            } else {
                // Snap back
                Animated.spring(swipeY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 8,
                }).start();
            }
        }
    };

    return (
        <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetY={[-5, 5]}
        >
            <Animated.View
                style={[
                    styles.container,
                    {
                        top: insets.top + 16,
                        transform: [
                            {
                                translateY: Animated.add(
                                    animationValue.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-40, 0],
                                    }),
                                    swipeY
                                ),
                            },
                        ],
                        opacity: animationValue,
                    },
                ]}
            >
            <View style={styles.content}>
                <View style={styles.textWrap}>
                    <Text style={styles.title} numberOfLines={1}>
                        {banner.title}
                    </Text>
                    <Text style={styles.message} numberOfLines={2}>
                        {banner.message}
                    </Text>
                    {!!banner.zoneName && (
                        <View style={styles.metaRow}>
                            <Icon name="map-marker" size={12} color="#93c5fd" />
                            <Text style={styles.metaText}>
                                {banner.zoneName}
                                {banner.floor != null ? ` · Floor ${banner.floor}` : ''}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={onDismiss} style={styles.actionGhost}>
                        <Text style={styles.actionGhostText}>Dismiss</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onView} style={styles.actionPrimary}>
                        <Text style={styles.actionPrimaryText}>View</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
        </PanGestureHandler>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 12,
        right: 12,
        zIndex: 30,
    },
    content: {
        borderRadius: 16,
        backgroundColor: '#1d4ed8', // brighter blue to stand out from background
        borderWidth: 1,
        borderColor: '#60a5fa',
        paddingVertical: 20,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    textWrap: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#f9fafb',
        marginBottom: 2,
    },
    message: {
        fontSize: 14,
        color: '#e5efff',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        color: '#93c5fd',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionGhost: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 999,
    },
    actionGhostText: {
        fontSize: 11,
        color: '#9ca3af',
        fontWeight: '500',
    },
    actionPrimary: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#2563eb',
    },
    actionPrimaryText: {
        fontSize: 11,
        color: '#e5e7eb',
        fontWeight: '600',
    },
});

