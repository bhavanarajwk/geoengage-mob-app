import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  G,
  Text as SvgText,
} from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * GELogo - Custom stylized GeoEngage logo
 *
 * Features:
 * - Modern stylized "GE" letters with rounded edges
 * - Location pin dot inside the G curve
 * - Purple→Cyan gradient fill
 * - Pulsing animation on the location dot
 * - Optional tagline text
 */
const GELogo = ({
  size = 120,
  animated = true,
  showText = false,
  showTagline = false,
  gradientStart = '#8B5CF6',
  gradientEnd = '#06B6D4',
}) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (animated) {
      // Pulse animation for the location dot
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.3,
              duration: 1000,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.6,
              duration: 1000,
              useNativeDriver: false,
            }),
          ]),
        ]),
      ).start();
    }
  }, [animated, pulseAnim, glowAnim]);

  // Calculate dimensions
  const viewBoxSize = 230;
  const scale = size / viewBoxSize;
  const textHeight = showText ? 35 : 0;
  const taglineHeight = showTagline ? 20 : 0;
  const totalHeight = size + textHeight + taglineHeight;

  // SVG paths for stylized G and E - BOLD/THICK version
  // G - Bold rounded G with space for blue dot
  const gPath = `
    M 80 25
    C 30 25, 5 55, 5 100
    C 5 145, 30 175, 80 175
    C 115 175, 140 155, 145 125
    L 145 95
    L 85 95
    L 85 115
    L 120 115
    C 115 145, 100 155, 80 155
    C 45 155, 25 130, 25 100
    C 25 70, 45 45, 80 45
    C 100 45, 118 55, 130 72
    L 148 55
    C 132 32, 108 25, 80 25
    Z
  `;

  // E - Bold stylized E
  const ePath = `
    M 165 25
    L 165 175
    L 220 175
    L 220 155
    L 190 155
    L 190 110
    L 215 110
    L 215 90
    L 190 90
    L 190 45
    L 220 45
    L 220 25
    Z
  `;

  // Blue dot position inside G (centered in the G's inner curve)
  const dotCenterX = 58;
  const dotCenterY = 100;

  return (
    <View style={[styles.container, {width: size, height: totalHeight}]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        <Defs>
          {/* Main gradient for letters */}
          <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientStart} />
            <Stop offset="100%" stopColor={gradientEnd} />
          </LinearGradient>

          {/* Glow gradient for pin */}
          <LinearGradient id="pinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="50%" stopColor={gradientEnd} />
            <Stop offset="100%" stopColor={gradientStart} />
          </LinearGradient>

          {/* Accent gradient */}
          <LinearGradient
            id="accentGradient"
            x1="0%"
            y1="100%"
            x2="100%"
            y2="0%">
            <Stop offset="0%" stopColor={gradientEnd} />
            <Stop offset="100%" stopColor={gradientStart} />
          </LinearGradient>
        </Defs>

        <G>
          {/* Shadow/glow layer */}
          <Path
            d={gPath}
            fill="rgba(139, 92, 246, 0.3)"
            transform="translate(2, 2)"
          />
          <Path
            d={ePath}
            fill="rgba(6, 182, 212, 0.3)"
            transform="translate(2, 2)"
          />

          {/* Main G letter */}
          <Path d={gPath} fill="url(#logoGradient)" />

          {/* Main E letter */}
          <Path d={ePath} fill="url(#logoGradient)" />

          {/* Pulsing blue dot inside G - like map BlueDot */}
          {/* Outer pulse ring 2 */}
          {animated && (
            <AnimatedCircle
              cx={dotCenterX}
              cy={dotCenterY}
              r={pulseAnim.interpolate({
                inputRange: [1, 1.3],
                outputRange: [20, 32],
              })}
              fill="none"
              stroke={gradientEnd}
              strokeWidth="1.5"
              opacity={glowAnim.interpolate({
                inputRange: [0, 0.6],
                outputRange: [0, 0.3],
              })}
            />
          )}

          {/* Outer pulse ring 1 */}
          {animated && (
            <AnimatedCircle
              cx={dotCenterX}
              cy={dotCenterY}
              r={pulseAnim.interpolate({
                inputRange: [1, 1.3],
                outputRange: [14, 24],
              })}
              fill="none"
              stroke={gradientEnd}
              strokeWidth="2"
              opacity={glowAnim}
            />
          )}

          {/* Blue dot outer glow */}
          <Circle cx={dotCenterX} cy={dotCenterY} r="12" fill="rgba(6, 182, 212, 0.3)" />
          
          {/* Blue dot main circle */}
          <Circle cx={dotCenterX} cy={dotCenterY} r="9" fill={gradientEnd} />
          
          {/* Blue dot inner highlight */}
          <Circle cx={dotCenterX - 2} cy={dotCenterY - 2} r="2.5" fill="rgba(255, 255, 255, 0.6)" />
        </G>
      </Svg>

      {/* GeoEngage text */}
      {showText && (
        <View style={styles.textContainer}>
          <Svg width={size} height={35} viewBox="0 0 200 40">
            <Defs>
              <LinearGradient
                id="textGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%">
                <Stop offset="0%" stopColor={gradientStart} />
                <Stop offset="100%" stopColor={gradientEnd} />
              </LinearGradient>
            </Defs>
            <SvgText
              x="100"
              y="28"
              textAnchor="middle"
              fill="url(#textGradient)"
              fontSize="24"
              fontWeight="bold"
              fontFamily="System">
              GeoEngage
            </SvgText>
          </Svg>
        </View>
      )}

      {/* Tagline */}
      {showTagline && (
        <View style={styles.taglineContainer}>
          <Svg width={size * 1.5} height={20} viewBox="0 0 300 25">
            <SvgText
              x="150"
              y="18"
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="14"
              fontFamily="System">
              Navigate Indoors. Discover More.
            </SvgText>
          </Svg>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginTop: 5,
    alignItems: 'center',
  },
  taglineContainer: {
    marginTop: 2,
    alignItems: 'center',
  },
});

export default GELogo;
