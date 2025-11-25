import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { FileText } from 'lucide-react';

interface OrderManagementProps {
  orders?: any[];
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders = [] }) => {
  return (
    <Card className="bg-gray-700/50 border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-400" />
          Order Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
          <p className="text-gray-400">Orders will appear here once projects are completed.</p>
        </div>
      </CardContent>
    </Card>
  );
};
