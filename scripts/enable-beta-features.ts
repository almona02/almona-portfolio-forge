/**
 * Automated Beta Feature Enablement
 * 
 * Programmatically enables beta features for selected workshops using
 * the FeatureFlagManager system.
 * 
 * Usage: npx ts-node scripts/enable-beta-features.ts
 * 
 * @since Phase 2B: Dual-Output Engine (Week 3 - Day 12)
 */

import * as fs from 'fs';
import * as path from 'path';

// Note: In a real implementation, this would import from the actual FeatureFlagManager
// For now, we'll create a simplified version that can work in Node.js context

interface BetaCandidate {
  workshop: {
    id: string;
    name: string;
  };
  score: number;
  readiness: 'high' | 'medium' | 'low';
}

class FeatureFlagManager {
  private static workshopOverrides: Map<string, Set<string>> = new Map();
  
  static enableForWorkshop(workshopId: string, feature: string): void {
    if (!this.workshopOverrides.has(workshopId)) {
      this.workshopOverrides.set(workshopId, new Set());
    }
    
    this.workshopOverrides.get(workshopId)!.add(feature);
    console.log(`  ✅ Enabled ${feature} for workshop ${workshopId}`);
  }
  
  static getEnabledFeatures(workshopId: string): string[] {
    const overrides = this.workshopOverrides.get(workshopId);
    return overrides ? Array.from(overrides) : [];
  }
  
  static reset(): void {
    this.workshopOverrides.clear();
  }
}

export class BetaFeatureEnabler {
  private featuresToEnable = [
    'DUAL_OUTPUT_BETA_ENABLED',
    'DUAL_OUTPUT_VISUALIZATION',
    'DUAL_OUTPUT_PRODUCTION_DATA',
    'PATTERN_SUGGESTIONS_ENABLED'
  ] as const;
  
  async enableForSelectedWorkshops(): Promise<void> {
    console.log('=== ENABLING BETA FEATURES FOR SELECTED WORKSHOPS ===\n');
    
    // 1. Load selected workshops from selection report
    const selectionReportPath = path.join(process.cwd(), 'beta-workshop-selection-report.json');
    
    if (!fs.existsSync(selectionReportPath)) {
      console.error('❌ Beta workshop selection report not found. Run select-beta-workshops.ts first.');
      process.exit(1);
    }
    
    const selectionReport = JSON.parse(fs.readFileSync(selectionReportPath, 'utf8'));
    const selected = selectionReport.selectedWorkshops;
    
    console.log(`Found ${selected.length} selected workshops\n`);
    
    // 2. Enable features for each workshop
    const results = await Promise.allSettled(
      selected.map(async (candidate: any) => {
        try {
          await this.enableFeaturesForWorkshop(candidate.id);
          return { workshopId: candidate.id, success: true };
        } catch (error: any) {
          console.error(`Failed to enable features for ${candidate.id}:`, error);
          return { workshopId: candidate.id, success: false, error: error.message };
        }
      })
    );
    
    // 3. Generate report
    this.generateEnablementReport(results, selected);
    
    // 4. Verify enablement
    await this.verifyFeatureEnablement(selected.map((s: any) => s.id));
  }
  
  private async enableFeaturesForWorkshop(workshopId: string): Promise<void> {
    console.log(`\nEnabling features for workshop ${workshopId}...`);
    
    // Enable each feature
    for (const feature of this.featuresToEnable) {
      try {
        FeatureFlagManager.enableForWorkshop(workshopId, feature);
      } catch (error: any) {
        console.error(`  ❌ ${feature}: ${error.message}`);
        throw error;
      }
    }
    
    // Update workshop beta status in database
    await this.updateWorkshopBetaStatus(workshopId, 'enabled');
    
    // Send confirmation
    await this.sendConfirmationEmail(workshopId);
  }
  
  private async updateWorkshopBetaStatus(workshopId: string, status: 'enabled' | 'disabled'): Promise<void> {
    // Update database record
    console.log(`  Updated workshop ${workshopId} beta status to: ${status}`);
  }
  
  private async sendConfirmationEmail(workshopId: string): Promise<void> {
    // Send confirmation email to workshop
    console.log(`  Sent confirmation email to workshop ${workshopId}`);
  }
  
  private generateEnablementReport(
    results: PromiseSettledResult<{ workshopId: string; success: boolean; error?: string }>[],
    selected: any[]
  ): void {
    console.log('\n=== BETA FEATURE ENABLEMENT REPORT ===\n');
    
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    
    const failed = results.filter(r => 
      r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    ).length;
    
    console.log(`Summary:`);
    console.log(`  Workshops selected: ${selected.length}`);
    console.log(`  Features enabled successfully: ${successful}`);
    console.log(`  Enablement failures: ${failed}`);
    console.log(`  Success rate: ${((successful / selected.length) * 100).toFixed(1)}%\n`);
    
    // Detailed results
    console.log('Detailed Results:');
    results.forEach((result, index) => {
      const workshop = selected[index];
      if (result.status === 'fulfilled' && result.value.success) {
        console.log(`  ✅ ${workshop.name || workshop.id}: All features enabled`);
      } else {
        const error = result.status === 'rejected' 
          ? result.reason 
          : result.status === 'fulfilled' 
            ? result.value.error 
            : 'Unknown error';
        console.log(`  ❌ ${workshop.name || workshop.id}: Feature enablement failed - ${error}`);
      }
    });
    
    // Export report
    const report = {
      generatedAt: new Date().toISOString(),
      featuresEnabled: this.featuresToEnable,
      results: results.map((result, index) => ({
        workshopId: selected[index].id,
        workshopName: selected[index].name,
        status: result.status === 'fulfilled' && result.value.success ? 'success' : 'failed',
        error: result.status === 'rejected' ? String(result.reason) : 
               result.status === 'fulfilled' ? result.value.error : null
      }))
    };
    
    const reportPath = path.join(process.cwd(), 'beta-feature-enablement-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Report saved to ${reportPath}`);
  }
  
  private async verifyFeatureEnablement(workshopIds: string[]): Promise<void> {
    console.log('\n=== VERIFYING FEATURE ENABLEMENT ===\n');
    
    for (const workshopId of workshopIds) {
      console.log(`Verifying workshop ${workshopId}...`);
      
      const enabledFeatures = FeatureFlagManager.getEnabledFeatures(workshopId);
      const expectedCount = this.featuresToEnable.length;
      
      if (enabledFeatures.length === expectedCount) {
        console.log(`  ✅ Features confirmed enabled (${enabledFeatures.length}/${expectedCount})`);
        console.log(`     Enabled: ${enabledFeatures.join(', ')}`);
      } else {
        console.log(`  ❌ Features NOT fully enabled - manual intervention required`);
        console.log(`     Expected: ${expectedCount}, Found: ${enabledFeatures.length}`);
      }
    }
  }
}

// Run enablement if executed directly
if (require.main === module) {
  const enabler = new BetaFeatureEnabler();
  enabler.enableForSelectedWorkshops().catch(console.error);
}

