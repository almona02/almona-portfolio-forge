import React, { useState } from "react";
import { LazyMotionDiv } from '@/utils/lazyMotion';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Textarea } from "@/shared/ui/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Users, 
  Wrench, 
  MessageSquare,
  Video,
  FileText,
  Download,
  Star,
  CheckCircle,
  AlertCircle,
  Globe,
  Truck,
  Shield,
  Zap
} from "lucide-react";

interface SupportCenter {
  id: string;
  name: string;
  nameAr: string;
  type: 'main' | 'regional' | 'specialized';
  location: string;
  locationAr: string;
  phone: string;
  email: string;
  services: string[];
  workingHours: string;
  languages: string[];
  specialties: string[];
  rating: number;
  responseTime: string;
}

interface SupportRequest {
  name: string;
  email: string;
  phone: string;
  company: string;
  machineModel: string;
  issueType: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  preferredContact: 'phone' | 'email' | 'whatsapp';
}

const EgyptianTechnicalSupportHub = () => {
  const [activeTab, setActiveTab] = useState('centers');
  const [selectedCenter, setSelectedCenter] = useState<SupportCenter | null>(null);
  const [supportRequest, setSupportRequest] = useState<SupportRequest>({
    name: '',
    email: '',
    phone: '',
    company: '',
    machineModel: '',
    issueType: '',
    description: '',
    urgency: 'medium',
    preferredContact: 'phone'
  });

  const supportCenters: SupportCenter[] = [
    {
      id: 'cairo-main',
      name: 'Cairo Main Technical Center',
      nameAr: 'المركز الفني الرئيسي بالقاهرة',
      type: 'main',
      location: 'Nasr City, Cairo',
      locationAr: 'مدينة نصر، القاهرة',
      phone: '+20 2 2274 0000',
      email: 'support.cairo@almona.com',
      services: ['Installation', 'Maintenance', 'Training', 'Spare Parts', 'Emergency Support'],
      workingHours: '24/7 Emergency, 8AM-6PM Regular',
      languages: ['Arabic', 'English', 'French'],
      specialties: ['CNC Machines', 'Cutting Equipment', 'Welding Systems', 'Processing Centers'],
      rating: 4.8,
      responseTime: '< 2 hours'
    },
    {
      id: 'alexandria-regional',
      name: 'Alexandria Regional Center',
      nameAr: 'المركز الإقليمي بالإسكندرية',
      type: 'regional',
      location: 'Smouha, Alexandria',
      locationAr: 'سموحة، الإسكندرية',
      phone: '+20 3 429 0000',
      email: 'support.alexandria@almona.com',
      services: ['Maintenance', 'Training', 'Spare Parts', 'Consultation'],
      workingHours: '8AM-6PM (Sat-Thu)',
      languages: ['Arabic', 'English'],
      specialties: ['Marine Equipment', 'Port Machinery', 'Industrial Automation'],
      rating: 4.6,
      responseTime: '< 4 hours'
    },
    {
      id: 'giza-specialized',
      name: 'Giza Specialized CNC Center',
      nameAr: 'مركز CNC المتخصص بالجيزة',
      type: 'specialized',
      location: '6th October City, Giza',
      locationAr: 'مدينة 6 أكتوبر، الجيزة',
      phone: '+20 2 3837 0000',
      email: 'cnc.giza@almona.com',
      services: ['CNC Programming', 'Advanced Training', 'Custom Solutions', 'Software Support'],
      workingHours: '8AM-5PM (Sat-Thu)',
      languages: ['Arabic', 'English', 'German'],
      specialties: ['CNC Machining', 'CAD/CAM', 'Automation Systems', 'Precision Tools'],
      rating: 4.9,
      responseTime: '< 1 hour'
    }
  ];

  const quickSupportOptions = [
    {
      id: 'emergency',
      title: 'Emergency Support',
      titleAr: 'الدعم الطارئ',
      description: '24/7 emergency technical support for critical issues',
      icon: <AlertCircle className="h-6 w-6" />,
      responseTime: '< 30 minutes',
      phone: '+20 2 2274 0000',
      color: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    {
      id: 'remote',
      title: 'Remote Support',
      titleAr: 'الدعم عن بُعد',
      description: 'Remote diagnostics and troubleshooting via video call',
      icon: <Video className="h-6 w-6" />,
      responseTime: '< 2 hours',
      phone: '+20 2 2274 0001',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    },
    {
      id: 'training',
      title: 'Training Support',
      titleAr: 'دعم التدريب',
      description: 'Operator training and certification programs',
      icon: <Users className="h-6 w-6" />,
      responseTime: '< 24 hours',
      phone: '+20 2 2274 0002',
      color: 'bg-green-500/20 text-green-400 border-green-500/30'
    },
    {
      id: 'parts',
      title: 'Parts & Service',
      titleAr: 'قطع الغيار والخدمة',
      description: 'Genuine spare parts and maintenance services',
      icon: <Wrench className="h-6 w-6" />,
      responseTime: '< 4 hours',
      phone: '+20 2 2274 0003',
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    }
  ];

  const supportStats = [
    { label: 'Response Time', value: '< 2 hours', icon: <Clock className="h-5 w-5" /> },
    { label: 'Success Rate', value: '98.5%', icon: <CheckCircle className="h-5 w-5" /> },
    { label: 'Customer Rating', value: '4.8/5', icon: <Star className="h-5 w-5" /> },
    { label: 'Languages', value: '3+', icon: <Globe className="h-5 w-5" /> }
  ];

  const handleSupportRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Support request submitted:', supportRequest);
    // Reset form
    setSupportRequest({
      name: '',
      email: '',
      phone: '',
      company: '',
      machineModel: '',
      issueType: '',
      description: '',
      urgency: 'medium',
      preferredContact: 'phone'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'main': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'regional': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'specialized': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <LazyMotionDiv
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Wrench className="h-12 w-12 text-amber-400" />
          <h1 className="typography-h1 md:text-5xl">
            <span className="text-gradient-orange">Egyptian Technical Support Hub</span>
          </h1>
        </div>
        <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-6">
          Comprehensive technical support network across Egypt with local experts, service centers, and 24/7 emergency assistance
        </p>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {supportStats.map((stat, index) => (
            <Card key={index} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {stat.icon}
                  <div className="text-2xl font-bold text-amber-400">{stat.value}</div>
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </LazyMotionDiv>

      {/* Quick Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickSupportOptions.map((option) => (
          <LazyMotionDiv
            key={option.id}
            whileHover={{ scale: 1.05 }}
            className="cursor-pointer"
          >
            <Card className={`${option.color} border-2 hover:border-opacity-60 transition-all`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {option.icon}
                  <div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                    <p className="text-sm opacity-80">{option.titleAr}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3 opacity-90">{option.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{option.responseTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    <span>{option.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </LazyMotionDiv>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="centers">Support Centers</TabsTrigger>
          <TabsTrigger value="request">Request Support</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Support Centers Tab */}
        <TabsContent value="centers" className="space-y-6">
          <div className="grid gap-4">
            {supportCenters.map((center) => (
              <LazyMotionDiv
                key={center.id}
                whileHover={{ scale: 1.02 }}
                className="cursor-pointer"
                onClick={() => setSelectedCenter(center)}
              >
                <Card className="bg-gray-800/50 border-gray-700 transition-colors card-premium">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{center.name}</CardTitle>
                        <p className="text-sm text-gray-400">{center.nameAr}</p>
                        <p className="text-sm text-gray-500 mt-1">{center.location} • {center.locationAr}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getTypeColor(center.type)}>
                          {center.type}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm">{center.rating}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="typography-h4 text-sm mb-2">Services:</h4>
                          <div className="flex flex-wrap gap-1">
                            {center.services.map((service) => (
                              <Badge key={service} variant="outline" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="typography-h4 text-sm mb-2">Specialties:</h4>
                          <div className="flex flex-wrap gap-1">
                            {center.specialties.map((specialty) => (
                              <Badge key={specialty} variant="outline" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-amber-400" />
                          <span>{center.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-amber-400" />
                          <span>{center.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-amber-400" />
                          <span>{center.workingHours}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Zap className="h-4 w-4 text-amber-400" />
                          <span>Response: {center.responseTime}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </LazyMotionDiv>
            ))}
          </div>
        </TabsContent>

        {/* Request Support Tab */}
        <TabsContent value="request" className="space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-amber-400" />
                Submit Support Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSupportRequestSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Full Name *</label>
                    <Input
                      value={supportRequest.name}
                      onChange={(e) => setSupportRequest(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Email Address *</label>
                    <Input
                      type="email"
                      value={supportRequest.email}
                      onChange={(e) => setSupportRequest(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Phone Number *</label>
                    <Input
                      value={supportRequest.phone}
                      onChange={(e) => setSupportRequest(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+20 10 0000 0000"
                      required
                    />
                  </div>
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Company Name</label>
                    <Input
                      value={supportRequest.company}
                      onChange={(e) => setSupportRequest(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Machine Model *</label>
                    <Input
                      value={supportRequest.machineModel}
                      onChange={(e) => setSupportRequest(prev => ({ ...prev, machineModel: e.target.value }))}
                      placeholder="e.g., YILMAZ CNC-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Issue Type *</label>
                    <select
                      value={supportRequest.issueType}
                      onChange={(e) => setSupportRequest(prev => ({ ...prev, issueType: e.target.value }))}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      required
                    >
                      <option value="">Select issue type</option>
                      <option value="installation">Installation</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="repair">Repair</option>
                      <option value="training">Training</option>
                      <option value="parts">Parts & Spares</option>
                      <option value="software">Software Support</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="typography-label block text-sm font-medium mb-2">Issue Description *</label>
                  <Textarea
                    value={supportRequest.description}
                    onChange={(e) => setSupportRequest(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Please describe the issue in detail..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Urgency Level *</label>
                    <select
                      value={supportRequest.urgency}
                      onChange={(e) => setSupportRequest(prev => ({ ...prev, urgency: e.target.value as any }))}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      required
                    >
                      <option value="low">Low - Can wait 24-48 hours</option>
                      <option value="medium">Medium - Can wait 4-8 hours</option>
                      <option value="high">High - Needs attention within 2 hours</option>
                      <option value="critical">Critical - Emergency, immediate attention</option>
                    </select>
                  </div>
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Preferred Contact Method *</label>
                    <select
                      value={supportRequest.preferredContact}
                      onChange={(e) => setSupportRequest(prev => ({ ...prev, preferredContact: e.target.value as any }))}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      required
                    >
                      <option value="phone">Phone Call</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge className={getUrgencyColor(supportRequest.urgency)}>
                    {supportRequest.urgency.toUpperCase()} Priority
                  </Badge>
                  <span className="text-sm text-gray-400">
                    Expected response time: {
                      supportRequest.urgency === 'critical' ? '< 30 minutes' :
                      supportRequest.urgency === 'high' ? '< 2 hours' :
                      supportRequest.urgency === 'medium' ? '< 4 hours' :
                      '< 24 hours'
                    }
                  </span>
                </div>

                <Button type="submit" className="btn-primary">
                  Submit Support Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-amber-400" />
                  Documentation & Manuals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                    <span className="text-sm">User Manuals (Arabic)</span>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                    <span className="text-sm">Installation Guides</span>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                    <span className="text-sm">Maintenance Schedules</span>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                    <span className="text-sm">Safety Procedures</span>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-6 w-6 text-amber-400" />
                  Training Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                    <span className="text-sm">Basic Operation Training</span>
                    <Button size="sm" variant="outline">
                      <Video className="h-4 w-4 mr-2" />
                      Watch
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                    <span className="text-sm">Advanced Programming</span>
                    <Button size="sm" variant="outline">
                      <Video className="h-4 w-4 mr-2" />
                      Watch
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                    <span className="text-sm">Troubleshooting Guide</span>
                    <Button size="sm" variant="outline">
                      <Video className="h-4 w-4 mr-2" />
                      Watch
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                    <span className="text-sm">Safety Training</span>
                    <Button size="sm" variant="outline">
                      <Video className="h-4 w-4 mr-2" />
                      Watch
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-amber-400" />
                Service Guarantees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700/30 rounded">
                  <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <h4 className="typography-h4 mb-1">Response Guarantee</h4>
                  <p className="text-sm text-gray-400">We guarantee response within our stated timeframes</p>
                </div>
                <div className="text-center p-4 bg-gray-700/30 rounded">
                  <Shield className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <h4 className="typography-h4 mb-1">Quality Assurance</h4>
                  <p className="text-sm text-gray-400">All work performed by certified technicians</p>
                </div>
                <div className="text-center p-4 bg-gray-700/30 rounded">
                  <Truck className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                  <h4 className="typography-h4 mb-1">Parts Availability</h4>
                  <p className="text-sm text-gray-400">Genuine parts available within 24-48 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Center Detail Modal */}
      {selectedCenter && (
        <LazyMotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCenter(null)}
        >
          <LazyMotionDiv
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="typography-h3">{selectedCenter.name}</h3>
                <p className="text-gray-400">{selectedCenter.nameAr}</p>
                <p className="text-sm text-gray-500">{selectedCenter.location}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCenter(null)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="typography-h4 mb-2">Contact Information:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-amber-400" />
                      <span>{selectedCenter.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-amber-400" />
                      <span>{selectedCenter.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-400" />
                      <span>{selectedCenter.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span>{selectedCenter.workingHours}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="typography-h4 mb-2">Center Details:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(selectedCenter.type)}>
                        {selectedCenter.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span>Rating: {selectedCenter.rating}/5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-400" />
                      <span>Response: {selectedCenter.responseTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-amber-400" />
                      <span>Languages: {selectedCenter.languages.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="typography-h4 mb-2">Services Offered:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCenter.services.map((service) => (
                    <Badge key={service} variant="outline">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="typography-h4 mb-2">Specialties:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCenter.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="btn-primary">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Now
                </Button>
                <Button variant="outline" className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>
          </LazyMotionDiv>
        </LazyMotionDiv>
      )}
    </div>
  );
};

export default EgyptianTechnicalSupportHub;
