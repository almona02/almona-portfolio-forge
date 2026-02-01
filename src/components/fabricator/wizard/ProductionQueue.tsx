import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { CalendarClock, CheckCircle, Factory, ShoppingCart, Truck } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

// Local interface until we export the main one
interface WizardData {
  windowType: any;
  systemPackId: string | null;
  dimensions: { width: number; height: number } | null;
  quantity: number;
}

interface ProductionQueueProps {
  wizardData: WizardData;
  onConfirm: () => void;
}

export function ProductionQueue({ wizardData, onConfirm }: ProductionQueueProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';

  // Mock Inventory Check
  const inventoryStatus = React.useMemo(() => {
    // 30% chance of low stock for demo purposes
    const isLowStock = Math.random() > 0.7;
    return isLowStock ? 'low' : 'ok';
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      
      {/* 1. Summary Card */}
      <Card className="bg-slate-900 text-white border-slate-800">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Factory className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {locale === 'ar' ? 'جاهز للإنتاج' : 'Ready for Production'}
              </h3>
              <p className="text-blue-200">
                {wizardData.quantity}x {wizardData.systemPackId} • {wizardData.dimensions?.width}x{wizardData.dimensions?.height}cm
              </p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-sm text-slate-400">{locale === 'ar' ? 'معرّف الدفعة' : 'Batch ID'}</div>
             <div className="font-mono text-lg font-bold tracking-widest">BATCH-{Math.floor(Math.random()*10000)}</div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Inventory Alert */}
      {inventoryStatus === 'low' ? (
         <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-500">
                {locale === 'ar' ? 'تنبيه مخزون' : 'Inventory Alert'}
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
                {locale === 'ar' 
                    ? 'المخزون الحالي من البروفايل قد لا يكفي. يرجى مراجعة المورد.'
                    : 'Current profile stock may not be sufficient. Please check with supplier.'}
            </AlertDescription>
         </Alert>
      ) : (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-500">
                {locale === 'ar' ? 'المخزون متوفر' : 'Stock Available'}
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
                {locale === 'ar' 
                    ? 'جميع المواد متوفرة في المخزن. يمكن البدء فوراً.'
                    : 'All materials available in warehouse. Can start immediately.'}
            </AlertDescription>
        </Alert>
      )}

      {/* 3. Production Timeline */}
      <div className="py-4">
        <div className="flex items-center justify-between px-8 text-sm text-slate-500 mb-2">
            <span>{locale === 'ar' ? 'اليوم' : 'Today'}</span>
            <span>+2 {locale === 'ar' ? 'أيام' : 'Days'}</span>
            <span>+3 {locale === 'ar' ? 'أيام' : 'Days'}</span>
        </div>
        <div className="relative h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-8 mx-4">
            <div className="absolute top-0 left-0 h-full w-1/3 bg-blue-500 rounded-full opacity-50"></div>
            
            {/* Dots */}
            <div className="absolute top-[-4px] left-0 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-950"></div>
            <div className="absolute top-[-4px] left-1/3 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700"></div>
            <div className="absolute top-[-4px] right-0 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        </div>
        <div className="flex justify-between text-center text-xs sm:text-sm px-2 font-medium">
            <div className="flex flex-col items-center gap-1 w-1/3">
                <CalendarClock className="w-5 h-5 text-blue-600" />
                <span>{locale === 'ar' ? 'جدولة' : 'Scheduling'}</span>
            </div>
            <div className="flex flex-col items-center gap-1 w-1/3 opacity-50">
                <Factory className="w-5 h-5" />
                <span>{locale === 'ar' ? 'تصنيع' : 'Fabrication'}</span>
            </div>
            <div className="flex flex-col items-center gap-1 w-1/3 opacity-50">
                <Truck className="w-5 h-5" />
                <span>{locale === 'ar' ? 'تسليم' : 'Delivery'}</span>
            </div>
        </div>
      </div>

      {/* 4. Action Button */}
      <Button 
        size="lg" 
        className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20"
        onClick={onConfirm}
      >
        <Factory className="mr-3 w-6 h-6" />
        {locale === 'ar' ? 'إضافة لخط الإنتاج' : 'Add to Production Schedule'}
      </Button>

    </div>
  );
}
