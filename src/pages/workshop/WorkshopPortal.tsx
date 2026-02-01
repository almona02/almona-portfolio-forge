/**
 * Workshop Portal - UGLY BUT FUNCTIONAL
 * 
 * This is the interface that saves the business.
 * No fancy UI, no empire, just math that works.
 * 
 * The Maalem will use an ugly terminal that saves money,
 * but will discard a beautiful UI that wastes aluminum.
 */

import { CalibrationView } from '@/components/fabricator/CalibrationView';
import type { SystemPack } from '@/data/systemPacks';
import { TEST_PROJECTS, getTestProject } from '@/data/test-projects';
import { generateCuttingListFromSystemPack, getAvailableSystemPacks, getSystemPackById } from '@/lib/fabricator/CuttingListGenerator';
import type { Cut, OptimizedResult } from '@/lib/fabricator/OptimizationEngine';
import { simplifiedOptimizationEngine } from '@/lib/fabricator/OptimizationEngine';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Download, Printer } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export const WorkshopPortal: React.FC = () => {
  const [availableSystems, setAvailableSystems] = useState<SystemPack[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('panda-50');
  const [selectedSystem, setSelectedSystem] = useState<SystemPack | null>(null);
  const [width, setWidth] = useState<number>(1200);
  const [height, setHeight] = useState<number>(1500);
  const [includeTransom, setIncludeTransom] = useState<boolean>(false);
  const [transomHeight, setTransomHeight] = useState<number>(0);
  const [cuttingList, setCuttingList] = useState<Cut[]>([]);
  const [optimizedResult, setOptimizedResult] = useState<OptimizedResult | null>(null);
  const [showRealityCheck, setShowRealityCheck] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);

  // Load available system packs
  useEffect(() => {
    const systems = getAvailableSystemPacks();
    setAvailableSystems(systems);
    if (systems.length > 0) {
      setSelectedSystemId(systems[0].meta.id);
      setSelectedSystem(systems[0]);
    }
  }, []);

  // Update selected system when ID changes
  useEffect(() => {
    const system = getSystemPackById(selectedSystemId);
    setSelectedSystem(system || null);
  }, [selectedSystemId]);

  /**
   * Generate cutting list from system pack
   */
  const generateCuttingList = () => {
    if (!selectedSystemId || width <= 0 || height <= 0) {
      alert('Please select a system and enter valid dimensions');
      return;
    }

    try {
      const cuts = generateCuttingListFromSystemPack(
        selectedSystemId,
        width,
        height,
        {
          includeTransom: includeTransom,
          transomHeight: transomHeight || height / 2,
          includeBeads: true
        }
      );

      setCuttingList(cuts);
      setShowOptimization(false);
      setOptimizedResult(null);
    } catch (error) {
      console.error('Error generating cutting list:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Load test project
   */
  const loadTestProject = (testId: string) => {
    const testProject = getTestProject(testId);
    if (!testProject) return;

    setSelectedSystemId(testProject.system);
    setWidth(testProject.dimensions.width);
    setHeight(testProject.dimensions.height);
    setIncludeTransom(false);
    
    // Generate cutting list automatically
    setTimeout(() => {
      generateCuttingList();
    }, 100);
  };

  /**
   * Optimize cutting list
   */
  const optimizeCuts = () => {
    if (cuttingList.length === 0) return;

    const result = simplifiedOptimizationEngine.optimize(cuttingList, selectedSystemId);
    setOptimizedResult(result);
    setShowOptimization(true);
  };

  /**
   * Export cutting list (simple text format for now)
   */
  const exportCuttingList = () => {
    if (cuttingList.length === 0) return;

    let text = `CUTTING LIST - ${selectedSystem?.meta.name || selectedSystemId}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `Dimensions: ${width}mm × ${height}mm\n\n`;
    text += `PIECES:\n`;
    text += `${'='.repeat(60)}\n`;
    
    cuttingList.forEach((cut, index) => {
      text += `${(index + 1).toString().padStart(2, ' ')}. ${cut.label.padEnd(20)} ${cut.plannedLength.toFixed(1).padStart(8)}mm`;
      if (cut.quantity > 1) {
        text += ` (×${cut.quantity})`;
      }
      text += '\n';
    });

    text += `\n${'='.repeat(60)}\n`;
    text += `Total Pieces: ${cuttingList.length}\n`;
    text += `Total Length: ${cuttingList.reduce((sum, c) => sum + c.plannedLength, 0).toFixed(1)}mm\n`;

    if (optimizedResult) {
      text += `\nOPTIMIZATION:\n`;
      text += `${'='.repeat(60)}\n`;
      text += `Bars Needed: ${optimizedResult.bars.length}\n`;
      text += `Utilization: ${optimizedResult.utilization.toFixed(1)}%\n`;
      text += `Waste: ${optimizedResult.waste.toFixed(1)}mm\n`;
      text += `\nBAR LAYOUT:\n`;
      optimizedResult.bars.forEach((bar, barIndex) => {
        text += `\nBar ${barIndex + 1} (${bar.nominalLength}mm nominal, ${bar.usableLength.toFixed(1)}mm usable):\n`;
        bar.cuts.forEach((cut, cutIndex) => {
          text += `  ${cutIndex + 1}. ${cut.label.padEnd(20)} ${cut.length.toFixed(1).padStart(8)}mm`;
          if (cut.kerf > 0) {
            text += ` + ${cut.kerf.toFixed(1)}mm kerf`;
          }
          text += ` (at ${cut.position.toFixed(1)}mm)\n`;
        });
        text += `  Remaining: ${bar.remainingLength.toFixed(1)}mm\n`;
      });
    }

    // Download as text file
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cutting-list-${selectedSystemId}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ fontFamily: 'Arial', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#002D62', marginBottom: '30px' }} className="typography-h1">🛠️ Almona Workshop Portal</h1>

      {/* System Selection */}
      <Card style={{ marginBottom: '20px' }}>
        <CardHeader>
          <CardTitle>1. Select System Pack</CardTitle>
          <CardDescription>
            Choose the profile system for this window
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
            <SelectTrigger style={{ width: '100%', maxWidth: '400px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSystems.map((system) => (
                <SelectItem key={system.meta.id} value={system.meta.id}>
                  {system.meta.name} {system.meta.brands && `(${system.meta.brands.join(', ')})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedSystem && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '12px' }}>
                <strong>System Info:</strong> {selectedSystem.meta.name}
                {selectedSystem.meta.brands && ` - ${selectedSystem.meta.brands.join(', ')}`}
              </p>
              {selectedSystem.windowSystemSpec && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                  Stock Length: {(selectedSystem.windowSystemSpec as any).stockLengthMm || 6000}mm
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dimensions Input */}
      <Card style={{ marginBottom: '20px' }}>
        <CardHeader>
          <CardTitle>2. Enter Dimensions (mm)</CardTitle>
          <CardDescription>
            Window opening dimensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <Label>Width (mm)</Label>
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                style={{ width: '150px', padding: '10px', fontSize: '16px' }}
                min="600"
                max="3000"
              />
            </div>
            <div>
              <Label>Height (mm)</Label>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                style={{ width: '150px', padding: '10px', fontSize: '16px' }}
                min="600"
                max="3000"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '25px' }}>
              <Checkbox
                id="include-transom"
                checked={includeTransom}
                onCheckedChange={(checked) => setIncludeTransom(checked as boolean)}
              />
              <Label htmlFor="include-transom" style={{ cursor: 'pointer' }} className="typography-label">
                Include Transom
              </Label>
            </div>
            {includeTransom && (
              <div>
                <Label>Transom Height from Bottom (mm)</Label>
                <Input
                  type="number"
                  value={transomHeight}
                  onChange={(e) => setTransomHeight(parseInt(e.target.value) || 0)}
                  style={{ width: '150px', padding: '10px', fontSize: '16px' }}
                  placeholder={String(height / 2)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate Cutting List */}
      <div style={{ marginBottom: '30px' }}>
        <Button
          onClick={generateCuttingList}
          style={{
            padding: '15px 30px',
            backgroundColor: '#002D62',
            color: 'white',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          🪚 Generate Cutting List
        </Button>
      </div>

      {/* Cutting List Display */}
      {cuttingList.length > 0 && (
        <Card style={{ marginBottom: '30px' }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cutting List</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCuttingList}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              {selectedSystem?.meta.name} - {width}mm × {height}mm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ fontFamily: 'monospace', fontSize: '14px', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Piece</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Length (mm)</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {cuttingList.map((cut) => (
                    <tr key={cut.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{cut.label}</td>
                      <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {cut.plannedLength.toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px' }}>{cut.quantity}</td>
                      <td style={{ padding: '8px' }}>
                        <Badge variant="outline">{cut.role}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #ccc', fontWeight: 'bold' }}>
                    <td style={{ padding: '8px' }}>Total</td>
                    <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace' }}>
                      {cuttingList.reduce((sum, c) => sum + (c.plannedLength * c.quantity), 0).toFixed(1)}mm
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                      {cuttingList.reduce((sum, c) => sum + c.quantity, 0)}
                    </td>
                    <td style={{ padding: '8px' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>📋 Micron Corrections Applied:</p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                <li>Kerf (4.2mm) will be included in optimization</li>
                <li>Bar trim (15mm per end) included</li>
                {cuttingList.some(c => c.role === 'transom') && (
                  <li>Transom milling (2.5mm per side) applied</li>
                )}
              </ul>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button
                onClick={optimizeCuts}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#D4AF37',
                  color: 'black',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                ⚙️ Optimize Material Usage
              </Button>
              <Button
                onClick={() => setShowRealityCheck(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                📏 Reality Check (After Cutting)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Results */}
      {showOptimization && optimizedResult && (
        <Card style={{ marginBottom: '30px', backgroundColor: '#f9f9f9' }}>
          <CardHeader>
            <CardTitle>⚙️ Optimization Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Bars Needed</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{optimizedResult.bars.length}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Utilization</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: optimizedResult.utilization > 90 ? '#28a745' : '#ffc107' }}>
                  {optimizedResult.utilization.toFixed(1)}%
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Waste</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                  {optimizedResult.waste.toFixed(1)}mm
                </p>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '10px' }} className="typography-h4">Bar Layout:</h4>
              {optimizedResult.bars.map((bar, barIndex) => (
                <div key={bar.id} style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong>Bar {barIndex + 1}</strong>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {bar.nominalLength}mm nominal → {bar.usableLength.toFixed(1)}mm usable
                    </span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {bar.cuts.map((cut, cutIndex) => (
                      <div key={cutIndex} style={{ padding: '2px 0' }}>
                        {cutIndex + 1}. {cut.label.padEnd(20)} {cut.length.toFixed(1).padStart(8)}mm
                        {cut.kerf > 0 && <span style={{ color: '#666' }}> + {cut.kerf.toFixed(1)}mm kerf</span>}
                        <span style={{ color: '#999', marginLeft: '10px' }}>@ {cut.position.toFixed(1)}mm</span>
                      </div>
                    ))}
                    <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #eee', color: '#666' }}>
                      Remaining: {bar.remainingLength.toFixed(1)}mm
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Alert style={{ marginTop: '20px' }}>
              <AlertDescription>
                <strong>Micron Corrections Applied:</strong><br />
                • Kerf: {optimizedResult.micronCorrections.appliedKerf}mm<br />
                • Trim: {optimizedResult.micronCorrections.appliedTrim}mm per end<br />
                • Transom Milling: {optimizedResult.micronCorrections.transomMillingApplied} pieces
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Reality Check Section */}
      {showRealityCheck && cuttingList.length > 0 && (
        <Card style={{ marginTop: '40px', backgroundColor: '#f9f9f9' }}>
          <CardHeader>
            <CardTitle>📏 Reality Check (After Cutting)</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ marginBottom: '20px' }}>
              Measure actual pieces and enter below. The system will detect patterns and suggest corrections.
            </p>
            <CalibrationView
              projectId="workshop-test"
              cutList={cuttingList.map(cut => ({
                id: cut.id,
                label: cut.label,
                plannedLength: cut.plannedLength,
                role: cut.role as 'frame' | 'sash' | 'mullion' | 'transom' | 'bead' | 'screen_sash'
              }))}
              onCorrectionApplied={(corrections) => {
                console.log('Corrections applied:', corrections);
                alert(`Corrections applied:\n- Kerf: ${corrections.suggestedKerf}mm\n- Trim: ${corrections.suggestedTrim}mm`);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Quick Test Projects */}
      <Card style={{ marginTop: '30px' }}>
        <CardHeader>
          <CardTitle>🧪 Quick Test Projects</CardTitle>
          <CardDescription>
            Load predefined test projects for validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {TEST_PROJECTS.map((test) => (
              <Button
                key={test.id}
                variant="outline"
                onClick={() => loadTestProject(test.id)}
              >
                {test.id}: {test.description}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

