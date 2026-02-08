/**
 * Batch Cut List Demo – test with single window
 *
 * Test: 1 × window 1000×1000 mm aluminium casement (frame + sash).
 * - Generates optimized cut list for frame and sash
 * - Visualizes with ALMONA Cut List Viewer
 * - Print ALMONA style (HTML) and Download PDF
 *
 * Route: /demo/batch-cut-list
 */

import { AlmonaCutListViewer } from '@/components/fabricator/AlmonaCutListViewer';
import type { AlmonaCutPrintProjectInfo } from '@/lib/fabricator/CutListExport';
import {
    downloadCutListPDF,
    type CutListPDFProjectInfo,
} from '@/lib/fabricator/CutListExport';
import {
    generateOptimizedCutListForBatch,
    type BatchWindowSpec,
} from '@/lib/fabricator/UPVCCuttingEngine';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import type { Profile } from '@/types/fabricator';
import { FileDown, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';

// Single window 1000×1000 mm — aluminium casement (frame + sash) for testing
const BATCH_SPECS: BatchWindowSpec[] = [
  { overallWidth: 1000, overallHeight: 1000, quantity: 1 },
];

// Alumil M9660 (ProfileRegistry: alumil_m9660, profileDepth 56 mm)
const ALUMIL_FRAME: Profile = {
  id: 'alumil_m9660_frame',
  name: 'Alumil M9660 Frame',
  profileRole: 'frame',
  width: 56,
  thickness: 2.5,
  material: 'aluminium',
  color: 'RAL 7016',
  costPerMeter: 180,
  cuttingAllowance: 3,
  stockQuantity: 100,
  minStockLevel: 10,
  supplier: 'Alumil',
} as Profile;

const ALUMIL_SASH: Profile = {
  id: 'alumil_m9660_sash',
  name: 'Alumil M9660 Sash',
  profileRole: 'sash',
  width: 50,
  thickness: 2.5,
  material: 'aluminium',
  color: 'RAL 7016',
  costPerMeter: 160,
  cuttingAllowance: 3,
  stockQuantity: 100,
  minStockLevel: 10,
  supplier: 'Alumil',
} as Profile;

const SAMPLE_PROFILES: Profile[] = [ALUMIL_FRAME, ALUMIL_SASH];

const WELDING = { burnOffMm: 3, coolingFactorPercent: 2.5 };
const BAR_LENGTH_MM = 6500;

export default function BatchCutListDemo() {
  const [pdfLoading, setPdfLoading] = useState(false);

  const cutList = useMemo(
    () =>
      generateOptimizedCutListForBatch(
        BATCH_SPECS,
        SAMPLE_PROFILES,
        WELDING,
        BAR_LENGTH_MM,
        10 // saw kerf mm — matches header "Saw Cut Deduction: 10 mm"
      ),
    []
  );

  const projectInfo: AlmonaCutPrintProjectInfo = useMemo(
    () => ({
      name: '1×1000×1000 mm aluminium casement',
      jobNumber: 'BATCH-DEMO-001',
      personInCharge: 'Demo User',
      directory: 'Demo / Batch Cut List',
      profileType: 'Alumil M9660 Frame + Sash',
      material: 'Aluminium',
      color: 'RAL 7016',
      barLengthMm: BAR_LENGTH_MM,
      sawKerfMm: 10,
      endDeductionMm: 20,
      width: 1000,
      height: 1000,
      systemPack: 'Alumil M9660 Alutherm',
    }),
    []
  );

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const pdfInfo: CutListPDFProjectInfo = {
        name: projectInfo.name,
        systemPack: projectInfo.systemPack,
        width: projectInfo.width,
        height: projectInfo.height,
      };
      await downloadCutListPDF(
        cutList,
        pdfInfo,
        `cut-list-1x1000x1000-alumil-${Date.now()}.pdf`
      );
    } finally {
      setPdfLoading(false);
    }
  };

  const totalWindows = BATCH_SPECS.reduce((s, spec) => s + spec.quantity, 0);
  const frameItems = cutList.items.filter((i) => i.role === 'frame');
  const sashItems = cutList.items.filter((i) => i.role === 'sash');

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-6 w-6" />
            Cut List Demo – 1×1000×1000 mm aluminium casement
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Single window 1000×1000 mm, Alumil M9660 aluminium casement (frame + sash). Verify cut lengths and bar layout below.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total windows:</span>
              <span className="ml-2 font-semibold">{totalWindows}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">System:</span>
              <span className="ml-2 font-semibold">Alumil M9660 Alutherm</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total bars (6.5 m):</span>
              <span className="ml-2 font-semibold">{cutList.totalBarsUsed}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Waste:</span>
              <span className="ml-2 font-semibold">{cutList.wastePercentage.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Frame cut lines:</span>
              <span className="ml-2 font-semibold">{frameItems.length}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Sash cut lines:</span>
              <span className="ml-2 font-semibold">{sashItems.length}</span>
            </div>
          </div>
          <Button
            variant="default"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {pdfLoading ? 'Generating…' : 'Download cut list PDF'}
          </Button>
        </CardContent>
      </Card>

      <AlmonaCutListViewer
        cutList={cutList}
        projectInfo={projectInfo}
        showFullCutList={true}
        barLengthMm={BAR_LENGTH_MM}
      />
    </div>
  );
}
