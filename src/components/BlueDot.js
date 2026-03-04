import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

/**
 * BlueDot - Animated position indicator
 * Shows user's current location on the floor plan
 * 
 * Props:
 * @param {number} x - X position on screen
 * @param {number} y - Y position on screen
 * @param {number} size - Dot size (default: 20)
 * @param {boolean} animated - Enable pulse animation (default: true)
 * @param {number} accuracy - Location accuracy in meters (default: 5)
 */
const BlueDot = ({ x, y, size = 20, animated = true, accuracy = 5 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!animated) return;

    // Pulse animation: scale in/out
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Fade animation: opacity in/out
    const fadeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    fadeAnimation.start();

    return () => {
      pulseAnimation.stop();
      fadeAnimation.stop();
    };
  }, [animated, pulseAnim, fadeAnim]);

  if (x === null || y === null || x === undefined || y === undefined) {
    return null; // Don't render if position is not available
  }

  // Scale pulse ring based on accuracy (smaller = more accurate)
  // accuracy: 2-5m = 1x, 5-10m = 1.5x, 10-20m = 2x, 20m+ = 2.5x
  const accuracyScale = Math.min(Math.max(accuracy / 5, 1), 2.5);

  return (
    <View
      style={[
        styles.container,
        {
          left: x - size / 2,
          top: y - size / 2,
        },
      ]}
    >
      {/* Outer pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim.interpolate({
              inputRange: [1, 1.3],
              outputRange: [accuracyScale, accuracyScale * 1.3],
            }) }],
          },
        ]}
      />

      {/* Inner dot */}
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {/* White center */}
        <View
          style={[
            styles.innerDot,
            {
              width: size * 0.4,
              height: size * 0.4,
              borderRadius: size * 0.2,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  dot: {
    backgroundColor: '#007AFF', // iOS blue
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  innerDot: {
    backgroundColor: '#FFFFFF',
  },
});

export default BlueDot;
