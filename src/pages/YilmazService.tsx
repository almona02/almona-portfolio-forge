import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Wrench, Clock, ShieldCheck, Phone } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Link } from 'react-router-dom';

const YilmazService = () => {
  return (
    <>
      <Helmet>
        <title>Yilmaz Machine Service Egypt | Maintenance & Repair | ALMONA</title>
        <meta name="description" content="Expert maintenance and repair services for Yilmaz machines in Egypt. Official service center, genuine spare parts, and preventive maintenance contracts." />
        <meta name="keywords" content="Yilmaz service Egypt, Yilmaz repair Cairo, CNC maintenance Egypt, machine spare parts Egypt" />
        <link rel="canonical" href="https://almona.eg/yilmaz-service-egypt" />
      </Helmet>

      <main className="pt-24 pb-16 bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Yilmaz Service Center Egypt</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Keep your production running smoothly with our certified technical support and maintenance services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <Wrench className="w-12 h-12 text-blue-600 mb-6" />
              <h3 className="text-2xl font-semibold mb-4">Technical Support & Repair</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Our factory-trained engineers are ready to diagnose and fix issues rapidly. We handle everything from mechanical adjustments to complex CNC programming errors.
              </p>
              <ul className="space-y-2 mb-6 text-sm text-gray-500 dark:text-gray-400">
                <li className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-green-500" /> 24/7 Emergency Response</li>
                <li className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-green-500" /> Remote Diagnostics</li>
                <li className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-green-500" /> On-site Repair</li>
              </ul>
              <Link to="/support/tickets/new">
                <Button className="w-full">Open Support Ticket</Button>
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <Clock className="w-12 h-12 text-orange-600 mb-6" />
              <h3 className="text-2xl font-semibold mb-4">Preventive Maintenance</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Avoid costly downtime with our scheduled maintenance packages. We inspect, calibrate, and service your machines to ensure optimal performance and longevity.
              </p>
               <ul className="space-y-2 mb-6 text-sm text-gray-500 dark:text-gray-400">
                <li className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-green-500" /> Annual Service Contracts</li>
                <li className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-green-500" /> Calibration Services</li>
                <li className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-green-500" /> Performance Reports</li>
              </ul>
              <Link to="/contact">
                <Button variant="outline" className="w-full">Inquire About Contracts</Button>
              </Link>
            </div>
          </div>

          <div className="bg-blue-600 text-white rounded-xl p-8 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-2xl font-bold mb-2">Need Spare Parts?</h3>
              <p className="text-blue-100">We stock thousands of genuine Yilmaz parts in our Cairo warehouse.</p>
            </div>
            <Link to="/services/spare-parts">
              <Button variant="secondary" size="lg">Order Spare Parts</Button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default YilmazService;
