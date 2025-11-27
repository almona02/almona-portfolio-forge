import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Palette, Factory, ShieldCheck } from 'lucide-react';
import CompanyBrandingSettings from '@/components/settings/CompanyBrandingSettings';

const FabricatorBrandingSettings: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-slate-950 text-white pt-20 pb-16">
      <div className="container mx-auto px-4 md:px-8 space-y-8">
        {/* Prestige header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="lg:col-span-2 bg-gray-900/70 border-gray-700 shadow-2xl shadow-orange-500/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 via-amber-400 to-sky-400 shadow-lg shadow-orange-500/40">
                  <Palette className="h-6 w-6 text-slate-950" />
                </div>
                <div className="space-y-1">
                  <span className="block text-sm font-semibold tracking-[0.25em] text-orange-300/80 uppercase">
                    Fabricator Pro
                  </span>
                  <span>Company Branding & Reports Identity</span>
                </div>
              </CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-300 mt-3 max-w-2xl">
                Configure the visual identity that appears on every quotation, cutting report and
                fabrication export. Logos, colors and company details here define how your shop
                looks to customers and partners.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-3">
            <Card className="bg-gray-900/70 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Factory className="h-4 w-4 text-orange-400" />
                  Brand Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-gray-300">
                <p>
                  Your branding is applied to:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Cutting list PDFs & accessories reports</li>
                  <li>Glass and fabrication reports</li>
                  <li>Client-ready offers and quotations</li>
                </ul>
                <div className="pt-1">
                  <Badge variant="outline" className="text-[10px] border-emerald-500/60 text-emerald-300 bg-emerald-500/10">
                    Live on Export
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/70 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-sky-400" />
                  Best Practice
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-300 space-y-1">
                <p>Use high‑resolution PNG/SVG logos and keep colors aligned with your shop identity.</p>
                <p className="text-gray-400">
                  Operators can work confidently knowing every report that leaves the workshop
                  carries the right logo and contact details.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Branding settings panel */}
        <CompanyBrandingSettings />
      </div>
    </div>
  );
};

export default FabricatorBrandingSettings;


