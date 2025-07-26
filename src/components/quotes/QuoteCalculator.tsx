import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Machine } from '../../types/index';

interface Service {
  name: string;
  price: number;
}

interface QuoteCalculatorProps {
  products: Machine[];
  services: Service[];
  urgency: string;
  onCalculate: () => void;
}

export const QuoteCalculator: React.FC<QuoteCalculatorProps> = ({
  products,
  services,
  urgency,
  onCalculate,
}) => {
  const calculateEstimate = () => {
    const basePrice = products.reduce((sum, p) => sum + (p.price || 0), 0);
    const servicePrice = services.reduce((sum, s) => sum + (s.price || 0), 0);
    let total = basePrice + servicePrice;

    // Apply urgency multiplier
    switch (urgency) {
      case 'express':
        total *= 1.15;
        break;
      case 'urgent':
        total *= 1.3;
        break;
      default:
        break;
    }

    return total;
  };

  const estimatedTotal = calculateEstimate();

  return (
    <Card className="bg-almona-dark border-almona-light/20">
      <CardHeader>
        <CardTitle className="text-lg">Price Estimation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Products Total:</span>
            <span>{products.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()} EGP</span>
          </div>
          <div className="flex justify-between">
            <span>Services Total:</span>
            <span>{services.reduce((sum, s) => sum + (s.price || 0), 0).toLocaleString()} EGP</span>
          </div>
          <div className="flex justify-between">
            <span>Urgency:</span>
            <Badge variant="outline">{urgency}</Badge>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between font-bold">
              <span>Estimated Total:</span>
              <span className="text-orange-500">{estimatedTotal.toLocaleString()} EGP</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
