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
                            <Icon name="map-marker" size={12} color="#64748b" />
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
        backgroundColor: '#161b22',
        borderWidth: 1,
        borderColor: '#30363d',
        paddingVertical: 20,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
    textWrap: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#e2e8f0',
        marginBottom: 2,
    },
    message: {
        fontSize: 14,
        color: '#94a3b8',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        color: '#64748b',
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
        color: '#64748b',
        fontWeight: '500',
    },
    actionPrimary: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#3b82f6',
    },
    actionPrimaryText: {
        fontSize: 11,
        color: '#ffffff',
        fontWeight: '600',
    },
});

