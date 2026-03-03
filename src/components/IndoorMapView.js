import React, { useRef, useState } from 'react';
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

  const handlePanGestureEvent = (event) => {
    const { translationX, translationY } = event.nativeEvent;
    translateX.setValue(lastTranslate.current.x + translationX);
    translateY.setValue(lastTranslate.current.y + translationY);
  };

  const handlePanStateChange = (event) => {
    const { state, translationX, translationY } = event.nativeEvent;
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      lastTranslate.current = {
        x: lastTranslate.current.x + translationX,
        y: lastTranslate.current.y + translationY,
      };
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

    const s = lastScale.current;
    const ux = userLocation.pixelX;
    const uy = userLocation.pixelY;

    const cx = viewportSize.width / 2;
    const cy = viewportSize.height / 2;

    const targetTx = cx - s * ux;
    const targetTy = cy - s * uy;

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: targetTx,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: targetTy,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      lastTranslate.current = { x: targetTx, y: targetTy };
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
                <BlueDot x={userLocation.pixelX} y={userLocation.pixelY} size={24} />
              )}
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>

      <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter} activeOpacity={0.85}>
        <Icon name="crosshairs-gps" size={18} color="#e5e7eb" />
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
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  recenterText: {
    fontSize: 11,
    color: '#e5e7eb',
    fontWeight: '500',
  },
});

