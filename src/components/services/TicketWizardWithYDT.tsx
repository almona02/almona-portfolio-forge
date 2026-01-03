/**
 * Ticket Wizard with YDT Integration
 * 
 * Wraps the existing TicketWizardDialog and adds YDT-powered suggestions.
 * Week 1 implementation: Basic integration with async YDT suggestions.
 * 
 * Status: Week 1 Implementation (Jan 2, 2026)
 */

import { YDTSuggestionsPanel, type YDTSuggestion } from '@/components/services/YDTSuggestionsPanel';
import TicketWizardDialog, { type TicketWizardDialogProps } from '@/components/support/TicketWizardDialog';
import {
    getYDTServiceIntelligence,
    type Ticket
} from '@/lib/services/YDTServiceIntelligence';
import { ydtServiceLogger, type YDTServiceEvent } from '@/lib/services/YDTServiceLogger';
import type { UnifiedTicketFormData } from '@/lib/validation/ticket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface TicketWizardWithYDTProps extends TicketWizardDialogProps {
  showYdtPanel?: boolean;
  autoAcceptHighConfidence?: boolean; // Auto-accept suggestions with >85% confidence
}

export function TicketWizardWithYDT({
  showYdtPanel = true,
  autoAcceptHighConfidence = false,
  ...ticketWizardProps
}: TicketWizardWithYDTProps) {
  const [ydtSuggestions, setYdtSuggestions] = useState<YDTSuggestion[]>([]);
  const [ydtConfidence, setYdtConfidence] = useState<number>(0);
  const [ydtLoading, setYdtLoading] = useState<boolean>(false);
  const [ydtError, setYdtError] = useState<string | null>(null);
  
  const ydtService = useMemo(() => getYDTServiceIntelligence(), []);
  
  // Track form values from initialValues and watch for changes
  // Note: For Week 1, we'll use initialValues and a polling approach
  // In Week 2, we can add proper form watching via callbacks
  const formValuesRef = useRef<Partial<UnifiedTicketFormData>>(ticketWizardProps.initialValues || {});
  
  // Update form values ref when initialValues change
  useEffect(() => {
    if (ticketWizardProps.initialValues) {
      formValuesRef.current = ticketWizardProps.initialValues;
    }
  }, [ticketWizardProps.initialValues]);
  
  // Extract current form values
  const description = formValuesRef.current.description || '';
  const ticketType = formValuesRef.current.type || 'general';
  const priority = formValuesRef.current.priority || 'medium';
  const machineSerial = formValuesRef.current.machine_serial_number;

  /**
   * Handle accepting YDT suggestion
   */
  const handleAcceptYdtSuggestion = useCallback((suggestion: YDTSuggestion) => {
    if (suggestion.type === 'assignment' && suggestion.assignment) {
      const assignment = suggestion.assignment;
      
      // For Week 1: Log acceptance
      // In Week 2: We'll add proper form integration via callbacks
      ydtServiceLogger.logUsage({
        service: 'ticket_assignment',
        operation: 'accept_ydt_suggestion',
        success: true,
        confidence: assignment.confidence,
        source: assignment.source
      } as YDTServiceEvent);
      
      // TODO Week 2: Apply priority suggestion to form via callback
      // if (assignment.suggested_priority && onPriorityChange) {
      //   onPriorityChange(assignment.suggested_priority);
      // }
    }
    
    if (suggestion.type === 'resolution' && suggestion.resolution) {
      // Could auto-fill resolution steps into description or notes
      // For Week 1, just log acceptance
      ydtServiceLogger.logUsage({
        service: 'resolution_prediction',
        operation: 'accept_ydt_resolution',
        success: true,
        confidence: suggestion.resolution.confidence,
        source: suggestion.resolution.source
      } as YDTServiceEvent);
    }
  }, []);
  
  /**
   * Fetch YDT suggestions when description changes
   */
  const fetchYdtSuggestions = useCallback(async () => {
    if (!showYdtPanel || !description || description.length < 20) {
      setYdtSuggestions([]);
      setYdtConfidence(0);
      return;
    }

    setYdtLoading(true);
    setYdtError(null);
    
    const startTime = Date.now();
    
    try {
      // Build ticket object for YDT
      const ticket: Ticket = {
        type: ticketType || 'general',
        priority: priority as any,
        description: description,
        machine_serial: machineSerial ? {
          serialNumber: machineSerial
        } : undefined
      };

      // Fetch assignment suggestion
      const assignmentPromise = ydtService.suggestTicketAssignment(ticket);
      
      // Fetch resolution prediction
      const resolutionPromise = ydtService.predictResolution(ticket);
      
      // Fetch spare parts (if machine info available)
      const sparePartsPromise = machineSerial 
        ? ydtService.suggestSpareParts(machineSerial, [description])
        : Promise.resolve([]);

      // Wait for all suggestions
      const [assignment, resolution, spareParts] = await Promise.all([
        assignmentPromise,
        resolutionPromise,
        sparePartsPromise
      ]);

      const responseTime = Date.now() - startTime;

      // Build suggestions array
      const suggestions: YDTSuggestion[] = [];
      
      if (assignment) {
        suggestions.push({
          type: 'assignment',
          assignment,
          confidence: assignment.confidence,
          source: assignment.source,
          dataPoints: assignment.dataPoints
        });
      }
      
      if (resolution) {
        suggestions.push({
          type: 'resolution',
          resolution,
          confidence: resolution.confidence,
          source: resolution.source
        });
      }
      
      if (spareParts && spareParts.length > 0) {
        suggestions.push({
          type: 'spare_parts',
          spareParts,
          confidence: spareParts[0]?.confidence || 0.75,
          source: spareParts[0]?.source || 'ydt_live'
        });
      }

      // Calculate overall confidence
      const overallConfidence = suggestions.length > 0
        ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
        : 0;

      setYdtSuggestions(suggestions);
      setYdtConfidence(overallConfidence);

      // Auto-accept high confidence suggestions
      if (autoAcceptHighConfidence && overallConfidence > 0.85 && suggestions.length > 0) {
        handleAcceptYdtSuggestion(suggestions[0]);
      }

      // Log successful YDT usage
      ydtServiceLogger.logUsage({
        service: 'ticket_assignment',
        operation: 'suggest_ticket_assignment',
        success: true,
        confidence: overallConfidence,
        responseTime,
        fallbackUsed: assignment.source !== 'ydt_live',
        source: assignment.source
      } as YDTServiceEvent);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setYdtError(errorMessage);
      setYdtSuggestions([]);
      setYdtConfidence(0);

      // Log failed YDT usage
      ydtServiceLogger.logUsage({
        service: 'ticket_assignment',
        operation: 'suggest_ticket_assignment',
        success: false,
        responseTime,
        fallbackUsed: true,
        source: 'fallback',
        error: errorMessage
      } as YDTServiceEvent);
    } finally {
      setYdtLoading(false);
    }
  }, [description, ticketType, priority, machineSerial, showYdtPanel, autoAcceptHighConfidence, ydtService, handleAcceptYdtSuggestion]);

  /**
   * Debounced YDT fetch (wait 500ms after user stops typing)
   */
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchYdtSuggestions();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [fetchYdtSuggestions]);


  /**
   * Handle dismissing YDT panel
   */
  const handleDismissYdt = useCallback(() => {
    // Could persist dismissal preference
    // For Week 1, just hide panel
  }, []);

  return (
    <div className="ticket-wizard-ydt-container" style={{ display: 'flex', gap: '1rem' }}>
      {/* Main Ticket Wizard */}
      <div className="ticket-wizard-main" style={{ flex: showYdtPanel ? '1 1 60%' : '1 1 100%' }}>
        <TicketWizardDialog {...ticketWizardProps} />
      </div>

      {/* YDT Suggestions Panel (Right Sidebar) */}
      {showYdtPanel && (
        <div className="ydt-suggestions-sidebar" style={{ flex: '0 0 400px' }}>
          <YDTSuggestionsPanel
            title="YDT Suggestions"
            suggestions={ydtSuggestions}
            confidence={ydtConfidence}
            onAccept={handleAcceptYdtSuggestion}
            onDismiss={handleDismissYdt}
            loading={ydtLoading}
            ticketId={undefined}
          />
          
          {ydtError && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              YDT Error: {ydtError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TicketWizardWithYDT;

