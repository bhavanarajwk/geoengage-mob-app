// @ts-nocheck
/**
 * Icon Converter Script for GeoEngage
 * 
 * This script converts SVG files to PNG format for Android and iOS
 * Requires: npm install --save-dev sharp
 * 
 * Usage: node convert-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
/** @type {any} */
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Error: sharp package is not installed');
  console.log('\n📦 Please install sharp first:');
  console.log('   npm install --save-dev sharp\n');
  process.exit(1);
}

const tempDir = path.join(__dirname, 'temp-icons');

// Android icon configuration
const androidSizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

// iOS icon configuration
const iosSizes = [
  { name: 'Icon-20@2x.png', size: 40 },
  { name: 'Icon-20@3x.png', size: 60 },
  { name: 'Icon-29@2x.png', size: 58 },
  { name: 'Icon-29@3x.png', size: 87 },
  { name: 'Icon-40@2x.png', size: 80 },
  { name: 'Icon-40@3x.png', size: 120 },
  { name: 'Icon-60@2x.png', size: 120 },
  { name: 'Icon-60@3x.png', size: 180 },
  { name: 'Icon-1024.png', size: 1024 },
];

async function convertIcons() {
  console.log('🔄 Converting SVG files to PNG...\n');

  // Convert Android icons
  for (const { folder, size } of androidSizes) {
    const svgPath = path.join(tempDir, `${folder}-${size}.svg`);
    const outputFolder = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', folder);
    
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Generate both regular and round icons
    const icLauncherPath = path.join(outputFolder, 'ic_launcher.png');
    const icLauncherRoundPath = path.join(outputFolder, 'ic_launcher_round.png');

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(icLauncherPath);
      
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(icLauncherRoundPath);
      
      console.log(`✓ Converted ${folder}/ic_launcher.png (${size}x${size})`);
      console.log(`✓ Converted ${folder}/ic_launcher_round.png (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Error converting ${folder}:`, error instanceof Error ? error.message : String(error));
    }
  }

  // Convert iOS icons
  const iosFolder = path.join(__dirname, 'ios', 'GeoEngage', 'Images.xcassets', 'AppIcon.appiconset');
  
  if (!fs.existsSync(iosFolder)) {
    fs.mkdirSync(iosFolder, { recursive: true });
  }

  for (const { name, size } of iosSizes) {
    const svgPath = path.join(tempDir, name.replace('.png', '.svg'));
    const outputPath = path.join(iosFolder, name);

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Converted iOS ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Error converting ${name}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log('\n✅ All icons converted successfully!');
  console.log('\n📱 Next steps:');
  console.log('1. Clean build: cd android && ./gradlew clean && cd ..');
  console.log('2. Rebuild app: npm run android');
  console.log('3. Uninstall old app from device/emulator');
  console.log('4. Install fresh build to see new icon');
  console.log('\n🎉 Your GeoEngage logo will now appear as the app icon!');
}

// Run conversion
convertIcons().catch(error => {
  console.error('❌ Conversion failed:', error);
  process.exit(1);
});
