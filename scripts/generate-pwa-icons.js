import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple script to copy and rename logo for PWA icons
// In a real project, you'd use a proper image processing library like sharp

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo.png');

// Check if logo exists
if (!fs.existsSync(logoPath)) {
  console.error('Logo file not found:', logoPath);
  process.exit(1);
}

// Create PWA icons by copying the logo
// Note: In production, you should resize these to the exact dimensions
const pwaIcons = [
  { name: 'pwa-192x192.png', size: '192x192' },
  { name: 'pwa-512x512.png', size: '512x512' },
  { name: 'apple-touch-icon.png', size: '180x180' }
];

console.log('Generating PWA icons...');

pwaIcons.forEach(icon => {
  const targetPath = path.join(publicDir, icon.name);
  
  try {
    // Copy the logo file to create the PWA icon
    fs.copyFileSync(logoPath, targetPath);
    console.log(`✅ Created ${icon.name} (${icon.size})`);
  } catch (error) {
    console.error(`❌ Failed to create ${icon.name}:`, error.message);
  }
});

console.log('PWA icon generation complete!');
console.log('Note: For production, consider using proper image resizing to exact dimensions.');
