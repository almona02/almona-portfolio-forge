import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { track } from '@/lib/analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
  AlertTriangle,
  Award,
  CheckCircle,
  Clock,
  Crown,
  DollarSign,
  Download,
  Eye,
  FileText,
  Globe,
  Key,
  Star,
  Store,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Partner Types
interface PartnerApplication {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  partnerType: 'distributor' | 'reseller' | 'service-provider' | 'technology';
  businessModel: string;
  yearsInBusiness: number;
  annualRevenue: string;
  targetMarkets: string[];
  certifications: string[];
  references: Array<{
    company: string;
    contact: string;
    email: string;
    phone: string;
  }>;
  documents: Array<{
    type: string;
    name: string;
    url: string;
    uploaded: string;
  }>;
  status: 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected';
  submittedAt?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

interface Partner {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  partnerType: string;
  status: 'active' | 'suspended' | 'pending';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  joinedAt: string;
  apiKey: string;
  commissionRate: number;
  metrics: {
    totalSales: number;
    monthlyGrowth: number;
    customerCount: number;
    averageOrderValue: number;
    satisfaction: number;
  };
  certifications: Array<{
    name: string;
    validUntil: string;
    status: 'active' | 'expired' | 'pending';
  }>;
}

// Mock data
const mockPartnerApplication: PartnerApplication = {
  id: 'app-001',
  companyName: 'TechSol Solutions',
  contactName: 'Ahmed Mohamed',
  email: 'ahmed@techsol.com',
  phone: '+20 100 123 4567',
  website: 'https://techsol.com',
  country: 'Egypt',
  partnerType: 'reseller',
  businessModel: 'B2B Sales and Support',
  yearsInBusiness: 8,
  annualRevenue: '$500K - $1M',
  targetMarkets: ['Egypt', 'Sudan', 'Libya'],
  certifications: ['ISO 9001', 'YILMAZ Certified'],
  references: [
    {
      company: 'Cairo Aluminum Factory',
      contact: 'Mohamed Hassan',
      email: 'mohamed@cairofactory.com', 
      phone: '+20 102 555 0123'
    }
  ],
  documents: [
    {
      type: 'Business License',
      name: 'business_license_2024.pdf',
      url: '/documents/business_license_2024.pdf',
      uploaded: '2024-01-15T10:00:00Z'
    }
  ],
  status: 'draft',
};

const _mockPartner: Partner = {
  id: 'partner-001',
  companyName: 'Alexandria Industrial Equipment',
  contactName: 'Omar Farouk',
  email: 'omar@alexequip.com',
  partnerType: 'distributor',
  status: 'active',
  tier: 'gold',
  joinedAt: '2023-03-15T00:00:00Z',
  apiKey: 'pk_live_abc123...xyz789',
  commissionRate: 15,
  metrics: {
    totalSales: 2450000,
    monthlyGrowth: 23.5,
    customerCount: 156,
    averageOrderValue: 15700,
    satisfaction: 4.8
  },
  certifications: [
    {
      name: 'YILMAZ Certified Partner',
      validUntil: '2024-12-31T23:59:59Z',
      status: 'active'
    },
    {
      name: 'Technical Support Certification',
      validUntil: '2024-06-30T23:59:59Z',
      status: 'active'
    }
  ]
};

/**
 * Partner Onboarding Component
 * 
 * Comprehensive partner marketplace onboarding and management system.
 * Features:
 * - Partner application process
 * - Document management and verification
 * - API key generation and management
 * - Commission tracking and payouts
 * - Performance analytics
 * - Certification management
 * - Multi-tier partner program
 */
export const PartnerOnboarding: React.FC = () => {
  const { t: _t } = useTranslation();
  const [application, setApplication] = useState<PartnerApplication>(mockPartnerApplication);
  const [partner, _setPartner] = useState<Partner | null>(null);
  const [activeTab, setActiveTab] = useState('application');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    track('partner_onboarding_viewed', {
      applicationId: application.id,
      status: application.status,
      timestamp: Date.now()
    });
  }, [application.id, application.status]);

  const handleApplicationChange = (field: keyof PartnerApplication, value: any) => {
    setApplication(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addReference = () => {
    setApplication(prev => ({
      ...prev,
      references: [
        ...prev.references,
        { company: '', contact: '', email: '', phone: '' }
      ]
    }));
  };

  const updateReference = (index: number, field: string, value: string) => {
    setApplication(prev => ({
      ...prev,
      references: prev.references.map((ref, i) => 
        i === index ? { ...ref, [field]: value } : ref
      )
    }));
  };

  const submitApplication = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setApplication(prev => ({
      ...prev,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    }));
    
    setIsSubmitting(false);
    
    track('partner_application_submitted', {
      applicationId: application.id,
      partnerType: application.partnerType,
      timestamp: Date.now()
    });
  };

  const generateApiKey = () => {
    const key = `pk_live_${Math.random().toString(36).substr(2, 20)}`;
    alert(`New API Key Generated: ${key}\n\nPlease copy and store this key securely.`);
  };

  const ApplicationForm = () => (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Application Progress</span>
          <span>{Math.round((currentStep / 4) * 100)}%</span>
        </div>
        <Progress value={(currentStep / 4) * 100} />
      </div>

      <Tabs value={`step-${currentStep}`} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="step-1">Company Info</TabsTrigger>
          <TabsTrigger value="step-2">Business Details</TabsTrigger>
          <TabsTrigger value="step-3">References</TabsTrigger>
          <TabsTrigger value="step-4">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="step-1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    value={application.companyName}
                    onChange={(e) => handleApplicationChange('companyName', e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person *</Label>
                  <Input
                    value={application.contactName}
                    onChange={(e) => handleApplicationChange('contactName', e.target.value)}
                    placeholder="Full Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={application.email}
                    onChange={(e) => handleApplicationChange('email', e.target.value)}
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    value={application.phone}
                    onChange={(e) => handleApplicationChange('phone', e.target.value)}
                    placeholder="+20 100 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={application.website}
                    onChange={(e) => handleApplicationChange('website', e.target.value)}
                    placeholder="https://yourcompany.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Select
                    value={application.country}
                    onValueChange={(value) => handleApplicationChange('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Egypt">Egypt</SelectItem>
                      <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="Turkey">Turkey</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={() => setCurrentStep(2)}>
              Next Step
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="step-2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Partner Type *</Label>
                <Select
                  value={application.partnerType}
                  onValueChange={(value) => handleApplicationChange('partnerType', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="reseller">Reseller</SelectItem>
                    <SelectItem value="service-provider">Service Provider</SelectItem>
                    <SelectItem value="technology">Technology Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Business Model</Label>
                <Textarea
                  value={application.businessModel}
                  onChange={(e) => handleApplicationChange('businessModel', e.target.value)}
                  placeholder="Describe your business model and how you plan to promote our products"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Years in Business *</Label>
                  <Input
                    type="number"
                    value={application.yearsInBusiness}
                    onChange={(e) => handleApplicationChange('yearsInBusiness', parseInt(e.target.value))}
                    placeholder="8"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Revenue *</Label>
                  <Select
                    value={application.annualRevenue}
                    onValueChange={(value) => handleApplicationChange('annualRevenue', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Under $100K">Under $100K</SelectItem>
                      <SelectItem value="$100K - $500K">$100K - $500K</SelectItem>
                      <SelectItem value="$500K - $1M">$500K - $1M</SelectItem>
                      <SelectItem value="$1M - $5M">$1M - $5M</SelectItem>
                      <SelectItem value="Over $5M">Over $5M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Markets</Label>
                <div className="flex flex-wrap gap-2">
                  {['Egypt', 'Saudi Arabia', 'UAE', 'Kuwait', 'Turkey', 'Libya', 'Sudan'].map((market) => (
                    <div key={market} className="flex items-center space-x-2">
                      <Checkbox
                        id={market}
                        checked={application.targetMarkets.includes(market)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleApplicationChange('targetMarkets', [...application.targetMarkets, market]);
                          } else {
                            handleApplicationChange('targetMarkets', application.targetMarkets.filter(m => m !== market));
                          }
                        }}
                      />
                      <Label htmlFor={market} className="typography-label text-sm">{market}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Previous
            </Button>
            <Button onClick={() => setCurrentStep(3)}>
              Next Step
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="step-3" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business References</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.references.map((ref, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="typography-h4 font-medium">Reference #{index + 1}</h4>
                    {application.references.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setApplication(prev => ({
                            ...prev,
                            references: prev.references.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="Company Name"
                      value={ref.company}
                      onChange={(e) => updateReference(index, 'company', e.target.value)}
                    />
                    <Input
                      placeholder="Contact Person"
                      value={ref.contact}
                      onChange={(e) => updateReference(index, 'contact', e.target.value)}
                    />
                    <Input
                      placeholder="Email"
                      value={ref.email}
                      onChange={(e) => updateReference(index, 'email', e.target.value)}
                    />
                    <Input
                      placeholder="Phone"
                      value={ref.phone}
                      onChange={(e) => updateReference(index, 'phone', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              
              <Button variant="outline" onClick={addReference}>
                Add Another Reference
              </Button>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Previous
            </Button>
            <Button onClick={() => setCurrentStep(4)}>
              Next Step
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="step-4" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  'Business License',
                  'Tax Registration',
                  'Company Profile',
                  'Financial Statements',
                  'Certifications'
                ].map((docType) => (
                  <div key={docType} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{docType}</span>
                      {docType === 'Business License' && (
                        <Badge variant="default" className="ml-2">Required</Badge>
                      )}
                      {docType === 'Tax Registration' && (
                        <Badge variant="default" className="ml-2">Required</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {application.documents.some(doc => doc.type === docType) ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  All documents will be reviewed by our team. Please ensure all files are clear and up-to-date.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              Previous
            </Button>
            <Button 
              onClick={submitApplication}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const PartnerDashboard = () => (
    <div className="space-y-6">
      {/* Partner Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{partner?.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Crown className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tier</p>
                <p className="font-semibold capitalize">{partner?.tier}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commission Rate</p>
                <p className="font-semibold">{partner?.commissionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Key className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">API Access</p>
                <p className="font-semibold">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${partner?.metrics.totalSales.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{partner?.metrics.monthlyGrowth}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partner?.metrics.customerCount}</div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${partner?.metrics.averageOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {partner?.metrics.satisfaction}
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
            </div>
            <p className="text-xs text-muted-foreground">Customer rating</p>
          </CardContent>
        </Card>
      </div>

      {/* API Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h4 className="typography-h4 font-medium">Production API Key</h4>
              <p className="text-sm text-muted-foreground font-mono">
                {partner?.apiKey.slice(0, 20)}...
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button variant="outline" size="sm" onClick={generateApiKey}>
                <Key className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <p className="text-2xl font-bold">8,543</p>
              <p className="text-sm text-muted-foreground">API Calls This Month</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">99.8%</p>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">45ms</p>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {partner?.certifications.map((cert, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h4 className="typography-h4 font-medium">{cert.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Valid until {new Date(cert.validUntil).toLocaleDateString()}
                  </p>
                </div>
                <Badge 
                  variant={cert.status === 'active' ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  {cert.status === 'active' && <CheckCircle className="h-3 w-3" />}
                  {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                </Badge>
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
          <h2 className="typography-h2 tracking-tight flex items-center gap-2">
            <Store className="h-8 w-8 text-blue-600" />
            Partner Marketplace
          </h2>
          <p className="text-muted-foreground">
            {application.status === 'draft' || application.status === 'submitted' 
              ? 'Complete your partner application to join our marketplace'
              : 'Manage your partnership and track performance'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {application.country}
          </Badge>
          <Badge 
            variant={application.status === 'approved' ? 'default' : 'secondary'}
            className="flex items-center gap-1"
          >
            {application.status === 'approved' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Status Alert */}
      {application.status === 'submitted' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your application has been submitted and is under review. 
            You will receive an email notification within 5-7 business days.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="application">Application</TabsTrigger>
          <TabsTrigger value="dashboard" disabled={application.status !== 'approved'}>
            Partner Dashboard
          </TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="application">
          {application.status === 'approved' && partner ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Congratulations! Your partner application has been approved. 
                Access your partner dashboard to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <ApplicationForm />
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          {partner ? (
            <PartnerDashboard />
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Partner dashboard is only available after application approval.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Partner Handbook
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  API Documentation
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Product Catalog
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Marketing Materials
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="typography-h4 font-medium">Partner Support Team</h4>
                  <p className="text-sm text-muted-foreground">partners@almona.com</p>
                  <p className="text-sm text-muted-foreground">+20 100 555 0123</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="typography-h4 font-medium">Technical Support</h4>
                  <p className="text-sm text-muted-foreground">Available 24/7 for approved partners</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerOnboarding;
