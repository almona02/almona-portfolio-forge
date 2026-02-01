import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Tier 3: Protected Determinism - Execution Paths
// Constitutional Constraint: NO_AI_ML_IN_EXECUTION
const TIER_3_PATHS = [
    'src/algorithms',
    'src/lib/constitutional',
    'src/lib/pricing',
    'src/realityos_core'
];

// Forbidden imports in Tier 3
const FORBIDDEN_IMPORTS = [
    '@tensorflow/tfjs',
    '@huggingface/inference',
    '@google/generative-ai',
    'openai',
    'langchain',
    'anthropic',
    'replicate'
];

describe('Tier 3 Purity Verification', () => {
    const rootDir = path.resolve(__dirname, '../../../../'); 
    // Adjust path: src/lib/constitutional/__tests__ -> ../../../.. -> project root

    it('should not contain AI/ML imports in Tier 3 execution paths', () => {
        const violations: string[] = [];

        TIER_3_PATHS.forEach(dirPath => {
            const absolutePath = path.join(rootDir, dirPath);
            if (!fs.existsSync(absolutePath)) return;

            const files = getAllFiles(absolutePath);
            
            files.forEach(file => {
                if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
                
                // Skip test files
                if (file.includes('.test.') || file.includes('__tests__')) return;

                const content = fs.readFileSync(file, 'utf-8');
                
                FORBIDDEN_IMPORTS.forEach(forbidden => {
                    if (content.includes(`from '${forbidden}'`) || content.includes(`from "${forbidden}"`)) {
                        violations.push(`File ${file} imports forbidden library: ${forbidden}`);
                    }
                    if (content.includes(`require('${forbidden}')`) || content.includes(`require("${forbidden}")`)) {
                        violations.push(`File ${file} requires forbidden library: ${forbidden}`);
                    }
                });
            });
        });

        expect(violations).toEqual([]);
    });
});

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        if (fs.statSync(dirPath + '/' + file).isDirectory()) {
            getAllFiles(dirPath + '/' + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, '/', file));
        }
    });

    return arrayOfFiles;
}
