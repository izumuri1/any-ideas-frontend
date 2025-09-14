import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const iconsSource = join(projectRoot, 'src/assets/icons');
const iconsOutput = join(projectRoot, 'public/icons');

const iconConfigs = [
  { source: 'icon-favicon.svg', output: 'icon-48x48.png', size: 48 },
  { source: 'icon-small.svg', output: 'icon-192x192.png', size: 192 },
  { source: 'icon-large.svg', output: 'icon-512x512.png', size: 512 },
  { source: 'icon-small.svg', output: 'apple-touch-icon.png', size: 180 },
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');
  
  for (const config of iconConfigs) {
    try {
      const sourcePath = join(iconsSource, config.source);
      const outputPath = join(iconsOutput, config.output);
      
      await sharp(sourcePath)
        .resize(config.size, config.size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 244, g: 193, b: 78, alpha: 1 }
        })
        .png({ 
          quality: 100,
          compressionLevel: 0,
          adaptiveFiltering: false
        })
        .toFile(outputPath);
      
      console.log(`✅ Generated ${config.output} (${config.size}x${config.size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${config.output}:`, error);
    }
  }
  
  console.log('🎉 Icon generation completed!');
}

generateIcons();