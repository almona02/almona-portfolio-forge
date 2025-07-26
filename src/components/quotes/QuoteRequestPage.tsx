import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { QuoteRequestStepper } from './QuoteRequestStepper';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

import { Machine } from '../../types/index';

interface Service {
  name: string;
  price: number;
}

export const QuoteRequestPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<{
    products?: Machine[];
    services?: Service[];
    contactInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
    };
  }>({});

  React.useEffect(() => {
    // Parse query parameters for pre-filled data
    const params = new URLSearchParams(location.search);
    const productId = params.get("productId");
    const serviceId = params.get("serviceId");
    
    if (productId) {
      setInitialData(prev => ({
        ...prev,
        products: [{ id: productId, name: params.get("productName") || "Product" }]
      }));
    }
    
    if (serviceId) {
      setInitialData(prev => ({
        ...prev,
        services: [{ id: serviceId, name: params.get("serviceName") || "Service" }]
      }));
    }
  }, [location]);

  const handleSubmit = async (quoteData: { products: Machine[], services: Service[], contactInfo: any, projectDescription: string, urgency: string }) => {
    try {
      // Simulate API call
      console.log('Quote submitted:', quoteData);
      
      toast({
        title: "Quote Request Submitted",
        description: "Our team will contact you within 24 hours",
      });
      
      navigate("/quotes/confirmation", { state: { quoteId: "QR-XXXXXX" } });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit quote request",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto bg-almona-darker rounded-xl p-8 border border-almona-light/20">
            <h1 className="text-3xl font-bold mb-2 text-gradient-orange">
              Request a Custom Quote
            </h1>
            <p className="text-gray-400 mb-8">
              Complete this form to receive a personalized quote for your industrial needs. 
              Our team will review your request and respond within 24 hours.
            </p>
            
            <QuoteRequestStepper
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={() => navigate("/")}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
