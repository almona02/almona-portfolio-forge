import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Download,
  Trash2,
  Eye,
  Settings,
  Info,
  CheckCircle,
  AlertTriangle,
  Cookie,
  Database,
  FileText,
  Lock,
  UserCheck,
  Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { track } from '@/lib/analytics';

// GDPR Consent Types
interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  personalization: boolean;
}

interface GDPRData {
  personalData: {
    profile: any;
    orders: any[];
    quotes: any[];
    preferences: any;
  };
  consentHistory: Array<{
    timestamp: string;
    consents: ConsentPreferences;
    version: string;
  }>;
  dataProcessing: Array<{
    purpose: string;
    legalBasis: string;
    retention: string;
    categories: string[];
  }>;
}

// Mock data - replace with real API calls
const mockGDPRData: GDPRData = {
  personalData: {
    profile: {
      name: 'Ahmed Hassan',
      email: 'ahmed.hassan@example.com',
      company: 'Hassan Aluminum Works',
      phone: '+20 100 123 4567',
      address: 'Cairo, Egypt'
    },
    orders: [
      { id: 'ORD-2024-001', date: '2024-01-15', total: 15000 },
      { id: 'ORD-2024-002', date: '2024-02-20', total: 23000 }
    ],
    quotes: [
      { id: 'QUO-2024-003', date: '2024-03-10', status: 'pending' }
    ],
    preferences: {
      language: 'en',
      currency: 'EGP',
      notifications: true
    }
  },
  consentHistory: [
    {
      timestamp: '2024-01-15T10:30:00Z',
      consents: {
        necessary: true,
        analytics: true,
        marketing: false,
        functional: true,
        personalization: true
      },
      version: '1.0'
    }
  ],
  dataProcessing: [
    {
      purpose: 'Order Processing',
      legalBasis: 'Contract Performance',
      retention: '7 years',
      categories: ['Contact Information', 'Order History', 'Payment Data']
    },
    {
      purpose: 'Marketing Communications',
      legalBasis: 'Consent',
      retention: 'Until consent withdrawn',
      categories: ['Contact Information', 'Preferences']
    },
    {
      purpose: 'Website Analytics',
      legalBasis: 'Legitimate Interest',
      retention: '26 months',
      categories: ['Usage Data', 'Technical Data']
    }
  ]
};

/**
 * GDPR Compliance Component
 * 
 * Comprehensive GDPR compliance management for EU market entry.
 * Features:
 * - Cookie consent management
 * - Data subject rights (access, portability, erasure)
 * - Consent history tracking
 * - Privacy settings management
 * - Data processing transparency
 * - Legal basis documentation
 */
export const GDPRCompliance: React.FC = () => {
  const { t } = useTranslation();
  const [gdprData, setGdprData] = useState<GDPRData>(mockGDPRData);
  const [consents, setConsents] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
    personalization: false
  });
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check if user has provided consent
    const savedConsents = localStorage.getItem('gdpr-consents');
    if (!savedConsents) {
      setShowConsentBanner(true);
    } else {
      setConsents(JSON.parse(savedConsents));
    }

    // Track GDPR compliance page view
    track('gdpr_compliance_viewed', {
      timestamp: Date.now(),
      hasConsent: !!savedConsents
    });
  }, []);

  const handleConsentChange = (type: keyof ConsentPreferences, value: boolean) => {
    const newConsents = { ...consents, [type]: value };
    setConsents(newConsents);
  };

  const saveConsents = () => {
    localStorage.setItem('gdpr-consents', JSON.stringify(consents));
    localStorage.setItem('gdpr-consent-date', new Date().toISOString());
    
    // Record consent in history
    const newConsentRecord = {
      timestamp: new Date().toISOString(),
      consents,
      version: '1.0'
    };
    
    setGdprData(prev => ({
      ...prev,
      consentHistory: [newConsentRecord, ...prev.consentHistory]
    }));
    
    setShowConsentBanner(false);
    
    track('gdpr_consent_updated', {
      consents,
      timestamp: Date.now()
    });
  };

  const exportData = async () => {
    const exportData = {
      personalData: gdprData.personalData,
      consentHistory: gdprData.consentHistory,
      exportDate: new Date().toISOString(),
      format: 'JSON'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `almona-gdpr-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    track('gdpr_data_exported', {
      timestamp: Date.now(),
      format: 'JSON'
    });
  };

  const requestDataDeletion = async () => {
    if (confirm(t('gdpr.deleteConfirmation', 'Are you sure you want to delete all your personal data? This action cannot be undone.'))) {
      // In real implementation, this would call an API
      alert(t('gdpr.deletionRequested', 'Data deletion request submitted. You will receive confirmation within 30 days.'));
      
      track('gdpr_data_deletion_requested', {
        timestamp: Date.now()
      });
    }
  };

  const ConsentBanner = () => (
    showConsentBanner && (
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Cookie className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Cookie & Privacy Settings</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                We use cookies to enhance your experience and analyze site usage. 
                You can customize your preferences or accept all cookies.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="necessary"
                    checked={consents.necessary}
                    disabled
                  />
                  <label htmlFor="necessary" className="text-xs font-medium">
                    Necessary
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="analytics"
                    checked={consents.analytics}
                    onCheckedChange={(checked) => handleConsentChange('analytics', !!checked)}
                  />
                  <label htmlFor="analytics" className="text-xs font-medium">
                    Analytics
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketing"
                    checked={consents.marketing}
                    onCheckedChange={(checked) => handleConsentChange('marketing', !!checked)}
                  />
                  <label htmlFor="marketing" className="text-xs font-medium">
                    Marketing
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="functional"
                    checked={consents.functional}
                    onCheckedChange={(checked) => handleConsentChange('functional', !!checked)}
                  />
                  <label htmlFor="functional" className="text-xs font-medium">
                    Functional
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="personalization"
                    checked={consents.personalization}
                    onCheckedChange={(checked) => handleConsentChange('personalization', !!checked)}
                  />
                  <label htmlFor="personalization" className="text-xs font-medium">
                    Personalization
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={saveConsents} className="bg-blue-600 hover:bg-blue-700">
                Save Preferences
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setConsents({
                    necessary: true,
                    analytics: true,
                    marketing: true,
                    functional: true,
                    personalization: true
                  });
                  setTimeout(saveConsents, 100);
                }}
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  return (
    <>
      <ConsentBanner />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              GDPR Compliance
            </h2>
            <p className="text-muted-foreground">
              Manage your privacy settings and data protection rights
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              EU Compliant
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Active
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-sm">View My Data</h3>
                  <p className="text-xs text-muted-foreground">See what we know</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Download className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-sm">Export Data</h3>
                  <p className="text-xs text-muted-foreground">Download your info</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-sm">Privacy Settings</h3>
                  <p className="text-xs text-muted-foreground">Control permissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Trash2 className="h-8 w-8 text-red-600" />
                <div>
                  <h3 className="font-semibold text-sm">Delete Data</h3>
                  <p className="text-xs text-muted-foreground">Remove my info</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed GDPR Management */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">My Data</TabsTrigger>
            <TabsTrigger value="consents">Consents</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="rights">Your Rights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Consent Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(consents).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{key}</span>
                        <Badge variant={value ? "default" : "secondary"}>
                          {value ? "Granted" : "Denied"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Profile Data</span>
                      <Badge variant="outline">5 fields</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Order History</span>
                      <Badge variant="outline">{gdprData.personalData.orders.length} records</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quotes</span>
                      <Badge variant="outline">{gdprData.personalData.quotes.length} records</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Consent Records</span>
                      <Badge variant="outline">{gdprData.consentHistory.length} versions</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your data is processed in accordance with GDPR regulations. 
                You have full control over your personal information and can exercise your rights at any time.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(gdprData.personalData.profile).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm font-medium capitalize">{key}:</span>
                        <span className="text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button onClick={exportData} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export All Data
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={requestDataDeletion}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Request Deletion
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="consents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Consent Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(consents).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium capitalize">{key} Cookies</h4>
                        <p className="text-xs text-muted-foreground">
                          {key === 'necessary' && 'Required for basic site functionality'}
                          {key === 'analytics' && 'Help us understand how you use our site'}
                          {key === 'marketing' && 'Used to show relevant advertisements'}
                          {key === 'functional' && 'Enable enhanced features and functionality'}
                          {key === 'personalization' && 'Customize your experience'}
                        </p>
                      </div>
                      <Checkbox
                        checked={value}
                        disabled={key === 'necessary'}
                        onCheckedChange={(checked) => handleConsentChange(key as keyof ConsentPreferences, !!checked)}
                      />
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <Button onClick={saveConsents}>Update Preferences</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consent History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gdprData.consentHistory.map((record, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </span>
                        <Badge variant="outline">v{record.version}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Consents: {Object.entries(record.consents)
                          .filter(([_, value]) => value)
                          .map(([key]) => key)
                          .join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <div className="space-y-4">
              {gdprData.dataProcessing.map((processing, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{processing.purpose}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <span className="text-sm font-medium">Legal Basis:</span>
                        <p className="text-sm">{processing.legalBasis}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Retention Period:</span>
                        <p className="text-sm">{processing.retention}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-sm font-medium">Data Categories:</span>
                      <div className="flex gap-2 mt-1">
                        {processing.categories.map((category) => (
                          <Badge key={category} variant="outline">{category}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rights" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Right to Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    You have the right to know what personal data we hold about you.
                  </p>
                  <Button variant="outline" size="sm">Request Access</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Right to Portability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    You can receive your personal data in a structured format.
                  </p>
                  <Button variant="outline" size="sm" onClick={exportData}>
                    Export Data
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Right to Rectification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    You can request correction of inaccurate personal data.
                  </p>
                  <Button variant="outline" size="sm">Request Correction</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Right to Erasure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    You can request deletion of your personal data in certain circumstances.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={requestDataDeletion}
                  >
                    Request Deletion
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                For any data protection concerns or to exercise your rights, 
                contact our Data Protection Officer at privacy@almona.com
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default GDPRCompliance;