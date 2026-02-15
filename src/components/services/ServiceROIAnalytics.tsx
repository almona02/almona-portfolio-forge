import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  BarChart3,
  PieChart,
  Calculator,
  Download,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import { track } from '@/lib/analytics'

interface ROIMetrics {
  totalSavings: number
  maintenanceCostReduction: number
  uptimeImprovement: number
  responseTimeReduction: number
  customerSatisfactionIncrease: number
  roiPercentage: number
}

interface CostBreakdown {
  category: string
  amount: number
  percentage: number
  color: string
}

interface TimeSeriesData {
  month: string
  maintenanceCost: number
  uptime: number
  responseTime: number
  customerSatisfaction: number
}

interface ServiceROIAnalyticsProps {
  timeRange?: '3m' | '6m' | '1y' | '2y'
  onTimeRangeChange?: (range: string) => void
}

const COLORS = ['#ff6b35', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#f59e0b']

export const ServiceROIAnalytics: React.FC<ServiceROIAnalyticsProps> = ({
  timeRange = '1y',
  onTimeRangeChange
}) => {
  const [metrics, setMetrics] = useState<ROIMetrics>({
    totalSavings: 0,
    maintenanceCostReduction: 0,
    uptimeImprovement: 0,
    responseTimeReduction: 0,
    customerSatisfactionIncrease: 0,
    roiPercentage: 0
  })
  
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [_selectedMetric, _setSelectedMetric] = useState<string>('all')

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadROIData = async () => {
      setIsLoading(true)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock ROI metrics
      setMetrics({
        totalSavings: 125000,
        maintenanceCostReduction: 35,
        uptimeImprovement: 18,
        responseTimeReduction: 42,
        customerSatisfactionIncrease: 25,
        roiPercentage: 340
      })

      // Mock cost breakdown
      setCostBreakdown([
        { category: 'Preventive Maintenance', amount: 45000, percentage: 36, color: COLORS[0] },
        { category: 'Predictive Analytics', amount: 32000, percentage: 26, color: COLORS[1] },
        { category: 'Remote Monitoring', amount: 28000, percentage: 22, color: COLORS[2] },
        { category: 'Training & Support', amount: 20000, percentage: 16, color: COLORS[3] }
      ])

      // Mock time series data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      setTimeSeriesData(months.map((month, index) => ({
        month,
        maintenanceCost: 15000 - (index * 800),
        uptime: 85 + (index * 1.2),
        responseTime: 120 - (index * 4),
        customerSatisfaction: 3.2 + (index * 0.15)
      })))

      setIsLoading(false)
      track('service_roi_analytics_loaded', { timeRange })
    }

    loadROIData()
  }, [timeRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getROITrend = () => {
    if (metrics.roiPercentage > 200) return { icon: TrendingUp, color: 'text-green-500', label: 'Excellent' }
    if (metrics.roiPercentage > 100) return { icon: TrendingUp, color: 'text-blue-500', label: 'Good' }
    if (metrics.roiPercentage > 50) return { icon: TrendingDown, color: 'text-yellow-500', label: 'Fair' }
    return { icon: TrendingDown, color: 'text-red-500', label: 'Poor' }
  }

  const roiTrend = getROITrend()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="typography-h3 text-lg text-gray-900">Service ROI Analytics</h3>
          <p className="text-sm text-gray-600">Return on investment from service improvements</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange?.(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
            <option value="2y">Last 2 Years</option>
          </select>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.totalSavings)}
            </div>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-4 w-4  mr-1 status-valid" />
              <span className="text-sm text-green-600">+{formatPercentage(metrics.roiPercentage)} ROI</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Maintenance Cost Reduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatPercentage(metrics.maintenanceCostReduction)}
            </div>
            <Progress value={metrics.maintenanceCostReduction} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Uptime Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatPercentage(metrics.uptimeImprovement)}
            </div>
            <Progress value={metrics.uptimeImprovement} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Response Time Reduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatPercentage(metrics.responseTimeReduction)}
            </div>
            <Progress value={metrics.responseTimeReduction} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatPercentage(metrics.customerSatisfactionIncrease)}
            </div>
            <Progress value={metrics.customerSatisfactionIncrease} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">ROI Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <roiTrend.icon className={`h-6 w-6 ${roiTrend.color} mr-2`} />
              <div>
                <div className="text-2xl font-bold">{roiTrend.label}</div>
                <div className="text-sm text-gray-600">{metrics.roiPercentage}% ROI</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="uptime" 
                    stroke="#ff6b35" 
                    strokeWidth={2}
                    name="Uptime %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="customerSatisfaction" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Satisfaction"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Cost Savings Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROI Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            ROI Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="typography-label text-sm font-medium text-gray-700">Initial Investment</label>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(45000)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="typography-label text-sm font-medium text-gray-700">Annual Savings</label>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.totalSavings)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="typography-label text-sm font-medium text-gray-700">ROI</label>
              <div className="text-2xl font-bold text-amber-600">
                {formatPercentage(metrics.roiPercentage)}
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Payback Period: 4.3 months</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Your service improvements have generated significant returns, with full payback achieved in less than 5 months.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
