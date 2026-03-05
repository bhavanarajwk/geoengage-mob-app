import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width, height} = Dimensions.get('window');

// Colors
const COLORS = {
  gradientStart: '#0F172A',
  gradientEnd: '#1E293B',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  textGray: '#94A3B8',
  white: '#FFFFFF',
  dotInactive: '#334155',
};

// Onboarding slides data
const SLIDES = [
  {
    id: '1',
    icon: 'map-marker-radius',
    title: 'Real-Time Indoor Location',
    description:
      'Navigate seamlessly inside buildings with precise indoor positioning technology.',
    iconColor: COLORS.cyan,
  },
  {
    id: '2',
    icon: 'bell-ring',
    title: 'Context-Aware Notifications',
    description:
      'Receive relevant alerts based on your location within the venue. Never miss important updates.',
    iconColor: COLORS.purple,
  },
  {
    id: '3',
    icon: 'shield-check',
    title: 'Your Privacy Matters',
    description:
      'Location data stays on your device. You are always in control of your information.',
    iconColor: COLORS.cyan,
  },
];

/**
 * OnboardingScreen - First-time user onboarding carousel
 *
 * Features:
 * - 3 swipeable slides
 * - Animated dot indicators
 * - Skip button to bypass
 * - Get Started button on final slide
 * - Saves completion to AsyncStorage
 */
const OnboardingScreen = (props) => {
  const {navigation} = props;
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Handle slide change
  const onViewableItemsChanged = useRef(({viewableItems}) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Complete onboarding
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      navigation.replace('Auth');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      navigation.replace('Auth');
    }
  };

  // Skip onboarding
  const handleSkip = () => {
    completeOnboarding();
  };

  // Go to next slide or complete
  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  // Render individual slide
  const renderSlide = ({item, index}) => {
    return (
      <View style={styles.slide}>
        {/* Icon with glow effect */}
        <View style={styles.iconContainer}>
          <View
            style={[
              styles.iconGlow,
              {
                backgroundColor:
                  item.iconColor === COLORS.cyan
                    ? 'rgba(6, 182, 212, 0.15)'
                    : 'rgba(139, 92, 246, 0.15)',
              },
            ]}
          />
          <View
            style={[
              styles.iconCircle,
              {
                borderColor: item.iconColor,
              },
            ]}>
            <Icon name={item.icon} size={60} color={item.iconColor} />
          </View>
        </View>

        {/* Title with gradient effect */}
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              {
                color: index % 2 === 0 ? COLORS.cyan : COLORS.purple,
              },
            ]}>
            {item.title}
          </Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  // Render dot indicators
  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          const dotColor = scrollX.interpolate({
            inputRange,
            outputRange: [COLORS.dotInactive, COLORS.cyan, COLORS.dotInactive],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: dotColor,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

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
        {/* Skip button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {x: scrollX}}}],
            {useNativeDriver: false},
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
        />

        {/* Bottom section */}
        <View style={styles.bottomContainer}>
          {/* Dot indicators */}
          {renderDots()}

          {/* Next / Get Started button */}
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.purple, COLORS.cyan]}
              style={styles.nextButtonGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}>
              <Text style={styles.nextButtonText}>
                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              {currentIndex < SLIDES.length - 1 && (
                <Icon
                  name="arrow-right"
                  size={20}
                  color={COLORS.white}
                  style={styles.nextIcon}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: COLORS.textGray,
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: height * 0.15,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  iconGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: COLORS.textGray,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  bottomContainer: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    width: width * 0.8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  nextIcon: {
    marginLeft: 8,
  },
});

export default OnboardingScreen;
