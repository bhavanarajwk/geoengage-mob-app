// @ts-nocheck
const fs = require('fs');
const path = require('path');

// GE Logo SVG paths (from GELogo.js)
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

// Foreground icon should be 108dp × 108dp with safe zone of 66dp diameter circle
// The maskable area is 72dp circle, so we need good padding
// Android densities for foreground icons
const androidSizes = [
  { density: 'mdpi', size: 108 },
  { density: 'hdpi', size: 162 },
  { density: 'xhdpi', size: 216 },
  { density: 'xxhdpi', size: 324 },
  { density: 'xxxhdpi', size: 432 }
];

function createForegroundSVG(size) {
  // Original viewBox is "0 0 230 230" (from GELogo.js)
  // The logo content spans roughly from (5, 25) to (220, 175)
  // Safe zone for adaptive icons is 66dp diameter (33dp radius from center)
  // We'll scale the logo to fit comfortably within the safe zone with generous padding
  
  const originalViewBox = 230;
  
  // Scale to about 55% of icon size for balanced padding on all sides
  const targetSize = size * 0.55;
  const scale = targetSize / originalViewBox;
  
  // Center the scaled logo
  const scaledSize = originalViewBox * scale;
  const offset = (size - scaledSize) / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06B6D4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <path fill="url(#grad)" d="${gPath}"/>
    <path fill="url(#grad)" d="${ePath}"/>
  </g>
</svg>`;
}

// Create temp directory for SVGs
const tempDir = path.join(__dirname, 'temp-foreground-icons');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Generate foreground SVGs for Android
console.log('Generating foreground SVG icons for Android...');
androidSizes.forEach(({ density, size }) => {
  const svg = createForegroundSVG(size);
  const filename = `ic_launcher_foreground_${density}.svg`;
  fs.writeFileSync(path.join(tempDir, filename), svg);
  console.log(`✓ Created ${filename} (${size}x${size})`);
});

console.log('\n✅ All foreground SVG icons generated successfully!');
console.log(`📁 Files saved to: ${tempDir}`);
console.log('\n📝 Next step: Run "node convert-foreground-icons.js" to convert SVGs to PNGs');
