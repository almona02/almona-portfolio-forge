/**
 * CompanyBrandingManager - Allows logo upload and brand color settings
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Upload, Save, Palette, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { CompanyBranding } from './PDFExportService';

interface CompanyBrandingManagerProps {
  branding: CompanyBranding;
  onBrandingUpdate: (branding: CompanyBranding) => void;
}

export const CompanyBrandingManager: React.FC<CompanyBrandingManagerProps> = ({
  branding: initialBranding,
  onBrandingUpdate,
}) => {
  const [branding, setBranding] = useState<CompanyBranding>(initialBranding);
  const [logoPreview, setLogoPreview] = useState<string | null>(branding.logo || null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBranding(initialBranding);
    setLogoPreview(initialBranding.logo || null);
  }, [initialBranding]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      setBranding({ ...branding, logo: result });
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read logo file');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onBrandingUpdate(branding);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-900/20 border-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Branding settings saved successfully!</AlertDescription>
        </Alert>
      )}

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-amber-400" />
            Company Branding Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="w-32 h-32 border border-gray-600 rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center">
                  <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Label htmlFor="logo-upload" className="typography-label">
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </span>
                  </Button>
                </Label>
                <p className="text-xs text-gray-400 mt-2">
                  Recommended: PNG or SVG, max 2MB. Logo will appear on all PDF reports.
                </p>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Company Name *</Label>
              <Input
                value={branding.companyName}
                onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>
            <div className="col-span-2">
              <Label>Workshop / Production Name</Label>
              <Input
                value={branding.workshopName || ''}
                onChange={(e) => setBranding({ ...branding, workshopName: e.target.value })}
                placeholder="e.g. Downtown Workshop, Line 1"
              />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input
                value={branding.address || ''}
                onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                placeholder="Company Address"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={branding.phone || ''}
                onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={branding.email || ''}
                onChange={(e) => setBranding({ ...branding, email: e.target.value })}
                placeholder="info@company.com"
              />
            </div>
            <div className="col-span-2">
              <Label>Website</Label>
              <Input
                value={branding.website || ''}
                onChange={(e) => setBranding({ ...branding, website: e.target.value })}
                placeholder="https://www.company.com"
              />
            </div>
          </div>

          {/* Brand Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={branding.primaryColor || '#FF6B35'}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-20"
                />
                <Input
                  value={branding.primaryColor || '#FF6B35'}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  placeholder="#FF6B35"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Used for headings and accents in PDF reports
              </p>
            </div>
            <div>
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={branding.secondaryColor || '#4A5568'}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="w-20"
                />
                <Input
                  value={branding.secondaryColor || '#4A5568'}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  placeholder="#4A5568"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Used for secondary elements
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <Label className="typography-label mb-2 block">Preview</Label>
            <div className="space-y-2">
              {logoPreview && (
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Logo will appear here</span>
                </div>
              )}
              <div
                className="text-lg font-bold"
                style={{ color: branding.primaryColor || '#FF6B35' }}
              >
                {branding.companyName || 'Your Company Name'}
              </div>
              {branding.workshopName && (
                <div className="text-sm text-gray-300">
                  {branding.workshopName}
                </div>
              )}
              {branding.address && (
                <div className="text-sm text-gray-400">{branding.address}</div>
              )}
              <div className="flex gap-4 text-sm text-gray-400">
                {branding.phone && <span>Phone: {branding.phone}</span>}
                {branding.email && <span>Email: {branding.email}</span>}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="btn-primary">
              <Save className="h-4 w-4 mr-2" />
              Save Branding Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

