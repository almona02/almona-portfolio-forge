import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { CompanyBrandingManager } from '@/modules/reporting';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';

/**
 * CompanyBrandingSettings
 * Wrapper around CompanyBrandingManager that persists settings and exposes
 * a simple panel you can drop into any settings / profile page.
 */
export const CompanyBrandingSettings: React.FC = () => {
  const { branding, setBranding } = useCompanyBranding();

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg">Company Profile & Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <CompanyBrandingManager
          branding={branding}
          onBrandingUpdate={setBranding}
        />
      </CardContent>
    </Card>
  );
};

export default CompanyBrandingSettings;


