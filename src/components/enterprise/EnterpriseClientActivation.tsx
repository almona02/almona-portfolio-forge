import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { track } from '@/lib/analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    Crown,
    DollarSign,
    Eye,
    FileText,
    Mail,
    Phone,
    Rocket,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Enterprise Client Types
interface EnterpriseClient {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  industry: string;
  employeeCount: string;
  annualRevenue: string;
  currentSolution: string;
  painPoints: string[];
  requirements: string[];
  timeline: string;
  budget: string;
  decisionMakers: Array<{
    name: string;
    role: string;
    email: string;
    influence: 'high' | 'medium' | 'low';
  }>;
  customization: {
    branding: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    apiAccess: boolean;
    advancedReports: boolean;
    dedicatedSupport: boolean;
  };
  proposal: {
    tier: 'professional' | 'enterprise' | 'custom';
    monthlyValue: number;
    setupFee: number;
    features: string[];
    timeline: string;
    roi: string;
  };
  status: 'prospect' | 'qualified' | 'proposal-sent' | 'negotiation' | 'contract-signed' | 'onboarding' | 'active';
  probability: number;
  nextStep: string;
  assignedCSM: string;
}

// Mock enterprise client data
const mockEnterpriseClient: EnterpriseClient = {
  id: 'ent-001',
  companyName: 'Mediterranean Aluminum Industries',
  contactPerson: 'Maria Gonzalez',
  email: 'maria.gonzalez@medaluminum.com',
  phone: '+34 91 123 4567',
  industry: 'Aluminum Manufacturing',
  employeeCount: '500-1000',
  annualRevenue: '$50M - $100M',
  currentSolution: 'Manual processes + Excel',
  painPoints: [
    'Inefficient production planning',
    'Manual inventory tracking',
    'Limited visibility across operations',
    'Difficulty scaling operations',
    'Compliance documentation challenges'
  ],
  requirements: [
    'White-label solution for their brand',
    'Multi-language support (Spanish/English)',
    'API integration with ERP system',
    'Advanced reporting and analytics',
    'Dedicated customer success manager'
  ],
  timeline: '3 months',
  budget: '$50K - $100K annually',
  decisionMakers: [
    { name: 'Maria Gonzalez', role: 'Operations Director', email: 'maria.gonzalez@medaluminum.com', influence: 'high' },
    { name: 'Carlos Rodriguez', role: 'IT Manager', email: 'carlos.rodriguez@medaluminum.com', influence: 'medium' },
    { name: 'Ana Martinez', role: 'CEO', email: 'ana.martinez@medaluminum.com', influence: 'high' }
  ],
  customization: {
    branding: true,
    whiteLabel: true,
    customDomain: true,
    apiAccess: true,
    advancedReports: true,
    dedicatedSupport: true
  },
  proposal: {
    tier: 'enterprise',
    monthlyValue: 8500,
    setupFee: 15000,
    features: [
      'White-label branding',
      'Custom domain (mediterranean.almona.com)',
      'Spanish localization',
      'API integration support',
      'Dedicated customer success manager',
      'Advanced analytics dashboard',
      'Priority support (2-hour response)',
      'Custom workflow automation',
      'Compliance documentation system'
    ],
    timeline: '6-8 weeks implementation',
    roi: '300% ROI within 12 months'
  },
  status: 'qualified',
  probability: 75,
  nextStep: 'Schedule technical demo with IT team',
  assignedCSM: 'Sophie Chen'
};

// Pricing tiers
const ENTERPRISE_TIERS = {
  professional: {
    name: 'Professional',
    monthlyPrice: 2500,
    setupFee: 5000,
    features: [
      'Multi-tenant architecture',
      'Basic white-labeling',
      'Standard integrations',
      'Business hours support',
      'Advanced analytics',
      'Up to 100 users'
    ],
    limits: {
      users: 100,
      apiCalls: 50000,
      storage: '500GB',
      support: 'Business hours'
    }
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 7500,
    setupFee: 15000,
    features: [
      'Full white-label solution',
      'Custom domain',
      'API integration support',
      'Dedicated success manager',
      'Priority support (2-hour SLA)',
      'Advanced reporting',
      'Custom workflows',
      'Up to 500 users'
    ],
    limits: {
      users: 500,
      apiCalls: 200000,
      storage: '2TB',
      support: '24/7 priority'
    }
  },
  custom: {
    name: 'Custom Enterprise',
    monthlyPrice: 15000,
    setupFee: 35000,
    features: [
      'Fully customized solution',
      'On-premise deployment option',
      'Custom integrations',
      'Dedicated technical team',
      '1-hour SLA support',
      'Custom feature development',
      'Advanced security features',
      'Unlimited users'
    ],
    limits: {
      users: 'Unlimited',
      apiCalls: 'Unlimited',
      storage: 'Unlimited',
      support: 'Dedicated team'
    }
  }
};

/**
 * Enterprise Client Activation Component
 * 
 * Complete enterprise sales and onboarding system for high-value clients.
 * Features:
 * - Lead qualification and management
 * - Proposal generation and customization
 * - White-label configuration setup
 * - Implementation timeline tracking
 * - ROI calculation and presentation
 * - Success metrics and engagement tracking
 */
export const EnterpriseClientActivation: React.FC = () => {
  const { t: _t } = useTranslation();
  const [client, setClient] = useState<EnterpriseClient>(mockEnterpriseClient);
  const [activeTab, setActiveTab] = useState('overview');
  const [proposalGenerated, setProposalGenerated] = useState(false);
  const [demoScheduled, setDemoScheduled] = useState(false);

  useEffect(() => {
    track('enterprise_client_activation_viewed', {
      clientId: client.id,
      status: client.status,
      probability: client.probability,
      tier: client.proposal.tier,
      timestamp: Date.now()
    });
  }, [client.id, client.status, client.probability, client.proposal.tier]);

  const updateClientStatus = (newStatus: EnterpriseClient['status']) => {
    setClient(prev => ({ ...prev, status: newStatus }));
    track('enterprise_client_status_updated', {
      clientId: client.id,
      oldStatus: client.status,
      newStatus,
      timestamp: Date.now()
    });
  };

  const generateProposal = () => {
    setProposalGenerated(true);
    track('enterprise_proposal_generated', {
      clientId: client.id,
      tier: client.proposal.tier,
      value: client.proposal.monthlyValue,
      timestamp: Date.now()
    });
  };

  const scheduleDemo = () => {
    setDemoScheduled(true);
    track('enterprise_demo_scheduled', {
      clientId: client.id,
      timestamp: Date.now()
    });
  };

  const activateWhiteLabel = () => {
    // In real implementation, this would call the white-label activation API
    updateClientStatus('onboarding');
    track('enterprise_white_label_activated', {
      clientId: client.id,
      domain: `${client.companyName.toLowerCase().replace(/\s+/g, '')}.almona.com`,
      timestamp: Date.now()
    });
  };

  const ClientOverview = () => (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="typography-h2">{client.companyName}</h2>
            <p className="text-muted-foreground">{client.industry} • {client.employeeCount} employees</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={client.status === 'active' ? 'default' : 'secondary'}
            className="flex items-center gap-1"
          >
            {client.status === 'active' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {client.status.charAt(0).toUpperCase() + client.status.slice(1).replace('-', ' ')}
          </Badge>
          <Badge variant="outline">
            {client.probability}% Probability
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Monthly Value</p>
                <p className="text-xl font-bold">${client.proposal.monthlyValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Annual Value</p>
                <p className="text-xl font-bold">${(client.proposal.monthlyValue * 12).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Decision Makers</p>
                <p className="text-xl font-bold">{client.decisionMakers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Timeline</p>
                <p className="text-xl font-bold">{client.timeline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Deal Progress</span>
              <span>{client.probability}%</span>
            </div>
            <Progress value={client.probability} />
            
            <div className="grid gap-3 md:grid-cols-3">
              {['prospect', 'qualified', 'proposal-sent', 'negotiation', 'contract-signed', 'active'].map((status) => (
                <div 
                  key={status}
                  className={`p-3 rounded-lg border ${client.status === status ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{status.replace('-', ' ')}</span>
                    {client.status === status && <CheckCircle className="h-4 w-4 text-blue-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Step:</strong> {client.nextStep}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              {!demoScheduled && (
                <Button onClick={scheduleDemo} className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule Technical Demo
                </Button>
              )}
              
              {!proposalGenerated && (
                <Button onClick={generateProposal} variant="outline" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Generate Proposal
                </Button>
              )}

              {client.status === 'contract-signed' && (
                <Button onClick={activateWhiteLabel} className="flex items-center gap-2">
                  <Rocket className="h-4 w-4" />
                  Activate White-Label Portal
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ProposalDetails = () => {
    const tier = ENTERPRISE_TIERS[client.proposal.tier];
    
    return (
      <div className="space-y-6">
        {/* Proposal Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="typography-h3">{tier.name} Proposal</h3>
            <p className="text-muted-foreground">Customized for {client.companyName}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">${client.proposal.monthlyValue.toLocaleString()}/month</p>
            <p className="text-sm text-muted-foreground">+ ${client.proposal.setupFee.toLocaleString()} setup</p>
          </div>
        </div>

        {/* ROI Highlight */}
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <strong>Expected ROI:</strong> {client.proposal.roi} through operational efficiency and cost savings
          </AlertDescription>
        </Alert>

        {/* Features Included */}
        <Card>
          <CardHeader>
            <CardTitle>Features Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {client.proposal.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Implementation Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Implementation Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{client.proposal.timeline}</p>
              
              <div className="space-y-3">
                {[
                  { phase: 'Planning & Requirements', duration: '1-2 weeks', status: 'pending' },
                  { phase: 'White-label Setup', duration: '2-3 weeks', status: 'pending' },
                  { phase: 'Data Migration & Integration', duration: '2-3 weeks', status: 'pending' },
                  { phase: 'Testing & Training', duration: '1-2 weeks', status: 'pending' },
                  { phase: 'Go-Live & Support', duration: 'Ongoing', status: 'pending' }
                ].map((phase, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{phase.phase}</span>
                      <p className="text-sm text-muted-foreground">{phase.duration}</p>
                    </div>
                    <Badge variant="secondary">{phase.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposal Actions */}
        <div className="flex gap-2">
          <Button onClick={generateProposal} disabled={proposalGenerated}>
            {proposalGenerated ? 'Proposal Generated' : 'Generate Formal Proposal'}
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Email Proposal
          </Button>
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview Proposal
          </Button>
        </div>
      </div>
    );
  };

  const CustomizationSetup = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>White-Label Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Custom Domain</Label>
              <Input 
                value={`${client.companyName.toLowerCase().replace(/\s+/g, '')}.almona.com`}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <Input value="#1B4332" />
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(client.customization).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <p className="text-sm text-muted-foreground">
                    {key === 'whiteLabel' && 'Remove Almona branding completely'}
                    {key === 'customDomain' && 'Use your own domain name'}
                    {key === 'apiAccess' && 'Full API access for integrations'}
                    {key === 'advancedReports' && 'Custom reporting and analytics'}
                    {key === 'dedicatedSupport' && 'Dedicated customer success manager'}
                    {key === 'branding' && 'Custom colors, logo, and styling'}
                  </p>
                </div>
                <Switch checked={enabled} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technical Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {client.requirements.map((requirement, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">{requirement}</span>
              </div>
            ))}
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
          <h1 className="typography-h1 tracking-tight flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Enterprise Client Activation
          </h1>
          <p className="text-muted-foreground">
            Manage high-value enterprise deals and onboarding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            Call Client
          </Button>
          <Button className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="proposal">Proposal</TabsTrigger>
          <TabsTrigger value="customization">Setup</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ClientOverview />
        </TabsContent>

        <TabsContent value="proposal">
          <ProposalDetails />
        </TabsContent>

        <TabsContent value="customization">
          <CustomizationSetup />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Decision Makers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {client.decisionMakers.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="typography-h4 font-medium">{contact.name}</h4>
                      <p className="text-sm text-muted-foreground">{contact.role}</p>
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                    </div>
                    <Badge 
                      variant={contact.influence === 'high' ? 'default' : 'secondary'}
                    >
                      {contact.influence} influence
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnterpriseClientActivation;
