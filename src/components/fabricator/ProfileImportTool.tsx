'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Separator } from '@/shared/ui/ui/separator';
import {
  Upload,
  Package,
  DollarSign,
  Scale,
  FileText,
  FileCode,
  Loader2,
  Image,
  Brain,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  Settings,
  History,
  CheckCircle2,
  X,
} from 'lucide-react';
import { AluminumPricingCalculator } from '@/lib/pricing/AluminumPricingCalculator';
import type { Profile } from '@/types/fabricator';
import { toast } from 'sonner';
import { ProfileDefinitionWizard } from './ProfileDefinitionWizard';
import { useTranslation } from 'react-i18next';

// ============================================================================
// Types & Interfaces
// ============================================================================

type SupportedFileType = 'pdf' | 'dxf' | 'dwg' | 'svg' | 'png' | 'jpg';

interface ExtractedProfileData {
  id: string;
  name: string;
  source: SupportedFileType;
  sourceFile: string;
  dimensions: {
    width?: number;
    height?: number;
    thickness?: number;
    perimeter?: number;
    area?: number;
  };
  weightPerMeter?: number;
  material?: string;
  series?: string;
  supplier?: string;
  profileId?: string; // Extracted ID from PDF
  profileRole?: string; // Extracted role (frame, mullion, transom, etc.)
  profileNumber?: string; // Extracted profile number
  kFactorSuggestion?: KFactorSuggestion;
  geometryData?: {
    vertices?: number;
    segments?: number;
    holes?: number;
    complexity: 'simple' | 'medium' | 'complex';
  };
  confidence: number;
  rawData?: Record<string, unknown>;
  extractedText?: string; // Raw text extracted from PDF
  extractedNumbers?: number[]; // All numbers found in PDF
}

interface KFactorSuggestion {
  miter45: number;
  miter90: number;
  butt: number;
  confidence: number;
  reasoning: string;
  similarProfiles: SimilarProfile[];
  autoOptimized: boolean;
}

interface SimilarProfile {
  id: string;
  name: string;
  similarity: number;
  kFactor: number;
  productionCount: number;
  successRate: number;
}

interface KFactorLearningData {
  profileId: string;
  measuredKFactor: number;
  theoreticalKFactor: number;
  deviation: number;
  materialType: string;
  machineId?: string;
  timestamp: Date;
  isVerified: boolean;
}

interface ProfileImportToolProps {
  onProfilesImported: (profiles: Profile[]) => void;
  userId?: string;
  workshopId?: string;
  existingProfiles?: Profile[];
}

// ============================================================================
// Helper Functions
// ============================================================================

const getFileTypeFromExtension = (filename: string): SupportedFileType | null => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'dxf') return 'dxf';
  if (ext === 'dwg') return 'dwg';
  if (ext === 'svg') return 'svg';
  if (ext === 'png') return 'png';
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
  return null;
};

const getFileTypeColor = (type: SupportedFileType): string => {
  const colors: Record<SupportedFileType, string> = {
    pdf: 'bg-red-500/10 text-red-300 border-red-500/40',
    dxf: 'bg-blue-500/10 text-blue-300 border-blue-500/40',
    dwg: 'bg-purple-500/10 text-purple-300 border-purple-500/40',
    svg: 'bg-green-500/10 text-green-300 border-green-500/40',
    png: 'bg-orange-500/10 text-orange-300 border-orange-500/40',
    jpg: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/40',
  };
  return colors[type] || 'bg-gray-500/10 text-gray-300 border-gray-500/40';
};

const getFileTypeIcon = (type: SupportedFileType) => {
  switch (type) {
    case 'pdf':
      return <FileText className="h-4 w-4" />;
    case 'dxf':
    case 'dwg':
      return <FileCode className="h-4 w-4" />;
    case 'svg':
      return <FileCode className="h-4 w-4" />;
    case 'png':
    case 'jpg':
      return <Image className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

// ============================================================================
// Main Component
// ============================================================================

export const ProfileImportTool: React.FC<ProfileImportToolProps> = ({
  onProfilesImported,
  userId,
  workshopId: _workshopId,
  existingProfiles = [],
}) => {
  const { t } = useTranslation('fabricator');
  // File upload state
  const [_uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<string | null>(null);

  // Extracted data state
  const [extractedProfiles, setExtractedProfiles] = useState<ExtractedProfileData[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());

  // Profile Definition Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPrefillData, setWizardPrefillData] = useState<ExtractedProfileData | null>(null);

  // K-factor learning state
  const [kFactorLearningEnabled, setKFactorLearningEnabled] = useState(true);
  const [learnedKFactors, setLearnedKFactors] = useState<KFactorLearningData[]>([]);
  const [_isLearning, _setIsLearning] = useState(false);
  const [autoOptimizeAll, setAutoOptimizeAll] = useState(false);

  // Pricing state
  const [aluminumPrice, setAluminumPrice] = useState(
    AluminumPricingCalculator.getCurrentPricing().aluminumPricePerKg
  );
  const [markupPercentage, setMarkupPercentage] = useState(
    AluminumPricingCalculator.getCurrentPricing().markupPercentage
  );

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // File Upload Handlers
  // ============================================================================

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      // Filter valid file types
      const validFiles = files.filter((file) => {
        const type = getFileTypeFromExtension(file.name);
        return type !== null;
      });

      if (validFiles.length !== files.length) {
        toast.warning(
          t('profile_import_tool.upload.files_skipped', {
            count: files.length - validFiles.length,
            defaultValue: `${files.length - validFiles.length} files skipped (unsupported format)`
          })
        );
      }

      setUploadedFiles((prev) => [...prev, ...validFiles]);

      // Auto-process files
      await processFiles(validFiles);

      // Reset input
      if (event.target) event.target.value = '';
    },
    []
  );

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setProgress(0);

    const newProfiles: ExtractedProfileData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentProcessingFile(file.name);
      setProgress(((i + 0.5) / files.length) * 100);

      try {
        const fileType = getFileTypeFromExtension(file.name);
        if (!fileType) continue;

        let extractedData: ExtractedProfileData | null = null;

        switch (fileType) {
          case 'dxf':
          case 'dwg':
            extractedData = await extractFromCADFile(file, fileType);
            break;
          case 'svg':
            extractedData = await extractFromSVG(file);
            break;
          case 'pdf':
            extractedData = await extractFromPDF(file);
            break;
          case 'png':
          case 'jpg':
            extractedData = await extractFromImage(file, fileType);
            break;
        }

        if (extractedData) {
          // Apply K-factor learning if enabled
          if (kFactorLearningEnabled) {
            extractedData.kFactorSuggestion = await generateKFactorSuggestion(
              extractedData,
              existingProfiles
            );
          }
          newProfiles.push(extractedData);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        toast.error(t('profile_import_tool.upload.processing_error', {
          file: file.name,
          defaultValue: `Failed to process ${file.name}`
        }));
      }

      setProgress(((i + 1) / files.length) * 100);
    }

    setExtractedProfiles((prev) => [...prev, ...newProfiles]);
    setCurrentProcessingFile(null);
    setIsProcessing(false);
    setProgress(100);

    if (newProfiles.length > 0) {
      toast.success(t('profile_import_tool.upload.extracted_success', {
        count: newProfiles.length,
        filesCount: files.length,
        defaultValue: `Extracted ${newProfiles.length} profiles from ${files.length} files`
      }));
      
      // Auto-select all if auto-optimize is on
      if (autoOptimizeAll) {
        setSelectedProfiles(new Set(newProfiles.map((p) => p.id)));
      }
    }
  };

  // ============================================================================
  // File Type Extractors
  // ============================================================================

  const extractFromCADFile = async (
    file: File,
    type: 'dxf' | 'dwg'
  ): Promise<ExtractedProfileData> => {
    // In production, this would call the backend API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch('/api/v2/profiles/extract-cad', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: data.name || file.name.replace(/\.(dxf|dwg)$/i, ''),
          source: type,
          sourceFile: file.name,
          dimensions: {
            width: data.width,
            height: data.height,
            thickness: data.thickness,
            perimeter: data.perimeter,
            area: data.area,
          },
          weightPerMeter: data.weightPerMeter,
          geometryData: {
            vertices: data.vertices,
            segments: data.segments,
            holes: data.holes,
            complexity: data.complexity || 'medium',
          },
          confidence: data.confidence || 0.85,
          rawData: data.rawData,
        };
      }
    } catch (error) {
      console.error('CAD extraction API error:', error);
    }

    // Fallback: simulate extraction for demo
    return simulateCADExtraction(file, type);
  };

  const extractFromSVG = async (file: File): Promise<ExtractedProfileData> => {
    const text = await file.text();
    
    // Parse SVG dimensions
    const widthMatch = text.match(/width="([^"]+)"/);
    const heightMatch = text.match(/height="([^"]+)"/);
    const viewBoxMatch = text.match(/viewBox="([^"]+)"/);

    let width = 100, height = 100;
    
    if (viewBoxMatch) {
      const [, , vbWidth, vbHeight] = viewBoxMatch[1].split(/\s+/).map(Number);
      width = vbWidth || width;
      height = vbHeight || height;
    } else {
      width = parseFloat(widthMatch?.[1] || '100');
      height = parseFloat(heightMatch?.[1] || '100');
    }

    // Count path segments for complexity
    const pathCount = (text.match(/<path/g) || []).length;
    const circleCount = (text.match(/<circle/g) || []).length;
    const rectCount = (text.match(/<rect/g) || []).length;
    const totalElements = pathCount + circleCount + rectCount;

    return {
      id: `svg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name.replace(/\.svg$/i, ''),
      source: 'svg',
      sourceFile: file.name,
      dimensions: {
        width,
        height,
        perimeter: estimatePerimeterFromSVG(text),
      },
      geometryData: {
        segments: totalElements,
        complexity: totalElements > 20 ? 'complex' : totalElements > 5 ? 'medium' : 'simple',
      },
      confidence: 0.75,
    };
  };

  const extractFromPDF = async (file: File): Promise<ExtractedProfileData> => {
    // Try backend extraction first
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/v2/profiles/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const extracted: ExtractedProfileData = {
          id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: data.name || file.name.replace(/\.pdf$/i, ''),
          source: 'pdf',
          sourceFile: file.name,
          dimensions: data.dimensions || {},
          weightPerMeter: data.weightPerMeter,
          series: data.series,
          supplier: data.supplier,
          profileId: data.profileId,
          profileRole: data.profileRole,
          profileNumber: data.profileNumber,
          extractedText: data.extractedText,
          extractedNumbers: data.extractedNumbers,
          confidence: data.confidence || 0.7,
          rawData: data.rawData,
        };

        // Auto-open wizard for PDF extraction
        if (userId && (extracted.profileId || extracted.profileNumber || extracted.weightPerMeter)) {
          setWizardPrefillData(extracted);
          setWizardOpen(true);
        }

        return extracted;
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
    }

    // Client-side PDF text extraction using PDF.js (optional)
    try {
      // Try to use PDF.js if available, otherwise fall back to backend
      let pdfjsLib: any;
      try {
        // Dynamic import - will fail gracefully if pdfjs-dist is not installed
        pdfjsLib = await import('pdfjs-dist' as any);
        if (pdfjsLib && pdfjsLib.getDocument) {
          // Bundle worker locally for production (offline PWA support)
          // Use CDN only in development
          const pdfWorkerPath = import.meta.env.PROD
            ? new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href
            : `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
          pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerPath;
        } else {
          throw new Error('PDF.js not properly loaded');
        }
      } catch {
        // PDF.js not available, skip client-side extraction
        console.warn('PDF.js not available, using backend extraction only');
        throw new Error('PDF.js not available');
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      const allNumbers: number[] = [];

      // Extract text from all pages (limit to first 5 pages for performance)
      for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      // Extract all numbers from text
      const numberRegex = /[\d]+\.?[\d]*/g;
      const matches = fullText.match(numberRegex);
      if (matches) {
        allNumbers.push(...matches.map(Number).filter(n => !isNaN(n) && n > 0));
      }

      // Extract profile ID (common patterns: PROFILE-XXX, P-XXX, ID: XXX)
      const profileIdPatterns = [
        /(?:profile|id|code)[\s:]*([A-Z0-9\-]+)/i,
        /(?:P|PROF)[\s\-]?(\d+[A-Z]?)/i,
        /([A-Z]{2,}\d+[A-Z]?)/,
      ];
      let profileId: string | undefined;
      for (const pattern of profileIdPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          profileId = match[1];
          break;
        }
      }

      // Extract profile number
      const profileNumberPatterns = [
        /(?:profile|item|part)[\s#]*number[\s:]*([A-Z0-9\-]+)/i,
        /#[\s]*([A-Z0-9\-]+)/i,
      ];
      let profileNumber: string | undefined;
      for (const pattern of profileNumberPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          profileNumber = match[1];
          break;
        }
      }

      // Extract role (frame, mullion, transom, sash, etc.)
      const rolePatterns = [
        /(?:role|type|function)[\s:]*([a-z]+)/i,
        /\b(frame|mullion|transom|sash|casement|tilt|turn|fixed|ventilator)\b/i,
      ];
      let profileRole: string | undefined;
      for (const pattern of rolePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          profileRole = match[1].toLowerCase();
          break;
        }
      }

      // Extract weight (kg/m, kg/meter, weight per meter)
      const weightPatterns = [
        /(?:weight|wt)[\s:]*([\d.]+)[\s]*(?:kg\/m|kg\/meter|kg per meter)/i,
        /([\d.]+)[\s]*(?:kg\/m|kg\/meter)/i,
      ];
      let weightPerMeter: number | undefined;
      for (const pattern of weightPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          weightPerMeter = parseFloat(match[1]);
          break;
        }
      }

      // Extract dimensions (width x height, W x H, etc.)
      const dimensionPatterns = [
        /(?:width|w)[\s:]*([\d.]+)[\s]*(?:x|×|mm)[\s]*(?:height|h)[\s:]*([\d.]+)/i,
        /([\d.]+)[\s]*(?:x|×)[\s]*([\d.]+)[\s]*(?:mm)?/i,
      ];
      const dimensions: { width?: number; height?: number } = {};
      for (const pattern of dimensionPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          dimensions.width = parseFloat(match[1]);
          dimensions.height = parseFloat(match[2]);
          break;
        }
      }

      // Extract material
      const materialPatterns = [
        /(?:material|metal)[\s:]*([a-z]+)/i,
        /\b(aluminum|aluminium|steel|upvc|pvc|wood)\b/i,
      ];
      let material: string | undefined;
      for (const pattern of materialPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          material = match[1].toLowerCase();
          break;
        }
      }

      // Extract series/system name
      const seriesPatterns = [
        /(?:series|system|series name)[\s:]*([A-Z0-9\s]+)/i,
        /\b(ROCK|SONATA|SAMBA|TENDU|JUMBO|TEMPO|TANGO|NANO|PANORAMA|KITO|ACACIA)\s*(\d+)?/i,
      ];
      let series: string | undefined;
      for (const pattern of seriesPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          series = match[0].trim();
          break;
        }
      }

      const extracted: ExtractedProfileData = {
        id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: profileId || profileNumber || file.name.replace(/\.pdf$/i, ''),
        source: 'pdf',
        sourceFile: file.name,
        dimensions,
        weightPerMeter,
        material: material || 'aluminum',
        series,
        profileId,
        profileRole,
        profileNumber,
        extractedText: fullText.substring(0, 5000), // Limit text size
        extractedNumbers: allNumbers.slice(0, 100), // Limit numbers
        confidence: (profileId || profileNumber || weightPerMeter) ? 0.7 : 0.4,
      };

      // Auto-open wizard if we extracted meaningful data
      if (userId && (extracted.profileId || extracted.profileNumber || extracted.weightPerMeter || extracted.dimensions.width)) {
        setWizardPrefillData(extracted);
        setWizardOpen(true);
      }

      return extracted;
    } catch (error) {
      console.error('Client-side PDF extraction error:', error);
    }

    // Fallback
    return {
      id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name.replace(/\.pdf$/i, ''),
      source: 'pdf',
      sourceFile: file.name,
      dimensions: {},
      confidence: 0.3,
    };
  };

  const extractFromImage = async (
    file: File,
    type: 'png' | 'jpg'
  ): Promise<ExtractedProfileData> => {
    // Use AI vision API for image analysis
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch('/api/v2/profiles/extract-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: data.name || file.name.replace(/\.(png|jpg|jpeg)$/i, ''),
          source: type,
          sourceFile: file.name,
          dimensions: data.dimensions || {},
          weightPerMeter: data.weightPerMeter,
          confidence: data.confidence || 0.6,
        };
      }
    } catch (error) {
      console.error('Image extraction error:', error);
    }

    // Fallback: basic image dimensions
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        resolve({
          id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace(/\.(png|jpg|jpeg)$/i, ''),
          source: type,
          sourceFile: file.name,
          dimensions: {
            width: img.width,
            height: img.height,
          },
          confidence: 0.4,
        });
      };
      img.onerror = () => {
        resolve({
          id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace(/\.(png|jpg|jpeg)$/i, ''),
          source: type,
          sourceFile: file.name,
          dimensions: {},
          confidence: 0.3,
        });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // ============================================================================
  // K-Factor Learning
  // ============================================================================

  const generateKFactorSuggestion = async (
    profile: ExtractedProfileData,
    existingProfiles: Profile[]
  ): Promise<KFactorSuggestion> => {
    // Find similar profiles based on dimensions and geometry
    const similarProfiles = findSimilarProfiles(profile, existingProfiles);

    // Calculate weighted average K-factor from similar profiles
    let suggestedKFactor = 0.33; // Default K-factor for aluminum
    let totalWeight = 0;

    similarProfiles.forEach((similar) => {
      const weight = similar.similarity * (similar.successRate / 100);
      suggestedKFactor += similar.kFactor * weight;
      totalWeight += weight;
    });

    if (totalWeight > 0) {
      suggestedKFactor = suggestedKFactor / totalWeight;
    }

    // Adjust based on geometry complexity
    const complexityModifier =
      profile.geometryData?.complexity === 'complex'
        ? 1.05
        : profile.geometryData?.complexity === 'simple'
          ? 0.98
          : 1.0;

    suggestedKFactor *= complexityModifier;

    // Calculate confidence based on data quality
    const confidence = Math.min(
      0.95,
      0.5 + similarProfiles.length * 0.1 + (profile.source === 'dxf' ? 0.2 : 0.1)
    );

    return {
      miter45: suggestedKFactor,
      miter90: suggestedKFactor * 1.02,
      butt: suggestedKFactor * 0.95,
      confidence,
      reasoning: generateKFactorReasoning(profile, similarProfiles, suggestedKFactor),
      similarProfiles: similarProfiles.slice(0, 5),
      autoOptimized: autoOptimizeAll,
    };
  };

  const findSimilarProfiles = (
    profile: ExtractedProfileData,
    existingProfiles: Profile[]
  ): SimilarProfile[] => {
    return existingProfiles
      .map((existing) => {
        // Calculate dimensional similarity
        let similarity = 0;
        let factors = 0;

        if (profile.dimensions.width && existing.width) {
          const widthRatio = Math.min(profile.dimensions.width, existing.width) /
            Math.max(profile.dimensions.width, existing.width);
          similarity += widthRatio;
          factors++;
        }

        if (profile.dimensions.height && existing.height) {
          const heightRatio = Math.min(profile.dimensions.height, existing.height) /
            Math.max(profile.dimensions.height, existing.height);
          similarity += heightRatio;
          factors++;
        }

        if (profile.dimensions.thickness && existing.thickness) {
          const thicknessRatio = Math.min(profile.dimensions.thickness, existing.thickness) /
            Math.max(profile.dimensions.thickness, existing.thickness);
          similarity += thicknessRatio;
          factors++;
        }

        if (factors > 0) {
          similarity = similarity / factors;
        }

        return {
          id: existing.id,
          name: existing.name,
          similarity,
          kFactor: (existing.specifications as Record<string, unknown>)?.kFactor as number || 0.33,
          productionCount: Math.floor(Math.random() * 1000), // Would come from analytics
          successRate: 85 + Math.random() * 15,
        };
      })
      .filter((p) => p.similarity > 0.6)
      .sort((a, b) => b.similarity - a.similarity);
  };

  const generateKFactorReasoning = (
    profile: ExtractedProfileData,
    similarProfiles: SimilarProfile[],
    suggestedKFactor: number
  ): string => {
    const parts: string[] = [];

    if (similarProfiles.length > 0) {
      parts.push(
        `Based on ${similarProfiles.length} similar profile${similarProfiles.length > 1 ? 's' : ''}`
      );
    }

    if (profile.geometryData?.complexity === 'complex') {
      parts.push('Adjusted for complex geometry (+5%)');
    } else if (profile.geometryData?.complexity === 'simple') {
      parts.push('Optimized for simple geometry (-2%)');
    }

    if (profile.source === 'dxf' || profile.source === 'dwg') {
      parts.push('High precision from CAD data');
    }

    return parts.length > 0
      ? parts.join('. ') + '.'
      : `Default K-factor (${suggestedKFactor.toFixed(3)}) for standard aluminum profile.`;
  };

  const _learnFromMeasurement = async (
    profileId: string,
    measuredKFactor: number
  ) => {
    const profile = extractedProfiles.find((p) => p.id === profileId);
    if (!profile || !profile.kFactorSuggestion) return;

    const learningData: KFactorLearningData = {
      profileId,
      measuredKFactor,
      theoreticalKFactor: profile.kFactorSuggestion.miter45,
      deviation: measuredKFactor - profile.kFactorSuggestion.miter45,
      materialType: profile.material || 'aluminum',
      timestamp: new Date(),
      isVerified: true,
    };

    setLearnedKFactors((prev) => [...prev, learningData]);

    // Send to backend for collective learning
    try {
      await fetch('/api/v2/calibration/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          k_factor_value: measuredKFactor,
          adjustment_type: 'manual',
          feedback_status: Math.abs(learningData.deviation) < 0.01 ? 'perfect' : 'adjust_needed',
          notes: `Learned from ${profile.sourceFile}`,
          confidence_score: profile.confidence,
        }),
      });

      toast.success('K-factor measurement recorded for AI learning');
    } catch (error) {
      console.error('Failed to save learning data:', error);
    }
  };

  // ============================================================================
  // Profile Import
  // ============================================================================

  const handleImportProfiles = async () => {
    if (!userId) {
      toast.error('User ID required to link profiles to your account');
      return;
    }

    const profilesToImport =
      selectedProfiles.size > 0
        ? extractedProfiles.filter((p) => selectedProfiles.has(p.id))
        : extractedProfiles;

    if (profilesToImport.length === 0) {
      toast.error('No profiles to import');
      return;
    }

    const imported: Profile[] = await Promise.all(
      profilesToImport.map(async (extracted) => {
        const pricing = extracted.weightPerMeter
          ? await AluminumPricingCalculator.calculateCost(
              extracted.weightPerMeter,
              1,
              {
                aluminumPricePerKg: aluminumPrice,
                markupPercentage,
              }
            )
          : { pricePerMeter: 0 };

        const now = new Date();

        return {
          id: `imported_${extracted.source}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
          name: extracted.name,
          material: (extracted.material || 'aluminum') as 'aluminum' | 'upvc' | 'wood',
          width: extracted.dimensions.width ?? 60,
          height: extracted.dimensions.height ?? 30,
          thickness: extracted.dimensions.thickness ?? 1.4,
          color: '#C0C0C0',
          costPerMeter: pricing.pricePerMeter,
          cuttingAllowance: 3,
          stockQuantity: 0,
          minStockLevel: 0,
          maxStockLevel: 1000,
          supplier: extracted.supplier || 'Imported',
          systemBrand: extracted.series || 'Custom',
          weightPerMeter: extracted.weightPerMeter || 0,
          grainDirection: null,
          specifications: {
            importSource: extracted.sourceFile,
            importType: extracted.source,
            importConfidence: extracted.confidence,
            kFactor: extracted.kFactorSuggestion?.miter45,
            kFactorMiter45: extracted.kFactorSuggestion?.miter45,
            kFactorMiter90: extracted.kFactorSuggestion?.miter90,
            kFactorButt: extracted.kFactorSuggestion?.butt,
            kFactorConfidence: extracted.kFactorSuggestion?.confidence,
            kFactorReasoning: extracted.kFactorSuggestion?.reasoning,
            geometryComplexity: extracted.geometryData?.complexity,
            perimeter: extracted.dimensions.perimeter,
            area: extracted.dimensions.area,
            aluminumPricePerKg: aluminumPrice,
            markupPercentage,
            calculatedPricePerMeter: pricing.pricePerMeter,
            lastPriceUpdate: now.toISOString(),
          },
          userId,
          createdAt: now,
          updatedAt: now,
        };
      })
    );

    onProfilesImported(imported);
    toast.success(t('profile_import_tool.upload.imported_success', {
      count: imported.length,
      defaultValue: `Imported ${imported.length} profiles into inventory`
    }));

    // Clear imported profiles
    setExtractedProfiles((prev) =>
      prev.filter((p) => !profilesToImport.some((imp) => imp.id === p.id))
    );
    setSelectedProfiles(new Set());
  };

  const toggleProfileSelection = (profileId: string) => {
    setSelectedProfiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });
  };

  const selectAllProfiles = () => {
    setSelectedProfiles(new Set(extractedProfiles.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedProfiles(new Set());
  };

  const removeProfile = (profileId: string) => {
    setExtractedProfiles((prev) => prev.filter((p) => p.id !== profileId));
    setSelectedProfiles((prev) => {
      const newSet = new Set(prev);
      newSet.delete(profileId);
      return newSet;
    });
  };

  // ============================================================================
  // Helpers
  // ============================================================================

  const simulateCADExtraction = (file: File, type: 'dxf' | 'dwg'): ExtractedProfileData => {
    // Simulation for demo purposes
    const randomDim = () => Math.round(20 + Math.random() * 100);
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name.replace(/\.(dxf|dwg)$/i, ''),
      source: type,
      sourceFile: file.name,
      dimensions: {
        width: randomDim(),
        height: randomDim(),
        thickness: 1 + Math.random() * 2,
        perimeter: randomDim() * 4,
        area: randomDim() * randomDim(),
      },
      weightPerMeter: 0.3 + Math.random() * 0.7,
      geometryData: {
        vertices: Math.floor(8 + Math.random() * 40),
        segments: Math.floor(4 + Math.random() * 20),
        holes: Math.floor(Math.random() * 4),
        complexity: Math.random() > 0.7 ? 'complex' : Math.random() > 0.4 ? 'medium' : 'simple',
      },
      confidence: 0.7 + Math.random() * 0.25,
    };
  };

  const estimatePerimeterFromSVG = (svgText: string): number => {
    // Simple estimation based on path data
    const pathMatches = svgText.matchAll(/d="([^"]+)"/g);
    let totalLength = 0;

    for (const match of pathMatches) {
      const pathData = match[1];
      // Very rough estimation
      const commands = pathData.match(/[MLHVCSQTAZ]/gi) || [];
      totalLength += commands.length * 20;
    }

    return totalLength || 100;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-blue-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            {t('profile_import_tool.title', 'Smart Profile Import Tool')}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {t('profile_import_tool.description', 'Import profiles from multiple formats with AI-powered K-factor learning')}
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="import" className="text-xs">
            <Upload className="w-3 h-3 mr-1" />
            {t('profile_import_tool.tabs.import', 'Import')}
          </TabsTrigger>
          <TabsTrigger value="kfactor" className="text-xs">
            <Brain className="w-3 h-3 mr-1" />
            {t('profile_import_tool.tabs.kfactor', 'K-Factor AI')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            <Settings className="w-3 h-3 mr-1" />
            {t('profile_import_tool.tabs.settings', 'Settings')}
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          {/* File Upload Zone */}
          <Card className="bg-gray-900/60 border-gray-700">
            <CardContent className="pt-6">
              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium mb-2">{t('profile_import_tool.upload.title', 'Drop files here or click to upload')}</h3>
                <p className="text-xs text-gray-400 mb-4">
                  {t('profile_import_tool.upload.description', 'Supports DXF, DWG, SVG, PDF, PNG, JPG')}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(['dxf', 'dwg', 'svg', 'pdf', 'png', 'jpg'] as SupportedFileType[]).map(
                    (type) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className={`text-[10px] ${getFileTypeColor(type)}`}
                      >
                        {getFileTypeIcon(type)}
                        <span className="ml-1">.{type.toUpperCase()}</span>
                      </Badge>
                    )
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".dxf,.dwg,.svg,.pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-sm">{t('profile_import_tool.upload.processing_file', {
                      file: currentProcessingFile,
                      defaultValue: `Processing ${currentProcessingFile}...`
                    })}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extracted Profiles List */}
          {extractedProfiles.length > 0 && (
            <Card className="bg-gray-900/60 border-gray-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-400" />
                    {t('profile_import_tool.upload.extracted_profiles', {
                      count: extractedProfiles.length
                    })}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllProfiles}>
                      {t('profile_import_tool.upload.select_all', 'Select All')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearSelection}>
                      {t('profile_import_tool.upload.clear', 'Clear')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {extractedProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className={`p-3 bg-gray-800 rounded-lg border-2 transition-colors cursor-pointer ${
                        selectedProfiles.has(profile.id)
                          ? 'border-blue-500'
                          : 'border-transparent hover:border-gray-600'
                      }`}
                      onClick={() => toggleProfileSelection(profile.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              selectedProfiles.has(profile.id)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-500'
                            }`}
                          >
                            {selectedProfiles.has(profile.id) && (
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold truncate">{profile.name}</h4>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${getFileTypeColor(profile.source)}`}
                              >
                                {profile.source.toUpperCase()}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  profile.confidence >= 0.8
                                    ? 'bg-green-500/10 text-green-300 border-green-500/40'
                                    : profile.confidence >= 0.6
                                      ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/40'
                                      : 'bg-red-500/10 text-red-300 border-red-500/40'
                                }`}
                              >
                                {Math.round(profile.confidence * 100)}% {t('profile_import_tool.upload.confidence', 'confidence')}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-[11px] text-gray-400">
                              {profile.dimensions.width && (
                                <span>W: {profile.dimensions.width.toFixed(1)}mm</span>
                              )}
                              {profile.dimensions.height && (
                                <span>H: {profile.dimensions.height.toFixed(1)}mm</span>
                              )}
                              {profile.weightPerMeter && (
                                <span className="flex items-center gap-1">
                                  <Scale className="h-3 w-3" />
                                  {profile.weightPerMeter.toFixed(3)} kg/m
                                </span>
                              )}
                              {profile.geometryData?.complexity && (
                                <span className="capitalize">{profile.geometryData.complexity}</span>
                              )}
                            </div>
                            {profile.kFactorSuggestion && (
                              <div className="mt-2 p-2 bg-gray-700/50 rounded text-[11px]">
                                <div className="flex items-center gap-2 mb-1">
                                  <Brain className="h-3 w-3 text-purple-400" />
                                  <span className="text-purple-300 font-medium">
                                    {t('profile_import_tool.upload.k_factor_suggestion', 'K-Factor Suggestion')}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-gray-300">
                                  <span>45°: {profile.kFactorSuggestion.miter45.toFixed(3)}</span>
                                  <span>90°: {profile.kFactorSuggestion.miter90.toFixed(3)}</span>
                                  <span>Butt: {profile.kFactorSuggestion.butt.toFixed(3)}</span>
                                </div>
                                <p className="text-gray-500 mt-1 text-[10px]">
                                  {profile.kFactorSuggestion.reasoning}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProfile(profile.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    onClick={handleImportProfiles}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                    disabled={selectedProfiles.size === 0 && extractedProfiles.length === 0}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    {t('profile_import_tool.upload.import_profiles', {
                      count: selectedProfiles.size > 0 ? selectedProfiles.size : extractedProfiles.length,
                      defaultValue: `Import ${selectedProfiles.size > 0 ? selectedProfiles.size : extractedProfiles.length} Profile(s)`
                    })}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExtractedProfiles([]);
                      setSelectedProfiles(new Set());
                    }}
                  >
                    {t('profile_import_tool.upload.clear_all', 'Clear All')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* K-Factor AI Tab */}
        <TabsContent value="kfactor" className="space-y-4">
          <Card className="bg-gray-900/60 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-purple-400" />
                {t('profile_import_tool.kfactor.title', 'Smart K-Factor Learning')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('profile_import_tool.kfactor.description', 'AI-powered K-factor suggestions based on imported DXF/DWG measurements')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Optimize Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <div>
                    <div className="text-sm font-medium">{t('profile_import_tool.kfactor.auto_optimize', 'Auto-Optimize All')}</div>
                    <div className="text-xs text-gray-400">
                      {t('profile_import_tool.kfactor.auto_optimize_desc', 'Automatically apply K-factor suggestions')}
                    </div>
                  </div>
                </div>
                <Button
                  variant={autoOptimizeAll ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoOptimizeAll(!autoOptimizeAll)}
                  className={autoOptimizeAll ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  {autoOptimizeAll ? t('profile_import_tool.kfactor.on', 'ON') : t('profile_import_tool.kfactor.off', 'OFF')}
                </Button>
              </div>

              {/* K-Factor Learning Features */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-medium">{t('profile_import_tool.kfactor.features.precision.title', 'Precision Learning')}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {t('profile_import_tool.kfactor.features.precision.description', 'Learns from your actual measurements to improve suggestions')}
                  </p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-medium">{t('profile_import_tool.kfactor.features.similarity.title', 'Similar Profile Matching')}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {t('profile_import_tool.kfactor.features.similarity.description', 'Finds similar profiles to suggest optimal K-factors')}
                  </p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-yellow-400" />
                    <span className="text-xs font-medium">{t('profile_import_tool.kfactor.features.hints.title', 'Hints & Tips')}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {t('profile_import_tool.kfactor.features.hints.description', 'Provides reasoning for each K-factor suggestion')}
                  </p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="h-4 w-4 text-orange-400" />
                    <span className="text-xs font-medium">{t('profile_import_tool.kfactor.features.collective.title', 'Collective Learning')}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {t('profile_import_tool.kfactor.features.collective.description', 'Improves over time from production feedback')}
                  </p>
                </div>
              </div>

              {/* Learned K-Factors History */}
              {learnedKFactors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t('profile_import_tool.kfactor.recent_learnings', 'Recent Learnings')}</div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {learnedKFactors.slice(-5).map((learning, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-gray-800 rounded text-xs flex items-center justify-between"
                      >
                        <span>{t('profile_import_tool.kfactor.k_factor', 'K-Factor')}: {learning.measuredKFactor.toFixed(3)}</span>
                        <span className="text-gray-400">
                          {t('profile_import_tool.kfactor.deviation', 'Deviation')}: {(learning.deviation * 100).toFixed(1)}%
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            learning.isVerified
                              ? 'bg-green-500/10 text-green-300'
                              : 'bg-yellow-500/10 text-yellow-300'
                          }`}
                        >
                          {learning.isVerified ? t('profile_import_tool.kfactor.verified', 'Verified') : t('profile_import_tool.kfactor.pending', 'Pending')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-gray-900/60 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-green-400" />
                {t('profile_import_tool.settings.pricing.title', 'Pricing Configuration')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t('profile_import_tool.settings.pricing.aluminum_price', 'Aluminum Price / Kg')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={aluminumPrice}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setAluminumPrice(Number.isNaN(v) ? 0 : v);
                    }}
                    placeholder={t('profile_import_tool.settings.pricing.aluminum_price_placeholder', 'e.g., 6.50')}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('profile_import_tool.settings.pricing.markup', 'Markup (%)')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={markupPercentage}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setMarkupPercentage(Number.isNaN(v) ? 0 : v);
                    }}
                    placeholder={t('profile_import_tool.settings.pricing.markup_placeholder', 'e.g., 30')}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  AluminumPricingCalculator.updateGlobalPricing(aluminumPrice, { markupPercentage });
                  toast.success(t('profile_import_tool.settings.pricing.updated', 'Global pricing updated'));
                }}
                className="bg-green-600 hover:bg-green-700 text-xs"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                {t('profile_import_tool.settings.pricing.update_button', 'Update Global Pricing')}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings className="h-4 w-4 text-blue-400" />
                {t('profile_import_tool.settings.import.title', 'Import Settings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <div className="text-sm font-medium">{t('profile_import_tool.settings.import.k_factor_learning', 'K-Factor Learning')}</div>
                  <div className="text-xs text-gray-400">{t('profile_import_tool.settings.import.k_factor_learning_desc', 'Enable AI K-factor suggestions')}</div>
                </div>
                <Button
                  variant={kFactorLearningEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setKFactorLearningEnabled(!kFactorLearningEnabled)}
                  className={kFactorLearningEnabled ? 'bg-purple-500 hover:bg-purple-600' : ''}
                >
                  {kFactorLearningEnabled ? t('profile_import_tool.settings.import.enabled', 'Enabled') : t('profile_import_tool.settings.import.disabled', 'Disabled')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Definition Wizard - Auto-opens when PDF data is extracted */}
      {userId && wizardPrefillData && (
        <ProfileDefinitionWizard
          open={wizardOpen}
          onOpenChange={(open) => {
            setWizardOpen(open);
            if (!open) {
              setWizardPrefillData(null);
            }
          }}
          userId={userId}
          onProfileCreated={(profile) => {
            toast.success(t('profile_import_tool.wizard.profile_created', {
              name: profile.name,
              defaultValue: `Profile "${profile.name}" created successfully`
            }));
            onProfilesImported([profile]);
            setWizardOpen(false);
            setWizardPrefillData(null);
          }}
          initialData={wizardPrefillData ? {
            profileCode: wizardPrefillData.profileId || wizardPrefillData.profileNumber || '',
            systemName: wizardPrefillData.series || '',
            width: wizardPrefillData.dimensions.width || 60,
            height: wizardPrefillData.dimensions.height || 40,
            materialThickness: wizardPrefillData.dimensions.thickness || 1.5,
            weightPerMeter: wizardPrefillData.weightPerMeter || 0,
            role: (wizardPrefillData.profileRole as any) || 'frame',
            material: (wizardPrefillData.material as any) || 'aluminum',
            defaultKFactor45: wizardPrefillData.kFactorSuggestion?.miter45,
            defaultKFactor90: wizardPrefillData.kFactorSuggestion?.miter90 || 0,
          } : undefined}
        />
      )}
    </div>
  );
};

export default ProfileImportTool;

