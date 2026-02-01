/**
 * CommercialLockGuard - Read-Only Overlay for Locked Projects
 * 
 * Prevents editing of quoted/production projects by displaying
 * a prominent overlay with clear messaging and change order request button.
 * 
 * Designed for Sara persona: Accountants who need financial integrity.
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { AlertTriangle, Calendar, FileEdit, Lock, User } from 'lucide-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface ProjectLockStatus {
  status: 'design' | 'quoted' | 'production';
  isLocked: boolean;
  lockedBy?: string;
  lockReason?: string;
  lockedAt?: Date;
  changeOrderId?: string;
}

interface CommercialLockGuardProps {
  lockStatus: ProjectLockStatus;
  onRequestChangeOrder?: () => void;
  children: ReactNode;
}

export function CommercialLockGuard({
  lockStatus,
  onRequestChangeOrder,
  children,
}: CommercialLockGuardProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';

  // If not locked, render children normally
  if (!lockStatus.isLocked && lockStatus.status === 'design') {
    return <>{children}</>;
  }

  // Determine overlay styling based on status
  const getStatusColor = () => {
    switch (lockStatus.status) {
      case 'quoted':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-950';
      case 'production':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getStatusIcon = () => {
    switch (lockStatus.status) {
      case 'quoted':
        return <Lock className="h-16 w-16 text-amber-500" />;
      case 'production':
        return <Lock className="h-16 w-16 text-red-500" />;
      default:
        return <Lock className="h-16 w-16 text-gray-500" />;
    }
  };

  const getStatusLabel = () => {
    switch (lockStatus.status) {
      case 'quoted':
        return locale === 'ar' ? 'مسعر للعميل' : 'Quoted to Client';
      case 'production':
        return locale === 'ar' ? 'في الإنتاج' : 'In Production';
      default:
        return locale === 'ar' ? 'مقفول' : 'Locked';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative">
      {/* Read-only children (dimmed) */}
      <div className="opacity-50 pointer-events-none select-none filter blur-[2px]">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
        <Card className={`max-w-3xl w-full mx-4 border-4 ${getStatusColor()} shadow-2xl`}>
          <CardHeader>
            <div className="flex items-center justify-center gap-4 mb-4">
              {getStatusIcon()}
              <div>
                <CardTitle className="text-4xl text-center">
                  {locale === 'ar' ? '🔒 المشروع مقفول' : '🔒 Project Locked'}
                </CardTitle>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge
                    variant={lockStatus.status === 'production' ? 'destructive' : 'default'}
                    className="text-xl px-4 py-2"
                  >
                    {getStatusLabel()}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Lock reason */}
            {lockStatus.lockReason && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border-2 border-dashed">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-lg font-medium mb-2">
                      {locale === 'ar' ? 'السبب' : 'Reason'}:
                    </p>
                    <p className="text-xl">{lockStatus.lockReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Lock metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
              {lockStatus.lockedBy && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="h-5 w-5" />
                    <span>{locale === 'ar' ? 'قفل بواسطة' : 'Locked by'}</span>
                  </div>
                  <p className="font-medium">{lockStatus.lockedBy}</p>
                </div>
              )}

              {lockStatus.lockedAt && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-5 w-5" />
                    <span>{locale === 'ar' ? 'تاريخ القفل' : 'Locked on'}</span>
                  </div>
                  <p className="font-medium">{formatDate(lockStatus.lockedAt)}</p>
                </div>
              )}
            </div>

            {/* Warning message */}
            <div className="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 p-6 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400 mt-1" />
                <div>
                  <p className="text-xl font-bold text-amber-800 dark:text-amber-200 mb-2">
                    {locale === 'ar'
                      ? '⚠️ لا يمكن التعديل على المشروع'
                      : '⚠️ Project Cannot Be Modified'}
                  </p>
                  <p className="text-lg text-amber-700 dark:text-amber-300">
                    {locale === 'ar'
                      ? lockStatus.status === 'production'
                        ? 'المشروع في الإنتاج. لا يمكن التعديل نهائياً.'
                        : 'المشروع تم تسعيره للعميل. لازم طلب تغيير معتمد عشان تعدل.'
                      : lockStatus.status === 'production'
                      ? 'Project is in production. No edits allowed.'
                      : 'Project has been quoted to client. An approved change order is required to modify.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Change order info */}
            {lockStatus.changeOrderId && (
              <div className="bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 p-4 rounded-lg">
                <p className="text-lg text-blue-800 dark:text-blue-200">
                  ℹ️ {locale === 'ar' ? 'تم الفتح عن طريق أمر تغيير' : 'Unlocked via change order'}:{' '}
                  <span className="font-bold">#{lockStatus.changeOrderId}</span>
                </p>
              </div>
            )}

            {/* Action buttons */}
            {lockStatus.status === 'quoted' && onRequestChangeOrder && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={onRequestChangeOrder}
                  size="lg"
                  variant="default"
                  className="text-2xl px-8 py-6"
                >
                  <FileEdit className="mr-3 h-8 w-8" />
                  {locale === 'ar' ? 'طلب أمر تغيير' : 'Request Change Order'}
                </Button>
              </div>
            )}

            {lockStatus.status === 'production' && (
              <div className="text-center text-lg text-muted-foreground">
                {locale === 'ar'
                  ? '💼 اتصل بالمدير للحصول على المساعدة'
                  : '💼 Contact management for assistance'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
