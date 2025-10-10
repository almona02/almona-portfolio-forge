import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  Award,
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  Settings,
  Globe,
  Factory,
  Zap,
  Gauge,
  Lock,
  Eye,
  Star,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { track } from '@/lib/analytics';

// EU Standards and Certifications
interface EUStandard {
  id: string;
  code: string;
  title: string;
  titleFr: string;
  titleDe: string;
  category: 'safety' | 'environmental' | 'quality' | 'performance' | 'electrical';
  description: string;
  applicableProducts: string[];
  requirements: string[];
  testingRequired: boolean;
  validityPeriod: string;
  renewalRequired: boolean;
  authority: string;
  cost: {
    initial: number;
    renewal: number;
    currency: 'EUR';
  };
  processingTime: string;
  documents: string[];
}

interface CEMark {
  productId: string;
  productName: string;
  manufacturer: string;
  authorizedRepresentative: string;
  standards: string[];
  declarationOfConformity: {
    number: string;
    date: string;
    validUntil: string;
    signedBy: string;
  };
  technicalFile: {
    available: boolean;
    lastUpdated: string;
    documents: string[];
  };
  status: 'valid' | 'expired' | 'pending' | 'suspended';
}

interface ComplianceAssessment {
  productId: string;
  productName: string;
  targetMarkets: string[];
  requiredStandards: string[];
  currentCompliance: {
    standardId: string;
    status: 'compliant' | 'non-compliant' | 'pending' | 'not-assessed';
    validUntil?: string;
    gaps?: string[];
  }[];
  overallScore: number;
  priority: 'high' | 'medium' | 'low';
  recommendedActions: string[];
  estimatedCost: number;
  estimatedTime: string;
}

// Mock data for EU standards
const EU_STANDARDS: EUStandard[] = [
  {
    id: 'en-12840',
    code: 'EN 12840',
    title: 'Aluminium and aluminium alloys - Test methods for aluminium and aluminium alloys',
    titleFr: 'Aluminium et alliages d\'aluminium - Méthodes d\'essai pour l\'aluminium et alliages d\'aluminium',
    titleDe: 'Aluminium und Aluminiumlegierungen - Prüfverfahren für Aluminium und Aluminiumlegierungen',
    category: 'quality',
    description: 'Specifies test methods for determining mechanical and physical properties of aluminium products',
    applicableProducts: ['CNC Machines', 'Cutting Equipment', 'Window Systems'],
    requirements: [
      'Tensile strength testing',
      'Hardness measurement',
      'Chemical composition analysis',
      'Surface quality assessment'
    ],
    testingRequired: true,
    validityPeriod: '3 years',
    renewalRequired: true,
    authority: 'CEN (European Committee for Standardization)',
    cost: { initial: 2500, renewal: 1200, currency: 'EUR' },
    processingTime: '6-8 weeks',
    documents: ['Technical specifications', 'Test reports', 'Quality manual']
  },
  {
    id: 'en-1090',
    code: 'EN 1090',
    title: 'Execution of steel structures and aluminium structures',
    titleFr: 'Exécution des structures en acier et des structures en aluminium',
    titleDe: 'Ausführung von Stahlbauten und Aluminiumbauten',
    category: 'safety',
    description: 'Requirements for conformity assessment of structural components',
    applicableProducts: ['Aluminium Profiles', 'Window Systems', 'Structural Components'],
    requirements: [
      'Factory production control',
      'Initial type testing',
      'Continuous surveillance',
      'Traceability system'
    ],
    testingRequired: true,
    validityPeriod: 'Permanent (with surveillance)',
    renewalRequired: false,
    authority: 'Notified Body',
    cost: { initial: 8500, renewal: 2000, currency: 'EUR' },
    processingTime: '12-16 weeks',
    documents: ['Factory production control manual', 'Test certificates', 'Surveillance reports']
  },
  {
    id: 'en-60204',
    code: 'EN 60204-1',
    title: 'Safety of machinery - Electrical equipment of machines',
    titleFr: 'Sécurité des machines - Équipement électrique des machines',
    titleDe: 'Sicherheit von Maschinen - Elektrische Ausrüstung von Maschinen',
    category: 'electrical',
    description: 'General requirements for electrical equipment of machines',
    applicableProducts: ['CNC Machines', 'Cutting Equipment', 'Industrial Machinery'],
    requirements: [
      'Electrical protection measures',
      'Control system safety',
      'Emergency stop systems',
      'Electrical documentation'
    ],
    testingRequired: true,
    validityPeriod: '5 years',
    renewalRequired: true,
    authority: 'Accredited Testing Laboratory',
    cost: { initial: 4200, renewal: 2100, currency: 'EUR' },
    processingTime: '8-10 weeks',
    documents: ['Electrical schematics', 'Risk assessment', 'Test protocols']
  },
  {
    id: 'iso-14001',
    code: 'ISO 14001',
    title: 'Environmental management systems - Requirements with guidance for use',
    titleFr: 'Systèmes de management environnemental - Exigences et lignes directrices pour son utilisation',
    titleDe: 'Umweltmanagementsysteme - Anforderungen mit Anleitung zur Anwendung',
    category: 'environmental',
    description: 'International standard for environmental management systems',
    applicableProducts: ['All Products'],
    requirements: [
      'Environmental policy',
      'Environmental aspects identification',
      'Legal compliance',
      'Continuous improvement'
    ],
    testingRequired: false,
    validityPeriod: '3 years',
    renewalRequired: true,
    authority: 'Accredited Certification Body',
    cost: { initial: 6500, renewal: 3200, currency: 'EUR' },
    processingTime: '10-12 weeks',
    documents: ['Environmental manual', 'Procedures', 'Audit reports']
  }
];

const mockCEMarks: CEMark[] = [
  {
    productId: 'prod-001',
    productName: 'YILMAZ KM-212 CNC Machine',
    manufacturer: 'YILMAZ Machine Tools',
    authorizedRepresentative: 'Almona Industrial EU Representative',
    standards: ['EN 60204-1', 'EN 12100', 'EN ISO 13849-1'],
    declarationOfConformity: {
      number: 'DOC-KM212-2024-001',
      date: '2024-01-15',
      validUntil: '2029-01-15',
      signedBy: 'Ahmed Yilmaz, Technical Director'
    },
    technicalFile: {
      available: true,
      lastUpdated: '2024-01-15',
      documents: ['Risk Assessment', 'Test Reports', 'Installation Manual', 'User Manual']
    },
    status: 'valid'
  }
];

/**
 * EU Industrial Standards Component
 * 
 * Comprehensive EU compliance and standards management for industrial equipment.
 * Features:
 * - CE marking management and tracking
 * - EU standards compliance assessment
 * - Multi-language documentation (EN/FR/DE)
 * - Compliance gap analysis
 * - Certification cost estimation
 * - Regulatory authority contacts
 * - Market-specific requirements
 */
export const EUIndustrialStandards: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCountry, setSelectedCountry] = useState('Germany');
  const [selectedProduct, setSelectedProduct] = useState('CNC Machines');
  const [complianceAssessment, setComplianceAssessment] = useState<ComplianceAssessment | null>(null);

  useEffect(() => {
    track('eu_industrial_standards_viewed', {
      language: i18n.language,
      country: selectedCountry,
      product: selectedProduct,
      timestamp: Date.now()
    });
  }, [i18n.language, selectedCountry, selectedProduct]);

  const generateComplianceAssessment = () => {
    // Mock compliance assessment generation
    const assessment: ComplianceAssessment = {
      productId: 'prod-001',
      productName: selectedProduct,
      targetMarkets: [selectedCountry, 'France', 'Netherlands'],
      requiredStandards: ['EN 12840', 'EN 1090', 'EN 60204-1'],
      currentCompliance: [
        { standardId: 'EN 12840', status: 'compliant', validUntil: '2026-05-15' },
        { standardId: 'EN 1090', status: 'pending', gaps: ['Factory production control manual', 'Initial type testing'] },
        { standardId: 'EN 60204-1', status: 'non-compliant', gaps: ['Emergency stop certification', 'Electrical documentation'] }
      ],
      overallScore: 67,
      priority: 'high',
      recommendedActions: [
        'Complete EN 1090 factory production control certification',
        'Update electrical documentation for EN 60204-1 compliance',
        'Schedule third-party testing for electrical safety',
        'Prepare technical file for CE marking'
      ],
      estimatedCost: 15200,
      estimatedTime: '16-20 weeks'
    };

    setComplianceAssessment(assessment);
    
    track('eu_compliance_assessment_generated', {
      productId: assessment.productId,
      overallScore: assessment.overallScore,
      estimatedCost: assessment.estimatedCost,
      timestamp: Date.now()
    });
  };

  const getStandardTitle = (standard: EUStandard) => {
    switch (i18n.language) {
      case 'fr': return standard.titleFr;
      case 'de': return standard.titleDe;
      default: return standard.title;
    }
  };

  const StandardsOverview = () => (
    <div className="space-y-6">
      {/* Market Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            EU Market Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Target EU Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                  <SelectItem value="France">🇫🇷 France</SelectItem>
                  <SelectItem value="Netherlands">🇳🇱 Netherlands</SelectItem>
                  <SelectItem value="Italy">🇮🇹 Italy</SelectItem>
                  <SelectItem value="Spain">🇪🇸 Spain</SelectItem>
                  <SelectItem value="Belgium">🇧🇪 Belgium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product Category</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNC Machines">CNC Machines</SelectItem>
                  <SelectItem value="Cutting Equipment">Cutting Equipment</SelectItem>
                  <SelectItem value="Window Systems">Window Systems</SelectItem>
                  <SelectItem value="Aluminum Profiles">Aluminum Profiles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standards Categories */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {['safety', 'environmental', 'quality', 'performance', 'electrical'].map((category) => {
          const categoryStandards = EU_STANDARDS.filter(s => s.category === category);
          const categoryIcons = {
            safety: Shield,
            environmental: Globe,
            quality: Award,
            performance: Gauge,
            electrical: Zap
          };
          const Icon = categoryIcons[category as keyof typeof categoryIcons];

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{categoryStandards.length}</p>
                  <p className="text-sm text-muted-foreground">
                    Standards applicable to {selectedProduct}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {categoryStandards.filter(s => s.testingRequired).length} require testing
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Compliance Assessment CTA */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Get personalized compliance roadmap</p>
              <p className="text-sm text-muted-foreground">
                Analyze your products against EU standards for {selectedCountry}
              </p>
            </div>
            <Button onClick={generateComplianceAssessment}>
              Generate Assessment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Assessment Results */}
      {complianceAssessment && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Assessment Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Overall Compliance Score</span>
              <div className="flex items-center gap-2">
                <Progress value={complianceAssessment.overallScore} className="w-24" />
                <span className="font-bold">{complianceAssessment.overallScore}%</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Standards Compliance Status</h4>
              {complianceAssessment.currentCompliance.map((compliance, index) => {
                const standard = EU_STANDARDS.find(s => s.id === compliance.standardId);
                const statusColors = {
                  compliant: 'bg-green-100 text-green-800',
                  'non-compliant': 'bg-red-100 text-red-800',
                  pending: 'bg-yellow-100 text-yellow-800',
                  'not-assessed': 'bg-gray-100 text-gray-800'
                };

                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{standard?.code}</span>
                      <p className="text-sm text-muted-foreground">
                        {getStandardTitle(standard!)}
                      </p>
                      {compliance.gaps && (
                        <p className="text-xs text-red-600 mt-1">
                          Gaps: {compliance.gaps.join(', ')}
                        </p>
                      )}
                    </div>
                    <Badge className={statusColors[compliance.status]}>
                      {compliance.status.replace('-', ' ')}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Recommended Actions</h4>
              {complianceAssessment.recommendedActions.map((action, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <span className="text-sm">{action}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="font-medium">Estimated Cost: €{complianceAssessment.estimatedCost.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Timeline: {complianceAssessment.estimatedTime}</p>
              </div>
              <Button>
                Start Compliance Process
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const StandardsLibrary = () => (
    <div className="space-y-4">
      {EU_STANDARDS.map((standard) => (
        <Card key={standard.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{standard.code}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {getStandardTitle(standard)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{standard.category}</Badge>
                {standard.testingRequired && (
                  <Badge variant="secondary">Testing Required</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm">{standard.description}</p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-sm mb-2">Requirements</h4>
                  <ul className="text-sm space-y-1">
                    {standard.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Authority:</span>
                    <span className="font-medium">{standard.authority}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing Time:</span>
                    <span className="font-medium">{standard.processingTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cost:</span>
                    <span className="font-medium">€{standard.cost.initial.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Validity:</span>
                    <span className="font-medium">{standard.validityPeriod}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  View Details
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download Standard
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Official Source
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const CEMarking = () => (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          CE marking is mandatory for many products sold in the European Economic Area (EEA). 
          It indicates conformity with health, safety, and environmental protection standards.
        </AlertDescription>
      </Alert>

      {mockCEMarks.map((ceMark) => (
        <Card key={ceMark.productId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  {ceMark.productName}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manufacturer: {ceMark.manufacturer}
                </p>
              </div>
              <Badge 
                variant={ceMark.status === 'valid' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {ceMark.status === 'valid' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {ceMark.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-sm mb-2">Declaration of Conformity</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Number:</span>
                    <span className="font-medium">{ceMark.declarationOfConformity.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">{ceMark.declarationOfConformity.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valid Until:</span>
                    <span className="font-medium">{ceMark.declarationOfConformity.validUntil}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Signed By:</span>
                    <span className="font-medium">{ceMark.declarationOfConformity.signedBy}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Applicable Standards</h4>
                <div className="space-y-1">
                  {ceMark.standards.map((standardCode, index) => (
                    <Badge key={index} variant="outline" className="mr-1 mb-1">
                      {standardCode}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Technical File</h4>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <span className="text-sm">
                    {ceMark.technicalFile.available ? 'Available' : 'Not Available'}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {ceMark.technicalFile.lastUpdated}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View File
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                Declaration PDF
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Update Documents
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Manage CE Mark
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const RegulatoryContacts = () => (
    <div className="space-y-4">
      {[
        {
          country: 'Germany',
          flag: '🇩🇪',
          authority: 'Bundesanstalt für Arbeitsschutz und Arbeitsmedizin (BAuA)',
          website: 'www.baua.de',
          email: 'info@baua.bund.de',
          phone: '+49 231 9071-0',
          address: 'Friedrich-Henkel-Weg 1-25, 44149 Dortmund',
          specialization: 'Machine Safety, CE Marking'
        },
        {
          country: 'France',
          flag: '🇫🇷',
          authority: 'Direction Générale des Entreprises (DGE)',
          website: 'www.entreprises.gouv.fr',
          email: 'contact@dge.gouv.fr',
          phone: '+33 1 43 19 20 21',
          address: '61 boulevard Vincent Auriol, 75703 Paris',
          specialization: 'Industrial Standards, Product Safety'
        },
        {
          country: 'Netherlands',
          flag: '🇳🇱',
          authority: 'Rijksdienst voor Ondernemend Nederland (RVO)',
          website: 'www.rvo.nl',
          email: 'info@rvo.nl',
          phone: '+31 88 042 42 42',
          address: 'Prinses Beatrixlaan 2, 2595 AL Den Haag',
          specialization: 'CE Marking, Market Surveillance'
        }
      ].map((contact, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{contact.flag}</span>
              {contact.country}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm">{contact.authority}</h4>
                <p className="text-sm text-muted-foreground">{contact.specialization}</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <a href={`https://${contact.website}`} className="text-blue-600 hover:underline">
                    {contact.website}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                    {contact.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{contact.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>{contact.address}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            EU Industrial Standards
          </h2>
          <p className="text-muted-foreground">
            European compliance and certification management for industrial equipment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            EU Market Ready
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            CE Compliant
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="standards">Standards Library</TabsTrigger>
          <TabsTrigger value="ce-marking">CE Marking</TabsTrigger>
          <TabsTrigger value="contacts">Regulatory Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <StandardsOverview />
        </TabsContent>

        <TabsContent value="standards">
          <StandardsLibrary />
        </TabsContent>

        <TabsContent value="ce-marking">
          <CEMarking />
        </TabsContent>

        <TabsContent value="contacts">
          <RegulatoryContacts />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EUIndustrialStandards;