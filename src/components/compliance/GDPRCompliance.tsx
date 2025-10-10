import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Cookie,
  Eye,
  Download,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  Settings,
  Globe,
  Lock,
  UserCheck,
  ClipboardList,
  Mail,
  Calendar,
  X,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';

// GDPR Consent Types
export type ConsentType = 'essential' | 'analytics' | 'marketing' | 'personalization';

export interface ConsentSettings {
  essential: boolean;       // Always true - cannot be disabled
  analytics: boolean;       // Google Analytics, performance monitoring
  marketing: boolean;       // Email marketing, promotional cookies
  personalization: boolean; // User preferences, recommendation cookies
}

export interface DataProcessingRecord {
  id: string;
  type: 'personal_data' | 'usage_data' | 'technical_data' | 'communication';
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'legitimate_interest';
  retention: string;
  processor?: string;
  transfers?: string[];
  userConsent: boolean;
  consentDate?: Date;
}

export interface UserDataRequest {
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  description: string;
  requestId: string;
}

// Cookie consent banner
export const CookieConsentBanner: React.FC = () => {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [consents, setConsents] = useState<ConsentSettings>({
    essential: true,
    analytics: false,
    marketing: false,
    personalization: false
  });

  // Check if consent is already given
  useEffect(() => {
    const savedConsents = localStorage.getItem('gdpr-consent');
    if (!savedConsents) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(savedConsents);
        setConsents(parsed);
      } catch (error) {
        setShowBanner(true);
      }
    }
  }, []);

  const saveConsents = (consents: ConsentSettings) => {
    localStorage.setItem('gdpr-consent', JSON.stringify({
      ...consents,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }));

    // Apply consents to third-party services
    applyConsentSettings(consents);

    setShowBanner(false);
    setShowCustomize(false);
    
    toast.success(t('notifications.success.data_saved'));
  };

  const applyConsentSettings = (settings: ConsentSettings) => {
    // Google Analytics
    if (settings.analytics && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    } else if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied'
      });
    }

    // Marketing cookies
    if (!settings.marketing) {
      // Clear marketing cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    }
  };

  const acceptAll = () => {
    const allConsents: ConsentSettings = {
      essential: true,
      analytics: true,
      marketing: true,
      personalization: true
    };
    setConsents(allConsents);
    saveConsents(allConsents);
  };

  const rejectAll = () => {
    const minimalConsents: ConsentSettings = {
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false
    };
    setConsents(minimalConsents);
    saveConsents(minimalConsents);
  };

  const saveCustomConsents = () => {
    saveConsents(consents);
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-almona-dark/95 backdrop-blur-sm border-t border-almona-light/20"
      >
        <div className="container mx-auto">
          {!showCustomize ? (
            // Main consent banner
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Cookie className="h-6 w-6 text-almona-orange flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1">
                    {t('compliance.gdpr.cookie_consent')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('compliance.gdpr.data_protection')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomize(true)}
                  className="border-almona-light/30 text-xs"
                >
                  {t('compliance.gdpr.customize')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectAll}
                  className="border-gray-500/30 text-xs"
                >
                  {t('compliance.gdpr.decline')}
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="bg-almona-orange hover:bg-almona-orange-dark text-xs"
                >
                  {t('compliance.gdpr.accept')}
                </Button>
              </div>
            </div>
          ) : (
            // Detailed consent customization
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Cookie Preferences</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomize(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Essential Cookies */}
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium">{t('compliance.gdpr.essential')}</span>
                      </div>
                      <Switch checked={consents.essential} disabled />
                    </div>
                    <p className="text-xs text-gray-400">
                      Required for basic website functionality. Cannot be disabled.
                    </p>
                  </CardContent>
                </Card>

                {/* Analytics Cookies */}
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium">{t('compliance.gdpr.analytics')}</span>
                      </div>
                      <Switch 
                        checked={consents.analytics}
                        onCheckedChange={(checked) => setConsents(prev => ({ ...prev, analytics: checked }))}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Help us improve by analyzing usage patterns and performance.
                    </p>
                  </CardContent>
                </Card>

                {/* Marketing Cookies */}
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-medium">{t('compliance.gdpr.marketing')}</span>
                      </div>
                      <Switch 
                        checked={consents.marketing}
                        onCheckedChange={(checked) => setConsents(prev => ({ ...prev, marketing: checked }))}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Receive personalized offers and promotional content.
                    </p>
                  </CardContent>
                </Card>

                {/* Personalization Cookies */}
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-medium">Personalization</span>
                      </div>
                      <Switch 
                        checked={consents.personalization}
                        onCheckedChange={(checked) => setConsents(prev => ({ ...prev, personalization: checked }))}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Customize interface and recommendations based on preferences.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectAll}
                  className="border-gray-500/30"
                >
                  {t('compliance.gdpr.decline')} All
                </Button>
                <Button
                  size="sm"
                  onClick={saveCustomConsents}
                  className="bg-almona-orange hover:bg-almona-orange-dark"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// GDPR Data Management Dashboard
export const GDPRDataManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dataProcessing, setDataProcessing] = useState<DataProcessingRecord[]>([]);
  const [requests, setRequests] = useState<UserDataRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user's data processing records
  useEffect(() => {
    const fetchGDPRData = async () => {
      if (!user) return;

      try {
        // Fetch data processing records
        const mockDataProcessing: DataProcessingRecord[] = [
          {
            id: '1',
            type: 'personal_data',
            purpose: 'Account management and authentication',
            legalBasis: 'contract',
            retention: '7 years after account closure',
            userConsent: true,
            consentDate: new Date('2024-01-15')
          },
          {
            id: '2', 
            type: 'usage_data',
            purpose: 'Website analytics and performance optimization',
            legalBasis: 'consent',
            retention: '2 years',
            processor: 'Google Analytics',
            userConsent: false
          },
          {
            id: '3',
            type: 'technical_data',
            purpose: 'IoT sensor data and machine monitoring',
            legalBasis: 'contract',
            retention: '5 years for maintenance history',
            userConsent: true,
            consentDate: new Date('2024-02-20')
          },
          {
            id: '4',
            type: 'communication',
            purpose: 'Email notifications and technical support',
            legalBasis: 'consent',
            retention: '3 years or until consent withdrawn',
            userConsent: true,
            consentDate: new Date('2024-01-15')
          }
        ];

        setDataProcessing(mockDataProcessing);

        // Fetch user requests
        const { data: userRequests } = await supabase
          .from('gdpr_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('request_date', { ascending: false });

        setRequests(userRequests || []);
        
      } catch (error) {
        console.error('Failed to fetch GDPR data:', error);
        toast.error('Failed to load data processing information');
      } finally {
        setLoading(false);
      }
    };

    fetchGDPRData();
  }, [user]);

  // Submit data request
  const submitDataRequest = async (type: UserDataRequest['type'], description: string) => {
    if (!user) return;

    try {
      const request: Omit<UserDataRequest, 'requestId'> = {
        type,
        status: 'pending',
        requestDate: new Date(),
        description
      };

      const { data, error } = await supabase
        .from('gdpr_requests')
        .insert({
          user_id: user.id,
          request_type: request.type,
          status: request.status,
          request_date: request.requestDate.toISOString(),
          description: request.description
        })
        .select()
        .single();

      if (error) throw error;

      setRequests(prev => [{ ...request, requestId: data.id }, ...prev]);
      toast.success('Data request submitted successfully');

    } catch (error) {
      console.error('Failed to submit data request:', error);
      toast.error('Failed to submit data request');
    }
  };

  // Withdraw consent
  const withdrawConsent = async (recordId: string) => {
    try {
      // Update consent in database
      await supabase
        .from('consent_records')
        .update({
          consent_withdrawn: true,
          withdrawal_date: new Date().toISOString()
        })
        .eq('id', recordId)
        .eq('user_id', user?.id);

      // Update local state
      setDataProcessing(prev => 
        prev.map(record => 
          record.id === recordId 
            ? { ...record, userConsent: false }
            : record
        )
      );

      toast.success('Consent withdrawn successfully');

    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      toast.error('Failed to withdraw consent');
    }
  };

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case 'personal_data': return <UserCheck className="h-4 w-4 text-blue-400" />;
      case 'usage_data': return <Eye className="h-4 w-4 text-green-400" />;
      case 'technical_data': return <Settings className="h-4 w-4 text-purple-400" />;
      case 'communication': return <Mail className="h-4 w-4 text-orange-400" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getLegalBasisBadge = (basis: string) => {
    const styles = {
      consent: 'bg-green-500/20 text-green-300 border-green-500/50',
      contract: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      legal_obligation: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
      legitimate_interest: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
    };

    return (
      <Badge className={styles[basis]} variant="secondary">
        {basis.replace('_', ' ')}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      processing: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      completed: 'bg-green-500/20 text-green-300 border-green-500/50',
      rejected: 'bg-red-500/20 text-red-300 border-red-500/50'
    };

    return (
      <Badge className={styles[status]} variant="secondary">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="bg-almona-dark/60 border-almona-light/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-almona-orange" />
            GDPR Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-almona-orange"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* GDPR Overview */}
      <Card className="bg-almona-dark/60 border-almona-light/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-almona-orange" />
            {t('compliance.gdpr.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-almona-dark/40 rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <div className="font-medium">Data Protection</div>
              <div className="text-sm text-gray-400">GDPR Compliant</div>
            </div>
            <div className="text-center p-4 bg-almona-dark/40 rounded-lg">
              <Lock className="h-8 w-8 mx-auto mb-2 text-blue-400" />
              <div className="font-medium">Encrypted Storage</div>
              <div className="text-sm text-gray-400">AES-256 Encryption</div>
            </div>
            <div className="text-center p-4 bg-almona-dark/40 rounded-lg">
              <Globe className="h-8 w-8 mx-auto mb-2 text-purple-400" />
              <div className="font-medium">EU Data Centers</div>
              <div className="text-sm text-gray-400">Data Residency</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Processing Records */}
      <Card className="bg-almona-dark/60 border-almona-light/20">
        <CardHeader>
          <CardTitle>Your Data Processing Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataProcessing.map((record) => (
              <div key={record.id} className="p-4 border border-almona-light/20 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getDataTypeIcon(record.type)}
                    <div>
                      <h4 className="font-medium capitalize">{record.type.replace('_', ' ')}</h4>
                      <p className="text-sm text-gray-400">{record.purpose}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getLegalBasisBadge(record.legalBasis)}
                    {record.userConsent ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Retention Period:</span>
                    <span className="ml-2">{record.retention}</span>
                  </div>
                  {record.processor && (
                    <div>
                      <span className="text-gray-400">Processor:</span>
                      <span className="ml-2">{record.processor}</span>
                    </div>
                  )}
                  {record.consentDate && (
                    <div>
                      <span className="text-gray-400">Consent Given:</span>
                      <span className="ml-2">{record.consentDate.toLocaleDateString()}</span>
                    </div>
                  )}
                  {record.transfers && record.transfers.length > 0 && (
                    <div>
                      <span className="text-gray-400">Data Transfers:</span>
                      <span className="ml-2">{record.transfers.join(', ')}</span>
                    </div>
                  )}
                </div>

                {record.userConsent && record.legalBasis === 'consent' && (
                  <div className="mt-3 pt-3 border-t border-almona-light/10">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => withdrawConsent(record.id)}
                      className="text-red-400 border-red-500/30 hover:bg-red-500/20"
                    >
                      {t('compliance.gdpr.consent_withdrawal')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Rights Actions */}
      <Card className="bg-almona-dark/60 border-almona-light/20">
        <CardHeader>
          <CardTitle>Your Data Rights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                type: 'access' as const,
                title: 'Access My Data',
                description: 'Download all personal data we have about you',
                icon: <Download className="h-5 w-5 text-blue-400" />
              },
              {
                type: 'rectification' as const,
                title: 'Correct My Data',
                description: 'Update or correct your personal information',
                icon: <Settings className="h-5 w-5 text-green-400" />
              },
              {
                type: 'erasure' as const,
                title: 'Delete My Data',
                description: 'Request deletion of your personal data',
                icon: <Trash2 className="h-5 w-5 text-red-400" />
              },
              {
                type: 'portability' as const,
                title: 'Export My Data',
                description: 'Export your data in machine-readable format',
                icon: <ExternalLink className="h-5 w-5 text-purple-400" />
              },
              {
                type: 'restriction' as const,
                title: 'Restrict Processing',
                description: 'Limit how we process your data',
                icon: <Lock className="h-5 w-5 text-yellow-400" />
              },
              {
                type: 'objection' as const,
                title: 'Object to Processing',
                description: 'Object to specific data processing activities',
                icon: <AlertCircle className="h-5 w-5 text-orange-400" />
              }
            ].map((action) => (
              <Card key={action.type} className="bg-almona-dark/40 border-almona-light/20 hover:border-almona-orange/50 transition-colors cursor-pointer">
                <CardContent className="p-4 text-center">
                  <div className="mb-3">{action.icon}</div>
                  <h4 className="font-medium mb-2">{action.title}</h4>
                  <p className="text-xs text-gray-400 mb-3">{action.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const description = prompt(`Please describe your ${action.type} request:`);
                      if (description) {
                        submitDataRequest(action.type, description);
                      }
                    }}
                    className="border-almona-light/30 hover:bg-almona-orange/20"
                  >
                    Submit Request
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      {requests.length > 0 && (
        <Card className="bg-almona-dark/60 border-almona-light/20">
          <CardHeader>
            <CardTitle>Your Data Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.requestId} className="flex items-center justify-between p-3 bg-almona-dark/40 rounded-lg">
                  <div>
                    <div className="font-medium capitalize">{request.type.replace('_', ' ')} Request</div>
                    <div className="text-sm text-gray-400">{request.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Submitted: {request.requestDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(request.status)}
                    <div className="text-xs text-gray-500 mt-1">
                      ID: {request.requestId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal Documents */}
      <Card className="bg-almona-dark/60 border-almona-light/20">
        <CardHeader>
          <CardTitle>Legal Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 border-almona-light/30 hover:bg-almona-orange/20 text-left justify-start"
              onClick={() => window.open('/legal/privacy-policy.pdf', '_blank')}
            >
              <FileText className="h-5 w-5 mr-3 flex-shrink-0" />
              <div>
                <div className="font-medium">{t('compliance.gdpr.privacy_policy')}</div>
                <div className="text-xs text-gray-400">Last updated: December 2024</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 border-almona-light/30 hover:bg-almona-orange/20 text-left justify-start"
              onClick={() => window.open('/legal/terms-of-service.pdf', '_blank')}
            >
              <ClipboardList className="h-5 w-5 mr-3 flex-shrink-0" />
              <div>
                <div className="font-medium">{t('compliance.gdpr.terms_of_service')}</div>
                <div className="text-xs text-gray-400">Version 2.1 - December 2024</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 border-almona-light/30 hover:bg-almona-orange/20 text-left justify-start"
              onClick={() => window.open('/legal/cookie-policy.pdf', '_blank')}
            >
              <Cookie className="h-5 w-5 mr-3 flex-shrink-0" />
              <div>
                <div className="font-medium">Cookie Policy</div>
                <div className="text-xs text-gray-400">Details about cookie usage</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 border-almona-light/30 hover:bg-almona-orange/20 text-left justify-start"
              onClick={() => window.open('/legal/data-processing-agreement.pdf', '_blank')}
            >
              <Shield className="h-5 w-5 mr-3 flex-shrink-0" />
              <div>
                <div className="font-medium">Data Processing Agreement</div>
                <div className="text-xs text-gray-400">GDPR compliance documentation</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// CE Certification Tracking
export const CECertificationTracker: React.FC = () => {
  const [certifications, setCertifications] = useState([
    {
      id: '1',
      product: 'YILMAZ AIM 7420',
      standard: 'EN ISO 12100:2010',
      status: 'valid',
      issueDate: '2023-06-15',
      expiryDate: '2026-06-15',
      certificate_number: 'CE-2023-AIM7420-001',
      notified_body: 'TÜV SÜD Product Service GmbH'
    },
    {
      id: '2',
      product: 'YILMAZ CDC 600',
      standard: 'EN 60204-1:2018',
      status: 'expiring_soon',
      issueDate: '2022-09-20',
      expiryDate: '2025-01-20',
      certificate_number: 'CE-2022-CDC600-002',
      notified_body: 'Bureau Veritas'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'expiring_soon': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'expired': return 'bg-red-500/20 text-red-300 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  return (
    <Card className="bg-almona-dark/60 border-almona-light/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-almona-orange" />
          CE Certification Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {certifications.map((cert) => (
            <div key={cert.id} className="p-4 border border-almona-light/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{cert.product}</h4>
                <Badge className={getStatusColor(cert.status)} variant="secondary">
                  {cert.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Standard:</span>
                  <span className="ml-2">{cert.standard}</span>
                </div>
                <div>
                  <span className="text-gray-400">Certificate:</span>
                  <span className="ml-2">{cert.certificate_number}</span>
                </div>
                <div>
                  <span className="text-gray-400">Issued:</span>
                  <span className="ml-2">{new Date(cert.issueDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Expires:</span>
                  <span className={`ml-2 ${cert.status === 'expiring_soon' ? 'text-yellow-400' : ''}`}>
                    {new Date(cert.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Notified Body: {cert.notified_body}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export { CookieConsentBanner, GDPRDataManagement, CECertificationTracker };