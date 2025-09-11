#!/usr/bin/env node
/**
 * optimize-glb.mjs
 * Usage:
 *   node scripts/optimize-glb.mjs input.glb output.glb
 * Or optimize a folder:
 *   node scripts/optimize-glb.mjs ./public/models ./public/models/optimized
 *
 * Applies common mobile AR optimizations:
 *  - Deduplicate
 *  - Prune
 *  - Flatten
 *  - Draco mesh compression
 *  - Meshopt compression (if ktx2 / meshopt supported at runtime)
 *  - KTX2 texture compression (BasisU) for PNG/JPEG
 *  - Quantization
 *  - Remove unused nodes/materials
 */
import { resolve, extname, basename, join } from 'node:path';
import { statSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { draco, meshopt, ktx2, quantize, prune, dedup, flatten, reorder } from '@gltf-transform/functions';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

async function optimizeFile(inputPath, outputPath) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(inputPath);
  const logger = doc.getLogger();
  logger.setLevel(3);

  await doc.transform(
    dedup(),
    prune(),
    flatten(),
    reorder(),
    quantize({ quantizeColor: true, quantizeNormal: true, quantizeTexcoord: true }),
    draco(),
    meshopt(),
    ktx2({
      encoder: { quality: 128 },
      slots: /(baseColorTexture|metallicRoughnessTexture|normalTexture|emissiveTexture)/
    })
  );

  await io.write(outputPath, doc);
  const inputSize = (statSync(inputPath).size / 1024).toFixed(1);
  const outputSize = (statSync(outputPath).size / 1024).toFixed(1);
  console.log(`Optimized: ${basename(inputPath)} ${inputSize}KB -> ${outputSize}KB`);
}

async function main() {
  const [,, inArg, outArg] = process.argv;
  if (!inArg || !outArg) {
    console.error('Usage: node scripts/optimize-glb.mjs <input.glb|inputDir> <output.glb|outputDir>');
    process.exit(1);
  }
  const inPath = resolve(inArg);
  const outPath = resolve(outArg);
  const stats = statSync(inPath);

  if (stats.isDirectory()) {
    if (!existsSync(outPath)) mkdirSync(outPath, { recursive: true });
    const files = readdirSync(inPath).filter(f => /\.(glb|gltf)$/i.test(f));
    for (const f of files) {
      const inputFile = join(inPath, f);
      const ext = extname(f);
      const outputFile = join(outPath, basename(f, ext) + '.optimized.glb');
      await optimizeFile(inputFile, outputFile);
    }
  } else {
    await optimizeFile(inPath, outPath);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
