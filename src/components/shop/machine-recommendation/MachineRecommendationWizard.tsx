import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/ui/radio-group';
import { Label } from '@/shared/ui/ui/label';
import { yilmazMachines } from '@/constants/productsData';
import { Machine } from '@/types';
import ProductCard from '@/shared/ui/ui/ProductCard';

interface MachineRecommendationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'material' | 'application' | 'automation' | 'results';

const MachineRecommendationWizard: React.FC<MachineRecommendationWizardProps> = ({ open, onOpenChange }) => {
  const [step, setStep] = useState<Step>('material');
  const [answers, setAnswers] = useState({ material: '', application: '', automation: '' });
  const [recommendations, setRecommendations] = useState<Machine[]>([]);

  const handleValueChange = (key: keyof typeof answers, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const getRecommendations = () => {
    let filtered = yilmazMachines;

    if (answers.application) {
      filtered = filtered.filter(m => m.category.includes(answers.application));
    }
    if (answers.automation) {
      if (answers.automation === 'cnc') {
        filtered = filtered.filter(m => m.tags?.includes('CNC') || m.type.includes('CNC'));
      } else if (answers.automation === 'automatic') {
        filtered = filtered.filter(m => m.tags?.includes('Automatic') || m.type.includes('Automatic'));
      }
    }

    setRecommendations(filtered);
    setStep('results');
  };

  const resetWizard = () => {
    setStep('material');
    setAnswers({ material: '', application: '', automation: '' });
    setRecommendations([]);
  };

  const renderStep = () => {
    switch (step) {
      case 'material':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">What material will you work with?</h3>
            <RadioGroup onValueChange={(v) => handleValueChange('material', v)}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="pvc" id="pvc" /><Label htmlFor="pvc">PVC</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="aluminum" id="aluminum" /><Label htmlFor="aluminum">Aluminum</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="both" id="both" /><Label htmlFor="both">Both</Label></div>
            </RadioGroup>
            <DialogFooter className="mt-4"><Button onClick={() => setStep('application')}>Next</Button></DialogFooter>
          </div>
        );
      case 'application':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">What is your primary application?</h3>
            <RadioGroup onValueChange={(v) => handleValueChange('application', v)}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="cutting-machines" id="cutting" /><Label htmlFor="cutting">Cutting</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="welding-machines" id="welding" /><Label htmlFor="welding">Welding</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="processing-centers" id="milling" /><Label htmlFor="milling">Milling/Processing</Label></div>
            </RadioGroup>
            <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setStep('material')}>Back</Button><Button onClick={() => setStep('automation')}>Next</Button></DialogFooter>
          </div>
        );
      case 'automation':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">What level of automation do you need?</h3>
            <RadioGroup onValueChange={(v) => handleValueChange('automation', v)}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="manual" id="manual" /><Label htmlFor="manual">Manual</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="automatic" id="automatic" /><Label htmlFor="automatic">Semi-Automatic / Automatic</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="cnc" id="cnc" /><Label htmlFor="cnc">Fully Automatic / CNC</Label></div>
            </RadioGroup>
            <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setStep('application')}>Back</Button><Button onClick={getRecommendations}>See Results</Button></DialogFooter>
          </div>
        );
      case 'results':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Our Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto">
              {recommendations.length > 0 ? recommendations.map(machine => (
                <ProductCard key={machine.id} title={machine.name} description={machine.description} imageUrl={machine.imageUrl} features={[]}/>
              )) : <p>No machines match your criteria. Please try again.</p>}
            </div>
            <DialogFooter className="mt-4"><Button variant="outline" onClick={resetWizard}>Start Over</Button></DialogFooter>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Machine Recommendation Wizard</DialogTitle>
        </DialogHeader>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
};

export default MachineRecommendationWizard;
