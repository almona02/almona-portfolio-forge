import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { LazyMotionDiv } from '@/utils/lazyMotion';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface EnhancedQuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProducts?: Product[];
  initialServices?: Service[];
  relatedServiceTicketId?: string;
}

export const EnhancedQuoteRequestDialog: React.FC<EnhancedQuoteRequestDialogProps> = ({
  open,
  onOpenChange,
  initialProducts = [],
  initialServices = [],
  relatedServiceTicketId,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | {
    quote_number: string;
    digital_twin_code?: string | null;
    portal_reference?: string | null;
    id: string;
  }>(null);

  // Form state
  const [contactInfo, setContactInfo] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company_name || '',
  });
  const [projectDetails, setProjectDetails] = useState({
    description: '',
    urgency: 'normal',
    deliveryLocation: '',
    specialRequirements: '',
  });
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(initialProducts);
  const [selectedServices, setSelectedServices] = useState<Service[]>(initialServices);

  const apiBase = (import.meta as any).env?.VITE_API_BASE || '';

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'خطأ في المصادقة',
        description: 'يجب تسجيل الدخول لطلب عرض سعر',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        contact_name: contactInfo.name,
        contact_email: contactInfo.email,
        contact_phone: contactInfo.phone,
        company: contactInfo.company,
        project_description: projectDetails.description,
        urgency: projectDetails.urgency,
        delivery_location: projectDetails.deliveryLocation,
        special_requirements: projectDetails.specialRequirements,
        products: selectedProducts.map(p => ({ 
          product_id: p.id, 
          quantity: 1, 
          unit_price: p.price 
        })),
        services: selectedServices.map(s => ({ 
          service_id: s.id, 
          quantity: 1, 
          unit_price: s.price 
        })),
        related_service_ticket_id: relatedServiceTicketId,
      };

      const resp = await fetch(`${apiBase}/api/v2/quotes/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Failed to create quote');
      }

      const data = await resp.json();
      setResult({
        id: data.id,
        quote_number: data.quote_number,
        digital_twin_code: data.digital_twin_code,
        portal_reference: data.portal_reference,
      });

      toast({
        title: 'تم إنشاء عرض السعر بنجاح',
        description: data.digital_twin_code ? `كود التتبع: ${data.digital_twin_code}` : 'تم إنشاء عرض السعر',
      });
    } catch (error) {
      console.error('Error creating quote:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء عرض السعر',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const _addProduct = (product: Product) => {
    if (product.stock <= 0) {
      toast({
        title: 'غير متوفر',
        description: 'هذا المنتج غير متوفر في المخزون',
        variant: 'destructive',
      });
      return;
    }
    setSelectedProducts(prev => [...prev, product]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const _addService = (service: Service) => {
    setSelectedServices(prev => [...prev, service]);
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const calculateTotal = () => {
    const productTotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    const serviceTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
    return productTotal + serviceTotal;
  };

  if (result) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-green-600">تم إنشاء عرض السعر بنجاح</DialogTitle>
          </DialogHeader>
          
          <LazyMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل عرض السعر</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">رقم عرض السعر</Label>
                    <p className="text-lg font-mono">{result.quote_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">كود التتبع</Label>
                    <p className="text-lg font-mono text-orange-600">
                      {result.digital_twin_code || 'قيد التعيين'}
                    </p>
                  </div>
                </div>
                
                {result.portal_reference && (
                  <div>
                    <Label className="text-sm font-medium">مرجع البوابة</Label>
                    <p className="text-sm text-gray-600">{result.portal_reference}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      window.location.href = '/portal';
                    }}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    تتبع في البوابة
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                  >
                    إنشاء عرض سعر جديد
                  </Button>
                </div>
              </CardContent>
            </Card>
          </LazyMotionDiv>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gradient-orange">
            طلب عرض سعر إلكتروني
          </DialogTitle>
          <DialogDescription>
            احصل على عرض سعر مخصص لمنتجاتك وخدماتك المختارة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات الاتصال</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">الاسم *</Label>
                <Input
                  id="name"
                  value={contactInfo.name}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="company">الشركة</Label>
                <Input
                  id="company"
                  value={contactInfo.company}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل المشروع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">وصف المشروع *</Label>
                <Textarea
                  id="description"
                  value={projectDetails.description}
                  onChange={(e) => setProjectDetails(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="اشرح متطلباتك بالتفصيل..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="urgency">الأولوية</Label>
                  <Select
                    value={projectDetails.urgency}
                    onValueChange={(value) => setProjectDetails(prev => ({ ...prev, urgency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="normal">عادية</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="urgent">عاجلة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deliveryLocation">موقع التسليم</Label>
                  <Input
                    id="deliveryLocation"
                    value={projectDetails.deliveryLocation}
                    onChange={(e) => setProjectDetails(prev => ({ ...prev, deliveryLocation: e.target.value }))}
                    placeholder="المدينة، المحافظة"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="specialRequirements">متطلبات خاصة</Label>
                <Textarea
                  id="specialRequirements"
                  value={projectDetails.specialRequirements}
                  onChange={(e) => setProjectDetails(prev => ({ ...prev, specialRequirements: e.target.value }))}
                  placeholder="أي متطلبات خاصة أو ملاحظات إضافية..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Items Summary */}
          {(selectedProducts.length > 0 || selectedServices.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>المنتجات والخدمات المختارة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-gray-600">{product.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.price} جنيه</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeProduct(product.id)}
                        >
                          إزالة
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-gray-600">{service.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.price} جنيه</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeService(service.id)}
                        >
                          إزالة
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">المجموع المقدر:</span>
                      <span className="text-xl font-bold text-orange-600">
                        {calculateTotal()} جنيه
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !contactInfo.name || !contactInfo.email || !projectDetails.description}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال طلب عرض السعر'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
