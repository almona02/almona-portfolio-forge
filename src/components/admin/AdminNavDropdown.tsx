import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Settings,
  Shield,
  ChevronDown,
  LayoutDashboard,
  FileText,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Admin Navigation Dropdown Component
 * 
 * Provides a comprehensive navigation dropdown for administrators to access all admin panels.
 * Features:
 * - Quick access to all admin management panels
 * - Organized by functional categories (Users, Products, Orders, Analytics)
 * - Visual icons for easy identification
 * - Responsive design with proper accessibility
 * - Role-based access control ready
 * 
 * Categories:
 * - User Management: Customers, Users, Roles
 * - Product Management: Products, Inventory, Categories
 * - Order Management: Orders, Finance, Reports
 * - Analytics: Dashboard, Sales Charts, Reports
 * - System: Settings, Security, Logs
 */
export const AdminNavDropdown: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Admin Panel
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>Administration</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Dashboard */}
        <DropdownMenuItem onClick={() => handleNavigation('/admin/dashboard')}>
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* User Management */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          User Management
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/customers')}>
          <Users className="mr-2 h-4 w-4" />
          Customers
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/users')}>
          <Users className="mr-2 h-4 w-4" />
          Users & Roles
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Product Management */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Product Management
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/products')}>
          <Package className="mr-2 h-4 w-4" />
          Products
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/inventory')}>
          <Warehouse className="mr-2 h-4 w-4" />
          Inventory
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/categories')}>
          <Package className="mr-2 h-4 w-4" />
          Categories
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Order Management */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Order Management
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/orders')}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Orders
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/finance')}>
          <DollarSign className="mr-2 h-4 w-4" />
          Finance
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/reports')}>
          <FileText className="mr-2 h-4 w-4" />
          Reports
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Analytics */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Analytics
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/analytics')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Analytics
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/sales-chart')}>
          <TrendingUp className="mr-2 h-4 w-4" />
          Sales Charts
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* System */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          System
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/security')}>
          <Shield className="mr-2 h-4 w-4" />
          Security
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/logs')}>
          <FileText className="mr-2 h-4 w-4" />
          System Logs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminNavDropdown;
