import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public/images');

// Check if sharp is installed
let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
} catch (e) {
  console.log('❌ "sharp" is not installed. Run: npm install --save-dev sharp');
  process.exit(1);
}

// 1. Simple recursive file finder (No 'glob' dependency needed)
function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles || [];
  }
  
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

async function convertImages() {
  console.log('🚀 Starting Industrial Image Optimization...\n');
  
  // Get all images
  const files = getAllFiles(PUBLIC_DIR);
  let converted = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      const webpFile = file.replace(ext, '.webp');
      
      // Skip if WebP already exists
      if (fs.existsSync(webpFile)) {
        console.log(`⏭️  Skipping ${path.basename(file)} (WebP exists)`);
        skipped++;
        continue;
      }
      
      console.log(`⚡ Converting: ${path.basename(file)} → ${path.basename(webpFile)}`);
      
      try {
        const isLossless = ext === '.png';
        await sharp(file)
          .webp({ 
            quality: isLossless ? 100 : 85, 
            effort: 4,
            lossless: isLossless
          })
          .toFile(webpFile);
        converted++;
        console.log(`✅ Created: ${path.basename(webpFile)}\n`);
      } catch (err) {
        console.error(`❌ Failed to convert ${path.basename(file)}:`, err.message);
        errors++;
      }
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Conversion Summary:');
  console.log(`   ✅ Converted: ${converted}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (converted > 0) {
    console.log('🎯 Next Steps:');
    console.log('   1. Update image src attributes (see QUICK_REFERENCE.md)');
    console.log('   2. Test in browser');
    console.log('   3. Deploy');
  }
}

convertImages().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
