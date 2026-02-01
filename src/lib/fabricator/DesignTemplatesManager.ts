/**
 * Design Templates Library for ALMONA Fabricator
 * 
 * Manages design templates with:
 * - Save/load templates
 * - Favorites management
 * - Usage tracking
 * - Category organization
 * - Thumbnail generation
 * 
 * Constitutional: Deterministic storage, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { supabase } from '@/lib/supabase';
import { WindowGrid, WindowUnit } from '@/types/fabricator';

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  grid: WindowGrid;
  systemPackId: string;
  category: 'residential' | 'commercial' | 'industrial' | 'custom';
  thumbnail: string; // Base64 or URL
  isFavorite: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  notes: string;
}

export interface TemplateFilter {
  category?: string;
  systemPackId?: string;
  isFavorite?: boolean;
  searchTerm?: string;
}

export interface TemplateStats {
  totalTemplates: number;
  favoriteCount: number;
  mostUsed: DesignTemplate | null;
  recentlyUsed: DesignTemplate[];
  byCategory: Record<string, number>;
}

/**
 * Design Templates Manager
 */
export class DesignTemplatesManager {
  private userId: string;
  private tableName = 'design_templates';

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Save current design as template
   */
  async saveAsTemplate(
    name: string,
    description: string,
    grid: WindowGrid,
    systemPackId: string,
    category: DesignTemplate['category'],
    thumbnail: string,
    tags: string[] = [],
    notes: string = ''
  ): Promise<DesignTemplate | null> {
    try {
      const template: DesignTemplate = {
        id: this.generateId(),
        name,
        description,
        grid,
        systemPackId,
        category,
        thumbnail,
        isFavorite: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: this.userId,
        tags,
        notes
      };

      const insertData = {
        id: template.id,
        name: template.name,
        description: template.description,
        grid: template.grid as any,
        system_pack_id: template.systemPackId,
        category: template.category,
        thumbnail: template.thumbnail,
        is_favorite: template.isFavorite,
        usage_count: template.usageCount,
        created_at: template.createdAt.toISOString(),
        updated_at: template.updatedAt.toISOString(),
        created_by: this.userId,
        user_id: this.userId,
        tags: template.tags,
        notes: template.notes
      };

      const { data, error } = await (supabase
        .from(this.tableName) as any)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Failed to save template:', error);
        return null;
      }

      return this.mapFromDatabase(data);
    } catch (err) {
      console.error('Error saving template:', err);
      return null;
    }
  }

  /**
   * Load template by ID
   */
  async loadTemplate(templateId: string): Promise<DesignTemplate | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', templateId)
        .eq('user_id', this.userId)
        .single();

      if (error) {
        console.error('Failed to load template:', error);
        return null;
      }

      // Increment usage count
      await this.incrementUsageCount(templateId);

      return this.mapFromDatabase(data);
    } catch (err) {
      console.error('Error loading template:', err);
      return null;
    }
  }

  /**
   * Get all templates for user
   */
  async getAllTemplates(filter?: TemplateFilter): Promise<DesignTemplate[]> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', this.userId);

      if (filter?.category) {
        query = query.eq('category', filter.category);
      }

      if (filter?.systemPackId) {
        query = query.eq('system_pack_id', filter.systemPackId);
      }

      if (filter?.isFavorite) {
        query = query.eq('is_favorite', true);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch templates:', error);
        return [];
      }

      let templates = data.map(t => this.mapFromDatabase(t));

      // Apply search filter
      if (filter?.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        templates = templates.filter(t =>
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term) ||
          t.tags.some(tag => tag.toLowerCase().includes(term))
        );
      }

      return templates;
    } catch (err) {
      console.error('Error fetching templates:', err);
      return [];
    }
  }

  /**
   * Get favorite templates
   */
  async getFavoriteTemplates(): Promise<DesignTemplate[]> {
    return this.getAllTemplates({ isFavorite: true });
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: DesignTemplate['category']
  ): Promise<DesignTemplate[]> {
    return this.getAllTemplates({ category });
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(templateId: string): Promise<boolean> {
    try {
      const template = await this.loadTemplate(templateId);
      if (!template) return false;

      const updatePayload = { is_favorite: !template.isFavorite };
      const { error } = await (supabase
        .from(this.tableName) as any)
        .update(updatePayload)
        .eq('id', templateId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to toggle favorite:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error toggling favorite:', err);
      return false;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<DesignTemplate>
  ): Promise<DesignTemplate | null> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.grid !== undefined) updateData.grid = updates.grid as any;
      if (updates.systemPackId !== undefined) updateData.system_pack_id = updates.systemPackId;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;
      if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
      if (updates.usageCount !== undefined) updateData.usage_count = updates.usageCount;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await (supabase
        .from(this.tableName) as any)
        .update(updateData)
        .eq('id', templateId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update template:', error);
        return null;
      }

      return this.mapFromDatabase(data);
    } catch (err) {
      console.error('Error updating template:', err);
      return null;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', templateId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to delete template:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      return false;
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(): Promise<TemplateStats> {
    try {
      const templates = await this.getAllTemplates();

      const stats: TemplateStats = {
        totalTemplates: templates.length,
        favoriteCount: templates.filter(t => t.isFavorite).length,
        mostUsed: templates.reduce((prev, current) =>
          current.usageCount > prev.usageCount ? current : prev
        ) || null,
        recentlyUsed: templates.slice(0, 5),
        byCategory: {}
      };

      // Count by category
      templates.forEach(t => {
        stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + 1;
      });

      return stats;
    } catch (err) {
      console.error('Error getting template stats:', err);
      return {
        totalTemplates: 0,
        favoriteCount: 0,
        mostUsed: null,
        recentlyUsed: [],
        byCategory: {}
      };
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(templateId: string, newName: string): Promise<DesignTemplate | null> {
    try {
      const template = await this.loadTemplate(templateId);
      if (!template) return null;

      return this.saveAsTemplate(
        newName,
        template.description,
        template.grid,
        template.systemPackId,
        template.category,
        template.thumbnail,
        template.tags,
        template.notes
      );
    } catch (err) {
      console.error('Error duplicating template:', err);
      return null;
    }
  }

  /**
   * Export template as JSON
   */
  exportAsJSON(template: DesignTemplate): string {
    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template from JSON
   */
  async importFromJSON(jsonString: string): Promise<DesignTemplate | null> {
    try {
      const template = JSON.parse(jsonString) as DesignTemplate;
      
      // Validate required fields
      if (!template.name || !template.grid || !template.systemPackId) {
        throw new Error('Invalid template format');
      }

      // Save as new template
      return this.saveAsTemplate(
        template.name,
        template.description,
        template.grid,
        template.systemPackId,
        template.category,
        template.thumbnail,
        template.tags,
        template.notes
      );
    } catch (err) {
      console.error('Error importing template:', err);
      return null;
    }
  }

  /**
   * Search templates
   */
  async searchTemplates(searchTerm: string): Promise<DesignTemplate[]> {
    return this.getAllTemplates({ searchTerm });
  }

  /**
   * Get templates by tags
   */
  async getTemplatesByTags(tags: string[]): Promise<DesignTemplate[]> {
    try {
      const templates = await this.getAllTemplates();
      return templates.filter(t =>
        tags.some(tag => t.tags.includes(tag))
      );
    } catch (err) {
      console.error('Error getting templates by tags:', err);
      return [];
    }
  }

  /**
   * Private helper methods
   */

  private async incrementUsageCount(templateId: string): Promise<void> {
    try {
      const template = await this.loadTemplate(templateId);
      if (template) {
        await this.updateTemplate(templateId, {
          usageCount: template.usageCount + 1
        });
      }
    } catch (err) {
      console.error('Error incrementing usage count:', err);
    }
  }

  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapFromDatabase(data: any): DesignTemplate {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      grid: data.grid,
      systemPackId: data.system_pack_id,
      category: data.category,
      thumbnail: data.thumbnail,
      isFavorite: data.is_favorite,
      usageCount: data.usage_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
      tags: data.tags || [],
      notes: data.notes || ''
    };
  }
}

/**
 * Generate thumbnail from window unit
 */
export const generateTemplateThumbnail = (windowUnit: WindowUnit): string => {
  // Create a simple SVG thumbnail
  const width = windowUnit.overallWidth || 2400;
  const height = windowUnit.overallHeight || 1600;
  const grid = windowUnit.grid;

  const svgWidth = 200;
  const svgHeight = (height / width) * svgWidth;

  let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${svgWidth}" height="${svgHeight}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>`;

  // Draw grid cells
  const cellWidth = svgWidth / grid.cols;
  const cellHeight = svgHeight / grid.rows;

  grid.cells.forEach(cell => {
    const x = cell.col * cellWidth;
    const y = cell.row * cellHeight;
    const color = {
      'fixed': '#3b82f6',
      'sash': '#22c55e',
      'sliding': '#eab308',
      'panel': '#6b7280',
      'empty': '#ef4444'
    }[cell.type] || '#9ca3af';

    svg += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${color}" opacity="0.3" stroke="${color}" stroke-width="0.5"/>`;
  });

  svg += `</svg>`;

  // Convert to base64
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Create default templates
 */
export const DEFAULT_TEMPLATES: Omit<DesignTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    name: 'Simple Fixed Window',
    description: 'Single fixed pane window - ideal for fixed installations',
    grid: { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] },
    systemPackId: 'caluminium_ps_v3',
    category: 'residential',
    thumbnail: '',
    isFavorite: false,
    usageCount: 0,
    tags: ['fixed', 'simple', 'residential'],
    notes: 'Standard fixed window configuration'
  },
  {
    name: 'Double Casement Window',
    description: 'Two casement sashes - classic design',
    grid: {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { id: '0-1', row: 0, col: 1, type: 'sash', openingDirection: 'right' }
      ]
    },
    systemPackId: 'caluminium_ps_v3',
    category: 'residential',
    thumbnail: '',
    isFavorite: false,
    usageCount: 0,
    tags: ['casement', 'double', 'residential'],
    notes: 'Two opening casement sashes'
  },
  {
    name: 'Sliding Window 2x2',
    description: 'Four-pane sliding window with fixed and sliding panels',
    grid: {
      rows: 2,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'fixed' },
        { id: '0-1', row: 0, col: 1, type: 'fixed' },
        { id: '1-0', row: 1, col: 0, type: 'sliding' },
        { id: '1-1', row: 1, col: 1, type: 'sliding' }
      ]
    },
    systemPackId: 'caluminium_ps_v3',
    category: 'commercial',
    thumbnail: '',
    isFavorite: false,
    usageCount: 0,
    tags: ['sliding', 'commercial', '2x2'],
    notes: 'Fixed top, sliding bottom configuration'
  },
  {
    name: 'Picture Window with Casement',
    description: 'Large fixed center with casement sides',
    grid: {
      rows: 1,
      cols: 3,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { id: '0-1', row: 0, col: 1, type: 'fixed' },
        { id: '0-2', row: 0, col: 2, type: 'sash', openingDirection: 'right' }
      ],
      colWidths: [1, 2, 1]
    },
    systemPackId: 'caluminium_ps_v3',
    category: 'residential',
    thumbnail: '',
    isFavorite: false,
    usageCount: 0,
    tags: ['picture', 'casement', 'residential'],
    notes: 'Picture window with opening casements'
  }
];
