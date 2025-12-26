/**
 * Unit Tests for Quick Order Mode
 * 
 * Tests the quick order engine, templates, and keyboard shortcuts
 * 
 * @since Phase 1: Special Presets (Weeks 3-4)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuickOrderEngine, type QuickOrderParams } from '@/lib/quick/QuickOrderEngine';
import { FabricatorTemplates } from '@/lib/quick/FabricatorTemplates';
import { KeyboardShortcuts } from '@/lib/quick/KeyboardShortcuts';
import type { WindowUnit } from '@/types/fabricator';

describe('QuickOrderEngine', () => {
  let engine: QuickOrderEngine;

  beforeEach(() => {
    engine = new QuickOrderEngine();
  });

  describe('createQuickOrder', () => {
    it('should create window unit from parameters', async () => {
      const params: QuickOrderParams = {
        dimensions: { width: 1800, height: 1500 },
        systemPackId: 'rock60',
        windowType: 'sliding_window',
        color: 'Silver',
        glazingType: 'double'
      };

      const result = await engine.createQuickOrder(params);

      expect(result.windowUnit).toBeDefined();
      expect(result.windowUnit.overallWidth).toBe(1800);
      expect(result.windowUnit.overallHeight).toBe(1500);
      expect(result.windowUnit.systemPackId).toBe('rock60');
      expect(result.windowUnit.type).toBe('sliding_window');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should apply template if provided', async () => {
      // Create a template first
      const templateManager = new FabricatorTemplates();
      const template = await templateManager.saveTemplate({
        name: 'Test Template',
        category: 'custom',
        windowUnit: {
          type: 'casement',
          color: 'White',
          systemPackId: 'jumbo100'
        }
      });

      const params: QuickOrderParams = {
        templateId: template.id,
        dimensions: { width: 2000, height: 1600 },
        systemPackId: 'rock60',
        windowType: 'sliding_window'
      };

      const result = await engine.createQuickOrder(params);

      // Should use template values where provided
      expect(result.windowUnit.type).toBe('casement'); // From template
      expect(result.windowUnit.color).toBe('White'); // From template
      expect(result.windowUnit.overallWidth).toBe(2000); // From params
    });

    it('should generate unique order numbers', async () => {
      const params: QuickOrderParams = {
        dimensions: { width: 1800, height: 1500 },
        systemPackId: 'rock60',
        windowType: 'sliding_window'
      };

      const result1 = await engine.createQuickOrder(params);
      const result2 = await engine.createQuickOrder(params);

      expect(result1.windowUnit.orderNumber).not.toBe(result2.windowUnit.orderNumber);
    });
  });

  describe('getQuickDefaults', () => {
    it('should return defaults for known system packs', () => {
      const defaults = engine.getQuickDefaults('rock60');
      expect(defaults.windowType).toBe('sliding_window');
      expect(defaults.color).toBe('Silver');
    });

    it('should return generic defaults for unknown system packs', () => {
      const defaults = engine.getQuickDefaults('unknown-pack');
      expect(defaults.windowType).toBe('sliding_window');
      expect(defaults.color).toBe('Silver');
    });
  });
});

describe('FabricatorTemplates', () => {
  let templateManager: FabricatorTemplates;

  beforeEach(() => {
    templateManager = new FabricatorTemplates();
    // Clear templates before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveTemplate', () => {
    it('should save and load template', async () => {
      const template = await templateManager.saveTemplate({
        name: 'Test Template',
        description: 'Test description',
        category: 'residential',
        windowUnit: {
          type: 'sliding_window',
          systemPackId: 'rock60',
          color: 'Silver'
        }
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.createdAt).toBeInstanceOf(Date);

      const loaded = await templateManager.loadTemplate(template.id);
      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe('Test Template');
    });

    it('should increment usage count on load', async () => {
      const template = await templateManager.saveTemplate({
        name: 'Test Template',
        category: 'custom',
        windowUnit: {}
      });

      await templateManager.loadTemplate(template.id);
      await templateManager.loadTemplate(template.id);

      const loaded = await templateManager.loadTemplate(template.id);
      expect(loaded?.usageCount).toBe(3);
    });
  });

  describe('searchTemplates', () => {
    it('should search templates by name', async () => {
      await templateManager.saveTemplate({
        name: 'Residential Sliding',
        category: 'residential',
        windowUnit: {}
      });
      await templateManager.saveTemplate({
        name: 'Commercial Fixed',
        category: 'commercial',
        windowUnit: {}
      });

      const results = await templateManager.searchTemplates('Residential');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Residential Sliding');
    });
  });

  describe('getMostUsedTemplates', () => {
    it('should return templates sorted by usage', async () => {
      const t1 = await templateManager.saveTemplate({
        name: 'Template 1',
        category: 'custom',
        windowUnit: {}
      });
      const t2 = await templateManager.saveTemplate({
        name: 'Template 2',
        category: 'custom',
        windowUnit: {}
      });

      // Load t2 multiple times
      await templateManager.loadTemplate(t2.id);
      await templateManager.loadTemplate(t2.id);

      const mostUsed = await templateManager.getMostUsedTemplates(10);
      expect(mostUsed[0].id).toBe(t2.id);
    });
  });
});

describe('KeyboardShortcuts', () => {
  let shortcuts: KeyboardShortcuts;
  let handlerCalled: boolean;

  beforeEach(() => {
    shortcuts = new KeyboardShortcuts();
    handlerCalled = false;
  });

  it('should register and trigger handlers', () => {
    shortcuts.on('new_project', () => {
      handlerCalled = true;
    });

    // Simulate keyboard event
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true
    });
    window.dispatchEvent(event);

    expect(handlerCalled).toBe(true);
  });

  it('should get all registered shortcuts', () => {
    const allShortcuts = shortcuts.getShortcuts();
    expect(allShortcuts.length).toBeGreaterThan(0);
    expect(allShortcuts.some(s => s.action === 'new_project')).toBe(true);
  });

  it('should enable and disable shortcuts', () => {
    let called = false;
    shortcuts.on('new_project', () => {
      called = true;
    });

    shortcuts.disable();
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true
    });
    window.dispatchEvent(event);
    expect(called).toBe(false);

    shortcuts.enable();
    window.dispatchEvent(event);
    expect(called).toBe(true);
  });
});


