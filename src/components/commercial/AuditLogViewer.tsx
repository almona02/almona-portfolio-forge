/**
 * AuditLogViewer - Financial Audit Trail Component
 * 
 * Displays chronological log of project changes with price impact tracking.
 * Highlights price increases in red for accountant review.
 * 
 * Designed for Sara persona: Accountants who need financial oversight.
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/ui/table';
import { Calendar, DollarSign, FileText, Minus, TrendingDown, TrendingUp, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  actionType: 'price_change' | 'design_change' | 'lock' | 'unlock' | 'quote_sent' | 'approval' | 'other';
  details?: string;
  oldPrice?: number;
  newPrice?: number;
  priceImpact?: number; // Positive = increase, Negative = decrease
  currency?: string;
}

interface AuditLogViewerProps {
  auditEntries: AuditEntry[];
  showPriceImpact?: boolean;
  maxEntries?: number;
}

export function AuditLogViewer({
  auditEntries,
  showPriceImpact = true,
  maxEntries,
}: AuditLogViewerProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';

  // Sort entries by timestamp (newest first)
  const sortedEntries = [...auditEntries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Limit entries if maxEntries specified
  const displayEntries = maxEntries ? sortedEntries.slice(0, maxEntries) : sortedEntries;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'EGP') => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPriceImpactIcon = (impact?: number) => {
    if (!impact) return <Minus className="h-5 w-5 text-gray-500" />;
    if (impact > 0) return <TrendingUp className="h-5 w-5 text-red-500" />;
    return <TrendingDown className="h-5 w-5 text-green-500" />;
  };

  const getPriceImpactColor = (impact?: number) => {
    if (!impact) return 'text-gray-700 dark:text-gray-300';
    if (impact > 0) return 'text-red-700 dark:text-red-400 font-bold'; // Price INCREASE = RED = BAD
    return 'text-green-700 dark:text-green-400 font-bold'; // Price DECREASE = GREEN = GOOD
  };

  const getActionTypeIcon = (actionType: AuditEntry['actionType']) => {
    switch (actionType) {
      case 'price_change':
        return <DollarSign className="h-5 w-5" />;
      case 'design_change':
        return <FileText className="h-5 w-5" />;
      case 'lock':
      case 'unlock':
        return <FileText className="h-5 w-5" />;
      case 'quote_sent':
        return <FileText className="h-5 w-5" />;
      case 'approval':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getActionTypeBadge = (actionType: AuditEntry['actionType']) => {
    const labels = {
      price_change: locale === 'ar' ? 'تغيير سعر' : 'Price Change',
      design_change: locale === 'ar' ? 'تغيير تصميم' : 'Design Change',
      lock: locale === 'ar' ? 'قفل' : 'Locked',
      unlock: locale === 'ar' ? 'فتح' : 'Unlocked',
      quote_sent: locale === 'ar' ? 'إرسال عرض' : 'Quote Sent',
      approval: locale === 'ar' ? 'موافقة' : 'Approval',
      other: locale === 'ar' ? 'آخر' : 'Other',
    };

    const variants: Record<AuditEntry['actionType'], 'default' | 'destructive' | 'secondary' | 'outline'> = {
      price_change: 'destructive',
      design_change: 'secondary',
      lock: 'default',
      unlock: 'outline',
      quote_sent: 'default',
      approval: 'default',
      other: 'secondary',
    };

    return (
      <Badge variant={variants[actionType]} className="text-sm">
        {labels[actionType]}
      </Badge>
    );
  };

  if (displayEntries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">
            {locale === 'ar' ? 'لا توجد سجلات تدقيق' : 'No audit entries'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-3">
          <FileText className="h-7 w-7" />
          {locale === 'ar' ? 'سجل التدقيق' : 'Audit Log'}
        </CardTitle>
        <p className="text-muted-foreground">
          {locale === 'ar'
            ? `${displayEntries.length} ${displayEntries.length === 1 ? 'سجل' : 'سجلات'}`
            : `${displayEntries.length} ${displayEntries.length === 1 ? 'entry' : 'entries'}`}
        </p>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {locale === 'ar' ? 'التاريخ' : 'When'}
                  </div>
                </TableHead>
                <TableHead className="text-base">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {locale === 'ar' ? 'المستخدم' : 'Who'}
                  </div>
                </TableHead>
                <TableHead className="text-base">{locale === 'ar' ? 'الإجراء' : 'Action'}</TableHead>
                {showPriceImpact && (
                  <TableHead className="text-base text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-4 w-4" />
                      {locale === 'ar' ? 'تأثير السعر' : 'Price Impact'}
                    </div>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {displayEntries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/50">
                  {/* Timestamp */}
                  <TableCell className="font-mono text-sm">{formatDate(entry.timestamp)}</TableCell>

                  {/* User */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{entry.userName}</p>
                        <p className="text-xs text-muted-foreground">{entry.userId}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getActionTypeIcon(entry.actionType)}
                        {getActionTypeBadge(entry.actionType)}
                      </div>
                      <p className="text-base font-medium">{entry.action}</p>
                      {entry.details && (
                        <p className="text-sm text-muted-foreground">{entry.details}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Price Impact */}
                  {showPriceImpact && (
                    <TableCell className="text-right">
                      {entry.priceImpact !== undefined ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-end gap-2">
                            {getPriceImpactIcon(entry.priceImpact)}
                            <span className={`text-lg ${getPriceImpactColor(entry.priceImpact)}`}>
                              {entry.priceImpact > 0 && '+'}
                              {formatCurrency(entry.priceImpact, entry.currency)}
                            </span>
                          </div>
                          {entry.oldPrice !== undefined && entry.newPrice !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(entry.oldPrice, entry.currency)} →{' '}
                              {formatCurrency(entry.newPrice, entry.currency)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {maxEntries && auditEntries.length > maxEntries && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {locale === 'ar'
              ? `عرض ${maxEntries} من ${auditEntries.length} سجلات`
              : `Showing ${maxEntries} of ${auditEntries.length} entries`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
