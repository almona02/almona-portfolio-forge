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
import { getApiBase } from '@/lib/apiBase';
import { getQuoteRequestHeaders } from '@/lib/quoteRequestAuth';
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

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø©',
        description: 'ÙŠØ¬Ø¨ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ø·Ù„Ø¨ Ø¹Ø±Ø¶ Ø³Ø¹Ø±',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
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

      const resp = await fetch(`${getApiBase()}/api/v2/quotes/create`, {
        method: 'POST',
        headers: await getQuoteRequestHeaders(user.id),
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
        title: 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø± Ø¨Ù†Ø¬Ø§Ø­',
        description: data.digital_twin_code ? `ÙƒÙˆØ¯ Ø§Ù„ØªØªØ¨Ø¹: ${data.digital_twin_code}` : 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±',
      });
    } catch (error) {
      console.error('Error creating quote:', error);
      toast({
        title: 'Ø®Ø·Ø£',
        description: 'ÙØ´Ù„ ÙÙŠ Ø¥Ù†Ø´Ø§Ø¡ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const _addProduct = (product: Product) => {
    if (product.stock <= 0) {
      toast({
        title: 'ØºÙŠØ± Ù…ØªÙˆÙØ±',
        description: 'Ù‡Ø°Ø§ Ø§Ù„Ù…Ù†ØªØ¬ ØºÙŠØ± Ù…ØªÙˆÙØ± ÙÙŠ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†',
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
            <DialogTitle className="text-2xl text-green-600">ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø± Ø¨Ù†Ø¬Ø§Ø­</DialogTitle>
          </DialogHeader>
          
          <LazyMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>ØªÙØ§ØµÙŠÙ„ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="typography-label text-sm font-medium">Ø±Ù‚Ù… Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±</Label>
                    <p className="text-lg font-mono">{result.quote_number}</p>
                  </div>
                  <div>
                    <Label className="typography-label text-sm font-medium">ÙƒÙˆØ¯ Ø§Ù„ØªØªØ¨Ø¹</Label>
                    <p className="text-lg font-mono text-amber-600">
                      {result.digital_twin_code || 'Ù‚ÙŠØ¯ Ø§Ù„ØªØ¹ÙŠÙŠÙ†'}
                    </p>
                  </div>
                </div>
                
                {result.portal_reference && (
                  <div>
                    <Label className="typography-label text-sm font-medium">Ù…Ø±Ø¬Ø¹ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø©</Label>
                    <p className="text-sm text-gray-600">{result.portal_reference}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      window.location.href = '/portal';
                    }}
                    className="btn-primary"
                  >
                    ØªØªØ¨Ø¹ ÙÙŠ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø©
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                  >
                    Ø¥Ù†Ø´Ø§Ø¡ Ø¹Ø±Ø¶ Ø³Ø¹Ø± Ø¬Ø¯ÙŠØ¯
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
            Ø·Ù„Ø¨ Ø¹Ø±Ø¶ Ø³Ø¹Ø± Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ
          </DialogTitle>
          <DialogDescription>
            Ø§Ø­ØµÙ„ Ø¹Ù„Ù‰ Ø¹Ø±Ø¶ Ø³Ø¹Ø± Ù…Ø®ØµØµ Ù„Ù…Ù†ØªØ¬Ø§ØªÙƒ ÙˆØ®Ø¯Ù…Ø§ØªÙƒ Ø§Ù„Ù…Ø®ØªØ§Ø±Ø©
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ø§ØªØµØ§Ù„</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="typography-label">Ø§Ù„Ø§Ø³Ù… *</Label>
                <Input
                  id="name"
                  value={contactInfo.name}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email" className="typography-label">Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ *</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone" className="typography-label">Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ</Label>
                <Input
                  id="phone"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="company" className="typography-label">Ø§Ù„Ø´Ø±ÙƒØ©</Label>
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
              <CardTitle>ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description" className="typography-label">ÙˆØµÙ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ *</Label>
                <Textarea
                  id="description"
                  value={projectDetails.description}
                  onChange={(e) => setProjectDetails(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ø§Ø´Ø±Ø­ Ù…ØªØ·Ù„Ø¨Ø§ØªÙƒ Ø¨Ø§Ù„ØªÙØµÙŠÙ„..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="urgency" className="typography-label">Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©</Label>
                  <Select
                    value={projectDetails.urgency}
                    onValueChange={(value) => setProjectDetails(prev => ({ ...prev, urgency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Ù…Ù†Ø®ÙØ¶Ø©</SelectItem>
                      <SelectItem value="normal">Ø¹Ø§Ø¯ÙŠØ©</SelectItem>
                      <SelectItem value="high">Ø¹Ø§Ù„ÙŠØ©</SelectItem>
                      <SelectItem value="urgent">Ø¹Ø§Ø¬Ù„Ø©</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deliveryLocation" className="typography-label">Ù…ÙˆÙ‚Ø¹ Ø§Ù„ØªØ³Ù„ÙŠÙ…</Label>
                  <Input
                    id="deliveryLocation"
                    value={projectDetails.deliveryLocation}
                    onChange={(e) => setProjectDetails(prev => ({ ...prev, deliveryLocation: e.target.value }))}
                    placeholder="Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©ØŒ Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="specialRequirements" className="typography-label">Ù…ØªØ·Ù„Ø¨Ø§Øª Ø®Ø§ØµØ©</Label>
                <Textarea
                  id="specialRequirements"
                  value={projectDetails.specialRequirements}
                  onChange={(e) => setProjectDetails(prev => ({ ...prev, specialRequirements: e.target.value }))}
                  placeholder="Ø£ÙŠ Ù…ØªØ·Ù„Ø¨Ø§Øª Ø®Ø§ØµØ© Ø£Ùˆ Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Items Summary */}
          {(selectedProducts.length > 0 || selectedServices.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ù…Ø®ØªØ§Ø±Ø©</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="typography-h4 font-medium">{product.name}</h4>
                        <p className="text-sm text-gray-600">{product.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.price} Ø¬Ù†ÙŠÙ‡</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeProduct(product.id)}
                        >
                          Ø¥Ø²Ø§Ù„Ø©
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="typography-h4 font-medium">{service.name}</h4>
                        <p className="text-sm text-gray-600">{service.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.price} Ø¬Ù†ÙŠÙ‡</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeService(service.id)}
                        >
                          Ø¥Ø²Ø§Ù„Ø©
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ù…Ù‚Ø¯Ø±:</span>
                      <span className="text-xl font-bold text-amber-600">
                        {calculateTotal()} Ø¬Ù†ÙŠÙ‡
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
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting || !contactInfo.name || !contactInfo.email || !projectDetails.description}
              className="btn-primary"
            >
              {submitting ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„...' : 'Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
