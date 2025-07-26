import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export const QuoteConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const quoteId = location.state?.quoteId || "QR-XXXXXX";

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-gradient-orange">
              Quote Request Submitted!
            </h1>
            <p className="text-xl text-gray-400 mb-6">
              Your quote request <span className="text-orange-500 font-bold">{quoteId}</span> has been received.
            </p>
            
            <div className="bg-almona-darker p-6 rounded-lg border border-almona-light/20 mb-8 text-left">
              <h2 className="text-lg font-semibold mb-4">What happens next?</h2>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>Our sales team will review your request within 24 hours</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>You'll receive a confirmation email with your quote details</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>A technical specialist may contact you for additional details</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">✓</span>
                  <span>Your final quote will be delivered via email and WhatsApp</span>
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate("/")}>
                Back to Home
              </Button>
              <Button variant="outline" onClick={() => navigate("/contact")}>
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
