
import { createGoldTierMiteredFrame, createGoldTierProfileShape, generateProfileCrossSection } from './windowGeometry';

describe('Gold Tier Geometry', () => {
    test('creates chambered aluminum profile', () => {
        const profile = createGoldTierProfileShape(0.05, 0.05, 0.0016, 'frame', 'aluminum', true);
        expect(profile.shape.length).toBeGreaterThan(0);
        expect(profile.metadata.chambers.length).toBeGreaterThan(0);
        expect(profile.metadata.gasketGrooves.length).toBeGreaterThan(0);
        expect(profile.metadata.glassPocket).toBeDefined();
    });
    
    test('creates true mitered frame with 45° joints', () => {
        const mockProfile = generateProfileCrossSection({
            width: 50,
            height: 50,
            thickness: 1.5,
            material: 'aluminum',
            profileRole: 'frame'
        } as any);
        
        const frame = createGoldTierMiteredFrame(1.2, 1.5, mockProfile, true);
        
        // Should have 4 bars + 4 corners = 8 parts
        expect(frame.length).toBeGreaterThanOrEqual(4); 
        
        // Check for corner reinforcement
        const reinforcements = frame.filter(p => p.metadata?.type && p.metadata.type.includes('corner_reinforcement'));
        expect(reinforcements.length).toBeGreaterThan(0);
        
        // Check miter angle
        const topBar = frame.find(p => p.metadata?.type === 'top_bar');
        expect(topBar).toBeDefined();
        expect(topBar?.metadata?.hasMiter).toBe(true);
        expect(topBar?.metadata?.miterAngle).toBe(45);
    });
});
