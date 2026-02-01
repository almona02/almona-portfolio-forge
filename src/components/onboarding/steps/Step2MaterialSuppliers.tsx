/**
 * Step2MaterialSuppliers - Material Supplier Setup
 * 
 * Configure material suppliers with pre-populated Egyptian suppliers
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { OnboardingData } from '../OnboardingWizard';
import { Plus, X } from 'lucide-react';

interface Step2MaterialSuppliersProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
}

const EGYPTIAN_SUPPLIERS = {
  aluminum: [
    { name: 'Egyptian Aluminum Co.', contact: '+20 2 1234 5678' },
    { name: 'Cairo Profiles', contact: '+20 2 2345 6789' }
  ],
  upvc: [
    { name: 'UPVC Egypt', contact: '+20 2 3456 7890' },
    { name: 'Modern Profiles', contact: '+20 2 4567 8901' }
  ],
  glass: [
    { name: 'Egyptian Glass Co.', contact: '+20 2 5678 9012' }
  ],
  hardware: [
    { name: 'Hardware Solutions', contact: '+20 2 6789 0123' }
  ]
};

export const Step2MaterialSuppliers: React.FC<Step2MaterialSuppliersProps> = ({
  data,
  onUpdate
}) => {
  const addSupplier = (type: keyof typeof data.suppliers, supplier: { name: string; contact: string }) => {
    onUpdate({
      suppliers: {
        ...data.suppliers,
        [type]: [...data.suppliers[type], supplier]
      }
    });
  };

  const removeSupplier = (type: keyof typeof data.suppliers, index: number) => {
    onUpdate({
      suppliers: {
        ...data.suppliers,
        [type]: data.suppliers[type].filter((_, i) => i !== index)
      }
    });
  };

  const useDefaultSuppliers = () => {
    onUpdate({
      suppliers: EGYPTIAN_SUPPLIERS
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="typography-h3 text-lg mb-4">Material Suppliers</h3>
        <p className="text-gray-400 mb-6">Configure your material suppliers or use our Egyptian defaults</p>
        <Button
          variant="outline"
          onClick={useDefaultSuppliers}
          className="bg-gray-800 border-gray-700"
        >
          Use Egyptian Default Suppliers
        </Button>
      </div>

      {(['aluminum', 'upvc', 'glass', 'hardware'] as const).map((type) => (
        <div key={type} className="space-y-2">
          <Label className="typography-label capitalize">{type} Suppliers</Label>
          <div className="space-y-2">
            {data.suppliers[type].map((supplier, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={supplier.name}
                  onChange={(e) => {
                    const newSuppliers = [...data.suppliers[type]];
                    newSuppliers[index] = { ...newSuppliers[index], name: e.target.value };
                    onUpdate({
                      suppliers: { ...data.suppliers, [type]: newSuppliers }
                    });
                  }}
                  className="bg-gray-800 border-gray-700 flex-1"
                  placeholder="Supplier name"
                />
                <Input
                  value={supplier.contact}
                  onChange={(e) => {
                    const newSuppliers = [...data.suppliers[type]];
                    newSuppliers[index] = { ...newSuppliers[index], contact: e.target.value };
                    onUpdate({
                      suppliers: { ...data.suppliers, [type]: newSuppliers }
                    });
                  }}
                  className="bg-gray-800 border-gray-700 flex-1"
                  placeholder="Contact"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSupplier(type, index)}
                  className="text-red-400"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => addSupplier(type, { name: '', contact: '' })}
              className="bg-gray-800 border-gray-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

