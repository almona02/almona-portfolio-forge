import React from 'react';

const LogisticsPartners = () => {
  return (
    <section className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-4">Our Local Logistics Partners</h2>
      <p className="mb-4">
        We collaborate with trusted local logistics companies to ensure fast and reliable delivery across Egypt.
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-700">
        <li>Egypt Express Shipping</li>
        <li>Cairo Logistics Co.</li>
        <li>Delta Freight Services</li>
        <li>Nile Transport Solutions</li>
      </ul>
      <p className="mt-4">
        Our partners specialize in cash-on-delivery services and provide excellent coverage for mobile users.
      </p>
    </section>
  );
};

export default LogisticsPartners;
