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
  const viewBoxSize = 200;
  const scale = size / viewBoxSize;
  const textHeight = showText ? 35 : 0;
  const taglineHeight = showTagline ? 20 : 0;
  const totalHeight = size + textHeight + taglineHeight;

  // SVG paths for stylized G and E
  // G - Modern rounded G with open bottom for location dot
  const gPath = `
    M 85 40
    C 45 40, 20 70, 20 100
    C 20 130, 45 160, 85 160
    C 110 160, 130 145, 140 125
    L 140 105
    L 95 105
    L 95 115
    L 125 115
    C 118 135, 103 145, 85 145
    C 55 145, 35 125, 35 100
    C 35 75, 55 55, 85 55
    C 100 55, 115 62, 125 75
    L 138 65
    C 125 48, 107 40, 85 40
    Z
  `;

  // E - Modern stylized E with rounded edges
  const ePath = `
    M 150 40
    L 150 160
    L 195 160
    L 195 145
    L 165 145
    L 165 107
    L 190 107
    L 190 92
    L 165 92
    L 165 55
    L 195 55
    L 195 40
    Z
  `;

  // Location pin shape inside G
  const pinPath = `
    M 75 85
    C 60 85, 50 95, 50 110
    C 50 130, 75 150, 75 150
    C 75 150, 100 130, 100 110
    C 100 95, 90 85, 75 85
    Z
  `;

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

          {/* Location pin inside G */}
          <Path d={pinPath} fill="url(#pinGradient)" opacity={0.9} />

          {/* Animated pulse ring around pin dot */}
          {animated && (
            <AnimatedCircle
              cx="75"
              cy="110"
              r={pulseAnim.interpolate({
                inputRange: [1, 1.3],
                outputRange: [12, 18],
              })}
              fill="none"
              stroke={gradientEnd}
              strokeWidth="2"
              opacity={glowAnim}
            />
          )}

          {/* Center dot of pin */}
          <Circle cx="75" cy="110" r="8" fill="#FFFFFF" />
          <Circle cx="75" cy="110" r="5" fill={gradientEnd} />

          {/* Decorative accent line on E */}
          <Path
            d="M 152 98 L 188 98"
            stroke="url(#accentGradient)"
            strokeWidth="4"
            strokeLinecap="round"
          />
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
