#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Build Diagnosis Script');
console.log('========================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Not in project root directory');
  process.exit(1);
}

// Check package.json
console.log('📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`✅ Package name: ${packageJson.name}`);
  console.log(`✅ Build script: ${packageJson.scripts?.build || 'NOT FOUND'}`);
  console.log(`✅ Vite version: ${packageJson.dependencies?.vite || packageJson.devDependencies?.vite || 'NOT FOUND'}`);
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
}

// Check vite.config.ts
console.log('\n⚙️  Checking vite.config.ts...');
try {
  const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
  if (viteConfig.includes("base: '/'")) {
    console.log('✅ Base path is set correctly');
  } else {
    console.log('⚠️  Base path might not be set correctly');
  }
  
  if (viteConfig.includes('manualChunks')) {
    console.log('✅ Manual chunks configuration found');
  } else {
    console.log('ℹ️  No manual chunks configuration (using automatic)');
  }
} catch (error) {
  console.error('❌ Error reading vite.config.ts:', error.message);
}

// Check vercel.json
console.log('\n🚀 Checking vercel.json...');
try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  console.log('✅ Vercel config found');
  console.log(`✅ Build command: ${vercelConfig.buildCommand || 'default'}`);
  console.log(`✅ Output directory: ${vercelConfig.outputDirectory || 'default'}`);
  
  if (vercelConfig.rewrites && vercelConfig.rewrites.length > 0) {
    console.log('✅ Rewrites configured');
  } else {
    console.log('⚠️  No rewrites configured');
  }
} catch (error) {
  console.error('❌ Error reading vercel.json:', error.message);
}

// Check if dist folder exists
console.log('\n📁 Checking build output...');
if (fs.existsSync('dist')) {
  console.log('✅ Dist folder exists');
  const distFiles = fs.readdirSync('dist');
  console.log(`✅ Found ${distFiles.length} files in dist folder`);
  
  // Check for index.html
  if (distFiles.includes('index.html')) {
    console.log('✅ index.html found');
  } else {
    console.log('❌ index.html NOT found');
  }
  
  // Check for assets folder
  if (distFiles.includes('assets')) {
    const assetsFiles = fs.readdirSync('dist/assets');
    console.log(`✅ Assets folder found with ${assetsFiles.length} files`);
  } else {
    console.log('❌ Assets folder NOT found');
  }
} else {
  console.log('❌ Dist folder does not exist - build has not run');
}

// Try to run build locally
console.log('\n🔨 Attempting local build...');
try {
  console.log('Running: npm run build');
  const buildOutput = execSync('npm run build', { 
    encoding: 'utf8', 
    timeout: 300000, // 5 minutes timeout
    stdio: 'pipe'
  });
  
  console.log('✅ Build completed successfully!');
  console.log('Build output preview:');
  console.log(buildOutput.slice(-500)); // Last 500 characters
  
} catch (error) {
  console.error('❌ Build failed:');
  console.error(error.message);
  
  if (error.stdout) {
    console.log('\nBuild stdout:');
    console.log(error.stdout);
  }
  
  if (error.stderr) {
    console.log('\nBuild stderr:');
    console.log(error.stderr);
  }
}

// Check for common issues
console.log('\n🔍 Checking for common issues...');

// Check for TypeScript errors
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ No TypeScript errors found');
} catch (error) {
  console.log('⚠️  TypeScript errors found:');
  console.log(error.stdout || error.message);
}

// Check for ESLint errors
try {
  execSync('npx eslint src --ext .ts,.tsx --max-warnings 0', { stdio: 'pipe' });
  console.log('✅ No ESLint errors found');
} catch (error) {
  console.log('⚠️  ESLint errors found:');
  console.log(error.stdout || error.message);
}

console.log('\n🎯 Diagnosis complete!');
console.log('\nNext steps:');
console.log('1. If build failed locally, fix the errors above');
console.log('2. If build succeeded locally but fails on Vercel, check Vercel logs');
console.log('3. If still having issues, try: npm run build -- --debug');
