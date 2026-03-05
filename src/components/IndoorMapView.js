import React, { useRef, useState, useEffect } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
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
  accuracy?: number;
};

type Props = {
  floorPlan: FloorPlan;
  userLocation: UserLocation;
};

export default function IndoorMapView({ floorPlan, userLocation }: Props) {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const scrollViewRef = useRef(null);

  const onViewportLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setViewportSize({ width, height });
  };

  // Calculate "cover" scale — fills container completely, zero empty space
  useEffect(() => {
    if (floorPlan && viewportSize.width > 0 && viewportSize.height > 0) {
      const scaleX = viewportSize.width / floorPlan.width;
      const scaleY = viewportSize.height / floorPlan.height;
      const calculatedScale = Math.max(scaleX, scaleY);
      setScale(calculatedScale);
      console.log('[IndoorMapView] Cover-scale calculated:', {
        floorPlan: `${floorPlan.width}x${floorPlan.height}`,
        viewport: `${viewportSize.width}x${viewportSize.height}`,
        scaleX: scaleX.toFixed(3),
        scaleY: scaleY.toFixed(3),
        finalScale: calculatedScale.toFixed(3),
      });
    }
  }, [floorPlan?.url, viewportSize.width, viewportSize.height]);

  // Determine scroll direction based on which axis overflows
  const scaledWidth = floorPlan ? floorPlan.width * scale : 0;
  const scaledHeight = floorPlan ? floorPlan.height * scale : 0;
  const needsVerticalScroll = scaledHeight > viewportSize.height;

  // Recenter placeholder — will be implemented in Commit 3
  const handleRecenter = () => {
    console.log('[IndoorMapView] Recenter pressed (will be functional in Commit 3)');
  };

  if (!floorPlan) {
    return null;
  }

  return (
    <View style={styles.viewport} onLayout={onViewportLayout}>
      <ScrollView
        ref={scrollViewRef}
        horizontal={!needsVerticalScroll}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          // Center content on the non-scrolling axis
          needsVerticalScroll
            ? { alignItems: 'center' }
            : { justifyContent: 'center' },
        ]}
      >
        <View
          style={[
            styles.mapContent,
            {
              width: scaledWidth,
              height: scaledHeight,
            },
          ]}
        >
          <Image
            source={{ uri: floorPlan.url }}
            style={{ width: scaledWidth, height: scaledHeight }}
            resizeMode="stretch"
          />
          {userLocation.pixelX != null && userLocation.pixelY != null && (
            <BlueDot
              x={userLocation.pixelX * scale}
              y={userLocation.pixelY * scale}
              size={24}
              accuracy={userLocation.accuracy || 5}
            />
          )}
        </View>
      </ScrollView>

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
  scrollContent: {
    flexGrow: 1,
  },
  mapContent: {
    position: 'relative',
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

