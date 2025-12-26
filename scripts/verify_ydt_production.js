/**
 * YDT Production Verification Script
 * 
 * Verifies that YDT is running correctly with all parsed knowledge base data
 * Run: node scripts/verify_ydt_production.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 YDT Production Verification\n');
console.log('=' .repeat(60));

// 1. Check if knowledge base file exists
console.log('\n1. Checking Knowledge Base File...');
const kbPath = path.join(__dirname, '../src/lib/ydt/knowledge-base.json');
if (fs.existsSync(kbPath)) {
  const stats = fs.statSync(kbPath);
  const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
  
  console.log('✅ Knowledge base file exists');
  console.log(`   Path: ${kbPath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Modified: ${stats.mtime.toISOString()}`);
  
  // Check structure
  console.log('\n   Knowledge Base Structure:');
  console.log(`   - Documents: ${kbData.documents?.totalFiles || 0} files parsed`);
  console.log(`   - Workflows: ${Object.keys(kbData.workflows || {}).length}`);
  console.log(`   - Algorithms: ${Object.keys(kbData.algorithms || {}).length}`);
  console.log(`   - Components: ${(kbData.components || []).length}`);
  
  // Check Egyptian fabrication knowledge
  if (kbData.egyptian?.fabricationKnowledge) {
    const fab = kbData.egyptian.fabricationKnowledge;
    console.log('\n   🏆 Gold Tier Extraction Results:');
    console.log(`   - System Packs: ${fab.systemPacks?.systems?.length || 0}`);
    console.log(`   - Profile Roles: ${fab.profileRoles?.roles?.length || 0}`);
    console.log(`   - Connection Angles: ${fab.connections?.angles?.length || 0}`);
    console.log(`   - Cutting Rules: ${fab.cutting?.rules?.length || 0}`);
    
    if (fab.profileRoles?.roles?.length > 0) {
      console.log(`   - Sample Roles: ${fab.profileRoles.roles.slice(0, 5).join(', ')}`);
    }
  }
} else {
  console.log('❌ Knowledge base file NOT FOUND');
  console.log(`   Expected at: ${kbPath}`);
  console.log('   Run: npm run parse:documentation');
}

// 2. Check API endpoint (if running)
console.log('\n2. Checking API Endpoint...');
console.log('   Testing: GET /api/v2/ydt/parser/knowledge-base');
console.log('   (Run this manually: curl http://your-domain/api/v2/ydt/parser/knowledge-base)');

// 3. Check frontend integration
console.log('\n3. Checking Frontend Integration...');
const docGraphPath = path.join(__dirname, '../src/lib/ydt/DocumentationKnowledgeGraph.ts');
if (fs.existsSync(docGraphPath)) {
  const content = fs.readFileSync(docGraphPath, 'utf-8');
  if (content.includes('/api/v2/ydt/parser/knowledge-base')) {
    console.log('✅ Frontend configured to use API endpoint');
  } else {
    console.log('⚠️  Frontend may not be using API endpoint');
  }
}

// 4. Check YDTCoreService
console.log('\n4. Checking YDTCoreService...');
const ydtCorePath = path.join(__dirname, '../src/lib/ydt/YDTCoreService.ts');
if (fs.existsSync(ydtCorePath)) {
  console.log('✅ YDTCoreService exists');
  const content = fs.readFileSync(ydtCorePath, 'utf-8');
  if (content.includes('DocumentationKnowledgeGraph')) {
    console.log('✅ YDTCoreService uses DocumentationKnowledgeGraph');
  }
}

// 5. Check YDTBusinessLayer integration
console.log('\n5. Checking YDTBusinessLayer Integration...');
const businessLayerPath = path.join(__dirname, '../src/lib/ydt/YDTBusinessLayer.ts');
if (fs.existsSync(businessLayerPath)) {
  console.log('✅ YDTBusinessLayer exists');
}

// 6. Check FabricatorWorkflow integration
console.log('\n6. Checking FabricatorWorkflow Integration...');
const workflowPath = path.join(__dirname, '../src/pages/FabricatorWorkflow.tsx');
if (fs.existsSync(workflowPath)) {
  const content = fs.readFileSync(workflowPath, 'utf-8');
  if (content.includes('YDTBusinessLayer')) {
    console.log('✅ FabricatorWorkflow uses YDTBusinessLayer');
    const matches = content.match(/ydtBusinessLayer\.\w+/g);
    if (matches) {
      console.log(`   Methods used: ${[...new Set(matches)].join(', ')}`);
    }
  } else {
    console.log('⚠️  FabricatorWorkflow may not be using YDTBusinessLayer');
  }
}

// 7. Check Morning Brief Widget
console.log('\n7. Checking Future Intelligence Integration...');
const morningBriefPath = path.join(__dirname, '../src/components/fabricator/MorningBriefWidget.tsx');
if (fs.existsSync(morningBriefPath)) {
  console.log('✅ MorningBriefWidget exists');
}

const dashboardPath = path.join(__dirname, '../src/pages/FabricatorDashboard.tsx');
if (fs.existsSync(dashboardPath)) {
  const content = fs.readFileSync(dashboardPath, 'utf-8');
  if (content.includes('MorningBriefWidget')) {
    console.log('✅ FabricatorDashboard includes MorningBriefWidget');
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n📋 Verification Summary:');
console.log('   1. Check knowledge base file exists and has data');
console.log('   2. Test API endpoint: curl http://your-domain/api/v2/ydt/parser/knowledge-base');
console.log('   3. Check browser console for YDT initialization messages');
console.log('   4. Test YDT features in FabricatorWorkflow');
console.log('   5. Verify Morning Brief appears on dashboard');
console.log('\n✅ Run this script after deployment to verify YDT is working!\n');

