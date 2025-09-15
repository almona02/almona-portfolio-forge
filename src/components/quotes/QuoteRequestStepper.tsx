import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Badge } from '@/shared/ui/ui/badge';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { QuoteAIHelper } from './QuoteAIHelper';
import { QuoteCalculator } from './QuoteCalculator';
import { QuoteSummary } from './QuoteSummary';
import { Machine } from '../../types';

const steps = [
  "Contact Information",
  "Request Details",
  "Additional Services",
  "Review & Submit"
];

interface SelectedProduct { id: string; name: string; price?: number }
interface SelectedService { id?: string; name: string; price?: number }
interface StepperInitialData {
  products?: SelectedProduct[]
  services?: SelectedService[]
  contactInfo?: {
    name?: string
    email?: string
    phone?: string
    company?: string
  }
}
interface StepperFormValues {
  name: string
  email: string
  phone: string
  company?: string
  projectDescription: string
  urgency: string
  deliveryLocation: string
  specialRequirements: string
}
interface QuoteRequestStepperProps {
  initialData?: StepperInitialData;
  onSubmit: (data: StepperFormValues & { products: SelectedProduct[]; services: SelectedService[]; estimatedPrice: number | null; timestamp: string; status: string }) => void;
  onCancel: () => void;
  submitting?: boolean;
  relatedServiceTicketId?: string;
}

export const QuoteRequestStepper: React.FC<QuoteRequestStepperProps> = ({
  initialData,
  onSubmit,
  // onCancel intentionally unused currently (reserved for future cancel button placement)
  submitting = false,
  relatedServiceTicketId,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(initialData?.products || []);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(initialData?.services || []);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const form = useForm<StepperFormValues>({
    defaultValues: {
      name: initialData?.contactInfo?.name || "",
      email: initialData?.contactInfo?.email || "",
      phone: initialData?.contactInfo?.phone || "",
      company: initialData?.contactInfo?.company || "",
      projectDescription: "",
      urgency: "standard",
      deliveryLocation: "",
      specialRequirements: "",
    }
  });

  const nextStep = () => {
    if (submitting) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (submitting) return;
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddProduct = (product: SelectedProduct) => {
    setSelectedProducts([...selectedProducts, product]);
  };

  // For now services suggestions come as simple strings -> map to SelectedService structure
  const handleAddService = (service: SelectedService | string) => {
    if (typeof service === 'string') {
      setSelectedServices([...selectedServices, { name: service }]);
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const calculateEstimate = () => {
    const base = selectedProducts.reduce((sum: number, p) => sum + (p.price || 0), 0);
    const services = selectedServices.reduce((sum: number, s) => sum + (s.price || 0), 0);
    setEstimatedPrice(base + services);
  };

  const handleFormSubmit = (data: StepperFormValues) => {
    if (submitting) return;
    const fullQuote = {
      ...data,
      products: selectedProducts,
      services: selectedServices,
      estimatedPrice,
      timestamp: new Date().toISOString(),
      status: "pending"
    };
    onSubmit(fullQuote);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pr-4 md:pr-0" role="tablist" aria-label="Quote steps">
            {steps.map((step, index) => {
              const active = index === currentStep
              const complete = index < currentStep
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => !submitting && setCurrentStep(index)}
                  aria-current={active ? 'step' : undefined}
                  aria-disabled={submitting}
                  className={`group flex items-center flex-shrink-0 rounded-full border transition px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70
                    ${active ? 'bg-orange-600/20 border-orange-500 text-orange-300 shadow-inner' : complete ? 'bg-almona-dark/70 border-orange-800 text-orange-500' : 'bg-almona-dark/40 border-almona-light/10 text-gray-400'}
                    ${submitting ? 'opacity-60 cursor-not-allowed' : 'hover:border-orange-500/70 hover:text-orange-300'}
                  `}
                >
                  <span
                    className={`mr-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition
                      ${active ? 'bg-orange-600 text-white' : complete ? 'bg-orange-700/70 text-white' : 'bg-almona-darker text-gray-400'}
                    `}
                  >
                    {complete ? '✓' : index + 1}
                  </span>
                  <span className="whitespace-nowrap select-none">
                    {step}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-2 h-1 hidden md:flex w-full bg-gradient-to-r from-orange-700/40 via-orange-500/40 to-transparent rounded" />
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          {relatedServiceTicketId && (
            <Badge variant="outline" className="border-blue-500 text-blue-400" title="Linked Service Ticket">
              Ticket {relatedServiceTicketId.slice(0,8)}…
            </Badge>
          )}
          <Badge variant="outline" className="border-orange-500 text-orange-500">
            {estimatedPrice ? `Est. ${estimatedPrice.toLocaleString()} EGP` : "Calculating..."}
          </Badge>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {currentStep === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <Input {...form.register("name", { required: true })} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input {...form.register("email", { required: true })} type="email" placeholder="Your email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <Input {...form.register("phone", { required: true })} placeholder="Your phone number" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Company (Optional)</label>
              <Input {...form.register("company")} placeholder="Your company name" />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Selected Items</h3>
              {selectedProducts.length === 0 && selectedServices.length === 0 ? (
                <p className="text-gray-400">No items selected yet</p>
              ) : (
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-3 bg-almona-dark rounded">
                      <span>{product.name}</span>
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        {product.price ? `${product.price.toLocaleString()} EGP` : "Price on request"}
                      </Badge>
                    </div>
                  ))}
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex justify-between items-center p-3 bg-almona-dark rounded">
                      <span>{service.name}</span>
                      <Badge variant="outline" className="border-blue-500 text-blue-500">
                        {service.price ? `${service.price.toLocaleString()} EGP` : "Price on request"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Project Description</label>
              <Textarea
                {...form.register("projectDescription", { required: true })}
                placeholder="Describe your project, requirements, and any specific needs..."
                rows={4}
              />
            </div>

            <QuoteAIHelper 
              projectDescription={form.watch("projectDescription")} 
              onProductSuggest={(p: Machine) => handleAddProduct({ id: p.id, name: p.name, price: (p as unknown as { price?: number }).price })}
              onServiceSuggest={(s: string) => handleAddService(s)}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Urgency</label>
              <Select onValueChange={(value) => form.setValue("urgency", value)} defaultValue="standard">
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (2-3 weeks)</SelectItem>
                  <SelectItem value="express">Express (1 week) +15%</SelectItem>
                  <SelectItem value="urgent">Urgent (3 days) +30%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Delivery Location</label>
              <Input {...form.register("deliveryLocation")} placeholder="City, Governorate, Egypt" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Special Requirements</label>
              <Textarea
                {...form.register("specialRequirements")}
                placeholder="Installation needs, training requirements, custom modifications..."
                rows={3}
              />
            </div>

            <QuoteCalculator 
              products={selectedProducts as unknown as Machine[]}
              services={selectedServices.map(s => ({ id: s.id || s.name, name: s.name, price: s.price }))}
              urgency={form.watch("urgency")}
              onCalculate={calculateEstimate}
            />
          </div>
        )}

        {currentStep === 3 && (
          <QuoteSummary 
            formData={form.getValues()}
            products={selectedProducts.map(p => ({ id: p.id, name: p.name, price: p.price }))}
            services={selectedServices.map((s, idx) => ({ id: s.id || String(idx), name: s.name, price: s.price }))}
            estimatedPrice={estimatedPrice}
          />
        )}

        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0 || submitting}
            aria-disabled={currentStep === 0 || submitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={nextStep} disabled={submitting} aria-disabled={submitting}>
              {submitting ? (
                <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</span>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button type="submit" disabled={submitting} aria-disabled={submitting} className="min-w-[200px]">
              {submitting ? (
                <span className="flex items-center justify-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</span>
              ) : (
                'Submit Quote Request'
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
