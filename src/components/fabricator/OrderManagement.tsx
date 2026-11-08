import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { FileText } from 'lucide-react';
import type { Database } from '@/types/database';

type Order = Database['public']['Tables']['orders']['Row'];

interface OrderManagementProps {
  orders?: Order[];
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders: _orders = [] }) => {
  return (
    <Card className="bg-muted/50 border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-warning" />
          Order Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="typography-h3 text-lg mb-2">No Orders Yet</h3>
          <p className="text-muted-foreground">Orders will appear here once projects are completed.</p>
        </div>
      </CardContent>
    </Card>
  );
};
