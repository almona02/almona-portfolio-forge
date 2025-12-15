#!/usr/bin/env node
/**
 * Deployment Verification Script
 * Run this after deployment to verify everything is working correctly
 * 
 * Usage: node scripts/verify-deployment.js [production-url]
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = process.argv[2] || process.env.PRODUCTION_URL;

if (!PRODUCTION_URL) {
  console.error('❌ Error: Production URL required');
  console.log('Usage: node scripts/verify-deployment.js <production-url>');
  console.log('Or set PRODUCTION_URL environment variable');
  process.exit(1);
}

console.log('🔍 DEPLOYMENT VERIFICATION STARTED');
console.log(`📍 Production URL: ${PRODUCTION_URL}\n`);

const checks = {
  siteAccessible: false,
  responseTime: 0,
  hasErrors: false,
  bundleSize: 0,
};

// Check 1: Site Accessibility
function checkSiteAccessible(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      const endTime = Date.now();
      checks.siteAccessible = res.statusCode === 200;
      checks.responseTime = endTime - startTime;
      
      console.log(`✅ Site Accessible: ${checks.siteAccessible ? 'YES' : 'NO'}`);
      console.log(`⏱️  Response Time: ${checks.responseTime}ms`);
      console.log(`📊 Status Code: ${res.statusCode}\n`);
      
      resolve(checks);
    }).on('error', (err) => {
      console.error(`❌ Site Access Error: ${err.message}\n`);
      checks.hasErrors = true;
      reject(err);
    });
  });
}

// Check 2: Bundle Size (if we can fetch HTML)
function checkBundleSize(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Look for script tags with bundle sizes
        const scriptMatches = data.match(/<script[^>]*src="([^"]*\.js)"/g);
        if (scriptMatches) {
          console.log(`📦 Found ${scriptMatches.length} JavaScript bundles`);
          console.log('   (Bundle size verification requires browser console)\n');
        }
        resolve();
      });
    }).on('error', () => resolve());
  });
}

// Run all checks
async function runVerification() {
  try {
    await checkSiteAccessible(PRODUCTION_URL);
    await checkBundleSize(PRODUCTION_URL);
    
    console.log('📋 VERIFICATION SUMMARY:');
    console.log(`   Site Accessible: ${checks.siteAccessible ? '✅' : '❌'}`);
    console.log(`   Response Time: ${checks.responseTime}ms ${checks.responseTime < 1000 ? '✅' : '⚠️'}`);
    console.log(`   Errors: ${checks.hasErrors ? '❌' : '✅'}\n`);
    
    console.log('🔍 NEXT STEPS:');
    console.log('   1. Open production URL in browser');
    console.log('   2. Open DevTools Console (F12)');
    console.log('   3. Run browser verification script (see below)\n');
    
    console.log('📝 BROWSER CONSOLE SCRIPT:');
    console.log(`
// Copy and paste this into browser console:
const verifyDeployment = () => {
  console.log('🔍 DEPLOYMENT VERIFICATION');
  
  // 1. Performance monitoring
  const metrics = window.performanceMonitor?.getMetrics?.() || [];
  console.log('📊 Performance Metrics:', metrics.length);
  
  // 2. BOM render time
  const bomRender = metrics.find(m => m.name === 'engineering_bay_render');
  console.log('⚡ BOM Render:', bomRender?.value?.toFixed(2) || 'N/A', 'ms');
  
  // 3. Slow operations
  const slowOps = metrics.filter(m => m.value > 100).length;
  console.log('⚠️  Slow operations (>100ms):', slowOps);
  
  // 4. Console errors
  const hasErrors = window.console?.errors?.length > 0;
  console.log('❌ Console errors:', hasErrors ? 'Yes' : 'No');
  
  // 5. Service Worker
  navigator.serviceWorker?.getRegistrations?.().then(regs => {
    console.log('🔧 Service Workers:', regs.length);
  });
  
  return {
    metricsCount: metrics.length,
    bomRenderTime: bomRender?.value,
    slowOperations: slowOps,
    hasErrors
  };
};

verifyDeployment();
    `);
    
    if (checks.siteAccessible && !checks.hasErrors && checks.responseTime < 2000) {
      console.log('✅ BASIC VERIFICATION PASSED');
      console.log('   Proceed with browser console verification\n');
      process.exit(0);
    } else {
      console.log('⚠️  BASIC VERIFICATION ISSUES DETECTED');
      console.log('   Check the issues above and verify manually\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

runVerification();

