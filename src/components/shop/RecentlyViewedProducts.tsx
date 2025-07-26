
import React from 'react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { yilmazMachines } from '@/constants/productsData';

export const RecentlyViewedProducts: React.FC = () => {
  const { recentlyViewed } = useRecentlyViewed();
  const { t } = useTranslation('shop');

  const products = recentlyViewed
    .map(id => yilmazMachines.find(machine => machine.id === id))
    .filter(Boolean);

  if (products.length === 0) {
    return null;
  }

  return (
    <Card className="bg-almona-darker border-almona-light text-white mt-12">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gradient-orange">{t('recently_viewed.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <Link to={`/products/machines/${product?.id}`} key={product?.id}>
              <div className="flex flex-col items-center text-center bg-almona-dark p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                <img src={product?.imageUrl} alt={product?.name} className="w-24 h-24 object-cover rounded-md mb-2" loading="lazy" />
                <h4 className="font-semibold text-lg">{product?.name}</h4>
                <p className="text-sm text-gray-400">{product?.description.substring(0, 50)}...</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
