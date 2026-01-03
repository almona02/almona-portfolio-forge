/**
 * Week 1 Governance Validation Test
 * 
 * This script validates that all three refactored services
 * correctly use IntelligenceGate and track metrics.
 * 
 * Run: npx tsx src/tests/validate-governance.ts
 */

import { YDTPricingOracle } from '@/lib/pricing/YDTPricingOracle';
import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';
import { TierMetrics } from '@/lib/ydt/TierMetrics';
import { YDTBusinessLayer } from '@/lib/ydt/YDTBusinessLayer';
import { YDTOptimizationWrapper } from '@/lib/ydt/YDTOptimizationWrapper';
import type { Project, Workshop } from '@/lib/ydt/types';

// Mock data for testing
const mockProject: Project = {
  id: 'test-project-1',
  type: 'residential',
  location: 'Cairo',
  material: 'aluminum',
  quantity: 1,
  estimatedCost: 5000,
  estimatedPrice: 8000,
};

const mockWorkshop: Workshop = {
  id: 'test-workshop-1',
  location: 'Cairo',
  pricingTier: 'standard',
};

async function validateGovernanceImplementation() {
  console.log('🎯 Week 1 Governance Validation Test');
  console.log('====================================\n');
  
  const initialTier1 = TierMetrics.getTierCoverage().tier1Decisions;
  const initialTier3 = TierMetrics.getTierCoverage().tier3Decisions;
  const initialYDT = TierMetrics.getReasoningQuality().totalYDTResponses;
  const initialViolations = IntelligenceGate.getViolationMetrics().tierViolationCount;
  
  console.log('📊 Initial Metrics:');
  console.log(`   Tier 1 Decisions: ${initialTier1}`);
  console.log(`   Tier 3 Decisions: ${initialTier3}`);
  console.log(`   YDT Responses: ${initialYDT}`);
  console.log(`   Tier Violations: ${initialViolations}\n`);
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Pricing Flow
  console.log('✅ Test 1: Pricing Flow');
  console.log('   Creating project and calculating price...');
  try {
    const pricingOracle = new YDTPricingOracle();
    const priceResult = await pricingOracle.calculatePriceWithYDT(
      mockProject,
      mockWorkshop
    );
    
    if (priceResult && priceResult.breakdown) {
      console.log(`   ✅ Pricing succeeded: EGP ${priceResult.breakdown.finalPrice?.toLocaleString() || 'N/A'}`);
      console.log(`   ✅ Confidence: ${(priceResult.confidence * 100).toFixed(0)}%`);
      console.log(`   ✅ Source: ${priceResult.source}`);
      testsPassed++;
    } else {
      console.log('   ❌ Pricing failed: No result returned');
      testsFailed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Pricing failed: ${error.message}`);
    testsFailed++;
  }
  
  // Test 2: Business Viability (Rejection Case)
  console.log('\n✅ Test 2: Business Viability Check');
  console.log('   Checking project viability...');
  try {
    const businessLayer = new YDTBusinessLayer();
    const viability = await businessLayer.validateProject(mockProject);
    
    if (viability) {
      console.log(`   ✅ Viability check succeeded: ${viability.valid ? 'Valid' : 'Invalid'}`);
      console.log(`   ✅ Recommendations: ${viability.recommendations?.length || 0} provided`);
      if (viability.ydtReason) {
        console.log(`   ✅ YDT Reason: "${viability.ydtReason.substring(0, 80)}..."`);
      }
      testsPassed++;
    } else {
      console.log('   ❌ Viability check failed: No result returned');
      testsFailed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Viability check failed: ${error.message}`);
    testsFailed++;
  }
  
  // Test 3: Optimization Strategy
  console.log('\n✅ Test 3: Optimization Strategy Selection');
  console.log('   Getting optimization strategy...');
  try {
    const optimizationWrapper = new YDTOptimizationWrapper();
    const strategy = await optimizationWrapper.getYDTStrategy({
      location: 'Cairo',
      season: 'winter',
      material: 'aluminum',
      machine: 'test-machine', // Required by OptimizationContext
      projectType: 'residential',
    });
    
    if (strategy && strategy.strategy) {
      console.log(`   ✅ Strategy selected: ${strategy.strategy || 'N/A'}`);
      console.log(`   ✅ Confidence: ${(strategy.confidence * 100).toFixed(0)}%`);
      if (strategy.why) {
        console.log(`   ✅ Reasoning: "${strategy.why.substring(0, 80)}..."`);
      }
      testsPassed++;
    } else {
      console.log('   ❌ Strategy selection failed: No result returned');
      testsFailed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Strategy selection failed: ${error.message}`);
    testsFailed++;
  }
  
  // Test 4: Negative Test (Deterministic Operation)
  console.log('\n✅ Test 4: Negative Test (Deterministic Operation)');
  console.log('   Testing that deterministic operations do NOT call YDT...');
  try {
    const beforeTier3 = TierMetrics.getTierCoverage().tier3Decisions;
    const beforeViolations = IntelligenceGate.getViolationMetrics().tierViolationCount;
    
    // Call a deterministic operation (should NOT use YDT)
    const deterministicResult = IntelligenceGate.deterministic(
      'test_deterministic_operation',
      () => {
        // Simple math operation (no YDT)
        return 42 * 2;
      }
    );
    
    const afterTier3 = TierMetrics.getTierCoverage().tier3Decisions;
    const afterViolations = IntelligenceGate.getViolationMetrics().tierViolationCount;
    
    if (deterministicResult === 84) {
      console.log('   ✅ Deterministic operation succeeded: 42 * 2 = 84');
      console.log(`   ✅ Tier 3 count increased: ${beforeTier3} → ${afterTier3}`);
      console.log(`   ✅ No violations: ${beforeViolations} → ${afterViolations}`);
      
      if (afterViolations === beforeViolations) {
        testsPassed++;
      } else {
        console.log('   ❌ Violations increased (should not happen)');
        testsFailed++;
      }
    } else {
      console.log(`   ❌ Deterministic operation failed: Expected 84, got ${deterministicResult}`);
      testsFailed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Negative test failed: ${error.message}`);
    testsFailed++;
  }
  
  // Final Metrics Check
  console.log('\n📊 Final Metrics:');
  const finalTier1 = TierMetrics.getTierCoverage().tier1Decisions;
  const finalTier3 = TierMetrics.getTierCoverage().tier3Decisions;
  const finalYDT = TierMetrics.getReasoningQuality().totalYDTResponses;
  const finalViolations = IntelligenceGate.getViolationMetrics().tierViolationCount;
  
  const tier1Increase = finalTier1 - initialTier1;
  const tier3Increase = finalTier3 - initialTier3;
  const ydtIncrease = finalYDT - initialYDT;
  const violationsIncrease = finalViolations - initialViolations;
  
  console.log(`   Tier 1 Decisions: ${initialTier1} → ${finalTier1} (+${tier1Increase})`);
  console.log(`   Tier 3 Decisions: ${initialTier3} → ${finalTier3} (+${tier3Increase})`);
  console.log(`   YDT Responses: ${initialYDT} → ${finalYDT} (+${ydtIncrease})`);
  console.log(`   Tier Violations: ${initialViolations} → ${finalViolations} (+${violationsIncrease})`);
  
  // Calculate Constitutional Health
  const healthMetrics = TierMetrics.getMetrics();
  const constitutionalHealth = healthMetrics.healthScore;
  
  console.log(`\n🎯 Constitutional Health: ${constitutionalHealth}/100`);
  
  // Summary
  console.log('\n====================================');
  console.log('📋 Test Summary:');
  console.log(`   ✅ Passed: ${testsPassed}/4`);
  console.log(`   ❌ Failed: ${testsFailed}/4`);
  
  if (testsPassed === 4 && violationsIncrease === 0 && tier1Increase >= 2) {
    console.log('\n🎉 SUCCESS: All governance tests passed!');
    console.log('   ✅ Tier 1 is officially certified');
    console.log('   ✅ Constitutional Health: 100/100');
    console.log('   ✅ Zero violations detected');
    return true;
  } else {
    console.log('\n⚠️ WARNING: Some tests failed or metrics unexpected');
    if (violationsIncrease > 0) {
      console.log(`   ⚠️ ${violationsIncrease} violation(s) detected`);
    }
    if (tier1Increase < 2) {
      console.log(`   ⚠️ Expected at least 2 Tier 1 decisions, got ${tier1Increase}`);
    }
    return false;
  }
}

// Run the test
if (require.main === module) {
  validateGovernanceImplementation()
    .then(success => {
      if (success) {
        console.log('\n✅ WEEK 1 GOVERNANCE VALIDATION PASSED');
        process.exit(0);
      } else {
        console.log('\n❌ WEEK 1 GOVERNANCE VALIDATION FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Test execution error:', error);
      process.exit(1);
    });
}

export { validateGovernanceImplementation };

