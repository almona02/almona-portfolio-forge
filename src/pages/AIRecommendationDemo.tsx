import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegionDetection } from '@/hooks/useRegionDetection';
import { EquipmentRecommender } from '@/components/recommendation/EquipmentRecommender';
import { InteractiveGLBViewer } from '@/components/3d-model/InteractiveGLBViewer';
import { ComplianceDocumentGenerator } from '@/components/regional/turkish/ComplianceDocumentGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Mock data for demonstration
const mockMachines = [
  {
    id: '1',
    name: 'Almona CNC-2000',
    specifications: {
      power_kw: 15,
      weight_kg: 2500,
      size_mm: 3000
    },
    pricing: {
      TR: 150000,
      EG: 120000,
      default: 18000
    },
    local_support: {
      TR: { regions: ['Istanbul', 'Ankara', 'Izmir'] },
      EG: { regions: ['Cairo', 'Alexandria'] }
    }
  },
  {
    id: '2',
    name: 'Almona CNC-3000',
    specifications: {
      power_kw: 25,
      weight_kg: 3500,
      size_mm: 4000
    },
    pricing: {
      TR: 220000,
      EG: 180000,
      default: 25000
    },
    local_support: {
      TR: { regions: ['Istanbul', 'Ankara', 'Izmir', 'Bursa'] },
      EG: { regions: ['Cairo', 'Alexandria', 'Giza'] }
    }
  },
  {
    id: '3',
    name: 'Almona CNC-5000',
    specifications: {
      power_kw: 40,
      weight_kg: 5000,
      size_mm: 5000
    },
    pricing: {
      TR: 350000,
      EG: 280000,
      default: 40000
    },
    local_support: {
      TR: { regions: ['Istanbul', 'Ankara'] },
      EG: { regions: ['Cairo'] }
    }
  }
];

const mockParts = [
  {
    id: 'spindle',
    name: 'High-Speed Spindle',
    price: 15000,
    description: 'Precision spindle for high-speed machining',
    compatibleWith: ['cnc-2000', 'cnc-3000']
  },
  {
    id: 'coolant',
    name: 'Coolant System',
    price: 8000,
    description: 'Advanced coolant system for temperature control',
    compatibleWith: ['cnc-2000', 'cnc-3000', 'cnc-5000']
  },
  {
    id: 'toolchanger',
    name: 'Automatic Tool Changer',
    price: 25000,
    description: '24-tool automatic tool changer',
    compatibleWith: ['cnc-3000', 'cnc-5000']
  }
];

const mockAnnotations = [
  {
    id: 'spindle',
    name: 'Spindle',
    nameTr: 'Mil',
    description: 'High-speed precision spindle',
    descriptionTr: 'Yüksek hızlı hassas mil',
    price: 15000,
    material: 'Steel',
    meshName: 'spindle_mesh',
    position: [0, 1, 0] as [number, number, number]
  },
  {
    id: 'coolant',
    name: 'Coolant System',
    nameTr: 'Soğutma Sistemi',
    description: 'Advanced temperature control',
    descriptionTr: 'Gelişmiş sıcaklık kontrolü',
    price: 8000,
    material: 'Aluminum',
    meshName: 'coolant_mesh',
    position: [1, 0, 0] as [number, number, number]
  }
];

export const AIRecommendationDemo: React.FC = () => {
  const { t } = useTranslation();
  const { regionState } = useRegionDetection();
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [selectedConfiguration, setSelectedConfiguration] = useState<string[]>([]);

  const mockCustomerProfile = {
    production_capacity: {
      power_kw: 20,
      weight_kg: 3000,
      size_mm: 3500
    },
    budget: 200000,
    expected_roi: 25,
    location: {
      country: regionState.region,
      region: regionState.region === 'TR' ? 'Istanbul' : 'Cairo'
    }
  };

  const handlePartSelect = (part: any) => {
    setSelectedPart(part);
    console.log('Selected part:', part);
  };

  const handleConfigurationChange = (partId: string) => {
    const newConfig = selectedConfiguration.includes(partId)
      ? selectedConfiguration.filter(id => id !== partId)
      : [...selectedConfiguration, partId];
    setSelectedConfiguration(newConfig);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">AI-Powered Equipment Recommendations</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Experience advanced AI recommendations and interactive 3D configuration
        </p>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Current Region: {regionState.region}
        </Badge>
      </div>

      {/* AI Recommendations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Equipment Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EquipmentRecommender
            customerProfile={mockCustomerProfile}
            machines={mockMachines}
          />
        </CardContent>
      </Card>

      {/* Enhanced 3D Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            Interactive 3D Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Click on parts in the 3D model or use the configuration panel to select components
            </p>
            {selectedConfiguration.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium">Selected:</span>
                {selectedConfiguration.map(partId => (
                  <Badge key={partId} variant="secondary">
                    {mockParts.find(p => p.id === partId)?.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <InteractiveGLBViewer
            modelPath="/models/cnc-machine.glb"
            annotations={mockAnnotations}
            enablePartSelection={true}
            enablePricing={true}
            onPartSelected={handlePartSelect}
            parts={mockParts}
            onPartSelect={handlePartSelect}
            initialConfiguration={selectedConfiguration}
            showAnnotations={true}
          />
        </CardContent>
      </Card>

      {/* Turkish Compliance Documents Section */}
      {regionState.region === 'TR' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Turkish Compliance Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ComplianceDocumentGenerator
              machineId="cnc-2000"
              customerInfo={{
                name: "Demo Customer",
                company: "Demo Company",
                taxNumber: "1234567890"
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Implementation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">✅ AI Recommendation Engine</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Advanced ML algorithms</li>
                <li>• Multi-factor scoring</li>
                <li>• Regional market analysis</li>
                <li>• Real-time recommendations</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">✅ Enhanced 3D Configuration</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Interactive part selection</li>
                <li>• Regional pricing integration</li>
                <li>• Real-time compatibility checking</li>
                <li>• Multi-language support</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">✅ Turkish Market Features</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• KDV tax calculations</li>
                <li>• Compliance document generation</li>
                <li>• Turkish Lira support</li>
                <li>• Local business standards</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Live Testing on almona02.com</h3>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm mb-2"><strong>URL:</strong> https://almona02.com/demo/ai-recommendations</p>
                <p className="text-sm mb-2"><strong>Credentials:</strong></p>
                <ul className="text-sm ml-4 space-y-1">
                  <li>• Username: almona.co@hotmail.com</li>
                  <li>• Password: abcd1234</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Test Scenarios</h3>
              <ol className="text-sm space-y-2 ml-4">
                <li>1. <strong>Region Detection:</strong> Verify automatic region detection and manual switching</li>
                <li>2. <strong>AI Recommendations:</strong> Test recommendation engine with different customer profiles</li>
                <li>3. <strong>3D Configuration:</strong> Interact with 3D model and verify pricing updates</li>
                <li>4. <strong>Turkish Features:</strong> Switch to Turkey region and test compliance documents</li>
                <li>5. <strong>Multi-Currency:</strong> Verify currency conversion and regional pricing</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIRecommendationDemo;
