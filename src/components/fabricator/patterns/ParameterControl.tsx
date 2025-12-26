/**
 * ParameterControl - Parametric control for pattern customization
 * 
 * @since Phase 3: Cognitive Intelligence (Week 18)
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface Parameter {
  name: string;
  type: 'number' | 'select' | 'slider';
  label: string;
  min?: number;
  max?: number;
  step?: number;
  default?: any;
  options?: Array<{ value: string; label: string }>;
}

interface ParameterControlProps {
  parameter: Parameter;
  value: any;
  onChange: (value: any) => void;
}

export const ParameterControl: React.FC<ParameterControlProps> = ({
  parameter,
  value,
  onChange
}) => {
  if (parameter.type === 'select' && parameter.options) {
    return (
      <div className="space-y-2">
        <Label>{parameter.label}</Label>
        <Select value={String(value)} onValueChange={onChange}>
          <SelectTrigger className="bg-gray-800 border-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {parameter.options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (parameter.type === 'slider') {
    return (
      <div className="space-y-2">
        <Label>{parameter.label}</Label>
        <Slider
          value={[value || parameter.default || parameter.min || 0]}
          onValueChange={(vals) => onChange(vals[0])}
          min={parameter.min}
          max={parameter.max}
          step={parameter.step}
          className="w-full"
        />
        <div className="text-sm text-gray-400">{value || parameter.default || parameter.min || 0}</div>
      </div>
    );
  }

  // Default: number input
  return (
    <div className="space-y-2">
      <Label>{parameter.label}</Label>
      <Input
        type="number"
        value={value || parameter.default || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-gray-800 border-gray-700"
        min={parameter.min}
        max={parameter.max}
        step={parameter.step}
      />
    </div>
  );
};


