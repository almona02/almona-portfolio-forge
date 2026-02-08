/**
 * ALMONA Cut List Viewer
 *
 * Renders cut list with "Cut Optimisation" header (job number, person in charge,
 * directory, profile type, material, colour, deductions, wastage) and metrics vs
 * industry baseline. Uses existing CutListViewer for the bar/table; adds ALMONA
 * header card and "Print ALMONA Style" / "Workshop Format" actions.
 *
 * @since February 2026 (Gold Tier)
 */

import type { AlmonaCutPrintProjectInfo } from '@/lib/fabricator/CutListExport';
import {
    buildAlmonaCutReportAndHTML,
    printCutList,
    printCutListAlmonaStyle,
} from '@/lib/fabricator/CutListExport';
import type { OptimizedCutList } from '@/lib/fabricator/UPVCCuttingEngine';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { FileDown, Printer, Scissors } from 'lucide-react';
import React, { useMemo } from 'react';
import { CutListViewer } from './CutListViewer';

export interface AlmonaCutListViewerProps {
  cutList: OptimizedCutList;
  projectInfo: AlmonaCutPrintProjectInfo;
  /** Show full CutListViewer below header; if false, only header + actions */
  showFullCutList?: boolean;
  barLengthMm?: number;
}

const defaultProjectInfo: AlmonaCutPrintProjectInfo = {
  name: 'Window Project',
  jobNumber: 'N/A',
  personInCharge: 'Not Assigned',
  directory: '',
  profileType: '—',
  material: 'Aluminium',
  color: 'RAL 7012',
  barLengthMm: 6500,
  sawKerfMm: 10,
  endDeductionMm: 20,
};

export const AlmonaCutListViewer: React.FC<AlmonaCutListViewerProps> = ({
  cutList,
  projectInfo: projectInfoProp,
  showFullCutList = true,
  barLengthMm = 6500,
}) => {
  const projectInfo = useMemo<AlmonaCutPrintProjectInfo>(() => ({
    ...defaultProjectInfo,
    ...projectInfoProp,
    barLengthMm: projectInfoProp.barLengthMm ?? barLengthMm,
  }), [projectInfoProp, barLengthMm]);

  const report = useMemo(
    () => buildAlmonaCutReportAndHTML(cutList, projectInfo).report,
    [cutList, projectInfo]
  );

  const handlePrintAlmona = () => {
    printCutListAlmonaStyle(cutList, projectInfo);
  };

  const handlePrintWorkshop = () => {
    printCutList(cutList, {
      name: projectInfo.name,
      width: projectInfo.width ?? 1200,
      height: projectInfo.height ?? 1400,
      systemPack: projectInfo.systemPack ?? 'Katra PRO RED',
    });
  };

  const h = report.header;

  return (
    <div className="space-y-6">
      {/* ALMONA Cut Optimisation header card */}
      <Card className="border-2 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Cut Optimisation
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {h.dateTime}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Project:</span>
              <span className="ml-2 font-medium">{h.project}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Job Number:</span>
              <span className="ml-2 font-medium">{h.jobNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Person in Charge:</span>
              <span className="ml-2 font-medium">{h.personInCharge}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Directory:</span>
              <span className="ml-2 font-medium">{h.directory || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Profile Type:</span>
              <span className="ml-2 font-medium">{h.profileType}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Pieces:</span>
              <span className="ml-2 font-medium">{h.totalPieces}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Material:</span>
              <span className="ml-2 font-medium">{h.material}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Colour:</span>
              <Badge variant="secondary" className="ml-2">
                {h.color}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Saw Cut Deduction:</span>
              <span className="ml-2 font-medium">{h.sawCutDeduction}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">End Deduction Total:</span>
              <span className="ml-2 font-medium">{h.endDeductionTotal}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Usable Residual Length:</span>
              <span className="ml-2 font-medium">{h.usableResidualLength}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Wastage:</span>
              <span className="ml-2 font-medium">{h.wastage}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="default" size="sm" onClick={handlePrintAlmona}>
              <Printer className="h-4 w-4 mr-2" />
              Print ALMONA Style
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintWorkshop}>
              <FileDown className="h-4 w-4 mr-2" />
              Workshop Format
            </Button>
          </div>
        </CardContent>
      </Card>

      {showFullCutList && (
        <CutListViewer
          cutList={cutList}
          barLengthMm={barLengthMm}
          showRemnants={true}
          projectInfo={{
            name: projectInfo.name,
            width: projectInfo.width ?? 1200,
            height: projectInfo.height ?? 1400,
            systemPack: projectInfo.systemPack ?? 'Katra PRO RED',
          }}
        />
      )}
    </div>
  );
};
