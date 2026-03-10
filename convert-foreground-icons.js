// @ts-nocheck
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const androidSizes = [
  { density: 'mdpi', size: 108 },
  { density: 'hdpi', size: 162 },
  { density: 'xhdpi', size: 216 },
  { density: 'xxhdpi', size: 324 },
  { density: 'xxxhdpi', size: 432 }
];

async function convertForegroundIcons() {
  const tempDir = path.join(__dirname, 'temp-foreground-icons');
  
  if (!fs.existsSync(tempDir)) {
    console.error('❌ temp-foreground-icons directory not found!');
    console.log('Please run "node generate-foreground-icons.js" first.');
    return;
  }

  console.log('Converting foreground SVG icons to PNG...\n');

  for (const { density, size } of androidSizes) {
    const svgPath = path.join(tempDir, `ic_launcher_foreground_${density}.svg`);
    const outputDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'ic_launcher_foreground.png');

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Converted ${density}: ic_launcher_foreground.png (${size}x${size})`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error converting ${density}:`, error.message);
      } else {
        console.error(`❌ Error converting ${density}:`, error);
      }
    }
  }

  console.log('\n✅ All foreground PNG icons generated successfully!');
  console.log('📁 Icons saved to: android/app/src/main/res/mipmap-*/');
  console.log('\n📝 Next step: Create adaptive icon XML files in mipmap-anydpi-v26');
}

convertForegroundIcons().catch(err => {
  if (err instanceof Error) {
    console.error('Failed to convert icons:', err.message);
  } else {
    console.error('Failed to convert icons:', err);
  }
});
