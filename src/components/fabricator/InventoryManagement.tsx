import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { WindowUnit, Profile } from '@/types/fabricator';

interface InventoryManagementProps {
  inventory: Profile[];
  project: WindowUnit | null;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({ 
  inventory, 
  project: _project 
}) => {
  if (!inventory || inventory.length === 0) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Inventory Data</h3>
          <p className="text-gray-400">
            Inventory data is not available. Please refresh the page or contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStockStatus = (profile: Profile) => {
    const percentage = (profile.stockQuantity / (profile.minStockLevel * 2)) * 100;
    if (percentage < 50) return 'low';
    if (percentage < 80) return 'medium';
    return 'high';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'low': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">{inventory.length}</div>
            <div className="text-sm text-gray-400">Total Profiles</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-400">
              {inventory.filter(p => getStockStatus(p) === 'low').length}
            </div>
            <div className="text-sm text-gray-400">Low Stock</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">
              {inventory.filter(p => getStockStatus(p) === 'high').length}
            </div>
            <div className="text-sm text-gray-400">Good Stock</div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory List */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-400" />
            Profile Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventory.map((profile) => {
              const status = getStockStatus(profile);
              const stockPercentage = (profile.stockQuantity / (profile.minStockLevel * 2)) * 100;
              
              return (
                <div key={profile.id} className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{profile.name}</h4>
                      <p className="text-sm text-gray-400">
                        {profile.material} • {profile.width}mm • {profile.color}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(status)} border-current`}
                    >
                      <div className="flex items-center gap-1">
                        {getStatusIcon(status)}
                        {status.toUpperCase()}
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Stock: {profile.stockQuantity}m</span>
                      <span>Min Level: {profile.minStockLevel}m</span>
                    </div>
                    <Progress value={Math.min(stockPercentage, 100)} className="h-2" />
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Cost: ${profile.costPerMeter}/m</span>
                      <span>Supplier: {profile.supplier}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
