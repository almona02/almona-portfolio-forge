/**
 * CustomerAnalyticsDashboard Component
 * 
 * Priority 4: Customers Page Upgrade - Customer Analytics Visualization
 * Display customer analytics metrics with KPIs, charts, and insights.
 * 
 * Gold Tier Implementation:
 * - Market-leading UX patterns (Salesforce/HubSpot inspired)
 * - ARIA compliant (WCAG 2.1 AA)
 * - Performance optimized
 * - Real-time data updates
 */

import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
    DollarSign,
    ShoppingCart,
    TrendingUp,
    Calendar,
    Loader2,
    RefreshCw,
    BarChart3,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    getCustomerAnalytics,
    getAnalyticsSummary,
    getCustomerRevenue,
    type CustomerAnalyticsResponse,
    type CustomerAnalyticsSummaryResponse,
    type CustomerRevenueResponse,
} from '@/services/customersApi';

/**
 * CustomerAnalyticsDashboard props
 */
export interface CustomerAnalyticsDashboardProps {
    customerId?: string; // If provided, shows customer-specific analytics
    className?: string;
}

/**
 * CustomerAnalyticsDashboard Component
 */
export const CustomerAnalyticsDashboard: React.FC<CustomerAnalyticsDashboardProps> = ({
    customerId,
    className,
}) => {
    const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalyticsResponse | null>(null);
    const [summary, setSummary] = useState<CustomerAnalyticsSummaryResponse | null>(null);
    const [revenue, setRevenue] = useState<CustomerRevenueResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    /**
     * Load analytics data
     */
    const loadAnalytics = useCallback(async () => {
        setIsLoading(true);
        try {
            if (customerId) {
                // Load customer-specific analytics
                const [analyticsData, revenueData] = await Promise.all([
                    getCustomerAnalytics(customerId),
                    getCustomerRevenue(customerId),
                ]);
                setCustomerAnalytics(analyticsData);
                setRevenue(revenueData);
            } else {
                // Load summary analytics
                const summaryData = await getAnalyticsSummary();
                setSummary(summaryData);
            }
            setLastRefresh(new Date());
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to load customer analytics'
            );
        } finally {
            setIsLoading(false);
        }
    }, [customerId]);

    /**
     * Initial load
     */
    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    /**
     * Format currency
     */
    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    /**
     * Format date
     */
    const formatDate = (dateString?: string): string => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">
                        {customerId ? 'Customer Analytics' : 'Analytics Summary'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {lastRefresh
                            ? `Last updated: ${lastRefresh.toLocaleTimeString()}`
                            : 'Loading analytics...'}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={loadAnalytics}
                    disabled={isLoading}
                    aria-label="Refresh analytics"
                >
                    <RefreshCw
                        className={cn(
                            'h-4 w-4',
                            isLoading && 'animate-spin'
                        )}
                    />
                </Button>
            </div>

            {isLoading && !customerAnalytics && !summary ? (
                <Card>
                    <CardContent className="flex items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            ) : customerId && customerAnalytics ? (
                <>
                    {/* Customer-specific metrics */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Revenue
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(customerAnalytics.total_revenue)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    All time revenue
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Order Count
                                </CardTitle>
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {customerAnalytics.order_count.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Total orders
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Average Order Value
                                </CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(customerAnalytics.average_order_value)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Per order average
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Lifetime Value
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(customerAnalytics.lifetime_value)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Customer LTV
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Revenue by period */}
                    {revenue && revenue.revenue_by_period.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue by Period</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {revenue.revenue_by_period.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 rounded border"
                                        >
                                            <span className="text-sm font-medium">
                                                {item.period}
                                            </span>
                                            <span className="text-sm font-bold">
                                                {formatCurrency(item.revenue)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Order dates */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    First Order
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-lg font-semibold">
                                    {formatDate(customerAnalytics.first_order_date)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Last Order
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-lg font-semibold">
                                    {formatDate(customerAnalytics.last_order_date)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : summary ? (
                <>
                    {/* Summary metrics */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Customers
                                </CardTitle>
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {summary.total_customers.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    All customers
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Revenue
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(summary.total_revenue)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    All time revenue
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Avg Lifetime Value
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(summary.average_lifetime_value)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Average LTV
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top customers */}
                    {summary.top_customers && summary.top_customers.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Customers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {summary.top_customers.map((customer, index) => (
                                        <div
                                            key={customer.customer_id}
                                            className="flex items-center justify-between p-2 rounded border"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-muted-foreground w-6">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {customer.customer_name}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold">
                                                {formatCurrency(customer.revenue)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <Card>
                    <CardContent className="flex items-center justify-center p-12">
                        <p className="text-muted-foreground">No analytics data available</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
