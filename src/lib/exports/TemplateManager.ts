/**
 * TemplateManager - Customizable report template management
 * Week 3: Enterprise Automation & Customization
 * 
 * Manages report templates with versioning, sharing, and analytics
 */

import { ExportTemplate, ExportOptions, ExportFormat, CompanyBranding, TemplateApplicationResult } from './types';

/**
 * Template manager class
 * Handles template CRUD operations, versioning, and application
 */
export class TemplateManager {
  private templates: Map<string, ExportTemplate> = new Map();
  private storageKey = 'export_templates';

  constructor() {
    this.loadTemplates();
  }

  /**
   * Create a new template
   */
  createTemplate(
    name: string,
    description: string,
    type: ExportTemplate['type'],
    format: ExportFormat,
    options: ExportOptions,
    branding?: CompanyBranding,
    createdBy: string = 'system'
  ): ExportTemplate {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const template: ExportTemplate = {
      id,
      name,
      description,
      type,
      format,
      options,
      branding,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      createdBy,
      isDefault: false,
      isPublic: false,
      usageCount: 0,
      tags: []
    };

    this.templates.set(id, template);
    this.saveTemplates();

    return template;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ExportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(type: ExportTemplate['type']): ExportTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.type === type);
  }

  /**
   * Get templates by format
   */
  getTemplatesByFormat(format: ExportFormat): ExportTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.format === format);
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): ExportTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Update template
   */
  updateTemplate(
    templateId: string,
    updates: Partial<Omit<ExportTemplate, 'id' | 'createdAt' | 'version'>>
  ): ExportTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    // Increment version
    const versionParts = template.version.split('.');
    const patch = parseInt(versionParts[2] || '0') + 1;
    const newVersion = `${versionParts[0]}.${versionParts[1]}.${patch}`;

    const updated: ExportTemplate = {
      ...template,
      ...updates,
      version: newVersion,
      updatedAt: new Date()
    };

    this.templates.set(templateId, updated);
    this.saveTemplates();

    return updated;
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId);
    if (deleted) {
      this.saveTemplates();
    }
    return deleted;
  }

  /**
   * Apply template to export options
   */
  applyTemplate(templateId: string, baseOptions?: ExportOptions): TemplateApplicationResult {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        templateId,
        error: 'Template not found'
      };
    }

    // Merge template options with base options
    const appliedOptions: ExportOptions = {
      ...baseOptions,
      ...template.options,
      branding: template.branding || baseOptions?.branding
    };

    // Increment usage count
    template.usageCount = (template.usageCount || 0) + 1;
    this.saveTemplates();

    return {
      success: true,
      templateId,
      appliedOptions
    };
  }

  /**
   * Set default template
   */
  setDefaultTemplate(templateId: string, format: ExportFormat): boolean {
    // Unset all other defaults for this format
    Array.from(this.templates.values())
      .filter(t => t.format === format && t.id !== templateId)
      .forEach(t => {
        t.isDefault = false;
      });

    const template = this.templates.get(templateId);
    if (template && template.format === format) {
      template.isDefault = true;
      this.saveTemplates();
      return true;
    }

    return false;
  }

  /**
   * Get default template for format
   */
  getDefaultTemplate(format: ExportFormat): ExportTemplate | undefined {
    return Array.from(this.templates.values())
      .find(t => t.format === format && t.isDefault);
  }

  /**
   * Duplicate template
   */
  duplicateTemplate(templateId: string, newName?: string): ExportTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    return this.createTemplate(
      newName || `${template.name} (Copy)`,
      template.description,
      template.type,
      template.format,
      { ...template.options },
      template.branding ? { ...template.branding } : undefined,
      template.createdBy
    );
  }

  /**
   * Rate template
   */
  rateTemplate(templateId: string, rating: number): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    // Simple average rating calculation
    const currentRating = template.rating || 0;
    const currentCount = template.usageCount || 0;
    const newRating = currentCount > 0
      ? ((currentRating * currentCount) + rating) / (currentCount + 1)
      : rating;

    template.rating = newRating;
    this.saveTemplates();

    return true;
  }

  /**
   * Initialize default templates
   */
  initializeDefaultTemplates(): void {
    // Basic PDF template
    this.createTemplate(
      'Basic PDF Report',
      'Standard PDF report with essential information',
      'basic',
      'pdf',
      {
        includeCuttingList: true,
        includeDiagrams: true,
        includeQRCode: true,
        pageSize: 'A4',
        orientation: 'portrait'
      },
      undefined,
      'system'
    );

    // Premium PDF template
    this.createTemplate(
      'Premium PDF Report',
      'Enhanced PDF report with 3D previews and detailed visuals',
      'premium',
      'pdf',
      {
        includeCuttingList: true,
        includeDiagrams: true,
        include3DPreview: true,
        includeAssemblyGuide: true,
        includeQRCode: true,
        includeMetadata: true,
        pageSize: 'A4',
        orientation: 'portrait'
      },
      undefined,
      'system'
    );

    // Minimal CSV template
    this.createTemplate(
      'Minimal CSV Export',
      'Simple CSV with core data only',
      'minimal',
      'csv',
      {
        includeHeaders: true,
        excelCompatible: true,
        delimiter: ','
      },
      undefined,
      'system'
    );

    // Workshop DXF template
    this.createTemplate(
      'Workshop DXF',
      'Production-focused DXF with annotations',
      'workshop',
      'dxf',
      {
        includeDimensions: true,
        includeAnnotations: true,
        units: 'mm',
        scale: 1
      },
      undefined,
      'system'
    );
  }

  /**
   * Export template as JSON
   */
  exportTemplate(templateId: string): string | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template from JSON
   */
  importTemplate(json: string, overwrite: boolean = false): ExportTemplate | null {
    try {
      const template = JSON.parse(json) as ExportTemplate;
      
      if (this.templates.has(template.id) && !overwrite) {
        // Generate new ID
        template.id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      template.updatedAt = new Date();
      this.templates.set(template.id, template);
      this.saveTemplates();

      return template;
    } catch (error) {
      console.error('Failed to import template:', error);
      return null;
    }
  }

  /**
   * Save templates to localStorage
   */
  private saveTemplates(): void {
    try {
      const templatesArray = Array.from(this.templates.values());
      localStorage.setItem(this.storageKey, JSON.stringify(templatesArray));
    } catch (error) {
      console.warn('Failed to save templates to localStorage:', error);
    }
  }

  /**
   * Load templates from localStorage
   */
  private loadTemplates(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const templatesArray = JSON.parse(stored) as ExportTemplate[];
        templatesArray.forEach(template => {
          // Convert date strings back to Date objects
          template.createdAt = new Date(template.createdAt);
          template.updatedAt = new Date(template.updatedAt);
          this.templates.set(template.id, template);
        });
      } else {
        // Initialize default templates if none exist
        this.initializeDefaultTemplates();
      }
    } catch (error) {
      console.warn('Failed to load templates from localStorage:', error);
      // Initialize defaults on error
      this.initializeDefaultTemplates();
    }
  }
}

// Export singleton instance
export const templateManager = new TemplateManager();

