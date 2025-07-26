import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Badge } from '@/shared/ui/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { QuoteAIHelper } from './QuoteAIHelper';
import { QuoteCalculator } from './QuoteCalculator';
import { QuoteSummary } from './QuoteSummary';

const steps = [
  "Contact Information",
  "Request Details",
  "Additional Services",
  "Review & Submit"
];

interface QuoteRequestStepperProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export const QuoteRequestStepper: React.FC<QuoteRequestStepperProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState(initialData?.products || []);
  const [selectedServices, setSelectedServices] = useState(initialData?.services || []);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const form = useForm({
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
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddProduct = (product: any) => {
    setSelectedProducts([...selectedProducts, product]);
  };

  const handleAddService = (service: any) => {
    setSelectedServices([...selectedServices, service]);
  };

  const calculateEstimate = () => {
    const base = selectedProducts.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
    const services = selectedServices.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
    setEstimatedPrice(base + services);
  };

  const handleFormSubmit = (data: any) => {
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= currentStep
                    ? "bg-orange-600 text-white"
                    : "bg-almona-dark text-gray-400"
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 ${
                  index === currentStep ? "text-orange-400 font-medium" : "text-gray-400"
                }`}
              >
                {step}
              </span>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 mx-2 text-gray-500" />
              )}
            </div>
          ))}
        </div>
        <Badge variant="outline" className="border-orange-500 text-orange-500">
          {estimatedPrice ? `Est. ${estimatedPrice.toLocaleString()} EGP` : "Calculating..."}
        </Badge>
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
                  {selectedProducts.map((product: any) => (
                    <div key={product.id} className="flex justify-between items-center p-3 bg-almona-dark rounded">
                      <span>{product.name}</span>
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        {product.price ? `${product.price.toLocaleString()} EGP` : "Price on request"}
                      </Badge>
                    </div>
                  ))}
                  {selectedServices.map((service: any) => (
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
              onProductSuggest={handleAddProduct}
              onServiceSuggest={handleAddService}
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
              products={selectedProducts}
              services={selectedServices}
              urgency={form.watch("urgency")}
              onCalculate={calculateEstimate}
            />
          </div>
        )}

        {currentStep === 3 && (
          <QuoteSummary 
            formData={form.getValues()}
            products={selectedProducts}
            services={selectedServices}
            estimatedPrice={estimatedPrice}
          />
        )}

        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit">Submit Quote Request</Button>
          )}
        </div>
      </form>
    </div>
  );
};
