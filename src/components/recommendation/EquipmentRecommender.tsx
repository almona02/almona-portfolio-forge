import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegionDetection } from '@/hooks/useRegionDetection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Button } from '@/components/ui/button';
import { Machine } from '@/types';

interface Recommendation {
  machine: Machine;
  match_score: number;
  breakdown: {
    technical: number;
    business: number;
    market: number;
  };
  recommendation: string;
}

interface EquipmentRecommenderProps {
  customerProfile: {
    production_capacity: any;
    budget: number;
    expected_roi: number;
    location: any;
  };
  machines: Machine[];
}

export const EquipmentRecommender: React.FC<EquipmentRecommenderProps> = ({
  customerProfile,
  machines
}) => {
  const { t } = useTranslation();
  const { regionState } = useRegionDetection();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/v2/ai/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_profile: customerProfile,
            machines: machines,
            market: regionState.region
          })
        });

        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations);
        } else {
          console.error('Failed to fetch recommendations');
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (customerProfile && machines.length > 0) {
      fetchRecommendations();
    }
  }, [customerProfile, machines, regionState.region]);

  if (loading) {
    return <div>{t('recommendations.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="typography-h2">{t('recommendations.title')}</h2>
      {recommendations.map((rec, index) => (
        <Card key={rec.machine.id} className={`relative ${index === 0 ? 'border-2 border-primary' : ''}`}>
          {index === 0 && (
            <Badge className="absolute -top-2 -right-2 bg-green-500">
              {t('recommendations.best_match')}
            </Badge>
          )}
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{rec.machine.name}</span>
              <Badge variant={
                rec.recommendation === 'Highly Recommended' ? 'default' :
                rec.recommendation === 'Recommended' ? 'secondary' : 'outline'
              }>
                {t(`recommendations.${rec.recommendation.toLowerCase().replace(' ', '_')}`)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>{t('recommendations.match_score')}</span>
                <span className="font-bold">{(rec.match_score * 100).toFixed(1)}%</span>
              </div>
              <Progress value={rec.match_score * 100} className="w-full" />
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">{t('recommendations.technical')}</div>
                  <div>{(rec.breakdown.technical * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="font-medium">{t('recommendations.business')}</div>
                  <div>{(rec.breakdown.business * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="font-medium">{t('recommendations.market')}</div>
                  <div>{(rec.breakdown.market * 100).toFixed(0)}%</div>
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                {t('recommendations.view_details')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
