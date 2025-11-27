#!/usr/bin/env node

/**
 * Workspace Sync Service Test Script
 * ----------------------------------
 * Quick manual sanity check for WorkspaceSyncService persistence behaviour.
 *
 * Usage (from project root):
 *   node scripts/test-workspace-sync.js
 *
 * Note: This script relies on the TS implementation at
 * `src/lib/workspace/WorkspaceSyncService.ts`. Ensure your Node/TS setup
 * can execute or transpile that module as needed.
 */

import { WorkspaceSyncService } from '../src/lib/workspace/WorkspaceSyncService';

async function testWorkspaceSync() {
  console.log('🧪 Testing Workspace Sync Service...');

  const syncService = new WorkspaceSyncService();

  // Test 1: Save workspace
  const testState = {
    currentProject: { id: 'test-project', name: 'Turkish Window Project' },
    profileEdits: {},
    accessoryEdits: {},
    snapshots: [],
  };

  try {
    const saveResult = await syncService.saveWorkspaceSnapshot(testState);
    console.log('💾 Save Result:', saveResult);

    // Test 2: Load workspace
    const loadResult = await syncService.loadWorkspaceSnapshot();
    console.log('📂 Load Result:', {
      data: !!loadResult.data,
      source: loadResult.source,
    });

    // Test 3: Check sync status
    const status = await syncService.getSyncStatus();
    console.log('📊 Sync Status:', status);

    console.log('✅ Workspace Sync Test Completed');
  } catch (error) {
    console.error('❌ Workspace Sync Test Failed:', error);
    process.exitCode = 1;
  }
}

// Execute when run directly
testWorkspaceSync();


