import React, { useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Settings, Calculator, Plus, Trash2 } from 'lucide-react';

interface TechnicalCalculatorProps {
  project: any;
  onDesignComplete: (components: any[]) => void;
  profiles: any[];
}

export const TechnicalCalculator: React.FC<TechnicalCalculatorProps> = ({ 
  project, 
  onDesignComplete, 
  profiles 
}) => {
  const [components, setComponents] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');

  const addComponent = () => {
    if (!selectedProfile) return;
    
    const profile = profiles.find(p => p.id === selectedProfile);
    if (!profile) return;

    const newComponent = {
      id: `comp_${Date.now()}`,
      type: 'frame',
      profile,
      width: project?.overallWidth || 1200,
      height: project?.overallHeight || 1500,
      quantity: 1,
      cuttingLengths: [project?.overallWidth || 1200, project?.overallHeight || 1500],
      angles: [90, 90],
      machiningOperations: [],
      glazingType: 'double',
      hardware: []
    };

    setComponents(prev => [...prev, newComponent]);
  };

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
  };

  const handleSubmit = () => {
    if (components.length > 0) {
      onDesignComplete(components);
    }
  };

  return (
    <div className="space-y-6">
      {/* Component Builder */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-orange-400" />
            Component Specification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Profile</label>
              <select 
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded"
              >
                <option value="">Choose profile...</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} - {profile.material} ({profile.width}mm)
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={addComponent} disabled={!selectedProfile}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Components List */}
      {components.length > 0 && (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-400" />
              Window Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {components.map((component, index) => (
                <div key={component.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{component.profile.name}</div>
                      <div className="text-sm text-gray-400">
                        {component.width}mm × {component.height}mm
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeComponent(component.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={components.length === 0}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Generate Cutting Plan
        </Button>
      </div>
    </div>
  );
};
