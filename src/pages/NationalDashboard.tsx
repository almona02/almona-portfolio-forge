import React from 'react';
import { Helmet } from 'react-helmet-async';
import { NationalImpactSection } from '@/components/home/NationalImpactSection';
import { EgyptVision2030Section } from '@/components/home/EgyptVision2030Section';
import { NationalServicePledge } from '@/components/national/NationalServicePledge';
import { ImportSubstitutionMeter } from '@/components/national/ImportSubstitutionMeter';
import { BuildingCodeValidator } from '@/components/national/BuildingCodeValidator';
import { NationalManufacturingDashboard } from '@/components/national/NationalManufacturingDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  TrendingUp, 
  Building2, 
  Shield, 
  FileText, 
  Download,
  Calendar,
  MapPin
} from 'lucide-react';

const NationalDashboard: React.FC = () => {
  // Demo data - would come from API in production
  const importSubstitutionData = {
    savedUSD: 2147500,
    exchangeRate: 48.50,
    materialTons: 847.3
  };

  return (
    <>
      <Helmet>
        <title>National Service Dashboard | Egypt Vision 2030 | Almona</title>
        <meta name="description" content="Strategic dashboard for tracking Egypt's industrial transformation progress aligned with Vision 2030." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Hero Header */}
        <div className="relative overflow-hidden border-b border-slate-800">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 py-12 relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/20">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold rounded-full mb-1">
                      🇪🇬 GOVERNMENT PORTAL
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      National Service Dashboard
                    </h1>
                  </div>
                </div>
                <p className="text-slate-400 text-lg max-w-2xl">
                  Strategic overview of Almona's contribution to <span className="text-orange-400 font-semibold">Egypt Vision 2030</span> and national industrial digitization initiatives.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Q4 2024 Report
                </Button>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { label: 'Pilot Workshops', value: '15', icon: Building2, trend: '+3 this month' },
                { label: 'USD Saved', value: '$2.1M', icon: TrendingUp, trend: '+12% MoM' },
                { label: 'Certificates Issued', value: '47', icon: FileText, trend: 'Digital Fabricators' },
                { label: 'Active Regions', value: '6', icon: MapPin, trend: 'Governorates' },
              ].map((stat, index) => (
                <div 
                  key={index}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-orange-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="h-4 w-4 text-orange-400" />
                    <span className="text-xs text-slate-500 uppercase tracking-wide">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="impact"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"
              >
                National Impact
              </TabsTrigger>
              <TabsTrigger 
                value="compliance"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"
              >
                Compliance
              </TabsTrigger>
              <TabsTrigger 
                value="pledge"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"
              >
                Our Pledge
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <NationalManufacturingDashboard />
                </div>
                <div>
                  <ImportSubstitutionMeter 
                    savedUSD={importSubstitutionData.savedUSD}
                    exchangeRate={importSubstitutionData.exchangeRate}
                    materialTons={importSubstitutionData.materialTons}
                  />
                </div>
              </div>

              {/* Egypt Vision 2030 Section */}
              <EgyptVision2030Section />
            </TabsContent>

            {/* Impact Tab */}
            <TabsContent value="impact" className="space-y-8">
              <NationalImpactSection />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ImportSubstitutionMeter 
                  savedUSD={importSubstitutionData.savedUSD}
                  exchangeRate={importSubstitutionData.exchangeRate}
                  materialTons={importSubstitutionData.materialTons}
                />
                <NationalManufacturingDashboard />
              </div>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BuildingCodeValidator />
                
                {/* Compliance Stats */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-400" />
                    Compliance Summary
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'HBRC Building Code', status: 'Compliant', color: 'emerald' },
                      { label: 'Egyptian VAT (14%)', status: 'Integrated', color: 'emerald' },
                      { label: 'ETA E-Invoice Ready', status: 'Certified', color: 'emerald' },
                      { label: 'Data Residency (Egypt)', status: 'Sovereign', color: 'orange' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-slate-300">{item.label}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${item.color}-500/20 text-${item.color}-400`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Pledge Tab */}
            <TabsContent value="pledge">
              <NationalServicePledge />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-900/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span>Aligned with</span>
                <span className="text-orange-400 font-semibold">Egypt Vision 2030</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">Digital Egypt Strategy</span>
              </div>
              <div>
                Last updated: {new Date().toLocaleDateString('en-EG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NationalDashboard;
