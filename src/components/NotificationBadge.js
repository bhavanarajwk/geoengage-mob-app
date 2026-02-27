import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * NotificationBadge - Animated badge component for notification count
 * @param {number} count - Number of unread notifications
 * @param {object} style - Additional styles
 */
export default function NotificationBadge({ count = 0, style }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Animate when count changes
    useEffect(() => {
        if (count > 0) {
            Animated.sequence([
                Animated.spring(scaleAnim, {
                    toValue: 1.3,
                    friction: 3,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 3,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [count]);

    if (count === 0) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.badge,
                style,
                {
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <Text style={styles.badgeText}>
                {count > 99 ? '99+' : count}
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#dc2626',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        borderWidth: 2,
        borderColor: '#1a1a2e',
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
});
