import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Button } from '@/shared/ui/ui/button';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { 
  identifyPartFromImage,
  findPartByDescription,
  predictPartDemand 
} from '@/lib/ai/SparePartsService';
import { equipmentRecommendationEngine } from '@/lib/ai/EquipmentRecommendationEngine';
import type { EquipmentRecommendation } from '@/lib/ai/EquipmentRecommendationEngine';
import ErrorBoundary from '../../ErrorBoundary';
import { Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * Props for the AI Equipment Advisor component
 */
interface AiEquipmentAdvisorProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to handle dialog open/close state changes */
  onOpenChange: (open: boolean) => void;
}

/**
 * Available methods for part identification
 */
type PartIdentificationMethod = 'image' | 'description' | 'symptom' | 'predictiveInventory' | 'equipmentWizard';

/**
 * AI Equipment Advisor Component
 * 
 * A comprehensive tool for identifying spare parts using multiple methods:
 * - Image recognition: Upload a photo of the part
 * - Description: Describe the part in text
 * - Symptoms: Describe machine symptoms to identify needed parts
 * - Predictive inventory: Get recommendations based on machine and location
 * 
 * Features:
 * - Multiple identification methods via tabs
 * - Real-time AI-powered part identification
 * - Analytics tracking for usage patterns
 * - Error handling with user-friendly messages
 */
const AiEquipmentAdvisorComponent = ({ open, onOpenChange }: AiEquipmentAdvisorProps) => {
  const [method, setMethod] = useState<PartIdentificationMethod>('description');
  const [inputValue, setInputValue] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [_productId, _setProductId] = useState('');
  const [_location, _setLocation] = useState('');
  
  // Equipment wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [windowTypes, setWindowTypes] = useState<string[]>([]);
  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [equipmentRecommendations, setEquipmentRecommendations] = useState<EquipmentRecommendation[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    // Analytics instrumentation
    if (window.gtag) {
      window.gtag('event', 'ai_advisor_used', {
        method,
        timestamp: new Date().toISOString()
      });
    }
    try {
      let response;
      if (method === 'image' && imagePreview) {
        response = await identifyPartFromImage(imagePreview.split(',')[1]);
        setResult(JSON.stringify(response, null, 2));
      } else if (method === 'description' && inputValue) {
        response = await findPartByDescription(inputValue);
        setResult(response);
      } else if (method === 'symptom' && inputValue) {
        response = await predictPartDemand('DK-502', 'Cairo');
        setResult(response);
      } else if (method === 'predictiveInventory' && _productId && _location) {
        // Placeholder for predictive inventory API call
        response = await predictPartDemand(_productId, _location);
        setResult(response);
      }
    } catch (error) {
      console.error('Error identifying part:', error);
      setResult('Error identifying part. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">
            AI Spare Parts Finder
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={method} onValueChange={(v) => setMethod(v as PartIdentificationMethod)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="image">Image</TabsTrigger>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="symptom">Symptoms</TabsTrigger>
          <TabsTrigger value="predictiveInventory">Predictive Inventory</TabsTrigger>
          <TabsTrigger value="equipmentWizard">
            <Sparkles className="h-4 w-4 mr-1" />
            Equipment Wizard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image">
          <div className="space-y-4 py-4">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-white
                hover:file:bg-primary/90"
            />
            {imagePreview && (
              <img 
                src={imagePreview} 
                alt="Part preview" 
                className="max-h-60 object-contain mx-auto"
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="description">
          <div className="space-y-4 py-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe the part (e.g. 'The thing that holds the aluminum sheet')"
            />
          </div>
        </TabsContent>

        <TabsContent value="symptom">
          <div className="space-y-4 py-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe the symptoms (e.g. 'Vibration when cutting')"
            />
          </div>
        </TabsContent>

        <TabsContent value="equipmentWizard">
          <div className="space-y-4 py-4">
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>What do you fabricate? (Select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['Sliding Windows', 'Casement Windows', 'Tilt & Turn', 'Curtain Walls', 'Doors', 'Other'].map((type) => (
                      <Button
                        key={type}
                        variant={windowTypes.includes(type) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (windowTypes.includes(type)) {
                            setWindowTypes(windowTypes.filter((t) => t !== type));
                          } else {
                            setWindowTypes([...windowTypes, type]);
                          }
                        }}
                      >
                        {windowTypes.includes(type) && <CheckCircle2 className="h-4 w-4 mr-2" />}
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => setWizardStep(2)}
                  disabled={windowTypes.length === 0}
                  className="w-full"
                >
                  Next: Volume & Budget
                </Button>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>What is your monthly volume? (units/month)</Label>
                  <Input
                    type="number"
                    value={monthlyVolume}
                    onChange={(e) => setMonthlyVolume(e.target.value)}
                    placeholder="e.g. 100"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>What is your budget?</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g. 500000"
                    />
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EGP">EGP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        // Get recommendations (would fetch from actual products in production)
                        const mockProducts = [
                          {
                            id: '1',
                            name: 'YILMAZ AIM-3410',
                            price: 450000,
                            currency: 'EGP',
                            features: ['CNC Control', 'High Precision', 'Auto Feed'],
                            windowTypes: ['Sliding Windows', 'Casement Windows'],
                            monthlyCapacity: 150,
                          },
                          {
                            id: '2',
                            name: 'YILMAZ AIM-7510',
                            price: 750000,
                            currency: 'EGP',
                            features: ['Advanced CNC', 'Multi-Axis', 'Large Capacity'],
                            windowTypes: ['Curtain Walls', 'Doors', 'Sliding Windows'],
                            monthlyCapacity: 300,
                          },
                          {
                            id: '3',
                            name: 'YILMAZ ALM-6510',
                            price: 600000,
                            currency: 'EGP',
                            features: ['CNC Control', 'Precision Cutting', 'Medium Capacity'],
                            windowTypes: ['Casement Windows', 'Tilt & Turn'],
                            monthlyCapacity: 200,
                          },
                        ];

                        const recommendations = await equipmentRecommendationEngine.getRecommendations(
                          {
                            windowTypes,
                            monthlyVolume: parseInt(monthlyVolume) || 0,
                            budget: parseFloat(budget) || 0,
                            currency,
                          },
                          mockProducts
                        );

                        setEquipmentRecommendations(recommendations);
                        setWizardStep(3);
                      } catch (error) {
                        console.error('Failed to get recommendations:', error);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={!monthlyVolume || !budget || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Finding Recommendations...' : 'Get Recommendations'}
                  </Button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Top 3 Recommendations</h3>
                  <Button variant="outline" size="sm" onClick={() => {
                    setWizardStep(1);
                    setWindowTypes([]);
                    setMonthlyVolume('');
                    setBudget('');
                    setEquipmentRecommendations([]);
                  }}>
                    Start Over
                  </Button>
                </div>
                <div className="space-y-3">
                  {equipmentRecommendations.map((rec, idx) => (
                    <Card key={rec.productId} className="bg-gray-900/50 border-gray-700">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{rec.productName}</CardTitle>
                          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400">
                            {Math.round(rec.matchScore)}% Match
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Price</span>
                          <span className="text-lg font-bold">
                            {rec.price.toLocaleString()} {rec.currency}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Why this machine:</p>
                          <ul className="space-y-1">
                            {rec.reasons.map((reason, rIdx) => (
                              <li key={rIdx} className="text-xs text-gray-400 flex items-start gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-400 flex-shrink-0 mt-0.5" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {rec.features.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Features:</p>
                            <div className="flex flex-wrap gap-1">
                              {rec.features.map((feature, fIdx) => (
                                <Badge key={fIdx} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            window.location.href = `/products/${rec.productId}`;
                          }}
                        >
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        </Tabs>

        <Button 
          onClick={handleSubmit}
          disabled={isLoading || (!inputValue && !imagePreview)}
          className="w-full"
        >
          {isLoading ? 'Identifying...' : 'Identify Part'}
        </Button>

        {result && (
          <div className="p-4 border rounded-lg mt-4">
            <h3 className="font-semibold mb-2">Result:</h3>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AiEquipmentAdvisor = (props: AiEquipmentAdvisorProps) => (
  <ErrorBoundary fallback={<div className="p-4 bg-red-50 text-red-800">AI advisor failed</div>}>
    <AiEquipmentAdvisorComponent {...props} />
  </ErrorBoundary>
);

export default AiEquipmentAdvisor;
