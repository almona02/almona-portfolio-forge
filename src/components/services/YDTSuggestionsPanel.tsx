/**
 * YDT Suggestions Panel - Display YDT intelligence in Ticket Wizard
 * 
 * Shows YDT-powered suggestions for ticket assignment, resolution, and spare parts.
 * Week 1 implementation: Basic panel with confidence scores.
 * 
 * Status: Week 1 Implementation (Jan 2, 2026)
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type {
  ResolutionPrediction,
  SparePartSuggestion,
  TicketAssignmentSuggestion
} from '@/lib/services/YDTServiceIntelligence';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  User,
  Wrench,
  X
} from 'lucide-react';

export interface YDTSuggestion {
  type: 'assignment' | 'resolution' | 'spare_parts';
  assignment?: TicketAssignmentSuggestion;
  resolution?: ResolutionPrediction;
  spareParts?: SparePartSuggestion[];
  confidence: number;
  source: string;
  dataPoints?: number;
}

export interface YDTSuggestionsPanelProps {
  title?: string;
  suggestions: YDTSuggestion[];
  confidence: number;
  onAccept?: (suggestion: YDTSuggestion) => void;
  onDismiss?: () => void;
  loading?: boolean;
  ticketId?: string;
}

export function YDTSuggestionsPanel({
  title = 'YDT Suggestions',
  suggestions,
  confidence,
  onAccept,
  onDismiss,
  loading = false,
  ticketId: _ticketId
}: YDTSuggestionsPanelProps) {
  const _getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-400';
    if (conf >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceBadge = (conf: number) => {
    if (conf >= 0.8) return 'default';
    if (conf >= 0.6) return 'secondary';
    return 'outline';
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'ydt_live':
        return 'YDT Live';
      case 'ydt_cached':
        return 'YDT Cached';
      case 'baseline':
        return 'Baseline';
      case 'fallback':
        return 'Fallback';
      default:
        return source;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border-orange-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-400">
            <Brain className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            <span className="ml-2 text-gray-400">Analyzing with YDT...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-gray-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No YDT suggestions available. Ensure ticket description is detailed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-orange-400" />
            <CardTitle className="text-orange-400">{title}</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          AI-powered suggestions based on YDT knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Confidence */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Overall Confidence</span>
            <div className="flex items-center gap-2">
              <Badge variant={getConfidenceBadge(confidence)}>
                {Math.round(confidence * 100)}%
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getSourceLabel(suggestions[0]?.source || 'unknown')}
              </Badge>
            </div>
          </div>
          <Progress value={confidence * 100} className="h-2" />
          {suggestions[0]?.dataPoints && (
            <p className="text-xs text-gray-500">
              Based on {suggestions[0].dataPoints} similar cases
            </p>
          )}
        </div>

        {/* Assignment Suggestions */}
        {suggestions.some(s => s.type === 'assignment' && s.assignment) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4 text-orange-400" />
              <span>Suggested Assignment</span>
            </div>
            {suggestions
              .filter(s => s.type === 'assignment' && s.assignment)
              .map((suggestion, idx) => {
                const assignment = suggestion.assignment!;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{assignment.suggested_agent}</span>
                      <Badge variant="outline">
                        {assignment.suggested_priority?.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{assignment.reason}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {assignment.suggested_category}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Confidence: {Math.round(assignment.confidence * 100)}%
                      </span>
                    </div>
                    {onAccept && (
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => onAccept(suggestion)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Accept Suggestion
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Resolution Predictions */}
        {suggestions.some(s => s.type === 'resolution' && s.resolution) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="h-4 w-4 text-orange-400" />
              <span>Predicted Resolution</span>
            </div>
            {suggestions
              .filter(s => s.type === 'resolution' && s.resolution)
              .map((suggestion, idx) => {
                const resolution = suggestion.resolution!;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                  >
                    <div className="mb-2">
                      <span className="font-medium">Likely Cause:</span>
                      <p className="text-sm text-gray-400 mt-1">{resolution.likelyCause}</p>
                    </div>
                    <div className="mb-2">
                      <span className="font-medium text-sm">Suggested Steps:</span>
                      <ol className="list-decimal list-inside text-sm text-gray-400 mt-1 space-y-1">
                        {resolution.suggestedSteps.map((step, stepIdx) => (
                          <li key={stepIdx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{resolution.estimatedTime}</span>
                      </div>
                      <span>Confidence: {Math.round(resolution.confidence * 100)}%</span>
                    </div>
                    {resolution.requiredParts && resolution.requiredParts.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <span className="text-xs font-medium">Required Parts:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resolution.requiredParts.map((part, partIdx) => (
                            <Badge key={partIdx} variant="outline" className="text-xs">
                              {part}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Spare Parts Suggestions */}
        {suggestions.some(s => s.type === 'spare_parts' && s.spareParts && s.spareParts.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-orange-400" />
              <span>Suggested Spare Parts</span>
            </div>
            {suggestions
              .filter(s => s.type === 'spare_parts' && s.spareParts && s.spareParts.length > 0)
              .map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                >
                  {suggestion.spareParts!.map((part, partIdx) => (
                    <div
                      key={partIdx}
                      className="flex items-center justify-between mb-2 last:mb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{part.partName}</span>
                          <Badge variant="outline" className="text-xs">
                            {part.urgency.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">Qty: {part.quantity}</p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {Math.round(part.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            Powered by YDT Intelligence • {getSourceLabel(suggestions[0]?.source || 'unknown')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

