import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink } from 'lucide-react';

/**
 * Egyptian Compliance Documents Component
 * Provides access to Egyptian regulatory and compliance documents
 */
export const EgyptianComplianceDocs: React.FC = () => {
  const complianceDocs = [
    {
      id: 'import-license',
      title: 'Import License Requirements',
      description: 'Documentation for importing industrial machinery',
      type: 'PDF',
      size: '2.3 MB',
      url: '/documents/egyptian/import-license-requirements.pdf'
    },
    {
      id: 'safety-standards',
      title: 'Safety Standards Compliance',
      description: 'Egyptian safety standards for industrial equipment',
      type: 'PDF',
      size: '1.8 MB',
      url: '/documents/egyptian/safety-standards-compliance.pdf'
    },
    {
      id: 'tax-regulations',
      title: 'Tax Regulations Guide',
      description: 'VAT and customs regulations for machinery',
      type: 'PDF',
      size: '1.2 MB',
      url: '/documents/egyptian/tax-regulations-guide.pdf'
    },
    {
      id: 'certification-process',
      title: 'Certification Process',
      description: 'Step-by-step certification process',
      type: 'PDF',
      size: '3.1 MB',
      url: '/documents/egyptian/certification-process.pdf'
    }
  ];

  const handleDownload = (doc: typeof complianceDocs[0]) => {
    // In a real application, this would trigger a download
    console.log(`Downloading ${doc.title}`);
    // For now, we'll just show an alert
    alert(`Downloading ${doc.title}...`);
  };

  const handleViewOnline = (doc: typeof complianceDocs[0]) => {
    // In a real application, this would open the document in a new tab
    console.log(`Viewing ${doc.title} online`);
    // For now, we'll just show an alert
    alert(`Opening ${doc.title} in new tab...`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-orange-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Egyptian Compliance Documents
        </h3>
      </div>
      
      <div className="grid gap-3">
        {complianceDocs.map((doc) => (
          <Card key={doc.id} className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                {doc.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                {doc.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    {doc.type}
                  </span>
                  <span>{doc.size}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewOnline(doc)}
                    className="h-7 px-2 text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    className="h-7 px-2 text-xs bg-orange-500 hover:bg-orange-600"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
        All documents are in compliance with Egyptian regulations
      </div>
    </div>
  );
};

export default EgyptianComplianceDocs;
