import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
    Activity,
    AlertTriangle,
    DollarSign,
    Package,
    ShoppingCart,
    Users,
} from 'lucide-react';
import React, { useState } from 'react';

// Import all admin panels
import { BusinessKPIDashboard } from '../analytics/BusinessKPIDashboard';
import { RecentOrders } from './RecentOrders';
import { SalesChart } from './SalesChart';
import { CustomersPanel } from './panels/CustomersPanel';
import { FinancePanel } from './panels/FinancePanel';
import { InventoryPanel } from './panels/InventoryPanel';
import { OrdersPanel } from './panels/OrdersPanel';
import { ProductsPanel } from './panels/ProductsPanel';

/**
 * Admin Dashboard Component
 * 
 * Main administrative interface providing access to all management panels.
 * Features:
 * - Tabbed interface for easy navigation between panels
 * - Dashboard overview with key metrics and charts
 * - Real-time data updates across all panels
 * - Responsive design for desktop and mobile
 * - Quick access to critical admin functions
 * 
 * Panels included:
 * - Overview: Dashboard with metrics and charts
 * - Customers: Customer management and profiles
 * - Products: Product catalog management
 * - Inventory: Stock level monitoring and management
 * - Orders: Order processing and tracking
 * - Finance: Financial data and payment tracking
 */
export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for dashboard metrics
  const dashboardMetrics = {
    totalCustomers: 1247,
    totalProducts: 89,
    totalOrders: 342,
    totalRevenue: 125430,
    lowStockItems: 12,
    pendingOrders: 23,
    recentActivity: 45,
    systemAlerts: 3,
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    color?: string;
  }> = ({ title, value, icon, trend, color = 'text-blue-600' }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-4 w-4 ${color}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600">{trend}</span> from last month
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typography-h1 tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your business operations and monitor performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Live
          </Badge>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="business-kpi">Business KPI</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Customers"
              value={dashboardMetrics.totalCustomers.toLocaleString()}
              icon={<Users className="h-4 w-4" />}
              trend="+12%"
            />
            <StatCard
              title="Total Products"
              value={dashboardMetrics.totalProducts}
              icon={<Package className="h-4 w-4" />}
              trend="+5%"
            />
            <StatCard
              title="Total Orders"
              value={dashboardMetrics.totalOrders}
              icon={<ShoppingCart className="h-4 w-4" />}
              trend="+18%"
            />
            <StatCard
              title="Total Revenue"
              value={`$${dashboardMetrics.totalRevenue.toLocaleString()}`}
              icon={<DollarSign className="h-4 w-4" />}
              trend="+23%"
            />
          </div>

          {/* Alerts and Status */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {dashboardMetrics.lowStockItems}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items need restocking
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardMetrics.pendingOrders}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardMetrics.recentActivity}
                </div>
                <p className="text-xs text-muted-foreground">
                  Actions in last 24h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardMetrics.systemAlerts}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Recent Activity */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <SalesChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentOrders />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business KPI Dashboard Tab */}
        <TabsContent value="business-kpi">
          <BusinessKPIDashboard />
        </TabsContent>

        {/* Individual Panel Tabs */}
        <TabsContent value="customers">
          <CustomersPanel />
        </TabsContent>

        <TabsContent value="products">
          <ProductsPanel />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryPanel />
        </TabsContent>

        <TabsContent value="orders">
          <OrdersPanel />
        </TabsContent>

        <TabsContent value="finance">
          <FinancePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
