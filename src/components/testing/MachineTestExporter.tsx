/**
 * MachineTestExporter - Export Test Windows for Machine Validation
 * 
 * UI component for generating and exporting test windows
 * 
 * @since Phase 4: Machine Testing (Week 24)
 */

'use client';

import React, { useState } from 'react';
import { MachineExporter } from '@/lib/export/MachineExporter';
import { TestWindowGenerator } from '@/lib/export/TestWindowGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, CheckCircle2 } from 'lucide-react';

export const MachineTestExporter: React.FC = () => {
  const [machineType, setMachineType] = useState<'manual_single' | 'automatic_double_head' | 'full_cnc_center'>('manual_single');
  const [testType, setTestType] = useState<'cairo_summer' | 'alexandria_coastal' | 'upper_egypt_desert' | 'dome_heritage'>('cairo_summer');
  const [exported, setExported] = useState(false);

  const exporter = new MachineExporter();
  const testGenerator = new TestWindowGenerator();

  const handleExport = async () => {
    try {
      // Generate test window
      let testWindow;
      switch (testType) {
        case 'cairo_summer':
          testWindow = testGenerator.generateCairoSummerWindow();
          break;
        case 'alexandria_coastal':
          testWindow = testGenerator.generateAlexandriaCoastalWindow();
          break;
        case 'upper_egypt_desert':
          testWindow = testGenerator.generateUpperEgyptDesertWindow();
          break;
        case 'dome_heritage':
          testWindow = testGenerator.generateDomeHeritageWindow();
          break;
      }

      // Generate export
      const exportData = await exporter.generateExport(
        testWindow.windowUnit,
        machineType
      );

      // Download G-code
      const gcodeContent = exportData.gcode.gcode.join('\n');
      const gcodeBlob = new Blob([gcodeContent], { type: 'text/plain' });
      const gcodeUrl = URL.createObjectURL(gcodeBlob);
      const gcodeLink = document.createElement('a');
      gcodeLink.href = gcodeUrl;
      gcodeLink.download = `${testWindow.windowUnit.id}-${machineType}.gcode`;
      gcodeLink.click();

      // Download drill coordinates
      const drillContent = JSON.stringify(exportData.drillPoints, null, 2);
      const drillBlob = new Blob([drillContent], { type: 'application/json' });
      const drillUrl = URL.createObjectURL(drillBlob);
      const drillLink = document.createElement('a');
      drillLink.href = drillUrl;
      drillLink.download = `${testWindow.windowUnit.id}-drill-coordinates.json`;
      drillLink.click();

      // Download test checklist
      const checklistContent = JSON.stringify(testWindow.testChecklist, null, 2);
      const checklistBlob = new Blob([checklistContent], { type: 'application/json' });
      const checklistUrl = URL.createObjectURL(checklistBlob);
      const checklistLink = document.createElement('a');
      checklistLink.href = checklistUrl;
      checklistLink.download = `${testWindow.windowUnit.id}-test-checklist.json`;
      checklistLink.click();

      setExported(true);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-800 card-dark">
          <CardHeader>
            <CardTitle className="text-2xl">Machine Test Exporter</CardTitle>
            <p className="text-gray-400">Generate test windows for physical validation</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="typography-label text-sm text-gray-400">Machine Type</label>
                <Select value={machineType} onValueChange={(v) => setMachineType(v as any)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_single">Manual Single Machine</SelectItem>
                    <SelectItem value="automatic_double_head">Automatic Double-Head</SelectItem>
                    <SelectItem value="full_cnc_center">Full CNC Cutting Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="typography-label text-sm text-gray-400">Test Window Type</label>
                <Select value={testType} onValueChange={(v) => setTestType(v as any)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cairo_summer">Cairo Summer Window</SelectItem>
                    <SelectItem value="alexandria_coastal">Alexandria Coastal</SelectItem>
                    <SelectItem value="upper_egypt_desert">Upper Egypt Desert</SelectItem>
                    <SelectItem value="dome_heritage">Dome Heritage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleExport}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={exported}
            >
              <Download className="mr-2 h-4 w-4" />
              Export for Machine Testing
            </Button>

            {exported && (
              <Alert className="bg-green-900/20 border-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Export Complete!</div>
                  <div className="text-sm text-gray-400">
                    Files downloaded:
                    <ul className="list-disc list-inside mt-2">
                      <li>G-code file (.gcode)</li>
                      <li>Drill coordinates (.json)</li>
                      <li>Test checklist (.json)</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="typography-h3 mb-2">Physical Validation Checklist</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>✓ Hinge Positions: 150mm from top/bottom (±0.5mm)</li>
                <li>✓ Handle Height: 1100mm from bottom (±10mm)</li>
                <li>✓ Glass Fit: 25mm pocket (±2mm)</li>
                <li>✓ Assembly Time: &lt;30 minutes</li>
                <li>✓ Material Waste: &lt;15%</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

