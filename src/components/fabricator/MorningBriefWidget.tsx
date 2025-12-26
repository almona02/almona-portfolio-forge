/**
 * Morning Brief Widget - "Maalem's Morning Brief"
 * 
 * Displays daily industry intelligence for workshop owners:
 * - Latest news
 * - Price updates
 * - Technology news
 * - Critical alerts
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Lightbulb, 
  DollarSign,
  RefreshCw,
  ExternalLink,
  Clock,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { futureKnowledgeGraph } from '@/lib/learning/FutureKnowledgeGraph';
import type { FutureIntelligence } from '@/lib/learning/types';
import { cn } from '@/lib/utils';

interface MorningBriefWidgetProps {
  workshopId?: string;
  className?: string;
  compact?: boolean;
}

export const MorningBriefWidget: React.FC<MorningBriefWidgetProps> = ({
  workshopId,
  className,
  compact = false,
}) => {
  const [brief, setBrief] = useState<FutureIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<Set<string>>(new Set());

  const fetchBrief = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await futureKnowledgeGraph.getMorningBrief();
      setBrief(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load morning brief');
      console.error('Error fetching morning brief:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (itemId: string, feedback: 'useful' | 'not_useful') => {
    if (feedbackSubmitting.has(itemId)) return;
    
    try {
      setFeedbackSubmitting(prev => new Set(prev).add(itemId));
      
      // Send feedback to API
      const response = await fetch('/api/v2/ydt/future-intelligence/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_id: itemId,
          feedback,
          workshop_id: workshopId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }
      
      // Visual feedback
      const button = document.querySelector(`[data-feedback-id="${itemId}"]`);
      if (button) {
        button.classList.add('opacity-50');
      }
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setFeedbackSubmitting(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchBrief();
    // Refresh every 5 minutes
    const interval = setInterval(fetchBrief, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [workshopId]);

  if (loading && !brief) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Maalem's Morning Brief
          </CardTitle>
          <CardDescription>Loading today's intelligence...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !brief) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Maalem's Morning Brief</CardTitle>
          <CardDescription>Error loading brief</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchBrief} className="mt-4" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!brief) {
    return null;
  }

  const criticalAlerts = brief.alerts.filter(a => a.severity === 'critical');
  const highAlerts = brief.alerts.filter(a => a.severity === 'high');

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Maalem's Morning Brief
            </CardTitle>
            <CardDescription>
              {brief.summary || `صباح الخير يا ريس! ${brief.totalArticles || 0} خبر جديد اليوم`}
            </CardDescription>
          </div>
          <Button
            onClick={fetchBrief}
            variant="ghost"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Critical Alerts
            </h3>
            {criticalAlerts.map((alert, idx) => (
              <Alert key={idx} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.title}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={async () => {
                        await handleFeedback(`alert_${idx}`, 'useful');
                      }}
                      title="مفيد"
                      data-feedback-id={`alert_${idx}`}
                    >
                      <ThumbsUp className="h-3 w-3 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={async () => {
                        await handleFeedback(`alert_${idx}`, 'not_useful');
                      }}
                      title="مش مفيد"
                      data-feedback-id={`alert_${idx}`}
                    >
                      <ThumbsDown className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </AlertTitle>
                <AlertDescription>
                  <p className="font-medium">{alert.messageArabic}</p>
                  <p className="text-sm mt-1">{alert.messageEnglish}</p>
                  {alert.actionable && (
                    <p className="text-sm mt-2 font-medium">{alert.actionable}</p>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* High Priority Alerts */}
        {highAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Important Updates
            </h3>
            {highAlerts.slice(0, 3).map((alert, idx) => (
              <Alert key={idx} variant="default">
                <AlertTitle className="text-sm flex items-center justify-between">
                  <span>{alert.title}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={async () => {
                        await handleFeedback(`high_alert_${idx}`, 'useful');
                      }}
                      title="مفيد"
                      data-feedback-id={`high_alert_${idx}`}
                      disabled={feedbackSubmitting.has(`high_alert_${idx}`)}
                    >
                      <ThumbsUp className="h-3 w-3 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={async () => {
                        await handleFeedback(`high_alert_${idx}`, 'not_useful');
                      }}
                      title="مش مفيد"
                      data-feedback-id={`high_alert_${idx}`}
                      disabled={feedbackSubmitting.has(`high_alert_${idx}`)}
                    >
                      <ThumbsDown className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {alert.messageArabic}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Price Updates */}
        {brief.price_updates && brief.price_updates.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Price Updates
            </h3>
            <div className="space-y-2">
              {brief.price_updates.slice(0, compact ? 2 : 3).map((article: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{article.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {article.maalem_summary || article.actionable_advice}
                      </p>
                    </div>
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technology News */}
        {brief.tech_news && brief.tech_news.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Technology News
            </h3>
            <div className="space-y-2">
              {brief.tech_news.slice(0, compact ? 2 : 3).map((article: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{article.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {article.maalem_summary || article.actionable_advice}
                      </p>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {article.source}
                        </Badge>
                        {article.relevance === 'high' && (
                          <Badge variant="default" className="text-xs">
                            High Priority
                          </Badge>
                        )}
                      </div>
                    </div>
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {!compact && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{brief.totalArticles || 0}</p>
                <p className="text-xs text-muted-foreground">Articles</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {brief.critical_alerts || 0}
                </p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{brief.alerts?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Alerts</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

