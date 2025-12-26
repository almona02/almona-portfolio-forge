/**
 * Monitor YDT Parser Progress - Auto-Watch Mode
 * Continuously monitors knowledge base and code structure extraction progress
 */

import * as fs from 'fs';
import * as path from 'path';

interface PreviousState {
  kbSize?: number;
  kbWorkflows?: number;
  kbAlgorithms?: number;
  kbComponents?: number;
  kbFabricationProcesses?: number;
  kbLastUpdated?: string;
  csSize?: number;
  csFiles?: number;
}

let previousState: PreviousState = {};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function checkProgress() {
  const timestamp = new Date().toLocaleTimeString();
  let hasChanges = false;
  const changes: string[] = [];

  // Check knowledge base
  const kbPath = 'src/lib/ydt/knowledge-base.json';
  if (fs.existsSync(kbPath)) {
    try {
      const kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
      const size = fs.statSync(kbPath).size;
      const workflows = Object.keys(kb.workflows || {}).length;
      const algorithms = Object.keys(kb.algorithms || {}).length;
      const components = (kb.components || []).length;
      const lastUpdated = kb.metadata?.parsedAt || 'Unknown';
      
      // Check for changes
      if (previousState.kbSize !== size) {
        hasChanges = true;
        const diff = size - (previousState.kbSize || 0);
        changes.push(`📦 KB size: ${formatBytes(previousState.kbSize || 0)} → ${formatBytes(size)} (${diff > 0 ? '+' : ''}${formatBytes(diff)})`);
        previousState.kbSize = size;
      }
      if (previousState.kbWorkflows !== workflows) {
        hasChanges = true;
        changes.push(`🔄 Workflows: ${previousState.kbWorkflows || 0} → ${workflows}`);
        previousState.kbWorkflows = workflows;
      }
      if (previousState.kbAlgorithms !== algorithms) {
        hasChanges = true;
        changes.push(`⚙️  Algorithms: ${previousState.kbAlgorithms || 0} → ${algorithms}`);
        previousState.kbAlgorithms = algorithms;
      }
      if (previousState.kbComponents !== components) {
        hasChanges = true;
        changes.push(`🧩 Components: ${previousState.kbComponents || 0} → ${components}`);
        previousState.kbComponents = components;
      }
      if (previousState.kbLastUpdated !== lastUpdated) {
        hasChanges = true;
        changes.push(`🕐 Knowledge base updated!`);
        previousState.kbLastUpdated = lastUpdated;
      }

      // Fabrication knowledge
      const fab = kb.fabrication || kb.egyptian?.fabricationKnowledge;
      if (fab) {
        const processes = fab.fabrication?.processes?.length || 0;
        const assembly = fab.assembly?.sequences?.length || 0;
        const systems = fab.systemPacks?.systems?.length || 0;
        const roles = fab.profileRoles?.roles?.length || 0;
        const cutting = fab.cutting?.rules?.length || 0;
        const angles = fab.connections?.angles?.length || 0;

        if (previousState.kbFabricationProcesses !== processes) {
          hasChanges = true;
          changes.push(`🔧 Fabrication processes: ${previousState.kbFabricationProcesses || 0} → ${processes}`);
          previousState.kbFabricationProcesses = processes;
        }

        // Show fabrication stats
        console.log(`\n📐 Fabrication Knowledge:`);
        console.log(`   🔨 Processes: ${processes}`);
        console.log(`   🔩 Assembly sequences: ${assembly}`);
        console.log(`   📦 System packs: ${systems}`);
        console.log(`   🎭 Profile roles: ${roles}`);
        console.log(`   ✂️  Cutting rules: ${cutting}`);
        console.log(`   📐 Connection angles: ${angles}`);
      }

      // Always show current status
      console.log(`\n✅ Knowledge Base Status (${timestamp}):`);
      console.log(`   Files parsed: ${kb.documents?.totalFiles || 'N/A'}`);
      console.log(`   Workflows: ${workflows}`);
      console.log(`   Algorithms: ${algorithms}`);
      console.log(`   Components: ${components}`);
      console.log(`   File size: ${formatBytes(size)}`);
      console.log(`   Last updated: ${lastUpdated}`);

      // Show changes if any
      if (hasChanges && changes.length > 0) {
        console.log(`\n🆕 Changes detected:`);
        changes.forEach(change => console.log(`   ${change}`));
      }
    } catch (e) {
      console.log(`   ⚠️ Error reading knowledge base: ${e.message}`);
    }
  } else {
    console.log(`⏳ Knowledge base not found - parser may still be running`);
  }

  // Check code structure
  const csPath = 'src/lib/ydt/code-structure.json';
  if (fs.existsSync(csPath)) {
    try {
      const cs = JSON.parse(fs.readFileSync(csPath, 'utf-8'));
      const size = fs.statSync(csPath).size;
      const files = cs.statistics?.totalFiles || 0;

      // Check for changes
      if (previousState.csSize !== size) {
        hasChanges = true;
        const diff = size - (previousState.csSize || 0);
        changes.push(`📄 Code structure: ${formatBytes(previousState.csSize || 0)} → ${formatBytes(size)} (${diff > 0 ? '+' : ''}${formatBytes(diff)})`);
        previousState.csSize = size;
      }
      if (previousState.csFiles !== files) {
        hasChanges = true;
        changes.push(`📝 Code files: ${previousState.csFiles || 0} → ${files}`);
        previousState.csFiles = files;
      }

      console.log(`\n✅ Code Structure Status:`);
      console.log(`   Files parsed: ${files}`);
      console.log(`   By type:`, JSON.stringify(cs.statistics?.byType || {}));
      console.log(`   Total lines: ${(cs.statistics?.totalLines || 0).toLocaleString()}`);
      console.log(`   Errors: ${cs.statistics?.errors || 0}`);
      console.log(`   File size: ${formatBytes(size)}`);
    } catch (e) {
      console.log(`   ⚠️ Error reading code structure: ${e.message}`);
    }
  } else {
    console.log(`\n⏳ Code structure not found - MultiSourceParser may still be running`);
  }

  return hasChanges;
}

// Main execution
const isWatchMode = process.argv.includes('--watch') || process.argv.includes('-w');

if (isWatchMode) {
  console.log('👀 YDT Parser Progress Monitor - Watch Mode');
  console.log('='.repeat(60));
  console.log('Monitoring parser progress every 15 seconds...');
  console.log('Press Ctrl+C to stop\n');

  // Initial check
  checkProgress();

  // Set up periodic checking (every 15 seconds)
  const interval = setInterval(() => {
    console.log('\n' + '='.repeat(60));
    const hasChanges = checkProgress();
    if (!hasChanges) {
      console.log('   (No changes since last check)');
    }
  }, 15000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping monitor...');
    clearInterval(interval);
    process.exit(0);
  });
} else {
  // Single check mode
  console.log('🔍 YDT Parser Progress Check\n');
  checkProgress();
  console.log('\n💡 To enable watch mode:');
  console.log('   npx tsx scripts/monitor-parser-progress.ts --watch');
  console.log('\n💡 To re-run parsers:');
  console.log('   npm run parse:documentation');
  console.log('   npx tsx scripts/run-multisource-parser.ts');
}

