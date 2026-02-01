/**
 * Email Tracking Dashboard
 * 
 * Gold-tier email analytics dashboard with open/click tracking,
 * delivery rates, and engagement metrics.
 * 
 * Features:
 * - Email open/click tracking
 * - Delivery rate analytics
 * - Engagement metrics
 * - Time-based analytics
 * - Export functionality
 * - Prestige theme styling
 * 
 * Usage:
 * ```tsx
 * <EmailTrackingDashboard
 *   startDate={new Date('2026-01-01')}
 *   endDate={new Date('2026-01-31')}
 * />
 * ```
 */

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/ui/table';
import { endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import {
    Calendar,
    Download,
    Mail,
    MailOpen,
    MousePointerClick,
    RefreshCw,
    TrendingUp,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface EmailTrackingDashboardProps {
  /** Start date for analytics period */
  startDate?: Date;
  /** End date for analytics period */
  endDate?: Date;
  /** Additional CSS classes */
  className?: string;
}

interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
}

interface EmailTrackingRecord {
  messageId: string;
  templateType: string;
  recipientEmail: string;
  subject: string;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  status: string;
  openCount: number;
  clickCount: number;
}

/**
 * Email Tracking Dashboard Component
 */
export const EmailTrackingDashboard: React.FC<EmailTrackingDashboardProps> = ({
  startDate = startOfMonth(new Date()),
  endDate = endOfMonth(new Date()),
  className,
}) => {
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState<Date>(startDate);
  const [periodEnd, setPeriodEnd] = useState<Date>(endDate);
  const [emailHistory, setEmailHistory] = useState<EmailTrackingRecord[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    openRate: 0,
    clickRate: 0,
    clickToOpenRate: 0,
  });

  const loadEmailTracking = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch email history
      const { data: history, error: historyError } = await (supabase
        .from('email_history') as any)
        .select('*')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString())
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Failed to fetch email history:', historyError);
        toast.error('Failed to load email tracking data');
        return;
      }

      // Fetch tracking events
      const messageIds = (history || []).map((h: any) => h.message_id).filter(Boolean);
      
      let trackingEvents: any[] = [];
      if (messageIds.length > 0) {
        const { data: events, error: eventsError } = await (supabase
          .from('email_tracking') as any)
          .select('*')
          .in('message_id', messageIds);

        if (!eventsError && events) {
          trackingEvents = events;
        }
      }

      // Combine history with tracking data
      const combined = (history || []).map((h: any) => {
        const opens = trackingEvents.filter(e => 
          e.message_id === h.message_id && e.event_type === 'opened'
        );
        const clicks = trackingEvents.filter(e => 
          e.message_id === h.message_id && e.event_type === 'clicked'
        );

        return {
          messageId: h.message_id,
          templateType: h.template_type || 'unknown',
          recipientEmail: h.recipient_email || '',
          subject: h.subject || '',
          sentAt: new Date(h.created_at || h.sent_at),
          deliveredAt: h.delivered_at ? new Date(h.delivered_at) : undefined,
          openedAt: opens.length > 0 ? new Date(opens[0].timestamp) : undefined,
          clickedAt: clicks.length > 0 ? new Date(clicks[0].timestamp) : undefined,
          status: h.status || 'pending',
          openCount: opens.length,
          clickCount: clicks.length,
        };
      });

      setEmailHistory(combined);

      // Calculate stats
      const totalSent = combined.length;
      const totalDelivered = combined.filter(e => e.status === 'delivered' || e.status === 'sent').length;
      const totalOpened = combined.filter(e => e.openCount > 0).length;
      const totalClicked = combined.filter(e => e.clickCount > 0).length;

      setStats({
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
        clickToOpenRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      });
    } catch (error) {
      console.error('Failed to load email tracking:', error);
      toast.error('Failed to load email tracking data');
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    loadEmailTracking();
  }, [loadEmailTracking]);

  const handleExport = () => {
    // Export functionality
    const csv = [
      ['Message ID', 'Template Type', 'Recipient', 'Subject', 'Sent At', 'Opened', 'Clicked', 'Status'].join(','),
      ...emailHistory.map(e => [
        e.messageId,
        e.templateType,
        e.recipientEmail,
        `"${e.subject}"`,
        format(e.sentAt, 'yyyy-MM-dd HH:mm:ss'),
        e.openCount > 0 ? 'Yes' : 'No',
        e.clickCount > 0 ? 'Yes' : 'No',
        e.status,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-tracking-${format(periodStart, 'yyyy-MM-dd')}-${format(periodEnd, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Email tracking data exported');
  };

  const quickPeriods = [
    { label: 'Today', start: new Date(), end: new Date() },
    { label: 'Last 7 Days', start: subDays(new Date(), 7), end: new Date() },
    { label: 'Last 30 Days', start: subDays(new Date(), 30), end: new Date() },
    { label: 'This Month', start: startOfMonth(new Date()), end: endOfMonth(new Date()) },
    { label: 'Last Month', start: startOfMonth(subDays(new Date(), 30)), end: endOfMonth(subDays(new Date(), 30)) },
  ];

  if (loading) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Period Selection */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Email Tracking Period
              </CardTitle>
              <CardDescription className="text-sm text-amber-600/70 mt-1">
                Select period for email analytics
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadEmailTracking}
                variant="outline"
                size="sm"
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-sm text-amber-300">Start Date</Label>
              <Input
                type="date"
                value={format(periodStart, 'yyyy-MM-dd')}
                onChange={(e) => setPeriodStart(new Date(e.target.value))}
                className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-amber-300">End Date</Label>
              <Input
                type="date"
                value={format(periodEnd, 'yyyy-MM-dd')}
                onChange={(e) => setPeriodEnd(new Date(e.target.value))}
                className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickPeriods.map((period) => (
              <Button
                key={period.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  setPeriodStart(period.start);
                  setPeriodEnd(period.end);
                }}
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
              >
                {period.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600/70 mb-1">Total Sent</p>
                <p className="text-2xl font-bold text-amber-200">{stats.totalSent}</p>
              </div>
              <Mail className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600/70 mb-1">Open Rate</p>
                <p className="text-2xl font-bold text-amber-200">{stats.openRate.toFixed(1)}%</p>
              </div>
              <MailOpen className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600/70 mb-1">Click Rate</p>
                <p className="text-2xl font-bold text-amber-200">{stats.clickRate.toFixed(1)}%</p>
              </div>
              <MousePointerClick className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600/70 mb-1">CTOR</p>
                <p className="text-2xl font-bold text-amber-200">{stats.clickToOpenRate.toFixed(1)}%</p>
                <p className="text-xs text-amber-600/50 mt-1">Click-to-Open</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email History Table */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Email History</CardTitle>
        </CardHeader>
        <CardContent>
          {emailHistory.length === 0 ? (
            <div className="text-center py-8 text-amber-600/70">
              No email tracking data for this period
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <TableHead className="text-amber-300/70">Template</TableHead>
                  <TableHead className="text-amber-300/70">Recipient</TableHead>
                  <TableHead className="text-amber-300/70">Subject</TableHead>
                  <TableHead className="text-amber-300/70">Sent</TableHead>
                  <TableHead className="text-amber-300/70 text-center">Opened</TableHead>
                  <TableHead className="text-amber-300/70 text-center">Clicked</TableHead>
                  <TableHead className="text-amber-300/70">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailHistory.map((email) => (
                  <TableRow key={email.messageId} className="border-amber-600/10">
                    <TableCell className="text-amber-200 capitalize">
                      {email.templateType.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-amber-200">{email.recipientEmail}</TableCell>
                    <TableCell className="text-amber-200">{email.subject}</TableCell>
                    <TableCell className="text-amber-200">
                      {format(email.sentAt, 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-center">
                      {email.openCount > 0 ? (
                        <span className="text-emerald-400">✓ {email.openCount}</span>
                      ) : (
                        <span className="text-amber-600/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {email.clickCount > 0 ? (
                        <span className="text-cyan-400">✓ {email.clickCount}</span>
                      ) : (
                        <span className="text-amber-600/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-amber-200 capitalize">{email.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

