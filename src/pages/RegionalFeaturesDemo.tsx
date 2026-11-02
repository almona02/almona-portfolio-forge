/**
 * Regional Features Demo Page
 * Showcases all implemented regional features including:
 * - Dynamic region detection
 * - Turkish market configuration
 * - Multi-currency support
 * - Interactive 3D models with pricing
 * - Turkish tax calculations
 * - Compliance documentation
 * - Turkish chat support
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegionDetection, useRegionUtils, useTurkishTaxUtils, useRegionalConfig } from '@/hooks/useRegionDetection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Separator } from '@/components/ui/separator';

// Import all regional components
import RegionAwareLayout from '@/components/layout/RegionAwareLayout';
import TurkishTaxCalculator from '@/components/regional/turkish/TurkishTaxCalculator';
import TurkishComplianceDocs from '@/components/regional/turkish/TurkishComplianceDocs';
import TurkishChatSupport from '@/components/regional/turkish/TurkishChatSupport';
import CurrencyConverter from '@/components/currency/CurrencyConverter';
import InteractiveModelDemo from '@/components/3d-model/InteractiveModelDemo';
import { withErrorBoundary } from '@/hocs/withErrorBoundary';

const RegionalFeaturesDemo: React.FC = () => {
  const { t } = useTranslation();
  const { regionState, setRegion, refreshRegion } = useRegionDetection();
  const utils = useRegionUtils();
  const turkishTaxUtils = useTurkishTaxUtils();
  const { config: _config } = useRegionalConfig();
  
  const [activeTab, setActiveTab] = useState('overview');

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion as 'TR' | 'EG' | 'DEFAULT');
  };

  return (
    <RegionAwareLayout showRegionalFeatures={true} enableRegionSwitching={true}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="typography-h1 text-foreground mb-4">
            {t('demo.regionalFeatures.title', 'Regional Features Demo')}
          </h1>
          <p className="text-foreground text-lg max-w-3xl mx-auto">
            {t('demo.regionalFeatures.subtitle', 'Comprehensive demonstration of Turkish and Egyptian market features including dynamic region detection, multi-currency support, tax calculations, and compliance documentation.')}
          </p>
        </div>

        {/* Current Region Status */}
        <Card className="bg-background border-border/20 mb-8">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center justify-between">
              <span>{t('demo.regionStatus.title', 'Current Region Status')}</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-amber-400 border-amber-400">
                  {regionState.region}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refreshRegion()}
                  className="border-border text-foreground hover:bg-muted"
                >
                  {t('demo.regionStatus.refresh', 'Refresh')}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {regionState.region === 'TR' ? '🇹🇷' : regionState.region === 'EG' ? '🇪🇬' : '🌍'}
                </div>
                <h3 className="typography-h3 text-foreground">
                  {regionState.region === 'TR' ? 'Turkey' : 
                   regionState.region === 'EG' ? 'Egypt' : 'International'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('demo.regionStatus.detectedBy', 'Detected by')}: {regionState.detectedBy}
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl mb-2">💱</div>
                <h3 className="typography-h3 text-foreground">
                  {_config.currency.symbol} {_config.currency.code}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('demo.regionStatus.currency', 'Currency')}
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <h3 className="typography-h3 text-foreground">
                  {_config.tax.vatRate * 100}% {_config.tax.vatName}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('demo.regionStatus.taxRate', 'Tax Rate')}
                </p>
              </div>
            </div>
            
            <Separator className="my-4 bg-muted" />
            
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => handleRegionChange('TR')}
                variant={regionState.region === 'TR' ? 'default' : 'outline'}
                className={regionState.region === 'TR' ? 'bg-amber-500 hover:bg-amber-600' : 'border-border text-foreground hover:bg-muted'}
              >
                🇹🇷 Turkey
              </Button>
              <Button
                onClick={() => handleRegionChange('EG')}
                variant={regionState.region === 'EG' ? 'default' : 'outline'}
                className={regionState.region === 'EG' ? 'bg-amber-500 hover:bg-amber-600' : 'border-border text-foreground hover:bg-muted'}
              >
                🇪🇬 Egypt
              </Button>
              <Button
                onClick={() => handleRegionChange('DEFAULT')}
                variant={regionState.region === 'DEFAULT' ? 'default' : 'outline'}
                className={regionState.region === 'DEFAULT' ? 'bg-amber-500 hover:bg-amber-600' : 'border-border text-foreground hover:bg-muted'}
              >
                🌍 International
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-card">
            <TabsTrigger value="overview" className="text-foreground data-[state=active]:text-foreground">
              {t('demo.tabs.overview', 'Overview')}
            </TabsTrigger>
            <TabsTrigger value="currency" className="text-foreground data-[state=active]:text-foreground">
              {t('demo.tabs.currency', 'Currency')}
            </TabsTrigger>
            <TabsTrigger value="3d" className="text-foreground data-[state=active]:text-foreground">
              {t('demo.tabs.3d', '3D Models')}
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-foreground data-[state=active]:text-foreground">
              {t('demo.tabs.compliance', 'Compliance')}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-background border-border/20">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    {t('demo.overview.regionDetection.title', 'Region Detection')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="typography-h4 text-foreground font-medium">
                      {t('demo.overview.regionDetection.currentRegion', 'Current Region')}
                    </h4>
                    <p className="text-foreground">
                      {regionState.region} - {t('demo.overview.regionDetection.detectedBy', 'Detected by')}: {regionState.detectedBy}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="typography-h4 text-foreground font-medium">
                      {t('demo.overview.regionDetection.features', 'Enabled Features')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(_config.features).map(([feature, enabled]) => (
                        <Badge
                          key={feature}
                          variant={enabled ? 'default' : 'secondary'}
                          className={enabled ? 'bg-green-500' : 'bg-muted'}
                        >
                          {feature}: {enabled ? '✓' : '✗'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="typography-h4 text-foreground font-medium">
                      {t('demo.overview.regionDetection.businessHours', 'Business Hours')}
                    </h4>
                    <p className="text-foreground">
                      {_config.business.workingHours.start} - {_config.business.workingHours.end} ({_config.business.workingHours.timezone})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {utils.isBusinessHours() ? t('demo.overview.regionDetection.open', 'Currently Open') : t('demo.overview.regionDetection.closed', 'Currently Closed')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background border-border/20">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    {t('demo.overview.turkishFeatures.title', 'Turkish Features')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {turkishTaxUtils.isTurkish ? (
                    <>
                      <div className="space-y-2">
                        <h4 className="typography-h4 text-foreground font-medium">
                          {t('demo.overview.turkishFeatures.kdv', 'KDV (VAT)')}
                        </h4>
                        <p className="text-foreground">
                          {turkishTaxUtils.kdvRate * 100}% {turkishTaxUtils.kdvName}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="typography-h4 text-foreground font-medium">
                          {t('demo.overview.turkishFeatures.currency', 'Currency Formatting')}
                        </h4>
                        <p className="text-foreground">
                          {turkishTaxUtils.formatTurkishCurrency(1234.56, { showSymbol: true })}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="typography-h4 text-foreground font-medium">
                          {t('demo.overview.turkishFeatures.compliance', 'Compliance Standards')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {_config.compliance.standards.map(standard => (
                            <Badge key={standard} variant="outline" className="text-info border-blue-400">
                              {standard}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      {t('demo.overview.turkishFeatures.notTurkish', 'Turkish features are only available when Turkey region is selected.')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Currency Tab */}
          <TabsContent value="currency" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CurrencyConverter 
                showRateInfo={true}
                autoDetectRegion={true}
              />
              
              {turkishTaxUtils.isTurkish && (
                <TurkishTaxCalculator />
              )}
            </div>
          </TabsContent>

          {/* 3D Models Tab */}
          <TabsContent value="3d" className="mt-6">
            <InteractiveModelDemo />
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {turkishTaxUtils.isTurkish && (
                <TurkishComplianceDocs />
              )}
              
              <Card className="bg-background border-border/20">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    {t('demo.compliance.standards.title', 'Compliance Standards')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="typography-h4 text-foreground font-medium mb-2">
                        {t('demo.compliance.standards.required', 'Required Standards')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {_config.compliance.standards.map(standard => (
                          <Badge key={standard} variant="outline" className="text-success border-green-400">
                            {standard}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="typography-h4 text-foreground font-medium mb-2">
                        {t('demo.compliance.standards.certifications', 'Certifications')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {_config.compliance.certifications.map(cert => (
                          <Badge key={cert} variant="outline" className="text-info border-blue-400">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="typography-h4 text-foreground font-medium mb-2">
                        {t('demo.compliance.standards.documents', 'Required Documents')}
                      </h4>
                      <ul className="text-foreground space-y-1">
                        {_config.compliance.documentation.required.map(doc => (
                          <li key={doc} className="flex items-center space-x-2">
                            <span className="text-success">✓</span>
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Turkish Chat Support */}
        {regionState.region === 'TR' && (
          <TurkishChatSupport />
        )}
      </div>
    </RegionAwareLayout>
  );
};

export default withErrorBoundary(RegionalFeaturesDemo);
