import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QuoteSummaryProps {
  formData: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    projectDescription: string;
    urgency: string;
    deliveryLocation: string;
    specialRequirements?: string;
  };
  products: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
  services: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
  estimatedPrice: number | null;
}

export const QuoteSummary: React.FC<QuoteSummaryProps> = ({
  formData,
  products,
  services,
  estimatedPrice,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Review Your Quote Request</h3>
      
      <Card className="bg-almona-dark border-almona-light/20">
        <CardHeader>
          <CardTitle className="text-lg">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Name</p>
              <p className="font-medium">{formData.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="font-medium">{formData.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Phone</p>
              <p className="font-medium">{formData.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Company</p>
              <p className="font-medium">{formData.company || "Not provided"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-almona-dark border-almona-light/20">
        <CardHeader>
          <CardTitle className="text-lg">Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-sm text-gray-400 mb-2">Project Description</p>
            <p className="whitespace-pre-wrap">{formData.projectDescription}</p>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-2">Urgency</p>
            <Badge variant="outline">{formData.urgency}</Badge>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-2">Delivery Location</p>
            <p>{formData.deliveryLocation}</p>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-2">Special Requirements</p>
            <p className="whitespace-pre-wrap">{formData.specialRequirements || "None"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-almona-dark border-almona-light/20">
        <CardHeader>
          <CardTitle className="text-lg">Selected Items</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Products</h4>
              {products.map((product) => (
                <div key={product.id} className="flex justify-between items-center py-2">
                  <span>{product.name}</span>
                  <Badge variant="outline" className="border-green-500 text-green-500">
                    {product.price ? `${product.price.toLocaleString()} EGP` : "Price on request"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          
          {services.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Services</h4>
              {services.map((service) => (
                <div key={service.id} className="flex justify-between items-center py-2">
                  <span>{service.name}</span>
                  <Badge variant="outline" className="border-blue-500 text-blue-500">
                    {service.price ? `${service.price.toLocaleString()} EGP` : "Price on request"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-almona-dark border-almona-light/20">
        <CardHeader>
          <CardTitle className="text-lg">Estimated Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">
            {estimatedPrice ? `${estimatedPrice.toLocaleString()} EGP` : "Calculating..."}
          </div>
          <p className="text-sm text-gray-400 mt-2">
            This is an estimated price. Final quote may vary based on specific requirements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
