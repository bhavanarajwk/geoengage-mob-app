/**
 * Icon Generator Script for GeoEngage
 * 
 * This script generates app icons from the GE logo SVG
 * and places them in the correct Android and iOS folders.
 * 
 * Usage: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// SVG paths from GELogo.js
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

// Create complete SVG
function createSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 230 230" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06B6D4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="230" height="230" fill="white"/>
  <g>
    <!-- Shadow layer -->
    <path d="${gPath}" fill="rgba(139, 92, 246, 0.3)" transform="translate(2, 2)" />
    <path d="${ePath}" fill="rgba(6, 182, 212, 0.3)" transform="translate(2, 2)" />
    
    <!-- Main letters -->
    <path d="${gPath}" fill="url(#logoGradient)" />
    <path d="${ePath}" fill="url(#logoGradient)" />
    
    <!-- Blue dot -->
    <circle cx="58" cy="100" r="12" fill="#06B6D4" />
    <circle cx="58" cy="100" r="6" fill="#FFFFFF" />
  </g>
</svg>`;
}

// Icon sizes configuration
const androidSizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

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

// Save SVG files for Android
console.log('🎨 Generating GeoEngage app icons...\n');

// Create temp directory for SVG files
const tempDir = path.join(__dirname, 'temp-icons');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Generate SVG files for Android
androidSizes.forEach(({ folder, size }) => {
  const svg = createSVG(size);
  const folderPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', folder);
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  // Save SVG temporarily
  const svgPath = path.join(tempDir, `${folder}-${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Generated SVG for ${folder} (${size}x${size})`);
});

// Generate SVG files for iOS
iosSizes.forEach(({ name, size }) => {
  const svg = createSVG(size);
  const svgPath = path.join(tempDir, name.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Generated SVG for iOS ${name} (${size}x${size})`);
});

console.log('\n📋 SVG files generated in temp-icons/ folder');
console.log('\n⚠️  NEXT STEPS:');
console.log('1. Install sharp package: npm install --save-dev sharp');
console.log('2. Run: node convert-icons.js (to convert SVG to PNG)');
console.log('\nOR use an online SVG to PNG converter:');
console.log('- Visit: https://www.svgtopng.com/ or https://cloudconvert.com/svg-to-png');
console.log('- Upload SVG files from temp-icons/ folder');
console.log('- Download PNG files and place them in the respective folders');
console.log('\nAndroid folders:');
androidSizes.forEach(({ folder }) => {
  console.log(`  - android/app/src/main/res/${folder}/ic_launcher.png`);
});
console.log('\niOS folder:');
console.log('  - ios/GeoEngage/Images.xcassets/AppIcon.appiconset/');
