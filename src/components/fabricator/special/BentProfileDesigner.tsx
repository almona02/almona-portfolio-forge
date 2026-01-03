/**
 * BentProfileDesigner - UI Component for Bent Profile Design
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 23)
 */

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BendRadiusValidator } from '@/lib/presets/BendRadiusValidator';
import { BentProfileEngine } from '@/lib/presets/BentProfileEngine';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

export const BentProfileDesigner: React.FC = () => {
  const [radius, setRadius] = useState<number>(1500);
  const [angle, setAngle] = useState<number>(90);
  const [material, setMaterial] = useState<'aluminum' | 'upvc'>('aluminum');
  const [profileWidth, setProfileWidth] = useState<number>(70);
  const [profileDepth, _setProfileDepth] = useState<number>(50);

  const engine = useMemo(() => new BentProfileEngine(), []);
  const validator = useMemo(() => new BendRadiusValidator(), []);

  const [design, setDesign] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);

  const handleGenerate = () => {
    // Validate bend
    const bendValidation = validator.validateBend(
      radius,
      material,
      profileWidth,
      profileDepth
    );

    setValidation(bendValidation);

    if (bendValidation.isBendable) {
      // Generate design
      const bentDesign = engine.generateBentProfile(
        radius,
        angle,
        material,
        profileWidth,
        profileDepth
      );

      setDesign(bentDesign);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl">Bent Profile Designer</CardTitle>
            <p className="text-gray-400">Design curved profiles for domes, arches, and custom curves</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="radius">Bend Radius (mm)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                  min={500}
                  max={5000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="angle">Bend Angle (degrees)</Label>
                <Input
                  id="angle"
                  type="number"
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                  min={30}
                  max={180}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Select value={material} onValueChange={(v) => setMaterial(v as 'aluminum' | 'upvc')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aluminum">Aluminum</SelectItem>
                    <SelectItem value="upvc">UPVC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileWidth">Profile Width (mm)</Label>
                <Input
                  id="profileWidth"
                  type="number"
                  value={profileWidth}
                  onChange={(e) => setProfileWidth(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                  min={50}
                  max={150}
                />
              </div>
            </div>

            <Button onClick={handleGenerate} className="w-full bg-blue-600 hover:bg-blue-700">
              Generate Design
            </Button>

            {validation && (
              <Alert className={validation.isBendable ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}>
                {validation.isBendable ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {validation.isBendable ? (
                    <div>
                      <div>Bend is feasible</div>
                      <div className="text-sm text-gray-400 mt-1">
                        Minimum radius: {validation.minBendRadius.toFixed(0)}mm
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div>Bend is not feasible with current parameters</div>
                      <div className="text-sm text-gray-400 mt-1">
                        Minimum required radius: {validation.minBendRadius.toFixed(0)}mm
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {design && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Design Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Bending Method:</span>
                      <span className="ml-2 font-semibold">{design.manufacturing.bendingMethod}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Springback Compensation:</span>
                      <span className="ml-2 font-semibold">{design.manufacturing.springbackCompensation.toFixed(2)}°</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Bend Allowance:</span>
                      <span className="ml-2 font-semibold">{design.manufacturing.bendAllowance.toFixed(2)}mm</span>
                    </div>
                    {design.manufacturing.segments && (
                      <div>
                        <span className="text-gray-400">Segments:</span>
                        <span className="ml-2 font-semibold">{design.manufacturing.segments}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

