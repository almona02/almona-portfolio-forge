import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ComplianceDocumentGeneratorProps {
  machineId: string;
  customerInfo: any;
}

export const ComplianceDocumentGenerator: React.FC<ComplianceDocumentGeneratorProps> = ({
  machineId,
  customerInfo
}) => {
  const { t } = useTranslation();

  const generateDocument = (type: string) => {
    // This would typically call a backend service to generate the document
    console.log(`Generating ${type} for machine ${machineId}`);
    // Placeholder for document generation logic
  };

  const documents = [
    { id: 'fatura', name: t('turkish_documents.fatura'), required: true },
    { id: 'irsaliye', name: t('turkish_documents.irsaliye'), required: true },
    { id: 'ce_belgesi', name: t('turkish_documents.ce_belgesi'), required: true },
    { id: 'test_raporu', name: t('turkish_documents.test_raporu'), required: false },
    { id: 'kullanım_kılavuzu', name: t('turkish_documents.kullanım_kılavuzu'), required: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('turkish_documents.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('turkish_documents.description')}
          </p>
          
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <span className="font-medium">{doc.name}</span>
                  {doc.required && (
                    <Badge variant="destructive" className="ml-2">
                      {t('turkish_documents.required')}
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => generateDocument(doc.id)}>
                  {t('turkish_documents.generate')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
