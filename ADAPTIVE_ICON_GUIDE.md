# Adaptive Icon Implementation Guide

## Overview
This document explains the adaptive icon implementation for the GeoEngage mobile app. Adaptive icons were introduced in Android 8.0 (API 26) and allow different Android launchers to display your app icon in various shapes (circle, square, rounded square, squircle) while maintaining visual consistency.

## What Are Adaptive Icons?

Adaptive icons consist of two layers:
- **Background layer**: A solid color or drawable that fills the entire icon space
- **Foreground layer**: The actual logo/icon that sits on top of the background

Android automatically masks these layers based on the launcher's preference, ensuring your icon looks great on any device.

## Implementation Details

### Files Created

#### 1. Icon Generation Scripts
- **`generate-foreground-icons.js`**: Generates foreground SVG icons (108dp base size)
  - Creates transparent background SVGs with only the GE logo
  - Scales logo to 50% to fit within the safe zone (66dp circle)
  - Generates icons for all Android densities (mdpi to xxxhdpi)

- **`convert-foreground-icons.js`**: Converts SVG foreground icons to PNG
  - Uses Sharp library to convert SVGs to PNGs
  - Creates `ic_launcher_foreground.png` for each density

#### 2. Resource Files
- **`android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`**
  - Adaptive icon definition for square launcher icon
  - Links background color and foreground drawable

- **`android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`**
  - Adaptive icon definition for round launcher icon
  - Same structure as square version

- **`android/app/src/main/res/values/colors.xml`**
  - Updated with `ic_launcher_background` color: `#0d1117` (dark theme background)

#### 3. Generated Foreground Icons
- **Location**: `android/app/src/main/res/mipmap-{density}/ic_launcher_foreground.png`
- **Densities**:
  - mdpi: 108×108px
  - hdpi: 162×162px
  - xhdpi: 216×216px
  - xxhdpi: 324×324px
  - xxxhdpi: 432×432px

### Icon Dimensions

Adaptive icons follow specific dimension requirements:
- **Total size**: 108dp × 108dp
- **Safe zone**: 66dp diameter circle (inner 61% of the icon)
- **Maskable area**: 72dp circle (content within this should always be visible)
- **Logo scale**: 50% to ensure it fits within the safe zone with padding

### How It Works

1. **Android 8.0+ devices**: Use adaptive icons defined in `mipmap-anydpi-v26/`
   - System reads the XML files
   - Applies the background color from colors.xml
   - Overlays the foreground PNG
   - Masks the result based on launcher preference

2. **Pre-Android 8.0 devices**: Use legacy icons from density-specific folders
   - Falls back to `ic_launcher.png` and `ic_launcher_round.png`
   - These have the background baked into the PNG

## Regenerating Icons

If you need to update the logo in the future:

### For Foreground Icons:
```bash
# 1. Generate foreground SVGs
node generate-foreground-icons.js

# 2. Convert SVGs to PNGs
node convert-foreground-icons.js
```

### For Legacy Icons (Android < 8.0):
```bash
# 1. Generate regular icons with baked-in background
node generate-icons.js

# 2. Convert to PNGs
node convert-icons.js
```

### Clean and Rebuild:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Testing Adaptive Icons

1. **Uninstall the existing app** from your device (important to clear launcher cache)
2. **Rebuild and install**: `npm run android`
3. **Long-press the app icon** on your home screen
4. **Try different launchers** (Nova Launcher, Pixel Launcher, etc.) to see how the icon adapts

## Color Reference

- **Background Color**: `#0d1117` (matches app's dark theme)
- **Gradient Start**: `#8B5CF6` (purple)
- **Gradient End**: `#06B6D4` (cyan)

## Technical Notes

- The foreground PNG has a transparent background
- The background layer uses a solid color for performance
- Legacy icons still exist for backward compatibility
- The 50% logo scale ensures visibility across all launcher shapes
- Safe zone compliance prevents logo cropping on circular launchers

## Resources

- [Android Adaptive Icons Guide](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
- [Material Design Icon Guidelines](https://material.io/design/iconography/product-icons.html)
- [Adaptive Icon Wizard (Android Studio)](https://developer.android.com/studio/write/image-asset-studio)

## Troubleshooting

**Icon not updating on device?**
- Uninstall the app completely
- Restart the device (clears launcher cache)
- Reinstall the app

**Icon looks cropped on some launchers?**
- Reduce logo scale in `generate-foreground-icons.js`
- Ensure content stays within the 66dp safe zone

**Colors don't match?**
- Verify `ic_launcher_background` in colors.xml matches app theme
- Check gradient colors in foreground icon scripts
