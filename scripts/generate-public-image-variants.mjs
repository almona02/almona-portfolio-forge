import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Explicit source inventory: no guessed URLs or repeated width descriptors.
const sources = [
  '/images/egyptian-industrial-hero-bg.webp',
  '/images/machines/cutting-machine.jpg',
  '/images/machines/CDC-600.jpg',
  '/images/machines/NCR-300.jpg',
];
const directory = 'public/images/responsive';
await mkdir(directory, { recursive: true });
const manifest = {};
for (const src of sources) {
  const input = path.join('public', src);
  const metadata = await sharp(input).metadata();
  const widths = [...new Set([480, 768, 1280, metadata.width].filter(width => width <= metadata.width))].sort((a, b) => a - b);
  const variants = [];
  for (const width of widths) {
    const name = `${path.parse(src).name}-v1-${width}w.webp`;
    const info = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: src.includes("hero-bg") ? 55 : 70, effort: 5 }).toFile(path.join(directory, name));
    variants.push({ src: `/images/responsive/${name}`, width: info.width });
  }
  manifest[src] = { width: metadata.width, height: metadata.height, variants };
}
await writeFile('src/lib/publicImageVariants.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated responsive variants for ${sources.length} public images.`);
