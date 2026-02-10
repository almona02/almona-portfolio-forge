
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statsPath = path.join(__dirname, '../stats.json');

try {
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  console.log('Root keys:', Object.keys(stats));
  if (stats.nodeParts) {
    const keys = Object.keys(stats.nodeParts);
    if (keys.length > 0) {
      console.log('nodeParts sample:', keys[0], stats.nodeParts[keys[0]]);
    }
  }
} catch (e) {
  console.error(e);
}
