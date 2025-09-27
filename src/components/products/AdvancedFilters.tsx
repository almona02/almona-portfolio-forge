import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

/**
 * Advanced Filters Component
 * 
 * Provides advanced filtering options for product listings.
 * Features:
 * - Power consumption range slider (0-100 kW)
 * - Price range slider (0-100,000 $)
 * - Tag-based filtering (New, Used, Sale)
 * - Real-time filter updates
 * 
 * Used in product catalog pages to help users narrow down search results.
 * All filter changes are immediately communicated to parent components.
 */

interface AdvancedFiltersProps {
  onFilterChange: (filters: any) => void;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ onFilterChange }) => {
  const handlePowerChange = (value: number[]) => {
    onFilterChange({ power: value });
  };

  const handlePriceChange = (value: number[]) => {
    onFilterChange({ price: value });
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    onFilterChange({ tags: { [tag]: checked } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Power Consumption (kW)</Label>
          <Slider
            defaultValue={[0, 50]}
            max={100}
            step={1}
            onValueChange={handlePowerChange}
          />
        </div>
        <div>
          <Label>Price Range ($)</Label>
          <Slider
            defaultValue={[0, 50000]}
            max={100000}
            step={1000}
            onValueChange={handlePriceChange}
          />
        </div>
        <div>
          <Label>Tags</Label>
          <div className="space-y-2">
            <div className="flex items-center">
              <Checkbox id="tag-new" onCheckedChange={(checked) => handleTagChange("new", checked as boolean)} />
              <Label htmlFor="tag-new" className="ml-2">New</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="tag-used" onCheckedChange={(checked) => handleTagChange("used", checked as boolean)} />
              <Label htmlFor="tag-used" className="ml-2">Used</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="tag-sale" onCheckedChange={(checked) => handleTagChange("sale", checked as boolean)} />
              <Label htmlFor="tag-sale" className="ml-2">Sale</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
