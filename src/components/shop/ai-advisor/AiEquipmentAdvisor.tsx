import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Button } from '@/shared/ui/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { 
  identifyPartFromImage,
  findPartByDescription,
  predictPartDemand 
} from '@/lib/ai/SparePartsService';
import ErrorBoundary from '../../ErrorBoundary';

interface AiEquipmentAdvisorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PartIdentificationMethod = 'image' | 'description' | 'symptom' | 'predictiveInventory';

const AiEquipmentAdvisorComponent = ({ open, onOpenChange }: AiEquipmentAdvisorProps) => {
  const [method, setMethod] = useState<PartIdentificationMethod>('description');
  const [inputValue, setInputValue] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [productId, setProductId] = useState('');
  const [location, setLocation] = useState('');

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
      } else if (method === 'predictiveInventory' && productId && location) {
        // Placeholder for predictive inventory API call
        response = await predictPartDemand(productId, location);
        setResult(response);
      }
    } catch (error) {
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="image">Image</TabsTrigger>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="symptom">Symptoms</TabsTrigger>
          <TabsTrigger value="predictiveInventory">Predictive Inventory</TabsTrigger>
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
