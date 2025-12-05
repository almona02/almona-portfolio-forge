import React from 'react';
import { Helmet } from 'react-helmet-async';
import { GraduationCap, Users, FileText, Video } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Link } from 'react-router-dom';

const YilmazTraining = () => {
  return (
    <>
      <Helmet>
        <title>Yilmaz Machine Operator Training Egypt | ALMONA Academy</title>
        <meta name="description" content="Professional training for Yilmaz machine operators and CNC programmers in Egypt. Enhance safety, efficiency, and output quality." />
        <meta name="keywords" content="Yilmaz training Egypt, CNC operator training Cairo, machine safety course, aluminium fabrication training" />
        <link rel="canonical" href="https://almona.eg/yilmaz-training-egypt" />
      </Helmet>

      <main className="pt-24 pb-16 bg-gray-50 dark:bg-gray-950 min-h-screen">
         <div id="top" className="sr-only" aria-hidden="true" />
         <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">Authorized Yilmaz Training Center</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Maximize your investment by empowering your team with expert operational knowledge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border-t-4 border-blue-500">
              <Users className="w-10 h-10 text-blue-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Operator Training</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Basic to advanced operation techniques for all Yilmaz models. Focus on safety, daily maintenance, and efficient workflow.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border-t-4 border-orange-500">
              <FileText className="w-10 h-10 text-orange-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">CNC Programming</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                In-depth software training for CNC processing centers. Learn to import files, optimize tool paths, and reduce waste.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border-t-4 border-green-500">
              <Video className="w-10 h-10 text-green-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Video Library</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Access our exclusive portal of tutorial videos and troubleshooting guides available 24/7 for registered clients.
              </p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4">Schedule a Training Session</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                We offer both on-site training at your facility and intensive workshops at our Cairo headquarters. customized to your specific machinery setup.
              </p>
              <div className="flex gap-4">
                <Link to="/contact">
                  <Button size="lg">Contact Training Dept</Button>
                </Link>
                <Link to="/services/training">
                  <Button size="lg" variant="outline">View Course Catalog</Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
               <GraduationCap className="w-48 h-48 text-gray-300 dark:text-gray-700 opacity-50" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default YilmazTraining;
