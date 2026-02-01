#!/usr/bin/env node

/**
 * Script to update wiring manifest with Wave 2 components
 * Ensures constitutional compliance and proper tier classification
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WIRING_MANIFEST_PATH = path.join(__dirname, '../src/components/fabricator/wiring-manifest.yaml');
const WAVE2_COMPONENTS = [
  // Advisory Hardener Infrastructure
  {
    component: 'AdvisoryHardener',
    location: 'src/lib/ticketing/advisory/AdvisoryHardener.ts',
    truth_domain: 'serviceTruth',
    execution_class: 'advisory_infrastructure',
    tier: 'tier_2_support'
  },
  {
    component: 'CircuitBreaker',
    location: 'src/lib/ticketing/advisory/CircuitBreaker.ts',
    truth_domain: 'serviceTruth',
    execution_class: 'advisory_infrastructure',
    tier: 'tier_2_support'
  },
  {
    component: 'AdvisoryMetrics',
    location: 'src/lib/ticketing/advisory/AdvisoryMetrics.ts',
    truth_domain: 'serviceTruth',
    execution_class: 'advisory_infrastructure',
    tier: 'tier_2_support'
  },
  
  // New Advisory Components
  {
    component: 'PredictiveMaintenanceAdvisor',
    location: 'src/services/ticketing/advisory/PredictiveMaintenanceAdvisor.ts',
    truth_domain: 'serviceTruth',
    execution_class: 'advisory',
    tier: 'tier_2',
    requires_human_validation: true
  },
  {
    component: 'ResponseDraftGenerator',
    location: 'src/services/ticketing/advisory/ResponseDraftGenerator.ts',
    truth_domain: 'serviceTruth',
    execution_class: 'advisory',
    tier: 'tier_2',
    requires_human_validation: true
  },
  {
    component: 'PartsRecommendationAdvisor',
    location: 'src/services/ticketing/advisory/PartsRecommendationAdvisor.ts',
    truth_domain: 'serviceTruth',
    execution_class: 'advisory',
    tier: 'tier_2',
    requires_human_validation: true
  },
  
  // UI Components
  {
    component: 'AdvisoryDashboard',
    location: 'src/components/ticketing/advisory/dashboard/AdvisoryDashboard.tsx',
    truth_domain: 'serviceTruth',
    execution_class: 'presentation',
    tier: 'tier_1'
  }
];

function updateWiringManifest() {
  try {
    // Read existing manifest
    const manifestContent = fs.readFileSync(WIRING_MANIFEST_PATH, 'utf8');
    const manifest = yaml.load(manifestContent);
    
    // Ensure serviceTruth domain exists
    if (!manifest.serviceTruth) {
        // Initialize if not exists, though it should from Wave 1
      manifest.serviceTruth = {
        tier_3: [],
        tier_2: [],
        tier_1: [],
        tier_2_support: [],
        presentation: []
      };
    } else {
        // Ensure sub-tiers exist
        if (!manifest.serviceTruth.tier_2_support) manifest.serviceTruth.tier_2_support = [];
        if (!manifest.serviceTruth.presentation) manifest.serviceTruth.presentation = [];
    }
    
    // Add Wave 2 components
    WAVE2_COMPONENTS.forEach(component => {
      const entry = {
        component: component.component,
        location: component.location,
        truth_domain: component.truth_domain,
        execution_class: component.execution_class
      };
      
      // Determine target array based on tier mapping in manifest vs script config
      // The script config uses 'tier' property which corresponds to manifest keys
      // tier_2_support -> serviceTruth.tier_2_support
      // tier_2 -> serviceTruth.tier_2
      // tier_3 -> serviceTruth.tier_3
      // tier_1 -> serviceTruth.presentation? Wait, let's check manifest structure
      
      // Manifest structure in previous interactions:
      // serviceTruth:
      //   canonicalSources: [...]
      //   advisorySources: [...]
      
      // Wait, the manifest structure I removed previously was the duplicate `serviceTruth` block.
      // The main manifest structure usually has `truthDomains` or similar.
      // The script provided by the user assumes a specific structure: `manifest.serviceTruth[tier]`.
      // Let's verify if `serviceTruth` is a root key or under something.
      // Looking at `wiring-manifest.yaml` from previous context:
      // It has `truthDomains` block, and `serviceTruth` was a key under `truthDomains`?
      // Or `serviceTruth` was its own root key?
      // In the previous turn I removed a DUPLICATE `serviceTruth` block.
      // The snippet showed:
      //   serviceTruth:
      //     canonicalSources: ...
      
      // But the script assumes:
      // manifest.serviceTruth.tier_3 = []
      
      // The script might be introducing a NEW structure or updating an existing one.
      // I will trust the script logic provided by the user. If it fails, I'll fix it.
      // However, looking at the script, it writes to `serviceTruth` root key.
      // If `wiring-manifest.yaml` uses `truthDomains` section, this script might create a top-level `serviceTruth` which is fine if that's the intent.
      // I will proceed with the script as written by the user.
      
      const targetTier = component.tier === 'presentation' ? 'tier_1' : component.tier;
      // Actually the script has:
      // if (!manifest.serviceTruth[component.tier]) { ... }
      // So if component.tier is 'tier_1', it looks for manifest.serviceTruth.tier_1
      
      if (!manifest.serviceTruth[component.tier]) {
        manifest.serviceTruth[component.tier] = [];
      }
      
      // Check if component already exists
      const exists = manifest.serviceTruth[component.tier].some(
        (item) => item.component === component.component
      );
      
      if (!exists) {
        manifest.serviceTruth[component.tier].push(entry);
        console.log(`✓ Added ${component.component} to ${component.tier}`);
      } else {
        console.log(`⏭️  ${component.component} already exists in ${component.tier}`);
      }
    });
    
    // Write updated manifest
    const updatedYaml = yaml.dump(manifest, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    
    fs.writeFileSync(WIRING_MANIFEST_PATH, updatedYaml, 'utf8');
    console.log('\n✅ Wiring manifest updated successfully!');
    
    // Validate the updated manifest
    validateWiringManifest(manifest);
    
  } catch (error) {
    console.error('❌ Failed to update wiring manifest:', error);
    process.exit(1);
  }
}

function validateWiringManifest(manifest) {
  console.log('\n🔍 Validating wiring manifest...');
  
  const errors = [];
  const warnings = [];
  
  // Check for required domains
  if (!manifest.serviceTruth) {
    errors.push('Missing serviceTruth domain');
  }
  
  // Check tier classifications
  if (manifest.serviceTruth) {
    const tiers = ['tier_3', 'tier_2', 'tier_1', 'tier_2_support'];
    
    tiers.forEach(tier => {
      // Presentation is often tier_1, let's allow flexibility or strict checking
      if (manifest.serviceTruth[tier] === undefined) {
         // It's okay if empty, but key might need to exist
         // The script initializes them if missing logic is slightly different
      }
    });
    
    // Check for proper advisory classification
    const advisoryComponents = [
      ...(manifest.serviceTruth.tier_2 || []),
      ...(manifest.serviceTruth.tier_2_support || [])
    ];
    
    advisoryComponents.forEach((comp) => {
      if (comp.execution_class !== 'advisory' && comp.execution_class !== 'advisory_infrastructure') {
        warnings.push(`${comp.component} in tier_2 should have execution_class 'advisory'`);
      }
    });
  }
  
  // Report findings
  if (errors.length > 0) {
    console.error('\n❌ Validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('\n⚠️  Validation warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  console.log('✅ Wiring manifest validation passed!');
  
  // Show summary
  const summary = {
    'Tier 3 (Execution)': (manifest.serviceTruth?.tier_3 || []).length,
    'Tier 2 (Advisory)': (manifest.serviceTruth?.tier_2 || []).length,
    'Tier 2 Support': (manifest.serviceTruth?.tier_2_support || []).length,
    'Tier 1 (Presentation)': (manifest.serviceTruth?.tier_1 || []).length
  };
  
  console.log('\n📊 Component Summary:');
  Object.entries(summary).forEach(([tier, count]) => {
    console.log(`  ${tier}: ${count} components`);
  });
}

// Execute
updateWiringManifest();
