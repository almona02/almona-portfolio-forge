#!/usr/bin/env tsx
/**
 * Migration Script: Top Patterns Per Region
 * 
 * Executes migration of top patterns per region:
 * - Egypt: Top 5 patterns
 * - Turkey: 2-3 UPVC systems
 * - GCC: 1-2 thermal-break systems
 * 
 * Usage:
 *   npm run migrate-patterns
 *   tsx scripts/migrate-top-patterns.ts
 * 
 * @since Gold Tier Phase 1, Task 1.3
 */

import {
  migrateAllTopPatterns,
  generateMigrationReport,
  exportMigratedSystems,
} from '../src/lib/fabricator/goldTier/migrateTopPatterns';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🚀 Starting Gold Tier Pattern Migration...\n');
  
  try {
    // Migrate all top patterns
    console.log('Migrating top patterns per region...');
    const results = await migrateAllTopPatterns();
    
    // Generate report
    console.log('\n📊 Generating migration report...');
    const report = generateMigrationReport(results);
    console.log(report);
    
    // Export systems to JSON
    const allSystems = [
      ...results.egypt.systems,
      ...results.turkey.systems,
      ...results.gcc.systems,
    ];
    
    if (allSystems.length > 0) {
      console.log('\n💾 Exporting migrated systems...');
      const json = exportMigratedSystems(allSystems);
      
      // Save to file
      const outputPath = join(process.cwd(), 'migrated-fenestration-systems.json');
      writeFileSync(outputPath, json, 'utf-8');
      console.log(`✅ Exported ${allSystems.length} systems to: ${outputPath}`);
    }
    
    // Save report
    const reportPath = join(process.cwd(), 'migration-report.txt');
    writeFileSync(reportPath, report, 'utf-8');
    console.log(`✅ Report saved to: ${reportPath}`);
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total: ${results.overall.total}`);
    console.log(`✅ Successful: ${results.overall.successful}`);
    console.log(`❌ Failed: ${results.overall.failed}`);
    console.log(`⏱️  Total Time: ${results.overall.totalTimeMs.toFixed(2)}ms`);
    console.log('='.repeat(80));
    
    // Exit code
    process.exit(results.overall.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

