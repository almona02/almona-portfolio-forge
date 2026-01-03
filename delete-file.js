const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'ml', 'AlgorithmPredictor.ts');

try {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log('✓ AlgorithmPredictor.ts deleted successfully');
  } else {
    console.log('✓ AlgorithmPredictor.ts already deleted');
  }
} catch (error) {
  console.error('✗ Error deleting file:', error.message);
  process.exit(1);
}
