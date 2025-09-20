import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, Users, DollarSign, Clock, AlertTriangle } from 'lucide-react'

interface DashboardStatsProps {
  stats: {
    totalOrders: number
    totalRevenue: number
    totalCustomers: number
    totalProducts: number
    pendingOrders: number
    lowStockItems: number
  }
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Revenue',
      value: `EGP ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: '+12.5%',
      trendPositive: true,
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      trend: '+8.2%',
      trendPositive: true,
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      trend: '+5.7%',
      trendPositive: true,
    },
    {
      title: 'Total Products',
      value: stats.totalProducts.toLocaleString(),
      icon: Package,
      trend: '+3.1%',
      trendPositive: true,
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders.toLocaleString(),
      icon: Clock,
      trend: `${stats.pendingOrders > 0 ? 'Needs attention' : 'All clear'}`,
      trendPositive: stats.pendingOrders === 0,
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems.toLocaleString(),
      icon: AlertTriangle,
      trend: `${stats.lowStockItems > 0 ? 'Restock needed' : 'Well stocked'}`,
      trendPositive: stats.lowStockItems === 0,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.trendPositive ? 'text-green-600' : 'text-red-600'}`}>{stat.trend}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
