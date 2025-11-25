import React from 'react';
import { WindowUnit, Profile } from '@/types/fabricator';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { parseLegacyOrderData } from '@/lib/legacyDataParser';

interface InventoryStatusPanelProps {
  project: WindowUnit | null;
}

const getStockStatus = (profile: Profile) => {
  if (!profile.minStockLevel) return 'unknown';
  const percentage = (profile.stockQuantity / (profile.minStockLevel * 2)) * 100;
  if (profile.stockQuantity <= 0) return 'out_of_stock';
  if (percentage < 50) return 'low';
  if (percentage < 80) return 'medium';
  return 'high';
};

export const InventoryStatusPanel: React.FC<InventoryStatusPanelProps> = ({ project }) => {
  const inventory = parseLegacyOrderData().profiles || [];

  const lowStockProfiles = inventory.filter((p) => {
    const status = getStockStatus(p);
    return status === 'low' || status === 'out_of_stock';
  });

  const projectProfiles = project?.components?.map((comp) => comp.profile.id) || [];
  const projectStockStatus = inventory
    .filter((p) => projectProfiles.includes(p.id))
    .map((p) => ({
      profile: p,
      status: getStockStatus(p),
    }));

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-orange-400" />
          Inventory Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {project && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-medium text-gray-400">For This Project</h4>
            {projectStockStatus.length === 0 ? (
              <p className="text-[11px] text-gray-500">No profiles selected yet</p>
            ) : (
              projectStockStatus.map(({ profile, status }) => (
                <div
                  key={profile.id}
                  className="flex justify-between items-center gap-2 text-[11px]"
                >
                  <span className="truncate">{profile.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      status === 'out_of_stock'
                        ? 'text-red-400 border-red-500'
                        : status === 'low'
                        ? 'text-orange-400 border-orange-500'
                        : status === 'high'
                        ? 'text-green-400 border-green-500'
                        : 'text-gray-300 border-gray-600'
                    }`}
                  >
                    {status === 'out_of_stock'
                      ? 'Out of Stock'
                      : status === 'low'
                      ? 'Low'
                      : status === 'high'
                      ? 'Available'
                      : 'Unknown'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}

        <div className="pt-2 border-t border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-[11px] font-medium text-gray-400">Overall Alerts</h4>
            {lowStockProfiles.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
          </div>

          {lowStockProfiles.length === 0 ? (
            <p className="text-[11px] text-green-400">All profiles in stock</p>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] text-orange-400">
                {lowStockProfiles.length} profile(s) need attention
              </p>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/fabricator';
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline"
              >
                View in Dashboard
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryStatusPanel;


