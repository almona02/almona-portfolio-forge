/**
 * @tier Demo/Testing Infrastructure
 * @constitutional_compliance AICS-001 §8
 * 
 * YILMAZ Service Analytics - Simulation Demo
 * 
 * This demo script shows how the complete Wave 3 system works:
 * 1. Simulator generates realistic telemetry (Tier 1)
 * 2. Rules engine analyzes telemetry (Tier 3)
 * 3. Expert advisor generates bilingual advisory (Tier 2)
 * 4. Results displayed for human validation
 * 
 * Usage:
 *   import { runYilmazSimulationDemo } from '@/services/ticketing/yilmaz/core/YilmazSimulationDemo';
 *   runYilmazSimulationDemo();
 */

import { yilmazTelemetrySimulator, YilmazSimulatedTelemetry } from './YilmazTelemetrySimulator';
import { yilmazEgyptRulesEngine } from '../rules/YilmazEgyptRules';
import { yilmazExpertAdvisor } from '../advisory/YilmazExpertAdvisor';

/**
 * Demo: Khamsin Season Scenario (March-May)
 */
export async function demoKhamsinSeason() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🌪️  DEMO: Khamsin Season Dust Storm (March-May)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Generate simulated telemetry with Khamsin conditions
  const telemetry = yilmazTelemetrySimulator.generateTelemetry(
    'YIL-2019-07812', // Older AIM 4410 in Cairo
    { forceKhamsin: true }
  );

  console.log('📊 SIMULATED TELEMETRY:');
  console.log(`Machine: ${telemetry.machineModel} (${telemetry.machineSerial})`);
  console.log(`Customer: ${telemetry.customer}`);
  console.log(`Location: ${telemetry.location}`);
  console.log(`Dust Level: ${telemetry.dustLevel}/5 ⚠️`);
  console.log(`Spindle Temp: ${telemetry.spindleTempCelsius}°C`);
  console.log(`Hydraulic Pressure: ${telemetry.hydraulicPressureBar} bar`);
  console.log(`Input Voltage: ${telemetry.inputVoltage}V`);
  console.log(`Symptoms: ${telemetry.symptoms.join(', ')}`);
  console.log(`Note: ${telemetry.simulationNote}\n`);

  // Convert to technician input format
  const technicianInput = yilmazTelemetrySimulator.toTechnicianInput(telemetry);

  // Execute Tier 3 deterministic rules
  console.log('🔧 TIER 3: DETERMINISTIC RULES ENGINE');
  const ruleResult = yilmazEgyptRulesEngine.executeRules(technicianInput);
  console.log(`Rule Matched: ${ruleResult.ruleMatched ? 'YES' : 'NO'}`);
  if (ruleResult.ruleMatched) {
    console.log(`Rule ID: ${ruleResult.ruleId}`);
    console.log(`Category: ${ruleResult.category}`);
    console.log(`Urgency: ${ruleResult.urgency.toUpperCase()}`);
    console.log(`Parts Required: ${ruleResult.recommendedParts.length}`);
    console.log(`Total Cost: ${ruleResult.totalCostEGP.toLocaleString('en-EG')} EGP`);
    console.log(`Estimated Downtime: ${ruleResult.estimatedDowntimeHours} hours\n`);
  }

  // Generate Tier 2 advisory
  console.log('💡 TIER 2: EXPERT ADVISORY');
  const advisory = await yilmazExpertAdvisor.generateAdvisory(technicianInput);
  console.log(`Confidence: ${(advisory.confidence * 100).toFixed(0)}%`);
  console.log(`Urgency: ${advisory.urgency.toUpperCase()}`);
  console.log(`\n--- SUGGESTION (EN) ---`);
  console.log(advisory.suggestionEn);
  console.log(`\n--- اقتراح (AR) ---`);
  console.log(advisory.suggestionAr);
  
  if (advisory.seasonalWarningEn) {
    console.log(`\n⚠️ SEASONAL WARNING:`);
    console.log(advisory.seasonalWarningEn);
  }

  console.log(`\n--- REQUIRED PARTS ---`);
  advisory.recommendedParts.forEach(part => {
    console.log(`• ${part.nameEn} (${part.partNumber})`);
    console.log(`  ${part.priceEGP.toLocaleString('en-EG')} EGP | Stock: ${part.stockLevel} | Lead: ${part.leadTimeDays} days`);
  });

  console.log(`\n✅ TOTAL COST: ${advisory.totalCostEGP.toLocaleString('en-EG')} EGP`);
  console.log(`⏱️  DOWNTIME: ${advisory.estimatedDowntimeHours} hours`);
  console.log(`🆔 ADVISORY ID: ${advisory.advisoryId}`);
  
  console.log(`\n⚖️  CONSTITUTIONAL DISCLAIMER:`);
  console.log(advisory.constitutionalDisclaimer.substring(0, 150) + '...');
  console.log(`\n🔒 Requires Human Validation: ${advisory.requiresHumanValidation ? 'YES' : 'NO'}`);
  console.log('\n');
}

/**
 * Demo: Voltage Fluctuation Scenario
 */
export async function demoVoltageFluctuation() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('⚡ DEMO: Egypt Grid Voltage Fluctuation');
  console.log('═══════════════════════════════════════════════════════════\n');

  const telemetry = yilmazTelemetrySimulator.generateTelemetry(
    'YIL-2020-05234', // AIM 7510 in Alexandria
    { forceVoltageIssue: true }
  );

  console.log('📊 SIMULATED TELEMETRY:');
  console.log(`Machine: ${telemetry.machineModel} (${telemetry.machineSerial})`);
  console.log(`Input Voltage: ${telemetry.inputVoltage}V 🚨`);
  console.log(`Symptoms: ${telemetry.symptoms.join(', ')}\n`);

  const technicianInput = yilmazTelemetrySimulator.toTechnicianInput(telemetry);
  const advisory = await yilmazExpertAdvisor.generateAdvisory(technicianInput);

  console.log(`💡 ADVISORY: ${advisory.ruleId || 'No specific rule matched'}`);
  console.log(`Urgency: ${advisory.urgency.toUpperCase()}`);
  console.log(`Cost: ${advisory.totalCostEGP.toLocaleString('en-EG')} EGP`);
  console.log(`Parts: ${advisory.recommendedParts.map(p => p.partNumber).join(', ')}\n`);
}

/**
 * Demo: Summer Overheating Scenario
 */
export async function demoSummerOverheating() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔥 DEMO: Summer Overheating (June-September)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const telemetry = yilmazTelemetrySimulator.generateTelemetry(
    'YIL-2024-01103', // New ALM 6510 in Giza
    { forceSummer: true, forceOverheating: true }
  );

  console.log('📊 SIMULATED TELEMETRY:');
  console.log(`Machine: ${telemetry.machineModel} (${telemetry.machineSerial})`);
  console.log(`Spindle Temp: ${telemetry.spindleTempCelsius}°C 🔥`);
  console.log(`Ambient Temp: ${telemetry.ambientTempCelsius}°C`);
  console.log(`Symptoms: ${telemetry.symptoms.join(', ')}\n`);

  const technicianInput = yilmazTelemetrySimulator.toTechnicianInput(telemetry);
  const advisory = await yilmazExpertAdvisor.generateAdvisory(technicianInput);

  console.log(`💡 ADVISORY: ${advisory.ruleId || 'No specific rule matched'}`);
  console.log(`Urgency: ${advisory.urgency.toUpperCase()}`);
  console.log(`Cost: ${advisory.totalCostEGP.toLocaleString('en-EG')} EGP`);
  
  if (advisory.seasonalWarningEn) {
    console.log(`\n⚠️ ${advisory.seasonalWarningEn}\n`);
  }
}

/**
 * Demo: Fleet-Wide Telemetry
 */
export async function demoFleetWide() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏭 DEMO: Fleet-Wide Telemetry (All Machines)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const allTelemetry = yilmazTelemetrySimulator.generateAllMachines({ forceKhamsin: true });

  console.log(`Total Machines: ${allTelemetry.length}\n`);

  for (const telemetry of allTelemetry) {
    console.log(`📍 ${telemetry.customer} (${telemetry.location})`);
    console.log(`   Machine: ${telemetry.machineModel} | Serial: ${telemetry.machineSerial}`);
    console.log(`   Dust: ${telemetry.dustLevel}/5 | Spindle: ${telemetry.spindleTempCelsius}°C | Voltage: ${telemetry.inputVoltage}V`);
    
    const technicianInput = yilmazTelemetrySimulator.toTechnicianInput(telemetry);
    const ruleResult = yilmazEgyptRulesEngine.executeRules(technicianInput);
    
    if (ruleResult.ruleMatched) {
      console.log(`   ⚠️ Alert: ${ruleResult.ruleId} | Urgency: ${ruleResult.urgency.toUpperCase()} | Cost: ${ruleResult.totalCostEGP} EGP`);
    } else {
      console.log(`   ✅ Normal operation`);
    }
    console.log('');
  }
}

/**
 * Run all demos
 */
export async function runYilmazSimulationDemo() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║    YILMAZ Service Analytics - Wave 3 Simulation Demo     ║');
  console.log('║    Almona Portfolio Forge | AICS-001 Compliant           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  await demoKhamsinSeason();
  
  console.log('Press Enter to continue...\n');
  // await new Promise(resolve => setTimeout(resolve, 1000));
  
  await demoVoltageFluctuation();
  await demoSummerOverheating();
  await demoFleetWide();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ DEMO COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('💡 KEY TAKEAWAYS:');
  console.log('   • Simulator generates realistic Egyptian conditions');
  console.log('   • Tier 3 rules engine provides deterministic analysis');
  console.log('   • Tier 2 advisory generates bilingual recommendations');
  console.log('   • All advisories require human validation (AICS-001)');
  console.log('   • $0 hardware investment - Human-as-a-Sensor methodology');
  console.log('\n');
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runYilmazSimulationDemo().catch(console.error);
}
