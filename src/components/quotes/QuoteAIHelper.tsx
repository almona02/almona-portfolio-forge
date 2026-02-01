import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { yilmazMachinesLegacy } from '@/constants/productsData';
import React, { useEffect, useState } from 'react';

import { Machine } from '../../types/index';

interface QuoteAIHelperProps {
  projectDescription: string;
  onProductSuggest: (product: Machine) => void;
  onServiceSuggest: (service: string) => void;
}

export const QuoteAIHelper: React.FC<QuoteAIHelperProps> = ({
  projectDescription,
  onProductSuggest,
  onServiceSuggest,
}) => {
  const [suggestions, setSuggestions] = useState<{
    products: Machine[];
    services: string[];
  }>({ products: [], services: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectDescription.length > 20) {
      setLoading(true);
      const timer = setTimeout(() => {
        const keywords = projectDescription.toLowerCase().split(/\s+/);
        
        const matchedProducts = yilmazMachinesLegacy.filter(product =>
          keywords.some(keyword => 
            product.name.toLowerCase().includes(keyword) ||
            product.description.toLowerCase().includes(keyword)
          )
        ).slice(0, 3).map(legacy => ({
          ...legacy,
          powerSpec: { voltage: '220V', frequency: '50Hz', power: legacy.power, phase: '3-phase', consumption: 'Standard' },
          certifications: [],
          safetyFeatures: [],
          price: 0
        } as unknown as Machine));

        setSuggestions({
          products: matchedProducts,
          services: []
        });
        setLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [projectDescription]);

  const handleAddSuggestion = (item: Machine | string, type: 'product' | 'service') => {
    if (type === 'product') {
      onProductSuggest(item as Machine);
    } else {
      onServiceSuggest(item as string);
    }
  };

  if (!projectDescription || projectDescription.length < 20) {
    return null;
  }

  return (
    <Card className="bg-almona-dark border-almona-light/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-gradient-orange">AI Suggestions</span>
          <Badge variant="outline" className="border-purple-500 text-purple-500">
            Beta
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="h-4 bg-almona-darker rounded animate-pulse"></div>
            <div className="h-4 bg-almona-darker rounded animate-pulse w-3/4"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.products.length > 0 && (
              <div>
                <h4 className="typography-h4 text-sm font-medium mb-2">Recommended Products</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.products.map(product => (
                    <Button
                      key={product.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSuggestion(product, 'product')}
                    >
                      {product.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
