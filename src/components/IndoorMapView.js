import React, { useRef, useState, useEffect } from 'react';
import { View, Image, StyleSheet, Animated, TouchableOpacity, Text, LayoutChangeEvent } from 'react-native';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BlueDot from './BlueDot';

type FloorPlan = {
  url: string;
  width: number;
  height: number;
} | null;

type UserLocation = {
  pixelX: number | null;
  pixelY: number | null;
};

type Props = {
  floorPlan: FloorPlan;
  userLocation: UserLocation;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export default function IndoorMapView({ floorPlan, userLocation }: Props) {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const lastScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });

  const onViewportLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewportSize({ width, height });
  };

  // Reset transforms when floor plan changes (Issue #39)
  useEffect(() => {
    if (floorPlan) {
      console.log('[IndoorMapView] Floor plan changed, resetting transforms');
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      lastScale.current = 1;
      lastTranslate.current = { x: 0, y: 0 };
    }
  }, [floorPlan?.url]);

  // Calculate pan boundaries based on current scale (Issue #40)
  const calculatePanBoundaries = (currentScale: number) => {
    if (!floorPlan || !viewportSize.width || !viewportSize.height) {
      return { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
    }

    const scaledWidth = floorPlan.width * currentScale;
    const scaledHeight = floorPlan.height * currentScale;

    // Allow panning only while keeping some portion of map visible
    const maxX = Math.max(0, (scaledWidth - viewportSize.width) / 2);
    const minX = -maxX;
    const maxY = Math.max(0, (scaledHeight - viewportSize.height) / 2);
    const minY = -maxY;

    return { minX, maxX, minY, maxY };
  };

  const handlePanGestureEvent = (event) => {
    const { translationX, translationY } = event.nativeEvent;
    
    // Calculate new position
    const newX = lastTranslate.current.x + translationX;
    const newY = lastTranslate.current.y + translationY;

    // Enforce boundaries (Issue #40)
    const boundaries = calculatePanBoundaries(lastScale.current);
    const clampedX = Math.max(boundaries.minX, Math.min(boundaries.maxX, newX));
    const clampedY = Math.max(boundaries.minY, Math.min(boundaries.maxY, newY));

    translateX.setValue(clampedX);
    translateY.setValue(clampedY);
  };

  const handlePanStateChange = (event) => {
    const { state, translationX, translationY } = event.nativeEvent;
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      // Calculate and clamp final position
      const newX = lastTranslate.current.x + translationX;
      const newY = lastTranslate.current.y + translationY;
      
      const boundaries = calculatePanBoundaries(lastScale.current);
      const clampedX = Math.max(boundaries.minX, Math.min(boundaries.maxX, newX));
      const clampedY = Math.max(boundaries.minY, Math.min(boundaries.maxY, newY));

      lastTranslate.current = { x: clampedX, y: clampedY };
    }
  };

  const handlePinchGestureEvent = (event) => {
    const { scale: pinchScale } = event.nativeEvent;
    let nextScale = lastScale.current * pinchScale;
    nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
    scale.setValue(nextScale);
  };

  const handlePinchStateChange = (event) => {
    const { state, scale: pinchScale } = event.nativeEvent;
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      let nextScale = lastScale.current * pinchScale;
      nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
      lastScale.current = nextScale;
      scale.setValue(nextScale);
    }
  };

  const handleRecenter = () => {
    if (!floorPlan || userLocation.pixelX == null || userLocation.pixelY == null) return;
    if (!viewportSize.width || !viewportSize.height) return;

    // Use current scale (Issue #41 - improved scale tracking)
    const s = lastScale.current;
    const ux = userLocation.pixelX;
    const uy = userLocation.pixelY;

    const cx = viewportSize.width / 2;
    const cy = viewportSize.height / 2;

    const targetTx = cx - s * ux;
    const targetTy = cy - s * uy;

    // Enforce boundaries even for recenter
    const boundaries = calculatePanBoundaries(s);
    const clampedTx = Math.max(boundaries.minX, Math.min(boundaries.maxX, targetTx));
    const clampedTy = Math.max(boundaries.minY, Math.min(boundaries.maxY, targetTy));

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: clampedTx,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: clampedTy,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      lastTranslate.current = { x: clampedTx, y: clampedTy };
    });
  };

  if (!floorPlan) {
    return null;
  }

  return (
    <View style={styles.viewport} onLayout={onViewportLayout}>
      <PanGestureHandler
        onGestureEvent={handlePanGestureEvent}
        onHandlerStateChange={handlePanStateChange}
      >
        <Animated.View style={styles.gestureWrapper}>
          <PinchGestureHandler
            onGestureEvent={handlePinchGestureEvent}
            onHandlerStateChange={handlePinchStateChange}
          >
            <Animated.View
              style={[
                styles.mapContent,
                {
                  width: floorPlan.width,
                  height: floorPlan.height,
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri: floorPlan.url }}
                style={{ width: floorPlan.width, height: floorPlan.height }}
              />
              {userLocation.pixelX != null && userLocation.pixelY != null && (
                <BlueDot 
                  x={userLocation.pixelX} 
                  y={userLocation.pixelY} 
                  size={24}
                  accuracy={userLocation.accuracy || 5}
                />
              )}
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>

      <TouchableOpacity 
        style={styles.recenterButton} 
        onPress={handleRecenter} 
        activeOpacity={0.8}
      >
        <Icon name="target" size={20} color="#63b3ed" />
        <Text style={styles.recenterText}>Recenter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 18,
  },
  gestureWrapper: {
    flex: 1,
  },
  mapContent: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  recenterButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#131c2c',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#1e3a5f',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  recenterText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

