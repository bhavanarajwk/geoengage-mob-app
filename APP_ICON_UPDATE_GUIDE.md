# 📱 App Icon Update Guide

## Overview
This guide will help you replace the default Android app icon with the custom GeoEngage logo.

## Quick Start

### Step 1: Generate Icons
1. Open `icon-generator.html` in your browser (double-click the file)
2. Click **"Download All Icons"** button
3. Extract the `geoengage-icons.zip` file

### Step 2: Replace Android Icons
Copy the icons from the extracted zip to your project:

```
android/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```

### Step 3: Replace iOS Icons
1. Copy all PNG files from `ios/` folder in the zip to:
   `ios/GeoEngage/Images.xcassets/AppIcon.appiconset/`

2. Replace the `Contents.json` file with the new one from the zip

### Step 4: Clean Build

#### For Android:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

#### For iOS:
```bash
cd ios
pod install
cd ..
npm run ios
```

## Verification

After rebuilding:
1. Uninstall the old app from your device/emulator
2. Install the new build
3. Check your app drawer/home screen - you should see the purple-cyan gradient GE logo!

## Troubleshooting

### Icons not updating on Android?
- Clear the app cache in Settings > Apps > GeoEngage > Storage > Clear Cache
- Uninstall and reinstall the app
- Run `./gradlew clean` in the android folder

### Icons not updating on iOS?
- Clean build folder in Xcode: Product > Clean Build Folder
- Delete the app from simulator/device
- Rebuild

## What Changed?
- ✅ Created custom icon generator tool
- ✅ Generated all required icon sizes for Android and iOS
- ✅ Maintained the exact GE logo design from `src/components/GELogo.js`
- ✅ Includes both square and round icons for Android
- ✅ Includes all required iOS sizes (20pt to 1024pt)

## Branch Info
Branch: `feat/update-app-icon`

To merge this into main:
```bash
git add .
git commit -m "Update app icon to GeoEngage logo"
git push origin feat/update-app-icon
```

Then create a pull request on GitHub.
