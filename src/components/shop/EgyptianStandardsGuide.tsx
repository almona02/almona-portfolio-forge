import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { 
  Shield, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Award,
  Building2,
  Factory,
  Zap,
  Globe,
  Phone,
  Mail,
  MapPin
} from "lucide-react";

interface EgyptianStandard {
  id: string;
  code: string;
  title: string;
  titleAr: string;
  category: 'safety' | 'environmental' | 'quality' | 'performance' | 'electrical';
  description: string;
  applicableProducts: string[];
  requirements: string[];
  testingRequired: boolean;
  validityPeriod: string;
  authority: string;
  cost: {
    initial: number;
    renewal: number;
    currency: 'EGP';
  };
  processingTime: string;
  documents: string[];
  status: 'mandatory' | 'recommended' | 'optional';
}

const EgyptianStandardsGuide = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStandard, setSelectedStandard] = useState<EgyptianStandard | null>(null);

  const egyptianStandards: EgyptianStandard[] = [
    {
      id: 'egs-001',
      code: 'EGS 1001-1',
      title: 'Industrial Machinery Safety Standards',
      titleAr: 'معايير السلامة للمعدات الصناعية',
      category: 'safety',
      description: 'Comprehensive safety requirements for industrial machinery operating in Egypt',
      applicableProducts: ['CNC Machines', 'Cutting Equipment', 'Welding Machines', 'Processing Centers'],
      requirements: [
        'Emergency stop mechanisms',
        'Safety guards and interlocks',
        'Electrical safety compliance',
        'Noise level limitations',
        'Operator training certification'
      ],
      testingRequired: true,
      validityPeriod: '3 years',
      authority: 'Egyptian Organization for Standardization (EOS)',
      cost: { initial: 15000, renewal: 8000, currency: 'EGP' },
      processingTime: '4-6 weeks',
      documents: ['Technical specifications', 'Safety test reports', 'User manual in Arabic', 'Installation certificate'],
      status: 'mandatory'
    },
    {
      id: 'egs-002',
      code: 'EGS 2001-2',
      title: 'Environmental Compliance Standards',
      titleAr: 'معايير الامتثال البيئي',
      category: 'environmental',
      description: 'Environmental impact assessment and compliance for industrial equipment',
      applicableProducts: ['All Industrial Machinery', 'Processing Equipment', 'Manufacturing Systems'],
      requirements: [
        'Emissions control systems',
        'Waste management protocols',
        'Energy efficiency certification',
        'Environmental impact assessment',
        'Carbon footprint documentation'
      ],
      testingRequired: true,
      validityPeriod: '2 years',
      authority: 'Ministry of Environment',
      cost: { initial: 12000, renewal: 6000, currency: 'EGP' },
      processingTime: '3-4 weeks',
      documents: ['Environmental impact report', 'Emissions test results', 'Energy efficiency certificate', 'Waste management plan'],
      status: 'mandatory'
    },
    {
      id: 'egs-003',
      code: 'EGS 3001-3',
      title: 'Quality Management Standards',
      titleAr: 'معايير إدارة الجودة',
      category: 'quality',
      description: 'Quality assurance and management system requirements',
      applicableProducts: ['All Industrial Products', 'Manufacturing Equipment', 'Service Equipment'],
      requirements: [
        'ISO 9001:2015 compliance',
        'Quality control procedures',
        'Supplier certification',
        'Customer satisfaction metrics',
        'Continuous improvement processes'
      ],
      testingRequired: false,
      validityPeriod: '3 years',
      authority: 'Egyptian Accreditation Council (EGAC)',
      cost: { initial: 20000, renewal: 10000, currency: 'EGP' },
      processingTime: '6-8 weeks',
      documents: ['Quality manual', 'Process documentation', 'Audit reports', 'Training records'],
      status: 'recommended'
    }
  ];

  const complianceSteps = [
    {
      step: 1,
      title: 'Initial Assessment',
      description: 'Evaluate your equipment against Egyptian standards',
      duration: '1-2 weeks',
      cost: 'Free consultation'
    },
    {
      step: 2,
      title: 'Documentation Preparation',
      description: 'Gather required technical documents and certificates',
      duration: '2-3 weeks',
      cost: 'Documentation fees apply'
    },
    {
      step: 3,
      title: 'Testing & Certification',
      description: 'Conduct required tests and obtain certifications',
      duration: '3-6 weeks',
      cost: 'Testing fees + certification costs'
    },
    {
      step: 4,
      title: 'Registration & Approval',
      description: 'Submit to authorities and obtain final approval',
      duration: '2-4 weeks',
      cost: 'Registration fees'
    }
  ];

  const regulatoryContacts = [
    {
      name: 'Egyptian Organization for Standardization',
      nameAr: 'الهيئة المصرية العامة للمواصفات والجودة',
      role: 'Standards Development & Certification',
      phone: '+20 2 2269 0000',
      email: 'info@eos.org.eg',
      address: '16 Tadreeb El-Modarrebeen St., Ameriya, Cairo',
      website: 'www.eos.org.eg'
    },
    {
      name: 'Ministry of Trade and Industry',
      nameAr: 'وزارة التجارة والصناعة',
      role: 'Industrial Licensing & Compliance',
      phone: '+20 2 2393 0000',
      email: 'info@mti.gov.eg',
      address: 'Ministry of Trade and Industry, Nasr City, Cairo',
      website: 'www.mti.gov.eg'
    },
    {
      name: 'Egyptian Accreditation Council',
      nameAr: 'المجلس المصري للاعتماد',
      role: 'Laboratory & Certification Body Accreditation',
      phone: '+20 2 2269 0000',
      email: 'info@egac.gov.eg',
      address: '16 Tadreeb El-Modarrebeen St., Ameriya, Cairo',
      website: 'www.egac.gov.eg'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mandatory': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'recommended': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'optional': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'safety': return <Shield className="h-5 w-5" />;
      case 'environmental': return <Globe className="h-5 w-5" />;
      case 'quality': return <Award className="h-5 w-5" />;
      case 'performance': return <Zap className="h-5 w-5" />;
      case 'electrical': return <Factory className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="h-12 w-12 text-orange-400" />
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="text-gradient-orange">Egyptian Standards Guide</span>
          </h1>
        </div>
        <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-6">
          Comprehensive guide to Egyptian industrial standards, certifications, and compliance requirements
        </p>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">15+</div>
              <div className="text-sm text-gray-400">Standards</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">3</div>
              <div className="text-sm text-gray-400">Authorities</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">4</div>
              <div className="text-sm text-gray-400">Steps</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">24/7</div>
              <div className="text-sm text-gray-400">Support</div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="standards">Standards Library</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Process</TabsTrigger>
          <TabsTrigger value="contacts">Regulatory Contacts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-orange-400" />
                Egyptian Industrial Standards Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Egyptian industrial standards ensure that all machinery and equipment imported or manufactured 
                in Egypt meets the highest levels of safety, quality, and environmental compliance. Our comprehensive 
                guide helps you navigate the complex regulatory landscape.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-orange-400">Key Benefits:</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Legal compliance and market access
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Enhanced product safety and reliability
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Competitive advantage in Egyptian market
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Reduced liability and insurance costs
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-orange-400">Our Services:</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Standards compliance assessment
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Documentation preparation support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Testing coordination and management
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Regulatory liaison and representation
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Standards Library Tab */}
        <TabsContent value="standards" className="space-y-6">
          <div className="grid gap-4">
            {egyptianStandards.map((standard) => (
              <motion.div
                key={standard.id}
                whileHover={{ scale: 1.02 }}
                className="cursor-pointer"
                onClick={() => setSelectedStandard(standard)}
              >
                <Card className="bg-gray-800/50 border-gray-700 hover:border-orange-500/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(standard.category)}
                        <div>
                          <CardTitle className="text-lg">{standard.title}</CardTitle>
                          <p className="text-sm text-gray-400">{standard.titleAr}</p>
                          <p className="text-xs text-gray-500 mt-1">Code: {standard.code}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(standard.status)}>
                        {standard.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-sm mb-3">{standard.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {standard.applicableProducts.slice(0, 3).map((product) => (
                        <Badge key={product} variant="outline" className="text-xs">
                          {product}
                        </Badge>
                      ))}
                      {standard.applicableProducts.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{standard.applicableProducts.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Compliance Process Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-orange-400" />
                Compliance Process Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {complianceSteps.map((step, index) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                        {step.step}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2">{step.title}</h4>
                      <p className="text-gray-300 mb-2">{step.description}</p>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {step.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {step.cost}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regulatory Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="grid gap-4">
            {regulatoryContacts.map((contact) => (
              <Card key={contact.name} className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">{contact.name}</CardTitle>
                  <p className="text-sm text-gray-400">{contact.nameAr}</p>
                  <Badge variant="outline" className="w-fit">
                    {contact.role}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-orange-400" />
                        <span>{contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-orange-400" />
                        <span>{contact.email}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-orange-400" />
                        <span>{contact.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-orange-400" />
                        <span>{contact.website}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Standard Detail Modal */}
      {selectedStandard && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedStandard(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getCategoryIcon(selectedStandard.category)}
                <div>
                  <h3 className="text-xl font-bold">{selectedStandard.title}</h3>
                  <p className="text-gray-400">{selectedStandard.titleAr}</p>
                  <p className="text-sm text-gray-500">Code: {selectedStandard.code}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStandard(null)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300">{selectedStandard.description}</p>
              
              <div>
                <h4 className="font-semibold mb-2">Requirements:</h4>
                <ul className="space-y-1">
                  {selectedStandard.requirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Cost:</h4>
                  <p className="text-sm text-gray-300">
                    Initial: {selectedStandard.cost.initial.toLocaleString()} {selectedStandard.cost.currency}
                  </p>
                  <p className="text-sm text-gray-300">
                    Renewal: {selectedStandard.cost.renewal.toLocaleString()} {selectedStandard.cost.currency}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Processing:</h4>
                  <p className="text-sm text-gray-300">{selectedStandard.processingTime}</p>
                  <p className="text-sm text-gray-300">Valid for: {selectedStandard.validityPeriod}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Required Documents:</h4>
                <ul className="space-y-1">
                  {selectedStandard.documents.map((doc, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                      <FileText className="h-4 w-4 text-orange-400" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default EgyptianStandardsGuide;
