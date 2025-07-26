import React from 'react';

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  egyptSpecific?: boolean;
}

interface ServicesGridProps {
  services: Service[];
}

const ServicesGrid: React.FC<ServicesGridProps> = ({ services }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {services.map((service) => (
        <div key={service.id} className="bg-gray-800 p-6 rounded-lg neon-glow">
          <img src={service.icon} alt={service.title} className="w-16 h-16 mb-4" />
          <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
          <p className="mb-4">{service.description}</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {service.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
          {service.egyptSpecific && (
            <p className="mt-4 text-yellow-400 font-semibold">Egypt Specific Service</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ServicesGrid;
