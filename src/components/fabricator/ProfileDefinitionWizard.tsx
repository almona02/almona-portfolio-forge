/**
 * Profile Definition Wizard
 * Multi-step wizard for creating profiles from technical data sheets
 * v1: Manual input with visual reference (de-risked approach)
 */

import { profileDataSheetParser } from '@/lib/profile/ProfileDataSheetParser';
import { profileDefinitionManager } from '@/lib/profile/ProfileDefinitionManager';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Progress } from '@/shared/ui/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { useToast } from '@/shared/ui/ui/use-toast';
import type { Profile } from '@/types/fabricator';
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { KFactorCalculator } from './KFactorCalculator';
import { ProfileCrossSectionViewer } from './ProfileCrossSectionViewer';
import { ProfileIconGenerator, type ProfileIconHandle } from './assets/ProfileIconGenerator';

interface ProfileDefinitionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onProfileCreated?: (profile: Profile) => void;
  initialData?: {
    profileCode?: string;
    systemName?: string;
    width?: number;
    height?: number;
    materialThickness?: number;
    weightPerMeter?: number;
    role?: 'frame' | 'mullion' | 'transom' | 'sash' | 'glazing_bead' | 'interlock' | 'accessory';
    material?: 'aluminum' | 'upvc' | 'wood';
    defaultKFactor45?: number;
    defaultKFactor90?: number;
  };
}

interface Annotation {
  id: string;
  type: 'point' | 'box';
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
}

export const ProfileDefinitionWizard: React.FC<ProfileDefinitionWizardProps> = ({
  open,
  onOpenChange,
  userId,
  onProfileCreated,
  initialData,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [_isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const profileIconRef = useRef<ProfileIconHandle>(null);

  const [formData, setFormData] = useState({
    profileCode: initialData?.profileCode || '',
    systemName: initialData?.systemName || '',
    width: initialData?.width || 60,
    height: initialData?.height || 40,
    materialThickness: initialData?.materialThickness || 1.5,
    weightPerMeter: initialData?.weightPerMeter || 0,
    role: initialData?.role || 'frame' as const,
    material: initialData?.material || 'aluminum' as const,
    defaultKFactor45: initialData?.defaultKFactor45,
    defaultKFactor90: initialData?.defaultKFactor90 || 0,
  });

  // Update form data when initialData changes (e.g., when wizard opens with new data)
  React.useEffect(() => {
    if (initialData && open) {
      setFormData({
        profileCode: initialData.profileCode || '',
        systemName: initialData.systemName || '',
        width: initialData.width || 60,
        height: initialData.height || 40,
        materialThickness: initialData.materialThickness || 1.5,
        weightPerMeter: initialData.weightPerMeter || 0,
        role: initialData.role || 'frame',
        material: initialData.material || 'aluminum',
        defaultKFactor45: initialData.defaultKFactor45,
        defaultKFactor90: initialData.defaultKFactor90 || 0,
      });
    }
  }, [initialData, open]);

  const totalSteps = 3;

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image (PNG, JPG) or PDF file.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // For images, create object URL for preview
      if (file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        setUploadedImage(objectUrl);
        setUploadedImageFile(file);
      } else {
        // For PDFs, we'd need to extract first page as image (v2 feature)
        toast({
          title: 'PDF support coming soon',
          description: 'Please upload an image file for now. PDF parsing will be available in v2.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to process the uploaded file.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (): Promise<string | null> => {
    if (!uploadedImageFile) return null;

    try {
      const fileExt = uploadedImageFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, uploadedImageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading to storage:', error);
      return null;
    }
  };

  const uploadThumbnailFromDataUrl = async (dataUrl: string | null): Promise<string | null> => {
    if (!dataUrl) return null;
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const fileName = `${userId}/thumb-${Date.now()}.png`;
      const { error } = await supabase.storage
        .from('profile-thumbnails')
        .upload(fileName, blob, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('profile-thumbnails').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading thumbnail:', err);
      return null;
    }
  };

  // Handle annotation add
  const handleAnnotationAdd = (annotation: Omit<Annotation, 'id'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `annotation-${Date.now()}-${Math.random()}`,
    };
    setAnnotations([...annotations, newAnnotation]);
  };

  // Handle annotation remove
  const handleAnnotationRemove = (id: string) => {
    setAnnotations(annotations.filter((a) => a.id !== id));
  };

  // Validate step 2
  const validateStep2 = () => {
    const parsed = profileDataSheetParser.parseManualInput({
      ...formData,
      role: formData.role,
      material: formData.material,
    });
    const validation = profileDataSheetParser.validate(parsed);
    return validation;
  };

  // Handle step navigation
  const handleNext = async () => {
    if (step === 2) {
      const validation = validateStep2();
      if (!validation.isValid) {
        toast({
          title: 'Validation failed',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  // Handle profile creation
  const handleCreateProfile = async () => {
    setIsCreating(true);
    try {
      // Upload image if available
      const imageUrl = await uploadImageToStorage();
      const thumbnailDataUrl = await profileIconRef.current?.capture();
      const thumbnailUrl = await uploadThumbnailFromDataUrl(thumbnailDataUrl || null);

      // Map role to valid ProfileDefinitionInput role
      const roleValue: string = formData.role;
      const validRole: 'frame' | 'sash' | 'mullion' | 'transom' | 'glazing_bead' | 'interlock' | 'accessory' = 
        (roleValue === 'casement' || roleValue === 'tilt' || roleValue === 'turn') ? 'sash' :
        (roleValue === 'fixed' || roleValue === 'ventilator') ? 'frame' :
        (roleValue === 'frame' || roleValue === 'sash' || roleValue === 'mullion' || roleValue === 'transom' || roleValue === 'glazing_bead' || roleValue === 'interlock' || roleValue === 'accessory') ? roleValue :
        'frame'; // Default fallback

      // Map material to valid ProfileDefinitionInput material (remove 'steel')
      const materialValue: string = formData.material;
      const validMaterial: 'aluminum' | 'upvc' | 'wood' = 
        materialValue === 'steel' ? 'aluminum' :
        (materialValue === 'aluminum' || materialValue === 'upvc' || materialValue === 'wood') ? materialValue :
        'aluminum'; // Default fallback

      // Create profile
      const profile = await profileDefinitionManager.createProfileFromDefinition({
        ...formData,
        role: validRole,
        material: validMaterial,
        crossSectionImageUrl: imageUrl || undefined,
        annotations: annotations.length > 0 ? annotations : undefined,
        userId,
      });

      if (thumbnailUrl) {
        const { error } = await (supabase
          .from('fabricator_profiles')
          .update({ thumbnail_url: thumbnailUrl } as never) as any) // Type assertion for Supabase client type limitations
          .eq('id', profile.id);
        if (error) {
          console.error('Failed to update thumbnail URL:', error);
        } else {
          (profile as any).thumbnailUrl = thumbnailUrl;
        }
      }

      toast({
        title: 'Profile created',
        description: `Profile "${profile.name}" has been created successfully.`,
      });

      onProfileCreated?.(profile);
      onOpenChange(false);
      // Reset wizard
      setStep(1);
      setUploadedImage(null);
      setUploadedImageFile(null);
      setAnnotations([]);
      setFormData({
        profileCode: '',
        systemName: '',
        width: 60,
        height: 40,
        materialThickness: 1.5,
        weightPerMeter: 0,
        role: 'frame',
        material: 'aluminum',
        defaultKFactor45: undefined,
        defaultKFactor90: 0,
      });
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({
        title: 'Creation failed',
        description: error.message || 'Failed to create profile.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle K-factor calculation
  const handleKFactorCalculated = (kFactor: number) => {
    setFormData({ ...formData, defaultKFactor45: kFactor });
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl">Define Profile from Data Sheet</CardTitle>
        <CardDescription className="text-gray-400">
          Create a new profile from supplier technical data sheet
        </CardDescription>
        <Progress value={(step / totalSteps) * 100} className="mt-4" />
        <p className="text-sm text-gray-500 mt-2">
          Step {step} of {totalSteps}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Upload Data Sheet */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload" className="typography-label text-gray-300 mb-2 block">
                Upload Technical Data Sheet
              </Label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
                <Label htmlFor="file-upload"
                  className="typography-label cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-12 w-12 text-gray-400" />
                  <span className="text-gray-300">Click to upload or drag and drop</span>
                  <span className="text-sm text-gray-500">PNG, JPG, or PDF (max 10MB)</span>
                </Label>
              </div>
            </div>

            {uploadedImage && (
              <div className="mt-4">
                <ProfileCrossSectionViewer
                  imageUrl={uploadedImage}
                  annotations={annotations}
                  onAnnotationAdd={handleAnnotationAdd}
                  onAnnotationRemove={handleAnnotationRemove}
                />
              </div>
            )}

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription className="text-sm text-gray-400">
                Upload a cross-section image from the technical data sheet. You'll enter dimensions manually in the next step.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Enter Dimensions */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="typography-h3 text-lg text-gray-300">Profile Information</h3>
              <div>
                <Label htmlFor="profile-code" className="typography-label text-gray-300">
                  Profile Code *
                </Label>
                <Input
                  id="profile-code"
                  value={formData.profileCode}
                  onChange={(e) => setFormData({ ...formData, profileCode: e.target.value })}
                  placeholder="e.g., PS-9601"
                  className="mt-1 bg-gray-900 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="system-name" className="typography-label text-gray-300">
                  System Name *
                </Label>
                <Input
                  id="system-name"
                  value={formData.systemName}
                  onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
                  placeholder="e.g., PS 9600 Sliding"
                  className="mt-1 bg-gray-900 border-gray-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width" className="typography-label text-gray-300">
                    Width (mm) *
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                    className="mt-1 bg-gray-900 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="typography-label text-gray-300">
                    Height (mm) *
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                    className="mt-1 bg-gray-900 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="material-thickness" className="typography-label text-gray-300">
                  Material Thickness (mm) *
                </Label>
                <Input
                  id="material-thickness"
                  type="number"
                  step="0.1"
                  value={formData.materialThickness}
                  onChange={(e) =>
                    setFormData({ ...formData, materialThickness: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-gray-900 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="weight" className="typography-label text-gray-300">
                  Weight per Meter (kg/m)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weightPerMeter}
                  onChange={(e) => setFormData({ ...formData, weightPerMeter: parseFloat(e.target.value) || 0 })}
                  className="mt-1 bg-gray-900 border-gray-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role" className="typography-label text-gray-300">
                    Role *
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                  >
                    <SelectTrigger id="role" className="mt-1 bg-gray-900 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="frame">Frame</SelectItem>
                      <SelectItem value="sash">Sash</SelectItem>
                      <SelectItem value="mullion">Mullion</SelectItem>
                      <SelectItem value="transom">Transom</SelectItem>
                      <SelectItem value="glazing_bead">Glazing Bead</SelectItem>
                      <SelectItem value="interlock">Interlock</SelectItem>
                      <SelectItem value="accessory">Accessory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="material" className="typography-label text-gray-300">
                    Material *
                  </Label>
                  <Select
                    value={formData.material}
                    onValueChange={(value) => setFormData({ ...formData, material: value as any })}
                  >
                    <SelectTrigger id="material" className="mt-1 bg-gray-900 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="aluminum">Aluminum</SelectItem>
                      <SelectItem value="upvc">UPVC</SelectItem>
                      <SelectItem value="wood">Wood</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="typography-h3 text-lg text-gray-300 mb-4">Visual Reference</h3>
              {uploadedImage ? (
                <ProfileCrossSectionViewer
                  imageUrl={uploadedImage}
                  annotations={annotations}
                  readonly
                />
              ) : (
                <div className="p-8 bg-gray-900 rounded border border-gray-700 text-center text-gray-400">
                  No image uploaded. Go back to step 1 to upload.
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <h4 className="typography-h4 text-sm text-gray-200 mb-2">Thumbnail Preview</h4>
              <div className="border border-gray-700 rounded-lg p-3 bg-gray-900 flex flex-col items-center">
                <ProfileIconGenerator
                  ref={profileIconRef}
                  widthMm={formData.width || 60}
                  heightMm={formData.height || formData.width || 60}
                  wallThicknessMm={formData.materialThickness || 1.5}
                  glazingPocketDepthMm={0}
                  glazingPocketWidthMm={0}
                  className="w-24 h-24"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  This preview is auto-captured and uploaded as the profile thumbnail.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Initial Calibration */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="typography-h3 text-lg text-gray-300 mb-4">Initial Calibration Setup</h3>
              <p className="text-sm text-gray-400 mb-4">
                Set up basic cutting parameters. You can fine-tune these later in the Calibration Wizard.
              </p>
            </div>

            <KFactorCalculator
              profile={{
                id: 'temp',
                name: formData.profileCode,
                material: (() => {
                  const mat: string = formData.material;
                  if (mat === 'steel') return 'aluminum' as const;
                  if (mat === 'aluminum' || mat === 'upvc' || mat === 'wood') {
                    return mat;
                  }
                  return 'aluminum' as const;
                })(),
                width: formData.width,
                height: formData.height,
                thickness: formData.materialThickness,
                color: 'default',
                costPerMeter: 0,
                cuttingAllowance: 0,
                stockQuantity: 0,
                minStockLevel: 0,
                supplier: '',
              }}
              onKFactorCalculated={handleKFactorCalculated}
              initialKFactor={formData.defaultKFactor45}
              initialJointType="miter_45"
            />

            <div className="p-4 bg-gray-900 rounded border border-gray-700">
              <h4 className="typography-h4 text-sm text-gray-300 mb-2">Summary</h4>
              <div className="space-y-1 text-sm text-gray-400">
                <p>
                  <span className="text-gray-500">Profile:</span> {formData.profileCode}
                </p>
                <p>
                  <span className="text-gray-500">System:</span> {formData.systemName}
                </p>
                <p>
                  <span className="text-gray-500">Dimensions:</span> {formData.width}mm × {formData.height}mm
                </p>
                {formData.defaultKFactor45 !== undefined && (
                  <p>
                    <span className="text-gray-500">K-Factor (45°):</span>{' '}
                    <span className="text-green-400 font-semibold">{formData.defaultKFactor45.toFixed(2)}mm</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={step === 1 ? () => onOpenChange(false) : handleBack}
            className="text-gray-300 border-gray-600 hover:bg-gray-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateProfile}
              disabled={isCreating}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isCreating ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Profile
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

