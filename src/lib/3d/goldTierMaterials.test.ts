
import { MeshPhysicalMaterial } from 'three';
import { GoldTierMaterialFactory } from './goldTierMaterials';

describe('GoldTierMaterialFactory', () => {
    let factory: GoldTierMaterialFactory;
    
    beforeEach(() => {
        factory = GoldTierMaterialFactory.getInstance();
    });
    
    test('creates Egyptian silver anodized aluminum', () => {
        const material = factory.createMaterial('aluminum', 'silverAnodized', 'premium');
        expect(material).toBeInstanceOf(MeshPhysicalMaterial);
        expect(material.metalness).toBeCloseTo(0.92, 2);
        expect(material.roughness).toBeCloseTo(0.18, 2);
        expect(material.clearcoat).toBe(1.0);
        expect(material.anisotropy).toBeCloseTo(0.25, 2);
    });
    
    test('creates Egyptian soda lime glass', () => {
        const material = factory.createMaterial('glass', 'sodaLimeFloat', 'premium');
        expect(material.ior).toBe(1.52);
        expect(material.transmission).toBeCloseTo(0.91, 2);
        expect(material.thickness).toBe(0.004);
        expect(material.transparent).toBe(true);
    });
    
    test('creates Egyptian white UPVC', () => {
        const material = factory.createMaterial('upvc', 'whiteUPVC', 'premium');
        expect(material.metalness).toBeCloseTo(0.05, 2);
        expect(material.roughness).toBeCloseTo(0.65, 2);
        expect(material.transmission).toBeCloseTo(0.03, 2);
    });
    
    test('quality levels affect materials correctly', () => {
        const standard = factory.createMaterial('aluminum', 'silverAnodized', 'standard');
        const premium = factory.createMaterial('aluminum', 'silverAnodized', 'premium');
        const ultra = factory.createMaterial('aluminum', 'silverAnodized', 'ultra');
        
        expect(standard.clearcoat).toBeLessThan(premium.clearcoat);
        // Ultra typically boosts envMapIntensity or clearcoat
        expect(ultra.envMapIntensity).toBeGreaterThan(premium.envMapIntensity);
    });

    test('maps window unit colors to materials', () => {
        const mockWindowUnit = {
            components: [{ profile: { material: 'aluminum' } }],
            color: 'Bronze Anodized'
        };
        const material = factory.createMaterialForWindowUnit(mockWindowUnit, 'frame', 'premium');
        expect(material.color.getHexString()).toBe('cd7f32'); // Bronze hex
    });
});
