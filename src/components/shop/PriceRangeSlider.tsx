
import React from 'react';
import { Slider } from '@/shared/ui/ui/slider';
import { Label } from '@/shared/ui/ui/label';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
}

export const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  min,
  max,
  value,
  onValueChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Label>Price Range</Label>
        <span>{value[0]} EGP - {value[1]} EGP</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={100}
        value={value}
        onValueChange={onValueChange}
        className="w-full"
      />
    </div>
  );
};
