import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { parseLegacyOrderData } from '@/lib/legacyDataParser';

const MaterialAlertsPanel: React.FC = () => {
  const { profiles } = parseLegacyOrderData();

  const lowStockItems = profiles.filter(
    (p) => typeof p.minStockLevel === 'number' && p.stockQuantity <= p.minStockLevel
  );

  return (
    <Card className="bg-gray-900/70 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          Material Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-gray-400">
        {lowStockItems.length === 0 ? (
          <p className="text-emerald-300">
            All tracked profiles are above their minimum stock levels.
          </p>
        ) : (
          <>
            <p>Some profiles are at or below minimum stock:</p>
            <div className="space-y-1">
              {lowStockItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="truncate">{item.name}</span>
                  <span className="text-red-400 font-semibold">
                    {item.stockQuantity}m
                  </span>
                </div>
              ))}
              {lowStockItems.length > 3 && (
                <p className="text-[11px] text-gray-500">
                  +{lowStockItems.length - 3} more profiles below threshold
                </p>
              )}
            </div>
          </>
        )}
        <Link
          to="/fabricator-workflow"
          state={{ startTab: 'inventory' }}
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full border-yellow-500/40 text-yellow-300"
          >
            Configure Profiles & Inventory
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default MaterialAlertsPanel;


