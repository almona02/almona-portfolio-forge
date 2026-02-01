import { Position } from '../../types/fabricator';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  defaultPositions: Partial<Position>[]; // Partial because we instantiate real positions later
  estimatedDurationDays: number;
  targetMargin: number;
  tags: string[];
}

/**
 * Library of standard project templates for enterprise adoption.
 * Allows quick creation of common project types (e.g., "Villa Standard", "Tower Block A").
 */
export class ProjectTemplateLibrary {
  
  private static templates: ProjectTemplate[] = [
    {
      id: 'villa-standard',
      name: 'Villa Standard Package',
      description: 'Typical configuration for a 2-story residential villa. Includes sliding doors and casement windows.',
      estimatedDurationDays: 14,
      targetMargin: 0.25,
      tags: ['residential', 'villa', 'standard'],
      defaultPositions: [
        { name: 'Living Room Slider', quantity: 2, description: 'Large sliding door for garden access' },
        { name: 'Bedroom Window', quantity: 4, description: 'Standard casement window with shutter' },
        { name: 'Bathroom Window', quantity: 3, description: 'Small frosted casement' },
        { name: 'Kitchen Window', quantity: 1, description: 'Sliding window above sink' }
      ]
    },
    {
        id: 'apartment-tower-c',
        name: 'Apartment Tower Type C',
        description: 'High-density residential unit configuration. Optimized for cost-efficiency.',
        estimatedDurationDays: 45,
        targetMargin: 0.18,
        tags: ['commercial', 'tower', 'high-volume'],
        defaultPositions: [
            { name: 'Balcony Slider', quantity: 50, description: 'Standard balcony access' },
            { name: 'Bedroom Capture', quantity: 100, description: 'Standard bedroom window' }
        ]
    },
    {
        id: 'goverment-school-v1',
        name: 'Government School Prototype V1',
        description: 'Compliant with Ministry of Education specs. High durability criteria.',
        estimatedDurationDays: 60,
        targetMargin: 0.15,
        tags: ['government', 'school', 'heavy-duty'],
        defaultPositions: [
            { name: 'Classroom Slider', quantity: 120, description: 'Heavy duty slider with safety stops' },
            { name: 'Corridor Fixed', quantity: 40, description: 'Fixed light for hallway illumination' }
        ]
    }
  ];

  /**
   * Returns all available templates.
   */
  static getTemplates(): ProjectTemplate[] {
    return this.templates;
  }

  /**
   * Retrieves a specific template by ID.
   */
  static getTemplateById(templateId: string): ProjectTemplate | undefined {
    return this.templates.find(t => t.id === templateId);
  }

  /**
   * Applies a template to a project context.
   * In a real app, this would modify the project in the DB.
   * Here, we return the generated positions.
   * 
   * @param templateId - The ID of the template to apply
   * @param projectRef - Optional reference to the project
   */
  static generatePositionsFromTemplate(templateId: string): Partial<Position>[] {
    const template = this.getTemplateById(templateId);
    if (!template) {
        throw new Error(`Template not found: ${templateId}`);
    }

    // Deep copy positions to avoid mutation
    return template.defaultPositions.map(p => ({
        ...p,
        status: 'draft', // Reset status
        createdAt: new Date()
    }));
  }
}
