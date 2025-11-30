import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Printer, QrCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { WindowUnit } from '@/types/fabricator';

interface ProductionLabelProps {
  windowUnit: WindowUnit;
  onClose?: () => void;
}

export const ProductionLabel: React.FC<ProductionLabelProps> = ({ windowUnit, onClose }) => {
  
  // Mock feedback URL - in prod this would point to your deployed feedback form
  const feedbackUrl = `https://fabricator.almona.com/feedback?id=${windowUnit.id}&sys=${windowUnit.systemPackId || 'default'}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-white text-black shadow-2xl border-none overflow-hidden print:shadow-none print:w-full print:max-w-none print:absolute print:inset-0">
        <div className="print:hidden bg-gray-100 p-3 flex justify-between items-center border-b">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <QrCode className="h-4 w-4" /> Production Label Preview
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handlePrint} className="bg-black hover:bg-gray-800 text-white gap-2">
              <Printer className="h-4 w-4" /> Print Label
            </Button>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Label Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4">
            <div>
              <h1 className="text-3xl font-black tracking-tighter">ALMONA</h1>
              <p className="text-sm font-medium text-gray-600">FABRICATOR PRO</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">{windowUnit.orderNumber}</h2>
              <p className="text-sm font-mono">{windowUnit.posNumber}</p>
            </div>
          </div>

          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs font-bold text-gray-500 uppercase">Type</span>
              <span className="font-semibold capitalize">{windowUnit.type?.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-500 uppercase">System</span>
              <span className="font-semibold">{windowUnit.systemPackId?.toUpperCase() || 'STANDARD'}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-500 uppercase">Dimensions</span>
              <span className="font-mono font-bold text-lg">{windowUnit.overallWidth} x {windowUnit.overallHeight} mm</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-500 uppercase">Color</span>
              <span className="font-semibold">{windowUnit.color}</span>
            </div>
          </div>

          {/* Cut List Summary (Simplified) */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
             <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Critical Cuts (Verify)</h4>
             <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                   <span>Frame Width:</span>
                   <span className="font-bold">{windowUnit.overallWidth} mm</span>
                </div>
                <div className="flex justify-between">
                   <span>Sash Width (Est):</span>
                   {/* Simple logic for visual estimation on label */}
                   <span className="font-bold">~{Math.round(windowUnit.overallWidth / 2)} mm</span>
                </div>
             </div>
          </div>

          {/* Feedback Loop Section */}
          <div className="flex gap-4 items-center border-t-2 border-black pt-4">
            <div className="bg-white p-1 border border-gray-300 rounded">
               <QRCodeCanvas value={feedbackUrl} size={80} />
            </div>
            <div className="flex-1">
               <h4 className="font-bold text-sm flex items-center gap-1">
                 <CheckCircle2 className="h-4 w-4 text-green-600" /> Quality Check
               </h4>
               <p className="text-xs text-gray-600 leading-tight mt-1">
                 Scan to report fit issues. Your feedback auto-tunes our cutting machines.
               </p>
               <div className="mt-2 text-[10px] font-mono text-gray-400 break-all">
                 ID: {windowUnit.id.substring(0, 8)}...
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
