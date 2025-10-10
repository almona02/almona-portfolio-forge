import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  Target,
  TrendingUp,
  Users,
  MessageCircle,
  FileText,
  Zap,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  BarChart3,
  Lightbulb,
  Send,
  Download,
  Eye,
  Settings,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  Award,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { track } from '@/lib/analytics';
import { getEquipmentRecommendation } from '@/lib/ai/gemini';

// AI Sales Types
interface Lead {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  industry: string;
  region: string;
  source: string;
  aiScore: number;
  qualification: 'hot' | 'warm' | 'cold' | 'qualified' | 'unqualified';
  stage: 'lead' | 'contacted' | 'demo' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  predictedValue: number;
  probability: number;
  nextBestAction: string;
  insights: string[];
  engagementScore: number;
  lastActivity: string;
  aiRecommendations: string[];
}

interface SalesProposal {
  id: string;
  leadId: string;
  title: string;
  products: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalValue: number;
  margin: number;
  discountApplied: number;
  aiOptimizations: string[];
  competitorAnalysis: {
    competitors: string[];
    advantages: string[];
    risks: string[];
  };
  customization: string;
  roi: string;
  timeline: string;
  generatedAt: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
}

interface AIInsight {
  type: 'opportunity' | 'risk' | 'action' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  recommendation: string;
  timestamp: string;
}

// Mock data
const mockLeads: Lead[] = [
  {
    id: 'lead-001',
    companyName: 'Berlin Precision Manufacturing',
    contactPerson: 'Klaus Mueller',
    email: 'klaus.mueller@berlinprecision.de',
    phone: '+49 30 123 4567',
    industry: 'Precision Manufacturing',
    region: 'Germany',
    source: 'Website Inquiry',
    aiScore: 87,
    qualification: 'hot',
    stage: 'demo',
    predictedValue: 125000,
    probability: 78,
    nextBestAction: 'Schedule technical demo for next week',
    insights: [
      'High engagement with CNC machine content',
      'Downloaded technical specifications 3 times',
      'Company expanding operations in Q2 2024',
      'Previous purchase history with similar suppliers'
    ],
    engagementScore: 92,
    lastActivity: '2024-03-10T14:30:00Z',
    aiRecommendations: [
      'Focus demo on precision and accuracy capabilities',
      'Highlight German engineering standards compliance',
      'Propose extended warranty for German market',
      'Schedule follow-up within 2 business days'
    ]
  },
  {
    id: 'lead-002',
    companyName: 'Mediterranean Aluminum Solutions',
    contactPerson: 'Maria Rodriguez',
    email: 'maria@medaluminum.es',
    phone: '+34 91 987 6543',
    industry: 'Aluminum Processing',
    region: 'Spain',
    source: 'Trade Show',
    aiScore: 73,
    qualification: 'warm',
    stage: 'contacted',
    predictedValue: 89000,
    probability: 45,
    nextBestAction: 'Send personalized follow-up with Spanish case studies',
    insights: [
      'Medium-sized company looking to modernize',
      'Budget constraints but growth potential',
      'Interested in financing options',
      'Competitor proposal received last month'
    ],
    engagementScore: 68,
    lastActivity: '2024-03-08T10:15:00Z',
    aiRecommendations: [
      'Emphasize ROI and cost savings',
      'Provide Spanish-language materials',
      'Offer flexible payment terms',
      'Share similar Spanish customer success stories'
    ]
  }
];

const mockAIInsights: AIInsight[] = [
  {
    type: 'opportunity',
    priority: 'high',
    title: 'German Market Expansion Opportunity',
    description: 'Increased activity from German manufacturers in precision equipment category',
    impact: '+€450K potential revenue in Q2',
    confidence: 89,
    recommendation: 'Increase German-language content and target precision manufacturing companies',
    timestamp: '2024-03-10T09:00:00Z'
  },
  {
    type: 'action',
    priority: 'high',
    title: 'Follow-up Required: High-Value Leads',
    description: '3 qualified leads haven\'t been contacted in 48+ hours',
    impact: 'Risk of losing €280K in potential deals',
    confidence: 95,
    recommendation: 'Immediate personalized follow-up required for Berlin Precision, Lyon Industries, and Rotterdam Steel',
    timestamp: '2024-03-10T08:30:00Z'
  },
  {
    type: 'trend',
    priority: 'medium',
    title: 'Financing Inquiries Trending Up',
    description: '67% increase in financing-related questions from EU prospects',
    impact: 'Opportunity to close more deals with flexible terms',
    confidence: 82,
    recommendation: 'Develop EU-specific financing packages and highlight payment flexibility',
    timestamp: '2024-03-10T07:45:00Z'
  }
];

/**
 * AI Sales Acceleration Component
 * 
 * AI-powered sales and marketing acceleration system.
 * Features:
 * - Intelligent lead scoring and qualification
 * - Automated proposal generation
 * - Sales insights and recommendations
 * - Competitor analysis and positioning
 * - Predictive analytics for deal closure
 * - Personalized customer engagement
 * - Regional market intelligence
 */
export const SalesAcceleration: React.FC = () => {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>(mockAIInsights);
  const [activeTab, setActiveTab] = useState('leads');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [aiQuery, setAIQuery] = useState('');
  const [aiResponse, setAIResponse] = useState('');

  useEffect(() => {
    track('ai_sales_acceleration_viewed', {
      leadsCount: leads.length,
      hotLeads: leads.filter(l => l.qualification === 'hot').length,
      averageScore: Math.round(leads.reduce((sum, l) => sum + l.aiScore, 0) / leads.length),
      timestamp: Date.now()
    });
  }, [leads]);

  const generateAIProposal = async (leadId: string) => {
    setGeneratingProposal(true);
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) return;

    // Simulate AI proposal generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const proposal: SalesProposal = {
      id: `prop-${Date.now()}`,
      leadId,
      title: `Customized Solution for ${lead.companyName}`,
      products: [
        { name: 'YILMAZ KM-212 CNC Machine', quantity: 1, unitPrice: 75000, total: 75000 },
        { name: 'Advanced Control System', quantity: 1, unitPrice: 25000, total: 25000 },
        { name: 'Training Package', quantity: 1, unitPrice: 8000, total: 8000 },
        { name: 'Extended Warranty', quantity: 1, unitPrice: 12000, total: 12000 }
      ],
      totalValue: 120000,
      margin: 35,
      discountApplied: 5000,
      aiOptimizations: [
        'Bundled training reduces implementation risk',
        'Extended warranty builds confidence',
        'Competitive pricing vs German alternatives',
        'Financing options available'
      ],
      competitorAnalysis: {
        competitors: ['DMG MORI', 'Trumpf', 'Mazak'],
        advantages: ['Better price-performance ratio', 'Faster delivery', 'Local support'],
        risks: ['Brand recognition', 'Established relationships']
      },
      customization: `Tailored for ${lead.industry} with German compliance standards`,
      roi: '280% ROI within 18 months',
      timeline: '8-10 weeks delivery and installation',
      generatedAt: new Date().toISOString(),
      status: 'draft'
    };
    
    setGeneratingProposal(false);
    
    track('ai_proposal_generated', {
      leadId,
      proposalValue: proposal.totalValue,
      margin: proposal.margin,
      timestamp: Date.now()
    });
  };

  const askAI = async () => {
    if (!aiQuery.trim()) return;
    
    try {
      const response = await getEquipmentRecommendation(aiQuery);
      setAIResponse(response);
      
      track('ai_sales_query', {
        query: aiQuery,
        timestamp: Date.now()
      });
    } catch (error) {
      setAIResponse('AI service temporarily unavailable. Please try again later.');
    }
  };

  const LeadsManagement = () => (
    <div className="space-y-6">
      {/* AI Insights Alert */}
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>AI Insight:</strong> {aiInsights[0]?.description} - {aiInsights[0]?.recommendation}
        </AlertDescription>
      </Alert>

      {/* Leads Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold">{leads.filter(l => l.qualification === 'hot').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Warm Leads</p>
                <p className="text-2xl font-bold">{leads.filter(l => l.qualification === 'warm').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">€{leads.reduce((sum, l) => sum + l.predictedValue, 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg AI Score</p>
                <p className="text-2xl font-bold">{Math.round(leads.reduce((sum, l) => sum + l.aiScore, 0) / leads.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {leads.map((lead) => (
          <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedLead(lead)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{lead.companyName}</h3>
                    <p className="text-sm text-muted-foreground">{lead.contactPerson} • {lead.industry}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{lead.region}</Badge>
                      <Badge 
                        variant={lead.qualification === 'hot' ? 'destructive' : lead.qualification === 'warm' ? 'default' : 'secondary'}
                      >
                        {lead.qualification}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="font-bold text-lg">{lead.aiScore}</span>
                    <span className="text-sm text-muted-foreground">AI Score</span>
                  </div>
                  <p className="text-sm text-muted-foreground">€{lead.predictedValue.toLocaleString()} • {lead.probability}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{lead.nextBestAction}</p>
                </div>
              </div>

              {lead === selectedLead && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">AI Insights</h4>
                      <div className="space-y-1">
                        {lead.insights.map((insight, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <span className="text-sm">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">AI Recommendations</h4>
                      <div className="space-y-1">
                        {lead.aiRecommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                            <span className="text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" onClick={() => generateAIProposal(lead.id)} disabled={generatingProposal}>
                      {generatingProposal ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Generate AI Proposal
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const AIInsights = () => (
    <div className="space-y-4">
      {aiInsights.map((insight, index) => {
        const priorityColors = {
          high: 'border-red-200 bg-red-50',
          medium: 'border-yellow-200 bg-yellow-50',
          low: 'border-blue-200 bg-blue-50'
        };
        
        const typeIcons = {
          opportunity: TrendingUp,
          risk: AlertCircle,
          action: Target,
          trend: BarChart3
        };
        
        const TypeIcon = typeIcons[insight.type];
        
        return (
          <Card key={index} className={priorityColors[insight.priority]}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <TypeIcon className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{insight.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {insight.confidence}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-green-600">Impact: {insight.impact}</p>
                      <p className="text-sm">
                        <strong>Recommendation:</strong> {insight.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Badge 
                    variant={insight.priority === 'high' ? 'destructive' : 'default'}
                    className="capitalize"
                  >
                    {insight.priority}
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Take Action
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const AIAssistant = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Sales Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ask AI about leads, markets, or strategies</Label>
            <Textarea
              placeholder="e.g., 'What's the best approach for German manufacturing companies?' or 'How should I position against DMG MORI?'"
              value={aiQuery}
              onChange={(e) => setAIQuery(e.target.value)}
              rows={3}
            />
          </div>
          
          <Button onClick={askAI} disabled={!aiQuery.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Ask AI
          </Button>
          
          {aiResponse && (
            <div className="p-4 border rounded-lg bg-blue-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Response
              </h4>
              <div className="text-sm whitespace-pre-wrap">{aiResponse}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick AI Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Generate Market Report</div>
                <div className="text-sm text-muted-foreground">AI-powered regional analysis</div>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Competitor Analysis</div>
                <div className="text-sm text-muted-foreground">Compare positioning strategies</div>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Price Optimization</div>
                <div className="text-sm text-muted-foreground">AI-suggested pricing</div>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Email Templates</div>
                <div className="text-sm text-muted-foreground">Personalized outreach</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            AI Sales Acceleration
          </h2>
          <p className="text-muted-foreground">
            AI-powered lead qualification, proposal generation, and sales intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            AI Powered
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            89% Accuracy
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leads">AI Leads</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <LeadsManagement />
        </TabsContent>

        <TabsContent value="insights">
          <AIInsights />
        </TabsContent>

        <TabsContent value="assistant">
          <AIAssistant />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesAcceleration;
