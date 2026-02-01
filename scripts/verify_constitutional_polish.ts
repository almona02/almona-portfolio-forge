import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EGYPTIAN_PATTERNS } from '../src/data/egyptian-window-patterns';
import { Template3DAccuracyValidator } from '../src/lib/fabricator/Template3DAccuracyValidator';
import { WindowUnit } from '../src/types/fabricator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

async function verifyConstitutionalPolish() {
  console.log('🔍 Starting Constitutional Polish Verification...\n');
  let errors: string[] = [];
  let successCount = 0;

  // 1. Verify CommercialPDFService.ts Disclaimers
  try {
    const pdfPath = path.join(projectRoot, 'src', 'services', 'commercial', 'CommercialPDFService.ts');
    const pdfContent = fs.readFileSync(pdfPath, 'utf-8');
    
    // Check for Disclaimer headers
    const disclaimerMatches = (pdfContent.match(/CONSTITUTIONAL DISCLAIMER:/g) || []).length;
    if (disclaimerMatches >= 2) {
      console.log('✅ CommercialPDFService: Found Constitutional Disclaimers (Quote & Invoice)');
      successCount++;
    } else {
      errors.push(`CommercialPDFService: Expected 2+ 'CONSTITUTIONAL DISCLAIMER' strings, found ${disclaimerMatches}`);
    }

    // Check for the disclaimer text itself
    if (pdfContent.includes('Accuracy framework: 99.8% (Tier 3 Protected Determinism)')) {
      console.log('✅ CommercialPDFService: Disclaimer text verified');
      successCount++;
    } else {
      errors.push('CommercialPDFService: Disclaimer text missing');
    }
  } catch (e) {
    errors.push(`CommercialPDFService Check Failed: ${e}`);
  }

  // 2. Verify QuotingEngine.ts Metadata
  try {
    const quotePath = path.join(projectRoot, 'src', 'modules', 'commercial', 'QuotingEngine.ts');
    const quoteContent = fs.readFileSync(quotePath, 'utf-8');

    if (quoteContent.includes('constitutionalMetadata?: {')) {
        console.log('✅ QuotingEngine: Quote interface metadata field verified');
        successCount++;
    } else {
        errors.push('QuotingEngine: Quote interface missing constitutionalMetadata');
    }

    if (quoteContent.includes('constitutionalMetadata: {') && quoteContent.includes('Tier 3 Protected Determinism')) {
        console.log('✅ QuotingEngine: generateQuote implementation metadata verified');
        successCount++;
    } else {
        errors.push('QuotingEngine: generateQuote missing metadata implementation');
    }
  } catch (e) {
    errors.push(`QuotingEngine Check Failed: ${e}`);
  }

  // 3. Verify Window3DGenerator.tsx Overlay & Integrity
  try {
    const generatorPath = path.join(projectRoot, 'src', 'components', 'fabricator', 'Window3DGenerator.tsx');
    const generatorContent = fs.readFileSync(generatorPath, 'utf-8');

    // Check for Overlay
    if (generatorContent.includes('CONSTITUTIONAL DISCLAIMER') && generatorContent.includes('Requires Human Validation')) {
        console.log('✅ Window3DGenerator: 3D Overlay verified');
        successCount++;
    } else {
        errors.push('Window3DGenerator: 3D Overlay missing');
    }

    // Check for Commented out BoxGeometry (Integrity Fix)
    // Looking for the commented out block start
    if (generatorContent.includes('// if (part.useBoxGeometry && part.boxSize)')) {
        console.log('✅ Window3DGenerator: BoxGeometry optimization correctly disabled (Integrity Safe)');
        successCount++;
    } else {
        errors.push('Window3DGenerator: BoxGeometry optimization NOT disabled (Potential Fragmentation)');
    }
  } catch (e) {
    errors.push(`Window3DGenerator Check Failed: ${e}`);
  }

  // 4. Verify Template3DAccuracyValidator Functionality
  try {
    console.log('\n🧪 Testing Template3DAccuracyValidator...');
    
    // Mock Data
    const mockPattern = EGYPTIAN_PATTERNS[0]; // sliding-2s
    const mockUnit: WindowUnit = {
        id: 'test-unit',
        orderNumber: 'ORD-001',
        posNumber: 'POS-001',
        type: 'sliding',
        overallWidth: 2000,
        overallHeight: 1500,
        color: 'white',
        glazing: {},
        hardware: [],
        status: 'draft',
        optimization: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        components: [
            { type: 'frame', id: 'f1', profileId: 'p1', length: 2000, cutAngles: [45, 45], matrix: [] as any },
            { type: 'frame', id: 'f2', profileId: 'p1', length: 2000, cutAngles: [45, 45], matrix: [] as any },
            { type: 'frame', id: 'f3', profileId: 'p1', length: 1500, cutAngles: [45, 45], matrix: [] as any },
            { type: 'frame', id: 'f4', profileId: 'p1', length: 1500, cutAngles: [45, 45], matrix: [] as any },
            { type: 'glass', id: 'g1', width: 900, height: 1400, thickness: 24, type: 'clear' }
        ],
        grid: {
            rows: 1,
            cols: 2, // Matches sliding-2s
            cells: [
                { id: '0-0', row: 0, col: 0, type: 'sliding' },
                { id: '0-1', row: 0, col: 1, type: 'sliding' }
            ],
            colWidths: [1, 1], // Matches sliding-2s
            rowHeights: [1]
        }
    } as any; // Cast to avoid full type mocking complexity if unnecessary

    const result = Template3DAccuracyValidator.validatePatternAccuracy(mockUnit, mockPattern);

    if (result.isValid) {
        console.log(`✅ Validator: Accuracy Check Passed (Score: ${result.accuracy}%, Tier: ${result.complianceTier})`);
        successCount++;
    } else {
        console.error('Validator Result:', JSON.stringify(result, null, 2));
        errors.push('Validator: Failed on valid mock data');
    }

    // Test Failure Case (Missing Components)
    const badUnit = { ...mockUnit, components: [] };
    const badResult = Template3DAccuracyValidator.validatePatternAccuracy(badUnit as any, mockPattern);
    
    if (!badResult.isValid && badResult.deviations.length > 0) {
         console.log('✅ Validator: Correctly detected component integrity failure');
         successCount++;
    } else {
         errors.push('Validator: Failed to detect component integrity failure');
    }

  } catch (e) {
    errors.push(`Validator Functional Test Failed: ${e}`);
    console.error(e);
  }

  console.log('\n==========================================');
  if (errors.length === 0) {
    console.log(`🎉 VERIFICATION SUCCESSFUL! (${successCount}/${successCount} checks passed)`);
    console.log('Constitutional Polish is fully applied and verified.');
    process.exit(0);
  } else {
    console.error(`❌ VERIFICATION FAILED with ${errors.length} errors:`);
    errors.forEach(e => console.error(`- ${e}`));
    process.exit(1);
  }
}

verifyConstitutionalPolish();
