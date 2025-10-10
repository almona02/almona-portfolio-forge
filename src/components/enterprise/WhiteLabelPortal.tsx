import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Palette,
  Upload,
  Eye,
  Settings,
  Building2,
  Users,
  BarChart3,
  Globe,
  Shield,
  Zap,
  Crown,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
  Type,
  Layout,
  Smartphone,
  Monitor,
  Save,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { track } from '@/lib/analytics';

// White Label Configuration Types
interface BrandingConfig {
  companyName: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCSS?: string;
}

interface TenantConfig {
  id: string;
  name: string;
  domain: string;
  branding: BrandingConfig;
  features: {
    analytics: boolean;
    multiLanguage: boolean;
    customDomain: boolean;
    advancedReports: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
  };
  limits: {
    users: number;
    storage: number; // GB
    apiCalls: number;
    customReports: number;
  };
  subscription: {
    plan: 'basic' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'trial';
    expiresAt: string;
  };
}

// Mock tenant data - replace with real API calls
const mockTenantConfig: TenantConfig = {
  id: 'tenant-001',
  name: 'Hassan Aluminum Works',
  domain: 'hassan-aluminum.almona.com',
  branding: {
    companyName: 'Hassan Aluminum Works',
    logo: '/logos/hassan-aluminum-logo.png',
    favicon: '/favicons/hassan-aluminum.ico',
    primaryColor: '#1B4332',
    secondaryColor: '#2D6A4F',
    accentColor: '#FF6B35',
    fontFamily: 'Inter'
  },
  features: {
    analytics: true,
    multiLanguage: true,
    customDomain: true,
    advancedReports: true,
    apiAccess: true,
    whiteLabel: true
  },
  limits: {
    users: 50,
    storage: 100,
    apiCalls: 10000,
    customReports: 25
  },
  subscription: {
    plan: 'enterprise',
    status: 'active',
    expiresAt: '2024-12-31T23:59:59Z'
  }
};

/**
 * White Label Portal Component
 * 
 * Enterprise portal for white-label customization and tenant management.
 * Features:
 * - Custom branding and theming
 * - Multi-tenant configuration
 * - Feature management and limits
 * - Real-time preview
 * - Subscription management
 * - Analytics and reporting
 * - Domain and SSL management
 */
export const WhiteLabelPortal: React.FC = () => {
  const { t } = useTranslation();
  const [tenantConfig, setTenantConfig] = useState<TenantConfig>(mockTenantConfig);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState('branding');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    track('white_label_portal_viewed', {
      tenantId: tenantConfig.id,
      plan: tenantConfig.subscription.plan,
      timestamp: Date.now()
    });
  }, [tenantConfig.id, tenantConfig.subscription.plan]);

  const handleBrandingChange = (field: keyof BrandingConfig, value: string) => {
    setTenantConfig(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleFeatureToggle = (feature: keyof TenantConfig['features'], enabled: boolean) => {
    setTenantConfig(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: enabled
      }
    }));
    setHasChanges(true);
  };

  const saveConfiguration = async () => {
    setSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setHasChanges(false);
    setSaving(false);
    
    track('white_label_config_saved', {
      tenantId: tenantConfig.id,
      changes: Object.keys(tenantConfig.branding),
      timestamp: Date.now()
    });
  };

  const resetToDefaults = () => {
    setTenantConfig(mockTenantConfig);
    setHasChanges(true);
  };

  const ColorPicker: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
  }> = ({ label, value, onChange }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 p-1 border rounded"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
          placeholder="#000000"
        />
      </div>
    </div>
  );

  const FeatureCard: React.FC<{
    title: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    icon: React.ReactNode;
    premium?: boolean;
  }> = ({ title, description, enabled, onToggle, icon, premium = false }) => (
    <Card className={`transition-all ${enabled ? 'ring-2 ring-blue-200' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{title}</h3>
                {premium && <Crown className="h-4 w-4 text-yellow-500" />}
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={premium && tenantConfig.subscription.plan === 'basic'}
          />
        </div>
      </CardContent>
    </Card>
  );

  const PreviewFrame = () => (
    <div className="border rounded-lg bg-white">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-xs text-gray-600">{tenantConfig.domain}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={previewMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('tablet')}
          >
            <Layout className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div 
        className={`p-6 transition-all ${
          previewMode === 'mobile' ? 'max-w-sm' : 
          previewMode === 'tablet' ? 'max-w-2xl' : 'w-full'
        }`}
        style={{
          '--primary-color': tenantConfig.branding.primaryColor,
          '--secondary-color': tenantConfig.branding.secondaryColor,
          '--accent-color': tenantConfig.branding.accentColor,
          fontFamily: tenantConfig.branding.fontFamily
        } as React.CSSProperties}
      >
        {/* Mock website preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6" style={{ color: tenantConfig.branding.primaryColor }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: tenantConfig.branding.primaryColor }}>
                {tenantConfig.branding.companyName}
              </h1>
              <p className="text-sm text-gray-600">Industrial Equipment Solutions</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div 
              className="p-3 rounded-lg text-white text-center"
              style={{ backgroundColor: tenantConfig.branding.primaryColor }}
            >
              <h3 className="font-medium">Products</h3>
            </div>
            <div 
              className="p-3 rounded-lg text-white text-center"
              style={{ backgroundColor: tenantConfig.branding.secondaryColor }}
            >
              <h3 className="font-medium">Services</h3>
            </div>
            <div 
              className="p-3 rounded-lg text-white text-center"
              style={{ backgroundColor: tenantConfig.branding.accentColor }}
            >
              <h3 className="font-medium">Contact</h3>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Welcome to Our Platform</h3>
            <p className="text-sm text-gray-600 mb-3">
              Discover our comprehensive range of industrial equipment and services.
            </p>
            <button 
              className="px-4 py-2 rounded text-white text-sm"
              style={{ backgroundColor: tenantConfig.branding.accentColor }}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            White Label Portal
          </h2>
          <p className="text-muted-foreground">
            Customize your platform branding and manage enterprise settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {tenantConfig.subscription.plan.charAt(0).toUpperCase() + tenantConfig.subscription.plan.slice(1)}
          </Badge>
          <Badge 
            variant={tenantConfig.subscription.status === 'active' ? 'default' : 'secondary'}
            className="flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" />
            {tenantConfig.subscription.status.charAt(0).toUpperCase() + tenantConfig.subscription.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Save Changes Alert */}
      {hasChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes to your configuration.</span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={saveConfiguration}
                disabled={saving}
                className="flex items-center gap-1"
              >
                {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetToDefaults}>
                Reset
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
              <TabsTrigger value="domain">Domain</TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Brand Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={tenantConfig.branding.companyName}
                      onChange={(e) => handleBrandingChange('companyName', e.target.value)}
                      placeholder="Your Company Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={tenantConfig.branding.logo}
                        onChange={(e) => handleBrandingChange('logo', e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="flex-1"
                      />
                      <Button variant="outline" size="icon">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <ColorPicker
                    label="Primary Color"
                    value={tenantConfig.branding.primaryColor}
                    onChange={(value) => handleBrandingChange('primaryColor', value)}
                  />

                  <ColorPicker
                    label="Secondary Color"
                    value={tenantConfig.branding.secondaryColor}
                    onChange={(value) => handleBrandingChange('secondaryColor', value)}
                  />

                  <ColorPicker
                    label="Accent Color"
                    value={tenantConfig.branding.accentColor}
                    onChange={(value) => handleBrandingChange('accentColor', value)}
                  />

                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select
                      value={tenantConfig.branding.fontFamily}
                      onValueChange={(value) => handleBrandingChange('fontFamily', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Open Sans">Open Sans</SelectItem>
                        <SelectItem value="Poppins">Poppins</SelectItem>
                        <SelectItem value="Montserrat">Montserrat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Custom CSS</Label>
                    <Textarea
                      value={tenantConfig.branding.customCSS || ''}
                      onChange={(e) => handleBrandingChange('customCSS', e.target.value)}
                      placeholder="/* Custom CSS rules */"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <div className="space-y-3">
                <FeatureCard
                  title="Advanced Analytics"
                  description="Detailed business intelligence and reporting"
                  enabled={tenantConfig.features.analytics}
                  onToggle={(enabled) => handleFeatureToggle('analytics', enabled)}
                  icon={<BarChart3 className="h-4 w-4" />}
                  premium
                />

                <FeatureCard
                  title="Multi-Language Support"
                  description="Support for multiple languages and locales"
                  enabled={tenantConfig.features.multiLanguage}
                  onToggle={(enabled) => handleFeatureToggle('multiLanguage', enabled)}
                  icon={<Globe className="h-4 w-4" />}
                />

                <FeatureCard
                  title="Custom Domain"
                  description="Use your own domain name"
                  enabled={tenantConfig.features.customDomain}
                  onToggle={(enabled) => handleFeatureToggle('customDomain', enabled)}
                  icon={<Globe className="h-4 w-4" />}
                  premium
                />

                <FeatureCard
                  title="Advanced Reports"
                  description="Custom reporting and data export"
                  enabled={tenantConfig.features.advancedReports}
                  onToggle={(enabled) => handleFeatureToggle('advancedReports', enabled)}
                  icon={<BarChart3 className="h-4 w-4" />}
                  premium
                />

                <FeatureCard
                  title="API Access"
                  description="Full API access for integrations"
                  enabled={tenantConfig.features.apiAccess}
                  onToggle={(enabled) => handleFeatureToggle('apiAccess', enabled)}
                  icon={<Zap className="h-4 w-4" />}
                  premium
                />

                <FeatureCard
                  title="White Label"
                  description="Remove Almona branding completely"
                  enabled={tenantConfig.features.whiteLabel}
                  onToggle={(enabled) => handleFeatureToggle('whiteLabel', enabled)}
                  icon={<Crown className="h-4 w-4" />}
                  premium
                />
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Usage & Limits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Users</span>
                      <span className="text-sm font-medium">25 / {tenantConfig.limits.users}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Storage</span>
                      <span className="text-sm font-medium">45 GB / {tenantConfig.limits.storage} GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Calls (Monthly)</span>
                      <span className="text-sm font-medium">3,456 / {tenantConfig.limits.apiCalls.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Custom Reports</span>
                      <span className="text-sm font-medium">8 / {tenantConfig.limits.customReports}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="domain" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Domain Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Domain</Label>
                    <Input value={tenantConfig.domain} readOnly />
                  </div>

                  <div className="space-y-2">
                    <Label>Custom Domain</Label>
                    <Input placeholder="your-domain.com" />
                    <p className="text-xs text-muted-foreground">
                      Contact support to configure your custom domain
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SSL Certificate</span>
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">CDN Enabled</span>
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </h3>
            <Badge variant="outline">
              {previewMode.charAt(0).toUpperCase() + previewMode.slice(1)}
            </Badge>
          </div>
          
          <PreviewFrame />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Subscription Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <span className="font-medium">{tenantConfig.subscription.plan.charAt(0).toUpperCase() + tenantConfig.subscription.plan.slice(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant={tenantConfig.subscription.status === 'active' ? 'default' : 'secondary'}>
                    {tenantConfig.subscription.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span className="font-medium">
                    {new Date(tenantConfig.subscription.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WhiteLabelPortal;