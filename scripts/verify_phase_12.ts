import { BoxGeometry, Group, Mesh } from 'three';
import { EGYPTIAN_PATTERNS } from '../src/data/egyptian-window-patterns';
import { Template3DAccuracyValidator } from '../src/lib/fabricator/Template3DAccuracyValidator';
import { ProjectTemplateLibrary } from '../src/lib/project/ProjectTemplateLibrary';
import { WindowUnit } from '../src/types/fabricator';

async function verifyPhase12() {
    console.log('🔍 Starting Phase 12 Verification (Integrity & Management)...\n');
    let errors: string[] = [];
    let successCount = 0;

    // 1. Verify Template3DAccuracyValidator.validateTemplate3DAccuracy (Geometry Check)
    try {
        console.log('🧪 Testing 3D Geometry Validation...');
        
        const mockPattern = EGYPTIAN_PATTERNS[0];
        const mockUnit: WindowUnit = {
            overallWidth: 2000,
            overallHeight: 1500
        } as any; // Partial

        // Create a Mock THREE.Group representing the model
        const mockGroup = new Group();
        
        // Add Frame Parts (BoxGeometries representing generated mesh)
        // Creating a box that is roughly the right size
        const overallMesh = new Mesh(new BoxGeometry(2, 1.5, 0.1)); // 2m x 1.5m
        overallMesh.name = "Frame_Assembly";
        mockGroup.add(overallMesh);

        // Add Glass Mesh to satisfy material check
        const glassMesh = new Mesh();
        glassMesh.name = "Glass_Panel"; 
        mockGroup.add(glassMesh);

        // Add dummy children to satisfy mesh count check (>4 total)
        mockGroup.add(new Mesh());
        mockGroup.add(new Mesh());
        mockGroup.add(new Mesh());

        const validation = Template3DAccuracyValidator.validateTemplate3DAccuracy(
            mockPattern, 
            mockUnit, 
            mockGroup
        );

        console.log(`   Score: ${validation.accuracyScore.toFixed(3)}`);
        
        if (validation.accuracyScore > 0.99) {
            console.log('✅ Validator: High accuracy score for perfect bounding box match');
            successCount++;
        } else {
            errors.push(`Validator: Score too low (${validation.accuracyScore}) for matching box`);
        }

        // Test Dimensional Mismatch
        const badGroup = new Group();
        const badMesh = new Mesh(new BoxGeometry(1.5, 1.5, 0.1)); // Width 1.5m vs 2.0m expected
        badGroup.add(badMesh);
        
        const badValidation = Template3DAccuracyValidator.validateTemplate3DAccuracy(
            mockPattern,
            mockUnit,
            badGroup
        );

        if (badValidation.dimensionalErrors.length > 0 && badValidation.accuracyScore < 0.9) {
             console.log('✅ Validator: Correctly detected dimensional mismatch');
             successCount++;
        } else {
            console.log('Bad Validation Result:', badValidation);
            errors.push('Validator: Failed to detect dimensional mismatch');
        }

    } catch (e) {
        errors.push(`Validator Geometry Test Failed: ${e}`);
    }

    // 2. Verify ProjectTemplateLibrary
    try {
        console.log('\n📚 Testing ProjectTemplateLibrary...');
        const templates = ProjectTemplateLibrary.getTemplates();
        
        if (templates.length >= 3) {
             console.log(`✅ ProjectTemplateLibrary: Found ${templates.length} templates`);
             successCount++;
        } else {
            errors.push('ProjectTemplateLibrary: Missing default templates');
        }

        const villaTemplate = ProjectTemplateLibrary.getTemplateById('villa-standard');
        if (villaTemplate && villaTemplate.targetMargin === 0.25) {
             console.log('✅ ProjectTemplateLibrary: "Villa Standard" template data verified');
             successCount++;
        } else {
            errors.push('ProjectTemplateLibrary: Villa template incorrect or missing');
        }

        const positions = ProjectTemplateLibrary.generatePositionsFromTemplate('villa-standard');
        if (positions.length === 4 && positions[0].status === 'draft') {
             console.log('✅ ProjectTemplateLibrary: Positions generation verified');
             successCount++;
        } else {
            errors.push('ProjectTemplateLibrary: Positions generation failed');
        }

    } catch (e) {
        errors.push(`ProjectTemplateLibrary Test Failed: ${e}`);
    }

    console.log('\n==========================================');
    if (errors.length === 0) {
        console.log(`🎉 PHASE 12 VERIFICATION SUCCESSFUL! (${successCount}/${successCount} checks passed)`);
        process.exit(0);
    } else {
        console.error(`❌ PHASE 12 VERIFICATION FAILED with ${errors.length} errors:`);
        errors.forEach(e => console.error(`- ${e}`));
        process.exit(1);
    }
}

verifyPhase12();
