import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import FileUploader from '@/components/used-machines/FileUploader';
import MachineSpecsForm from '@/components/used-machines/MachineSpecsForm';
import ContactVerification from '@/components/used-machines/ContactVerification';
import { ChevronRight, MapPin, Factory, Calendar, Gauge } from 'lucide-react';
import { usedMachines } from '@/data/usedMachines';

const UsedMachines = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const [verificationStep, setVerificationStep] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [machineTypeFilter, setMachineTypeFilter] = useState('all');

  const machineTypes = [
    { value: 'all', label: 'جميع الأنواع' },
    { value: 'copy-router', label: 'ماكينات نسخ' },
    { value: 'cutting', label: 'ماكينات قطع' },
    { value: 'cnc', label: 'مراكز CNC' },
    { value: 'welding', label: 'ماكينات لحام' },
    { value: 'corner-cleaning', label: 'تنظيف الزوايا' },
  ];

  const governorates = [
    'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Sharqia', 'Qalyubia',
    'Beheira', 'Minya', 'Gharbia', 'Sohag', 'Asyut', 'Monufia',
    'Qena', 'Faiyum', 'Kafr El Sheikh', 'Beni Suef', 'Port Said'
  ];

  const filteredMachines = usedMachines.filter(machine => {
    const matchesSearch = machine.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          machine.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === 'all' || machine.location === locationFilter;
    const matchesType = machineTypeFilter === 'all' || machine.type === machineTypeFilter;
    
    return matchesSearch && matchesLocation && matchesType;
  });

  const handleVerificationComplete = () => {
    setIsVerified(true);
    setVerificationStep(0);
  };

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="mb-12 text-center bg-gradient-to-r from-orange-900 to-orange-700 py-12 px-4 rounded-xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">سوق الماكينات المستعملة</span>
            </h1>
            <p className="text-xl text-orange-100 max-w-3xl mx-auto mb-8">
              منصة موثوقة لبيع وشراء ماكينات الألومنيوم واليو بي في سي المستعملة في مصر
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-orange-700 hover:bg-orange-100"
                onClick={() => setActiveTab('sell')}
              >
                بيع ماكيناتك المستعملة
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-white border-white hover:bg-orange-800"
              >
                احصل على استشارة مجانية
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-xl mx-auto mb-12" role="tablist" aria-label="Used Machines Tabs">
              <TabsTrigger value="browse" role="tab" aria-selected={activeTab === 'browse'} tabIndex={activeTab === 'browse' ? 0 : -1}>تصفح الماكينات</TabsTrigger>
              <TabsTrigger value="sell" role="tab" aria-selected={activeTab === 'sell'} tabIndex={activeTab === 'sell' ? 0 : -1}>بيع ماكينة</TabsTrigger>
            </TabsList>

            {/* Browse Machines Tab */}
            <TabsContent value="browse">
              <div className="mb-8 bg-almona-darker p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="ابحث عن ماكينة (نسخ، قطع، CNC...)"
                      className="bg-almona-dark border-almona-light text-right"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <Select onValueChange={setLocationFilter} value={locationFilter}>
                      <SelectTrigger className="bg-almona-dark border-almona-light text-right">
                        <SelectValue placeholder="جميع المحافظات" />
                      </SelectTrigger>
                      <SelectContent className="bg-almona-darker text-white">
                        <SelectItem value="all">جميع المحافظات</SelectItem>
                        {governorates.map(gov => (
                          <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select onValueChange={setMachineTypeFilter} value={machineTypeFilter}>
                      <SelectTrigger className="bg-almona-dark border-almona-light text-right">
                        <SelectValue placeholder="جميع الأنواع" />
                      </SelectTrigger>
                      <SelectContent className="bg-almona-darker text-white">
                        {machineTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {filteredMachines.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-400">لم يتم العثور على ماكينات تطابق بحثك</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setLocationFilter('all');
                      setMachineTypeFilter('all');
                    }}
                  >
                    مسح جميع الفلاتر
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredMachines.map(machine => (
                    <Card key={machine.id} className="bg-almona-darker border-almona-light overflow-hidden">
                      <div className="relative">
                        <div className="h-48 overflow-hidden">
                          <img 
                            src={machine.images[0]} 
                            alt={machine.title}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                          />
                        </div>
                        <Badge className="absolute top-2 left-2 bg-green-600">
                          {machine.condition === 'Excellent' ? 'ممتازة' : 'جيدة'}
                        </Badge>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-xl">{machine.title}</CardTitle>
                        <div className="flex justify-between items-center text-orange-400 font-bold text-lg">
                          {machine.price}
                          {machine.seller.verified && (
                            <Badge variant="secondary" className="bg-blue-600">
                              موثقة
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-400 mb-4">{machine.description}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                            <span>{machine.location}</span>
                          </div>
                          <div className="flex items-center">
                            <Factory className="w-4 h-4 mr-2 text-orange-500" />
                            <span>{machine.seller.name}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                            <span>سنة الصنع: {machine.year}</span>
                          </div>
                          <div className="flex items-center">
                            <Gauge className="w-4 h-4 mr-2 text-orange-500" />
                            <span>ساعات التشغيل: {machine.hours.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" className="border-orange-500 text-orange-500">
                          طلب معاينة
                        </Button>
                        <Button asChild>
                          <Link to={`/used-machines/${machine.id}`} className="flex items-center">
                            التفاصيل <ChevronRight className="w-4 h-4 mr-1" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}

              {/* Trust Badges */}
              <div className="mt-16 text-center">
                <h3 className="text-2xl font-semibold mb-6">لماذا تثق بمنصة ألمونا؟</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20">
                    <div className="text-5xl mb-4">🔍</div>
                    <h4 className="text-xl font-semibold mb-2">فحص فني دقيق</h4>
                    <p className="text-gray-400">
                      فريقنا الفني يفحص كل ماكينة قبل الموافقة على عرضها
                    </p>
                  </div>
                  <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20">
                    <div className="text-5xl mb-4">🤝</div>
                    <h4 className="text-xl font-semibold mb-2">ضمان التعامل الآمن</h4>
                    <p className="text-gray-400">
                      نظام دفاع آمن يحفظ حقوق البائع والمشتري حتى اكتمال الصفقة
                    </p>
                  </div>
                  <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20">
                    <div className="text-5xl mb-4">🚚</div>
                    <h4 className="text-xl font-semibold mb-2">خدمات لوجستية</h4>
                    <p className="text-gray-400">
                      ترتيب النقل والتركيب بأسعار تفضيلية مع شركائنا
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Sell Machine Tab */}
            <TabsContent value="sell">
              <div className="max-w-4xl mx-auto">
                <div className="bg-almona-darker rounded-xl p-6 mb-8">
                  <h2 className="text-2xl font-bold mb-6 text-center">بيع ماكينة مستعملة</h2>
                  
                  <div className="mb-8">
                    <Progress value={verificationStep === 0 ? 0 : verificationStep === 1 ? 33 : verificationStep === 2 ? 66 : 100} />
                    <div className="flex justify-between mt-2 text-sm text-gray-400">
                      <span>معلومات الماكينة</span>
                      <span>رفع الصور</span>
                      <span>معلومات البائع</span>
                      <span>مراجعة نهائية</span>
                    </div>
                  </div>

                  {verificationStep === 0 && (
                    <MachineSpecsForm onNext={() => setVerificationStep(1)} />
                  )}

                  {verificationStep === 1 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-4">رفع صور وفيديوهات الماكينة</h3>
                      <p className="text-gray-400 mb-6">
                        قم برفع صور واضحة من زوايا متعددة للماكينة، مع فيديو قصير يوضح عملها إن أمكن.
                        هذا يزيد من فرص بيع الماكينة بنسبة 70%.
                      </p>
                      <FileUploader />
                      <div className="flex justify-between mt-8">
                        <Button variant="outline" onClick={() => setVerificationStep(0)}>
                          رجوع
                        </Button>
                        <Button onClick={() => setVerificationStep(2)}>
                          التالي
                        </Button>
                      </div>
                    </div>
                  )}

                  {verificationStep === 2 && (
                    <ContactVerification 
                      onComplete={handleVerificationComplete} 
                      onBack={() => setVerificationStep(1)} 
                    />
                  )}

                  {isVerified && (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-4">🎉</div>
                      <h3 className="text-2xl font-bold mb-4">تم التسجيل بنجاح!</h3>
                      <p className="text-gray-400 mb-6">
                        فريق الفحص سيتواصل معك خلال 24 ساعة لتحديد موعد الفحص الفني. 
                        ستصلك رسالة على واتساب مع تفاصيل الفحص.
                      </p>
                      <Button onClick={() => {
                        setIsVerified(false);
                        setActiveTab('browse');
                      }}>
                        تصفح الماكينات الأخرى
                      </Button>
                    </div>
                  )}
                </div>

                {/* Seller Benefits */}
                <div className="bg-gradient-to-r from-orange-900 to-orange-800 p-8 rounded-xl">
                  <h3 className="text-xl font-semibold mb-4 text-center">مميزات البيع مع ألمونا</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <div className="bg-orange-600 p-2 rounded-full mr-3 mt-1">
                        <span className="text-white">1</span>
                      </div>
                      <p className="text-orange-100">
                        <span className="font-bold">فحص فني مجاني:</span> فريقنا الفني يزورك في المصنع لتقييم الماكينة
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-orange-600 p-2 rounded-full mr-3 mt-1">
                        <span className="text-white">2</span>
                      </div>
                      <p className="text-orange-100">
                        <span className="font-bold">تسويق مضمون:</span> نصل إلى أكثر من 5,000 صانع في مصر
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-orange-600 p-2 rounded-full mr-3 mt-1">
                        <span className="text-white">3</span>
                      </div>
                      <p className="text-orange-100">
                        <span className="font-bold">دعم لوجستي:</span> ترتيب النقل والتركيب بأسعار تفضيلية مع شركائنا
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UsedMachines;
