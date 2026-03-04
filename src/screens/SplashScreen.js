import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import GELogo from '../components/GELogo';

const {width, height} = Dimensions.get('window');

// Colors
const COLORS = {
  gradientStart: '#0F172A', // Dark navy
  gradientEnd: '#1E293B', // Slate
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  textGray: '#94A3B8',
  white: '#FFFFFF',
};

/**
 * SplashScreen - Animated splash screen with GE logo
 *
 * Features:
 * - Dark gradient background
 * - Logo scales up and fades in
 * - Text animates in sequence
 * - 3-second total duration
 * - Floating particles for visual interest
 */
const SplashScreen = (props) => {
  const {onAnimationComplete} = props;
  
  // Store callback in ref to avoid stale closure
  const callbackRef = useRef(onAnimationComplete);
  callbackRef.current = onAnimationComplete;
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array(6)
      .fill(0)
      .map(() => ({
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(0),
      })),
  ).current;

  useEffect(() => {
    // Start particle animations
    particleAnims.forEach((particle, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.parallel([
            Animated.timing(particle.opacity, {
              toValue: 0.3,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateY, {
              toValue: -30,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateY, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    });

    // Main animation sequence
    const animationSequence = Animated.sequence([
      // Phase 1: Logo appears (0-1.0s)
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      // Phase 2: App name fades in (1.0-1.6s)
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),

      // Phase 3: Tagline fades in (1.6-2.2s)
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start();

    // GUARANTEED 4-second timer - independent of animation
    const timer = setTimeout(() => {
      if (callbackRef.current) {
        callbackRef.current();
      }
    }, 4000);

    // Cleanup
    return () => {
      animationSequence.stop();
      clearTimeout(timer);
    };
  }, []); // Empty dependency array - runs only once

  // Particle positions (using numbers for better type safety)
  const particlePositions = [
    {left: width * 0.15, top: height * 0.20, size: 6},
    {left: width * 0.80, top: height * 0.25, size: 8},
    {left: width * 0.25, top: height * 0.65, size: 5},
    {left: width * 0.70, top: height * 0.70, size: 7},
    {left: width * 0.10, top: height * 0.45, size: 4},
    {left: width * 0.85, top: height * 0.50, size: 6},
  ];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.gradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        {/* Floating particles */}
        {particleAnims.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: particlePositions[index].left,
                top: particlePositions[index].top,
                width: particlePositions[index].size,
                height: particlePositions[index].size,
                borderRadius: particlePositions[index].size / 2,
                opacity: particle.opacity,
                transform: [{translateY: particle.translateY}],
              },
            ]}
          />
        ))}

        {/* Main content */}
        <View style={styles.content}>
          {/* Animated logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{scale: logoScale}],
              },
            ]}>
            <GELogo size={180} animated={true} />
          </Animated.View>

          {/* App name with gradient effect (simulated) */}
          <Animated.View style={[styles.textContainer, {opacity: textOpacity}]}>
            <Text style={styles.appNamePurple}>Geo</Text>
            <Text style={styles.appNameCyan}>Engage</Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.Text
            style={[styles.tagline, {opacity: taglineOpacity}]}>
            Navigate Indoors. Discover More.
          </Animated.Text>
        </View>

        {/* Bottom accent line */}
        <Animated.View
          style={[
            styles.bottomAccent,
            {
              opacity: taglineOpacity,
            },
          ]}>
          <LinearGradient
            colors={[COLORS.purple, COLORS.cyan]}
            style={styles.accentLine}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
          />
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    backgroundColor: COLORS.cyan,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  textContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  appNamePurple: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.purple,
    letterSpacing: 1,
  },
  appNameCyan: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.cyan,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textGray,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  bottomAccent: {
    position: 'absolute',
    bottom: 60,
    width: '60%',
    alignItems: 'center',
  },
  accentLine: {
    height: 3,
    width: '100%',
    borderRadius: 2,
  },
});

export default SplashScreen;
