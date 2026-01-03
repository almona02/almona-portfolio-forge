/**
 * YDT Service Intelligence - Services Section YDT Integration
 * 
 * This is the bridge between Services and YDT Core.
 * Makes YDT mandatory for service decisions while providing safety fallbacks.
 * 
 * Status: Week 1 Implementation (Jan 2, 2026)
 * Budget: Part of $12K Q1 allocation
 * Team: 2 engineers part-time
 */

import type { YDTMandatoryConfig } from '@/lib/ydt/YDTEnforcementService';
import { DEFAULT_YDT_CONFIG, YDTEnforcementService } from '@/lib/ydt/YDTEnforcementService';

export interface ServiceYDTConfig {
  enabled: boolean;
  mandatoryRoutes: string[]; // ['ticket_routing', 'resolution_prediction', 'spare_parts']
  fallbackStrategy: 'cache' | 'baseline' | 'manual';
  timeoutMs: number;
}

export interface TicketAssignmentSuggestion {
  suggested_agent?: string;
  suggested_priority?: 'low' | 'medium' | 'high' | 'urgent';
  suggested_category?: string;
  confidence: number;
  reason: string;
  source: 'ydt_live' | 'ydt_cached' | 'baseline' | 'fallback';
  dataPoints?: number;
  ydtResponse?: any;
}

export interface ResolutionPrediction {
  likelyCause: string;
  suggestedSteps: string[];
  estimatedTime: string;
  requiredParts?: string[];
  confidence: number;
  source: 'ydt_live' | 'ydt_cached' | 'baseline' | 'fallback';
}

export interface SparePartSuggestion {
  partId: string;
  partName: string;
  quantity: number;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  alternatives?: string[];
  source: 'ydt_live' | 'ydt_cached' | 'baseline' | 'fallback';
}

export interface Ticket {
  id?: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  machine_serial?: {
    type?: string;
    model?: string;
    serialNumber?: string;
  };
  customer?: {
    tier?: 'standard' | 'premium' | 'enterprise';
    city?: string;
    location?: string;
  };
}

export class YDTServiceIntelligence {
  private enforcer: YDTEnforcementService;
  private config: ServiceYDTConfig;
  
  constructor(config: Partial<ServiceYDTConfig> = {}) {
    this.config = {
      enabled: true,
      mandatoryRoutes: ['ticket_routing', 'resolution_prediction', 'spare_parts'],
      fallbackStrategy: 'cache',
      timeoutMs: 150,
      ...config
    };
    
    // Initialize YDT Enforcement Service with circuit breaker
    const ydtConfig: YDTMandatoryConfig = {
      ...DEFAULT_YDT_CONFIG,
      mode: 'mandatory',
      fallbackStrategy: this.config.fallbackStrategy === 'cache' ? 'cached' : 'baseline',
      timeoutMs: this.config.timeoutMs || DEFAULT_YDT_CONFIG.timeoutMs
    };
    
    this.enforcer = new YDTEnforcementService(ydtConfig);
  }

  /**
   * Suggest ticket assignment using YDT intelligence
   * Uses YDT's market knowledge and machine expertise
   */
  async suggestTicketAssignment(ticket: Ticket): Promise<TicketAssignmentSuggestion> {
    if (!this.config.enabled) {
      return this.getFallbackAssignment(ticket);
    }

    try {
      const keywords = this.extractKeywords(ticket.description);
      
      const ydtResponse = await this.enforcer.validateWithYDT('service_ticket_assignment', {
        operation: 'ticket_assignment',
        context: {
          ticket_type: ticket.type,
          machine_type: ticket.machine_serial?.type || 'unknown',
          machine_model: ticket.machine_serial?.model || 'unknown',
          customer_tier: ticket.customer?.tier || 'standard',
          location: ticket.customer?.city || ticket.customer?.location || 'cairo',
          problem_keywords: keywords,
          priority_hint: ticket.priority
        }
      });

      return {
        suggested_agent: ydtResponse.suggested_agent || this.getDefaultAgent(ticket),
        suggested_priority: ydtResponse.suggested_priority || ticket.priority || 'medium',
        suggested_category: ydtResponse.category || this.inferCategory(keywords),
        confidence: ydtResponse.confidence || 0.75,
        reason: ydtResponse.reason || `YDT analysis based on ${keywords.length} problem indicators`,
        source: ydtResponse.source || 'ydt_live',
        dataPoints: ydtResponse.dataPoints || 0,
        ydtResponse: ydtResponse
      };
    } catch (error) {
      console.warn('YDT ticket assignment failed, using fallback:', error);
      return this.getFallbackAssignment(ticket);
    }
  }

  /**
   * Predict ticket resolution using YDT knowledge base
   * Uses existing 164 chapters, 878 components, fault patterns
   */
  async predictResolution(ticket: Ticket): Promise<ResolutionPrediction> {
    if (!this.config.enabled) {
      return this.getFallbackResolution(ticket);
    }

    try {
      const keywords = this.extractKeywords(ticket.description);
      
      const ydtResponse = await this.enforcer.validateWithYDT('ticket_resolution', {
        operation: 'resolution_prediction',
        context: {
          machine_model: ticket.machine_serial?.model || 'unknown',
          machine_type: ticket.machine_serial?.type || 'unknown',
          problem_description: ticket.description,
          problem_keywords: keywords,
          chapters: ['YILMAZ_TROUBLESHOOTING', 'COMMON_FAILURES', 'MAINTENANCE']
        }
      });

      return {
        likelyCause: ydtResponse.likely_cause || 'Requires on-site inspection',
        suggestedSteps: ydtResponse.suggested_steps || [
          '1. Check machine error logs',
          '2. Verify basic connections',
          '3. Schedule technician visit'
        ],
        estimatedTime: ydtResponse.estimated_time || '2-4 hours',
        requiredParts: ydtResponse.required_parts || [],
        confidence: ydtResponse.confidence || 0.70,
        source: ydtResponse.source || 'ydt_live'
      };
    } catch (error) {
      console.warn('YDT resolution prediction failed, using fallback:', error);
      return this.getFallbackResolution(ticket);
    }
  }

  /**
   * Suggest spare parts using YDT market intelligence
   * Uses existing 281 parts catalog + Egyptian market data
   */
  async suggestSpareParts(
    machineId: string,
    symptoms: string[],
    location?: string
  ): Promise<SparePartSuggestion[]> {
    if (!this.config.enabled) {
      return this.getFallbackSpareParts(machineId, symptoms);
    }

    try {
      const ydtResponse = await this.enforcer.validateWithYDT('spare_parts', {
        operation: 'spare_parts_suggestion',
        context: {
          machine_id: machineId,
          symptoms: symptoms,
          location: location || 'cairo',
          // YDT knows Egyptian supplier patterns
          consider_availability: true,
          suggest_alternatives: true
        }
      });

      return (ydtResponse.suggested_parts || []).map((part: any) => ({
        partId: part.id || part.part_id,
        partName: part.name || part.part_name,
        quantity: part.quantity || 1,
        urgency: part.urgency || 'medium',
        confidence: part.confidence || 0.75,
        alternatives: part.alternatives || [],
        source: ydtResponse.source || 'ydt_live'
      }));
    } catch (error) {
      console.warn('YDT spare parts suggestion failed, using fallback:', error);
      return this.getFallbackSpareParts(machineId, symptoms);
    }
  }

  /**
   * Extract keywords from ticket description
   * Simple pattern matching for Week 1
   */
  private extractKeywords(description: string): string[] {
    const keywords = description.toLowerCase();
    const found: string[] = [];
    
    const patterns = [
      { word: 'vibration', category: 'mechanical' },
      { word: 'bearing', category: 'mechanical' },
      { word: 'noise', category: 'mechanical' },
      { word: 'alarm', category: 'electrical' },
      { word: 'error', category: 'electrical' },
      { word: 'code', category: 'electrical' },
      { word: 'cut', category: 'cutting' },
      { word: 'blade', category: 'cutting' },
      { word: 'spindle', category: 'mechanical' },
      { word: 'motor', category: 'mechanical' },
      { word: 'overheat', category: 'thermal' },
      { word: 'temperature', category: 'thermal' },
      { word: 'pressure', category: 'pneumatic' },
      { word: 'air', category: 'pneumatic' }
    ];
    
    patterns.forEach(pattern => {
      if (keywords.includes(pattern.word)) {
        if (!found.includes(pattern.category)) {
          found.push(pattern.category);
        }
      }
    });
    
    return found.length > 0 ? found : ['general'];
  }

  /**
   * Infer category from keywords
   */
  private inferCategory(keywords: string[]): string {
    if (keywords.includes('mechanical')) return 'mechanical';
    if (keywords.includes('electrical')) return 'electrical';
    if (keywords.includes('cutting')) return 'cutting';
    if (keywords.includes('thermal')) return 'thermal';
    if (keywords.includes('pneumatic')) return 'pneumatic';
    return 'general';
  }

  /**
   * Get default agent based on ticket type
   */
  private getDefaultAgent(ticket: Ticket): string {
    if (ticket.type === 'emergency' || ticket.priority === 'urgent') {
      return 'emergency_team';
    }
    if (ticket.type === 'maintenance') {
      return 'maintenance_team';
    }
    return 'general_support';
  }

  /**
   * Fallback assignment when YDT unavailable
   */
  private getFallbackAssignment(ticket: Ticket): TicketAssignmentSuggestion {
    return {
      suggested_agent: this.getDefaultAgent(ticket),
      suggested_priority: ticket.priority || 'medium',
      suggested_category: this.inferCategory(this.extractKeywords(ticket.description)),
      confidence: 0.6,
      reason: 'YDT not available, using baseline assignment logic',
      source: 'fallback'
    };
  }

  /**
   * Fallback resolution when YDT unavailable
   */
  private getFallbackResolution(_ticket: Ticket): ResolutionPrediction {
    return {
      likelyCause: 'Requires diagnostic inspection',
      suggestedSteps: [
        '1. Review machine error logs',
        '2. Check basic connections and power',
        '3. Schedule technician visit for detailed diagnosis'
      ],
      estimatedTime: '4-6 hours',
      confidence: 0.5,
      source: 'fallback'
    };
  }

  /**
   * Fallback spare parts when YDT unavailable
   */
  private getFallbackSpareParts(
    _machineId: string,
    _symptoms: string[]
  ): SparePartSuggestion[] {
    // Basic fallback - suggest common parts based on symptoms
    const commonParts: SparePartSuggestion[] = [];
    
    if (_symptoms.some(s => s.includes('bearing') || s.includes('vibration'))) {
      commonParts.push({
        partId: 'BEARING_STANDARD',
        partName: 'Standard Bearing',
        quantity: 1,
        urgency: 'high',
        confidence: 0.5,
        source: 'fallback'
      });
    }
    
    return commonParts.length > 0 ? commonParts : [];
  }

  /**
   * Check if YDT is enabled and operational
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): ServiceYDTConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (for testing/admin)
   */
  updateConfig(updates: Partial<ServiceYDTConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Singleton instance for services
let serviceInstance: YDTServiceIntelligence | null = null;

export function getYDTServiceIntelligence(): YDTServiceIntelligence {
  if (!serviceInstance) {
    serviceInstance = new YDTServiceIntelligence();
  }
  return serviceInstance;
}

