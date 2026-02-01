/**
 * KioskModeDashboard - Touch-First Production Interface for Operators
 * 
 * Designed for tablet-mounted interfaces near CNC machines.
 * Operator workflow: SCAN → EXECUTE → QC → NEXT
 * 
 * Features:
 * - Massive touch-optimized buttons (min 80px height)
 * - QR/Barcode-driven workflow
 * - Auto-save on every action (no manual save buttons)
 * - Full Arabic support
 * - High contrast, large fonts
 */

import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import {
    AlertCircle,
    Camera,
    CheckCircle,
    Pause,
    Play,
    Settings,
    SkipForward,
    StopCircle,
    XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Design tokens for kiosk mode
const KIOSK_TOKENS = {
  BUTTON_MIN_HEIGHT: '80px',
  BUTTON_LARGE_HEIGHT: '150px',
  FONT_BODY: '24px',
  FONT_HEADER: '48px',
  FONT_HUGE: '72px',
  HIT_AREA_MIN: '44px',
  SPACING_LARGE: '32px',
  BORDER_RADIUS: '12px',
};

interface ProductionPiece {
  id: string;
  barcode: string;
  name: string;
  length: number;
  profile: string;
  angles: string;
  image?: string;
}

interface KioskModeDashboardProps {
  machineId: string;
  operatorName: string;
  onStateChange?: (state: WorkflowState) => void;
}

type WorkflowState = 'idle' | 'scanning' | 'confirming' | 'executing' | 'qc' | 'complete';
type QCCheckItem = { id: string; labelAr: string; labelEn: string; passed: boolean };

export function KioskModeDashboard({ 
  machineId, 
  operatorName,
  onStateChange 
}: KioskModeDashboardProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  
  const [workflowState, setWorkflowState] = useState<WorkflowState>('idle');
  const [currentPiece, setCurrentPiece] = useState<ProductionPiece | null>(null);
  const [lastPiece, setLastPiece] = useState<ProductionPiece | null>(null);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [qcChecks, setQcChecks] = useState<QCCheckItem[]>([
    { id: 'length', labelAr: 'الطول صح', labelEn: 'Length OK', passed: false },
    { id: 'angles', labelAr: 'الزوايا صح', labelEn: 'Angles OK', passed: false },
    { id: 'surface', labelAr: 'السطح نظيف', labelEn: 'Surface Clean', passed: false },
    { id: 'profile', labelAr: 'البروفايل سليم', labelEn: 'Profile Intact', passed: false },
  ]);

  // Auto-save function (called on every state change)
  const autoSave = useCallback(async (event: { type: string; data: any }) => {
    const timestamp = Date.now();
    const logEntry = {
      machineId,
      operatorName,
      timestamp,
      event: event.type,
      data: event.data,
    };

    // Save to localStorage immediately
    const existingLogs = JSON.parse(localStorage.getItem('production_logs') || '[]');
    existingLogs.push(logEntry);
    localStorage.setItem('production_logs', JSON.stringify(existingLogs));

    // TODO: Send to server (background sync)
    console.log('[AUTO-SAVE]', logEntry);

    return logEntry;
  }, [machineId, operatorName]);

  // Handle barcode scan
  const handleScan = useCallback(async (barcode: string) => {
    console.log('[SCAN]', barcode);
    
    // Auto-save scan event
    await autoSave({ type: 'piece_scanned', data: { barcode } });

    // Fetch piece data (mock for now)
    const piece: ProductionPiece = {
      id: `piece_${Date.now()}`,
      barcode,
      name: 'إطار يمين', // Frame Right
      length: 180,
      profile: 'PANDA-50',
      angles: '45° / 45°',
    };

    setCurrentPiece(piece);
    setWorkflowState('confirming');

    // Show toast
    toast.success(locale === 'ar' ? '✅ تم المسح بنجاح' : '✅ Scan successful', {
      duration: 2000,
    });
  }, [autoSave, locale]);

  const handleScanError = useCallback((error: string) => {
    console.error('[SCAN ERROR]', error);
    toast.error(locale === 'ar' ? '❌ خطأ في المسح' : '❌ Scan error', {
      description: error,
      duration: 3000,
    });
  }, [locale]);

  // Barcode scanner hook
  const { isScanning, simulateScan, buffer } = useBarcodeScanner({
    enabled: workflowState === 'idle',
    onScan: handleScan,
    onError: handleScanError,
  });

  // Handle workflow state changes
  useEffect(() => {
    onStateChange?.(workflowState);
  }, [workflowState, onStateChange]);

  // Handle piece execution start
  const handleStart = useCallback(async () => {
    if (!currentPiece) return;

    await autoSave({ type: 'cutting_started', data: { pieceId: currentPiece.id } });
    setWorkflowState('executing');
    setExecutionProgress(0);
    setRemainingTime(30); // Mock: 30 seconds

    // Simulate cutting progress
    const interval = setInterval(() => {
      setExecutionProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setWorkflowState('qc');
          autoSave({ type: 'cutting_completed', data: { pieceId: currentPiece.id } });
          return 100;
        }
        return prev + 5;
      });
      
      setRemainingTime((prev) => Math.max(0, prev - 1.5));
    }, 500);
  }, [currentPiece, autoSave]);

  // Handle skip piece
  const handleSkip = useCallback(async () => {
    if (!currentPiece) return;

    await autoSave({ type: 'piece_skipped', data: { pieceId: currentPiece.id } });
    setCurrentPiece(null);
    setWorkflowState('idle');
    
    toast.info(locale === 'ar' ? 'تم التخطي' : 'Skipped');
  }, [currentPiece, autoSave, locale]);

  // Handle pause
  const handlePause = useCallback(async () => {
    await autoSave({ type: 'cutting_paused', data: { pieceId: currentPiece?.id, progress: executionProgress } });
    toast.warning(locale === 'ar' ? '⏸️ تم الإيقاف المؤقت' : '⏸️ Paused');
  }, [currentPiece, executionProgress, autoSave, locale]);

  // Handle emergency stop
  const handleStop = useCallback(async () => {
    await autoSave({ type: 'emergency_stop', data: { pieceId: currentPiece?.id, progress: executionProgress } });
    setWorkflowState('idle');
    setCurrentPiece(null);
    
    toast.error(locale === 'ar' ? '🛑 توقف طارئ' : '🛑 Emergency Stop', {
      duration: 5000,
    });
  }, [currentPiece, executionProgress, autoSave, locale]);

  // Handle QC check toggle
  const handleQCToggle = useCallback((checkId: string) => {
    setQcChecks((prev) =>
      prev.map((check) =>
        check.id === checkId ? { ...check, passed: !check.passed } : check
      )
    );
  }, []);

  // Handle QC confirm (all checks passed)
  const handleQCConfirm = useCallback(async () => {
    if (!currentPiece) return;

    const allPassed = qcChecks.every((check) => check.passed);

    await autoSave({
      type: 'qc_completed',
      data: {
        pieceId: currentPiece.id,
        allPassed,
        checks: qcChecks,
      },
    });

    if (allPassed) {
      toast.success(locale === 'ar' ? '✅ كل حاجة تمام' : '✅ All checks passed');
      setLastPiece(currentPiece);
      setCurrentPiece(null);
      setWorkflowState('idle');
      
      // Reset QC checks
      setQcChecks((prev) => prev.map((check) => ({ ...check, passed: false })));
    } else {
      toast.error(locale === 'ar' ? '⚠️ فيه مشكلة' : '⚠️ Issues detected');
    }
  }, [currentPiece, qcChecks, autoSave, locale]);

  // Handle QC reject
  const handleQCReject = useCallback(async () => {
    if (!currentPiece) return;

    await autoSave({
      type: 'qc_rejected',
      data: {
        pieceId: currentPiece.id,
        checks: qcChecks,
      },
    });

    toast.warning(locale === 'ar' ? '⚠️ عيد القطع' : '⚠️ Rework required');
    setCurrentPiece(null);
    setWorkflowState('idle');
    setQcChecks((prev) => prev.map((check) => ({ ...check, passed: false })));
  }, [currentPiece, qcChecks, autoSave, locale]);

  // Render functions for each state
  const renderIdleState = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
      <div className="text-center space-y-4">
        <Camera className="w-32 h-32 mx-auto text-primary animate-pulse" />
        <h2 
          className="font-bold text-primary"
          style={{ fontSize: KIOSK_TOKENS.FONT_HUGE }}
        >
          {locale === 'ar' ? 'امسح الباركود' : 'Scan Barcode'}
        </h2>
        {buffer && (
          <div className="text-muted-foreground" style={{ fontSize: KIOSK_TOKENS.FONT_BODY }}>
            {buffer}
          </div>
        )}
        {isScanning && (
          <Badge variant="default" className="text-2xl px-6 py-3">
            {locale === 'ar' ? 'جار المسح...' : 'Scanning...'}
          </Badge>
        )}
      </div>

      {lastPiece && (
        <div className="text-center p-6 bg-green-50 dark:bg-green-950 rounded-lg">
          <div className="text-green-700 dark:text-green-300" style={{ fontSize: KIOSK_TOKENS.FONT_BODY }}>
            {locale === 'ar' ? 'آخر قطعة' : 'Last Piece'}: {lastPiece.barcode} - ✓ {locale === 'ar' ? 'نجحت' : 'Success'}
          </div>
        </div>
      )}

      {/* Testing: Simulate scan button */}
      <Button
        onClick={() => simulateScan(`PIECE_${Date.now()}`)}
        variant="outline"
        style={{ minHeight: KIOSK_TOKENS.BUTTON_MIN_HEIGHT }}
        className="text-xl"
      >
        🧪 {locale === 'ar' ? 'محاكاة مسح (اختبار)' : 'Simulate Scan (Test)'}
      </Button>
    </div>
  );

  const renderConfirmingState = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle style={{ fontSize: KIOSK_TOKENS.FONT_HEADER }} className="text-center">
            ✅ {locale === 'ar' ? `قطعة #${currentPiece?.barcode}` : `Piece #${currentPiece?.barcode}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4" style={{ fontSize: KIOSK_TOKENS.FONT_BODY }}>
            <div>
              <p className="text-muted-foreground">{locale === 'ar' ? 'الطول' : 'Length'}:</p>
              <p className="font-bold">{currentPiece?.length} سم</p>
            </div>
            <div>
              <p className="text-muted-foreground">{locale === 'ar' ? 'البروفايل' : 'Profile'}:</p>
              <p className="font-bold">{currentPiece?.profile}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">{locale === 'ar' ? 'الزوايا' : 'Angles'}:</p>
              <p className="font-bold">{currentPiece?.angles}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleStart}
              variant="default"
              size="lg"
              style={{ minHeight: KIOSK_TOKENS.BUTTON_LARGE_HEIGHT, borderRadius: KIOSK_TOKENS.BORDER_RADIUS }}
              className="text-3xl font-bold"
            >
              <Play className="mr-3 h-12 w-12" />
              {locale === 'ar' ? 'ابدأ' : 'START'}
            </Button>
            <Button
              onClick={handleSkip}
              variant="outline"
              size="lg"
              style={{ minHeight: KIOSK_TOKENS.BUTTON_LARGE_HEIGHT, borderRadius: KIOSK_TOKENS.BORDER_RADIUS }}
              className="text-3xl"
            >
              <SkipForward className="mr-3 h-12 w-12" />
              {locale === 'ar' ? 'تخطي' : 'SKIP'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderExecutingState = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle style={{ fontSize: KIOSK_TOKENS.FONT_HEADER }} className="text-center flex items-center justify-center gap-4">
            ⚙️ {locale === 'ar' ? 'بيقطع...' : 'Cutting...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <Progress value={executionProgress} className="h-8" />
            <div className="text-center mt-4" style={{ fontSize: KIOSK_TOKENS.FONT_HEADER }}>
              {executionProgress.toFixed(0)}%
            </div>
          </div>

          <div className="text-center text-muted-foreground" style={{ fontSize: KIOSK_TOKENS.FONT_BODY }}>
            {locale === 'ar' ? 'الوقت المتبقي' : 'Time remaining'}: {remainingTime.toFixed(0)} {locale === 'ar' ? 'ثانية' : 'seconds'}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handlePause}
              variant="secondary"
              size="lg"
              style={{ minHeight: KIOSK_TOKENS.BUTTON_LARGE_HEIGHT, borderRadius: KIOSK_TOKENS.BORDER_RADIUS }}
              className="text-3xl"
            >
              <Pause className="mr-3 h-12 w-12" />
              {locale === 'ar' ? 'إيقاف مؤقت' : 'PAUSE'}
            </Button>
            <Button
              onClick={handleStop}
              variant="destructive"
              size="lg"
              style={{ minHeight: KIOSK_TOKENS.BUTTON_LARGE_HEIGHT, borderRadius: KIOSK_TOKENS.BORDER_RADIUS }}
              className="text-3xl"
            >
              <StopCircle className="mr-3 h-12 w-12" />
              {locale === 'ar' ? 'توقف' : 'STOP'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderQCState = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle style={{ fontSize: KIOSK_TOKENS.FONT_HEADER }} className="text-center">
            🔍 {locale === 'ar' ? 'فحص الجودة' : 'Quality Check'}
          </CardTitle>
          <div className="text-center text-muted-foreground" style={{ fontSize: KIOSK_TOKENS.FONT_BODY }}>
            {locale === 'ar' ? `قطعة #${currentPiece?.barcode} - ${currentPiece?.name}` : `Piece #${currentPiece?.barcode} - ${currentPiece?.name}`}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {qcChecks.map((check) => (
              <Button
                key={check.id}
                onClick={() => handleQCToggle(check.id)}
                variant={check.passed ? 'default' : 'outline'}
                size="lg"
                style={{ minHeight: '100px', borderRadius: KIOSK_TOKENS.BORDER_RADIUS }}
                className="w-full text-2xl justify-start"
              >
                {check.passed ? (
                  <CheckCircle className="mr-4 h-10 w-10 text-green-500" />
                ) : (
                  <XCircle className="mr-4 h-10 w-10 text-muted-foreground" />
                )}
                {locale === 'ar' ? check.labelAr : check.labelEn}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 pt-6">
            <Button
              onClick={handleQCConfirm}
              variant="default"
              size="lg"
              disabled={!qcChecks.every((c) => c.passed)}
              style={{ minHeight: KIOSK_TOKENS.BUTTON_LARGE_HEIGHT, borderRadius: KIOSK_TOKENS.BORDER_RADIUS }}
              className="text-3xl font-bold"
            >
              <CheckCircle className="mr-3 h-12 w-12" />
              {locale === 'ar' ? 'تأكيد - كل حاجة تمام' : 'Confirm - All OK'}
            </Button>
            <Button
              onClick={handleQCReject}
              variant="destructive"
              size="lg"
              style={{ minHeight: KIOSK_TOKENS.BUTTON_MIN_HEIGHT, borderRadius: KIOSK_TOKENS.BORDER_RADIUS }}
              className="text-2xl"
            >
              <AlertCircle className="mr-3 h-10 w-10" />
              {locale === 'ar' ? 'مشكلة - عيد القطع' : 'Issue - Rework'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="kiosk-container min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontSize: KIOSK_TOKENS.FONT_HEADER }} className="font-bold">
            🤖 {locale === 'ar' ? `آلة CNC رقم ${machineId}` : `CNC Machine #${machineId}`}
          </h1>
          <div style={{ fontSize: KIOSK_TOKENS.FONT_BODY }} className="text-muted-foreground">
            📊 {locale === 'ar' ? 'الحالة' : 'Status'}:{' '}
            <Badge variant={workflowState === 'idle' ? 'default' : 'secondary'} className="text-xl px-4 py-1">
              {workflowState === 'idle' && (locale === 'ar' ? 'جاهزة ✓' : 'Ready ✓')}
              {workflowState === 'scanning' && (locale === 'ar' ? 'مسح...' : 'Scanning...')}
              {workflowState === 'confirming' && (locale === 'ar' ? 'تأكيد' : 'Confirming')}
              {workflowState === 'executing' && (locale === 'ar' ? 'تشغيل' : 'Executing')}
              {workflowState === 'qc' && (locale === 'ar' ? 'فحص الجودة' : 'QC')}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" style={{ width: '64px', height: '64px' }}>
          <Settings className="h-10 w-10" />
        </Button>
      </div>

      {/* Main content based on workflow state */}
      {workflowState === 'idle' && renderIdleState()}
      {workflowState === 'confirming' && renderConfirmingState()}
      {workflowState === 'executing' && renderExecutingState()}
      {workflowState === 'qc' && renderQCState()}
    </div>
  );
}
