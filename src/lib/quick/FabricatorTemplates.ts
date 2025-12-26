/**
 * FabricatorTemplates - Save/Load Expert Designs
 * 
 * Allows expert fabricators to save and reuse common window configurations:
 * - Template management (save, load, delete)
 * - Template categories (residential, commercial, custom)
 * - Template sharing (future: between workshops)
 * 
 * @since Phase 1: Special Presets (Weeks 3-4)
 */

import type { WindowUnit } from '@/types/fabricator';

export interface FabricatorTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'residential' | 'commercial' | 'custom';
  windowUnit: Partial<WindowUnit>;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  usageCount?: number;
}

/**
 * FabricatorTemplates - Template management system
 */
export class FabricatorTemplates {
  private storageKey = 'fabricator_templates';

  /**
   * Save a template
   */
  async saveTemplate(template: Omit<FabricatorTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<FabricatorTemplate> {
    const templates = await this.loadAllTemplates();
    
    const newTemplate: FabricatorTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };

    templates.push(newTemplate);
    await this.saveAllTemplates(templates);

    return newTemplate;
  }

  /**
   * Load a template by ID
   */
  async loadTemplate(templateId: string): Promise<FabricatorTemplate | null> {
    const templates = await this.loadAllTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      // Increment usage count
      template.usageCount = (template.usageCount || 0) + 1;
      template.updatedAt = new Date();
      await this.saveAllTemplates(templates);
    }

    return template || null;
  }

  /**
   * Load all templates
   */
  async loadAllTemplates(): Promise<FabricatorTemplate[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];

      const templates = JSON.parse(stored);
      // Convert date strings back to Date objects
      return templates.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to load templates:', error);
      return [];
    }
  }

  /**
   * Save all templates
   */
  private async saveAllTemplates(templates: FabricatorTemplate[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(templates));
    } catch (error) {
      console.error('Failed to save templates:', error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const templates = await this.loadAllTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    
    if (filtered.length === templates.length) {
      return false; // Template not found
    }

    await this.saveAllTemplates(filtered);
    return true;
  }

  /**
   * Search templates by name or tags
   */
  async searchTemplates(query: string): Promise<FabricatorTemplate[]> {
    const templates = await this.loadAllTemplates();
    const lowerQuery = query.toLowerCase();

    return templates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery) ||
      t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: FabricatorTemplate['category']): Promise<FabricatorTemplate[]> {
    const templates = await this.loadAllTemplates();
    return templates.filter(t => t.category === category);
  }

  /**
   * Get most used templates
   */
  async getMostUsedTemplates(limit: number = 10): Promise<FabricatorTemplate[]> {
    const templates = await this.loadAllTemplates();
    return templates
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  }

  /**
   * Create template from window unit
   */
  async createTemplateFromWindowUnit(
    windowUnit: WindowUnit,
    name: string,
    description?: string,
    category: FabricatorTemplate['category'] = 'custom'
  ): Promise<FabricatorTemplate> {
    return this.saveTemplate({
      name,
      description,
      category,
      windowUnit: {
        type: windowUnit.type,
        systemPackId: windowUnit.systemPackId,
        color: windowUnit.color,
        glazing: windowUnit.glazing,
        hardware: windowUnit.hardware,
        grid: windowUnit.grid,
        presetId: windowUnit.presetId,
        flyScreenType: windowUnit.flyScreenType,
        // Include other relevant fields
        systemProfileSelections: windowUnit.systemProfileSelections
      },
      tags: this.generateTags(windowUnit)
    });
  }

  /**
   * Generate tags from window unit
   */
  private generateTags(windowUnit: WindowUnit): string[] {
    const tags: string[] = [];

    if (windowUnit.type) tags.push(windowUnit.type);
    if (windowUnit.systemPackId) tags.push(windowUnit.systemPackId);
    if (windowUnit.color) tags.push(windowUnit.color.toLowerCase());
    if (windowUnit.flyScreenType) tags.push(`flyscreen-${windowUnit.flyScreenType}`);
    if (windowUnit.presetId) tags.push(`preset-${windowUnit.presetId}`);

    return tags;
  }
}


