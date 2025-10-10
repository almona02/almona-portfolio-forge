import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Globe,
  Calendar,
  Star,
  ArrowUp,
  ArrowDown,
  Activity,
  Eye,
  Download,
  Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { track } from '@/lib/analytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Area, AreaChart } from 'recharts';

// Predictive Analytics Types
interface Prediction {
  id: string;
  type: 'revenue' | 'customer' | 'market' | 'product' | 'risk';
  title: string;
  description: string;
  timeframe: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  trend: 'positive' | 'negative' | 'neutral';
  value: number;
  unit: string;
  factors: string[];
  recommendations: string[];
  historicalAccuracy: number;
}

interface MarketForecast {
  period: string;
  revenue: number;
  customers: number;
  orders: number;
  marketShare: number;
  confidence: number;
}

interface CustomerSegment {
  name: string;
  size: number;
  value: number;
  growth: number;
  churnRisk: number;
  lifetime: number;
  color: string;
}

interface RiskAssessment {
  category: string;
  risk: string;
  probability: number;
  impact: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  mitigation: string[];
  timeframe: string;
}

// Mock predictive data
const mockPredictions: Prediction[] = [
  {
    id: 'pred-001',
    type: 'revenue',
    title: 'Q2 2024 Revenue Forecast',
    description: 'Based on current pipeline and historical patterns, revenue will exceed targets',
    timeframe: 'Next Quarter',
    confidence: 87,
    impact: 'high',
    trend: 'positive',
    value: 2850000,
    unit: 'EUR',
    factors: [
      'Strong EU market expansion',
      'Enterprise client conversions',
      'Partner channel growth',
      'Seasonal demand increase'
    ],
    recommendations: [
      'Increase inventory for top-selling products',
      'Expand sales team capacity',
      'Prepare for support scaling',
      'Optimize pricing for peak demand'
    ],
    historicalAccuracy: 92
  },
  {
    id: 'pred-002',
    type: 'customer',
    title: 'Customer Acquisition Acceleration',
    description: 'AI predicts 45% increase in high-value customer acquisitions',
    timeframe: 'Next 6 Months',
    confidence: 78,
    impact: 'high',
    trend: 'positive',
    value: 234,
    unit: 'customers',
    factors: [
      'Improved lead qualification',
      'Enhanced product positioning',
      'Market expansion success',
      'Brand recognition growth'
    ],
    recommendations: [
      'Invest in customer success team',
      'Develop enterprise onboarding program',
      'Create customer advocacy program',
      'Enhance support infrastructure'
    ],
    historicalAccuracy: 85
  },
  {
    id: 'pred-003',
    type: 'market',
    title: 'German Market Penetration',
    description: 'Strong growth opportunity in German precision manufacturing segment',
    timeframe: 'Next 12 Months',
    confidence: 91,
    impact: 'high',
    trend: 'positive',
    value: 1200000,
    unit: 'EUR',
    factors: [
      'Industry 4.0 adoption increase',
      'Government manufacturing incentives',
      'Competitor weakness in segment',
      'Strong brand perception'
    ],
    recommendations: [
      'Establish German sales office',
      'Partner with local distributors',
      'Invest in German-language content',
      'Attend key German trade shows'
    ],
    historicalAccuracy: 89
  },
  {
    id: 'pred-004',
    type: 'risk',
    title: 'Supply Chain Vulnerability',
    description: 'Potential disruption risk in Q3 due to material costs',
    timeframe: 'Next Quarter',
    confidence: 73,
    impact: 'medium',
    trend: 'negative',
    value: 15,
    unit: '% cost increase',
    factors: [
      'Aluminum price volatility',
      'Transportation cost increases',
      'Currency fluctuations',
      'Supplier capacity constraints'
    ],
    recommendations: [
      'Diversify supplier base',
      'Implement cost hedging strategies',
      'Optimize inventory levels',
      'Review pricing strategies'
    ],
    historicalAccuracy: 81
  }
];

const mockMarketForecast: MarketForecast[] = [
  { period: 'Mar 2024', revenue: 850000, customers: 1247, orders: 342, marketShare: 12.5, confidence: 95 },
  { period: 'Apr 2024', revenue: 920000, customers: 1356, orders: 378, marketShare: 13.1, confidence: 92 },
  { period: 'May 2024', revenue: 1050000, customers: 1489, orders: 425, marketShare: 14.2, confidence: 89 },
  { period: 'Jun 2024', revenue: 1180000, customers: 1634, orders: 467, marketShare: 15.8, confidence: 85 },
  { period: 'Jul 2024', revenue: 1320000, customers: 1798, orders: 512, marketShare: 17.1, confidence: 82 },
  { period: 'Aug 2024', revenue: 1420000, customers: 1945, orders: 548, marketShare: 18.3, confidence: 79 }
];

const mockCustomerSegments: CustomerSegment[] = [
  { name: 'Enterprise', size: 23, value: 156000, growth: 28, churnRisk: 5, lifetime: 4.2, color: '#FF6B6B' },
  { name: 'SME Manufacturing', size: 156, value: 45000, growth: 15, churnRisk: 12, lifetime: 2.8, color: '#4ECDC4' },
  { name: 'Startups', size: 89, value: 12000, growth: 45, churnRisk: 28, lifetime: 1.6, color: '#45B7D1' },
  { name: 'Government', size: 12, value: 89000, growth: 8, churnRisk: 3, lifetime: 5.1, color: '#96CEB4' }
];

const mockRiskAssessments: RiskAssessment[] = [
  {
    category: 'Market Risk',
    risk: 'Economic downturn affecting manufacturing investments',
    probability: 35,
    impact: 85,
    severity: 'high',
    mitigation: [
      'Diversify into recession-resistant segments',
      'Develop cost-effective product lines',
      'Strengthen cash reserves',
      'Flexible workforce planning'
    ],
    timeframe: '6-12 months'
  },
  {
    category: 'Competitive Risk',
    risk: 'Major competitor entering EU market with aggressive pricing',
    probability: 65,
    impact: 70,
    severity: 'high',
    mitigation: [
      'Enhance value proposition',
      'Strengthen customer relationships',
      'Accelerate product innovation',
      'Improve cost efficiency'
    ],
    timeframe: '3-6 months'
  },
  {
    category: 'Operational Risk',
    risk: 'Key supplier dependency creating supply chain vulnerability',
    probability: 45,
    impact: 60,
    severity: 'medium',
    mitigation: [
      'Identify alternative suppliers',
      'Build strategic inventory',
      'Negotiate better terms',
      'Develop local sourcing options'
    ],
    timeframe: '1-3 months'
  }
];

/**
 * Predictive Insights Component
 * 
 * Advanced predictive analytics and business intelligence platform.
 * Features:
 * - AI-powered market forecasting
 * - Customer behavior prediction
 * - Risk assessment and mitigation
 * - Revenue and growth projections
 * - Market opportunity identification
 * - Competitive intelligence
 * - Strategic recommendations
 */
export const PredictiveInsights: React.FC = () => {
  const { t } = useTranslation();
  const [predictions] = useState<Prediction[]>(mockPredictions);
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const [activeTab, setActiveTab] = useState('forecasts');
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    track('predictive_insights_viewed', {
      timeframe: selectedTimeframe,
      predictionsCount: predictions.length,
      highImpactPredictions: predictions.filter(p => p.impact === 'high').length,
      timestamp: Date.now()
    });
  }, [selectedTimeframe, predictions]);

  const generateReport = () => {
    track('predictive_report_generated', {
      timeframe: selectedTimeframe,
      includesPredictions: predictions.length,
      timestamp: Date.now()
    });
  };

  const PredictionCard: React.FC<{ prediction: Prediction }> = ({ prediction }) => {
    const trendIcons = {
      positive: <TrendingUp className="h-4 w-4 text-green-600" />,
      negative: <TrendingDown className="h-4 w-4 text-red-600" />,
      neutral: <Activity className="h-4 w-4 text-gray-600" />
    };

    const impactColors = {
      high: 'border-red-200 bg-red-50',
      medium: 'border-yellow-200 bg-yellow-50',
      low: 'border-blue-200 bg-blue-50'
    };

    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${impactColors[prediction.impact]} ${selectedPrediction?.id === prediction.id ? 'ring-2 ring-blue-500' : ''}`}
        onClick={() => setSelectedPrediction(selectedPrediction?.id === prediction.id ? null : prediction)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {trendIcons[prediction.trend]}
              {prediction.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {prediction.confidence}% confidence
              </Badge>
              <Badge 
                variant={prediction.impact === 'high' ? 'destructive' : 'default'}
                className="text-xs"
              >
                {prediction.impact} impact
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{prediction.description}</p>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {prediction.type === 'revenue' || prediction.type === 'market' 
                    ? `€${prediction.value.toLocaleString()}` 
                    : `${prediction.value} ${prediction.unit}`}
                </p>
                <p className="text-xs text-muted-foreground">{prediction.timeframe}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Historical Accuracy</p>
                <div className="flex items-center gap-2">
                  <Progress value={prediction.historicalAccuracy} className="w-16" />
                  <span className="text-sm">{prediction.historicalAccuracy}%</span>
                </div>
              </div>
            </div>

            {selectedPrediction?.id === prediction.id && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Key Factors</h4>
                  <div className="space-y-1">
                    {prediction.factors.map((factor, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                        <span className="text-sm">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <div className="space-y-1">
                    {prediction.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-green-600 mt-0.5" />
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const ForecastingDashboard = () => (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Next 3 Months</SelectItem>
              <SelectItem value="6months">Next 6 Months</SelectItem>
              <SelectItem value="12months">Next 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={generateReport}>
          <Download className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Key Predictions */}
      <div className="space-y-4">
        {predictions.map((prediction) => (
          <PredictionCard key={prediction.id} prediction={prediction} />
        ))}
      </div>

      {/* Market Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Market Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={mockMarketForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value, name) => [`${value}`, `${name}`]} />
              <Area type="monotone" dataKey="revenue" stroke="#4ECDC4" fill="#4ECDC4" fillOpacity={0.3} name="Revenue (€)" />
              <Area type="monotone" dataKey="customers" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.3} name="Customers" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const CustomerAnalytics = () => (
    <div className="space-y-6">
      {/* Customer Segments Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={mockCustomerSegments}
                  dataKey="size"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {mockCustomerSegments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segment Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockCustomerSegments.map((segment, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: segment.color }}
                      ></div>
                      <span className="font-medium">{segment.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      €{segment.value.toLocaleString()} avg
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Growth: </span>
                      <span className={segment.growth > 20 ? 'text-green-600' : 'text-gray-600'}>
                        +{segment.growth}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Churn Risk: </span>
                      <span className={segment.churnRisk > 20 ? 'text-red-600' : 'text-gray-600'}>
                        {segment.churnRisk}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">LTV: </span>
                      <span className="text-gray-600">{segment.lifetime} years</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Customer Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                <strong>Insight:</strong> Enterprise segment shows 28% growth but requires 45% more support resources. 
                Consider investing in dedicated enterprise success team.
              </AlertDescription>
            </Alert>

            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <strong>Opportunity:</strong> Startup segment has highest growth (45%) but also highest churn (28%). 
                Implement onboarding improvements to reduce early churn.
              </AlertDescription>
            </Alert>

            <Alert>
              <Star className="h-4 w-4" />
              <AlertDescription>
                <strong>Success:</strong> Government segment has lowest churn (3%) and highest lifetime value (5.1 years). 
                Expand government outreach programs.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const RiskAssessment = () => (
    <div className="space-y-6">
      {mockRiskAssessments.map((risk, index) => {
        const severityColors = {
          critical: 'border-red-500 bg-red-50',
          high: 'border-red-300 bg-red-50',
          medium: 'border-yellow-300 bg-yellow-50',
          low: 'border-blue-300 bg-blue-50'
        };

        const riskScore = (risk.probability * risk.impact) / 100;

        return (
          <Card key={index} className={severityColors[risk.severity]}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {risk.category}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Risk Score: {riskScore.toFixed(0)}</Badge>
                  <Badge 
                    variant={risk.severity === 'critical' || risk.severity === 'high' ? 'destructive' : 'default'}
                  >
                    {risk.severity}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium">{risk.risk}</p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Risk Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Probability:</span>
                      <div className="flex items-center gap-2">
                        <Progress value={risk.probability} className="w-16" />
                        <span className="text-sm">{risk.probability}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Impact:</span>
                      <div className="flex items-center gap-2">
                        <Progress value={risk.impact} className="w-16" />
                        <span className="text-sm">{risk.impact}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Timeframe:</span>
                      <span className="text-sm font-medium">{risk.timeframe}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Mitigation Strategies</h4>
                  <div className="space-y-1">
                    {risk.mitigation.map((strategy, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span className="text-sm">{strategy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  Create Action Plan
                </Button>
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Set Monitoring
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Alerts
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Predictive Insights
          </h2>
          <p className="text-muted-foreground">
            AI-powered forecasting, risk assessment, and strategic intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            AI Powered
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            87% Accuracy
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="forecasts">Market Forecasts</TabsTrigger>
          <TabsTrigger value="customers">Customer Analytics</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasts">
          <ForecastingDashboard />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerAnalytics />
        </TabsContent>

        <TabsContent value="risks">
          <RiskAssessment />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PredictiveInsights;