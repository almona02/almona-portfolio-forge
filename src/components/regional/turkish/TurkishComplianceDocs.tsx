/**
 * Turkish Compliance Documentation Templates
 * Generates Turkish market compliance documents and certificates
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatTurkishDate, generateTurkishInvoice, generateTurkishInvoiceNumber } from '@/lib/turkishTaxUtils';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TurkishComplianceDocsProps {
  className?: string;
  onDocumentGenerated?: (document: any) => void;
}

interface CompanyInfo {
  name: string;
  address: string;
  taxNumber: string;
  phone: string;
  email: string;
  website?: string;
}

interface ProductInfo {
  id: string;
  name: string;
  nameTr: string;
  description: string;
  descriptionTr: string;
  quantity: number;
  unitPrice: number;
  category: string;
}

export const TurkishComplianceDocs: React.FC<TurkishComplianceDocsProps> = ({
  className = '',
  onDocumentGenerated
}) => {
  const { t } = useTranslation();
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'Almona Endüstriyel Ekipman Ltd. Şti.',
    address: 'İstanbul, Türkiye',
    taxNumber: '1234567890',
    phone: '+90 212 123 45 67',
    email: 'info@almona.com.tr',
    website: 'www.almona.com.tr'
  });

  const [customerInfo, setCustomerInfo] = useState<CompanyInfo>({
    name: '',
    address: '',
    taxNumber: '',
    phone: '',
    email: ''
  });

  const [products, setProducts] = useState<ProductInfo[]>([
    {
      id: '1',
      name: 'YILMAZ KM-212 CNC Machine',
      nameTr: 'YILMAZ KM-212 CNC Makinesi',
      description: 'High precision CNC cutting machine',
      descriptionTr: 'Yüksek hassasiyetli CNC kesim makinesi',
      quantity: 1,
      unitPrice: 150000,
      category: 'machinery'
    }
  ]);

  const [selectedDocument, setSelectedDocument] = useState<string>('invoice');
  const [generatedDocument, setGeneratedDocument] = useState<any>(null);

  const handleCompanyInfoChange = useCallback((field: keyof CompanyInfo, value: string) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCustomerInfoChange = useCallback((field: keyof CompanyInfo, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleProductChange = useCallback((index: number, field: keyof ProductInfo, value: any) => {
    setProducts(prev => prev.map((product, i) => 
      i === index ? { ...product, [field]: value } : product
    ));
  }, []);

  const addProduct = useCallback(() => {
    setProducts(prev => [...prev, {
      id: String(prev.length + 1),
      name: '',
      nameTr: '',
      description: '',
      descriptionTr: '',
      quantity: 1,
      unitPrice: 0,
      category: 'machinery'
    }]);
  }, []);

  const removeProduct = useCallback((index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const generateDocument = useCallback(() => {
    if (selectedDocument === 'invoice') {
      const invoice = generateTurkishInvoice(
        generateTurkishInvoiceNumber(),
        customerInfo,
        products.map(product => ({
          id: product.id,
          description: product.name,
          descriptionTr: product.nameTr,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          kdvRate: 0.20 // Standard KDV rate
        }))
      );
      
      setGeneratedDocument(invoice);
      onDocumentGenerated?.(invoice);
    } else if (selectedDocument === 'delivery-note') {
      const deliveryNote = {
        type: 'delivery-note',
        number: `İRS${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        date: new Date(),
        company: companyInfo,
        customer: customerInfo,
        products: products,
        totalAmount: products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0),
        currency: 'TRY'
      };
      
      setGeneratedDocument(deliveryNote);
      onDocumentGenerated?.(deliveryNote);
    }
  }, [selectedDocument, companyInfo, customerInfo, products, onDocumentGenerated]);

  const generateDocumentContent = useCallback((doc: any) => {
    if (doc.type === 'delivery-note') {
      return generateDeliveryNoteHTML(doc);
    }
    return generateInvoiceHTML(doc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadDocument = useCallback(() => {
    if (!generatedDocument) return;

    const content = generateDocumentContent(generatedDocument);
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedDocument.type || 'document'}-${formatTurkishDate(new Date())}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedDocument, generateDocumentContent]);

  const generateInvoiceHTML = (invoice: any) => {
    return `
<!DOCTYPE html>
<html dir="ltr" lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Fatura - ${invoice.invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-info { margin-bottom: 20px; }
        .customer-info { margin-bottom: 20px; }
        .invoice-details { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total-section { text-align: right; margin-top: 20px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>FATURA</h1>
        <h2>${companyInfo.name}</h2>
    </div>
    
    <div class="company-info">
        <h3>Firma Bilgileri</h3>
        <p><strong>Firma Adı:</strong> ${companyInfo.name}</p>
        <p><strong>Adres:</strong> ${companyInfo.address}</p>
        <p><strong>Vergi No:</strong> ${companyInfo.taxNumber}</p>
        <p><strong>Telefon:</strong> ${companyInfo.phone}</p>
        <p><strong>E-posta:</strong> ${companyInfo.email}</p>
    </div>
    
    <div class="customer-info">
        <h3>Müşteri Bilgileri</h3>
        <p><strong>Müşteri Adı:</strong> ${customerInfo.name}</p>
        <p><strong>Adres:</strong> ${customerInfo.address}</p>
        <p><strong>Vergi No:</strong> ${customerInfo.taxNumber}</p>
        <p><strong>Telefon:</strong> ${customerInfo.phone}</p>
        <p><strong>E-posta:</strong> ${customerInfo.email}</p>
    </div>
    
    <div class="invoice-details">
        <p><strong>Fatura No:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Tarih:</strong> ${formatTurkishDate(invoice.date)}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Açıklama</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>Ara Toplam</th>
                <th>KDV</th>
                <th>Toplam</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map((item: any) => `
                <tr>
                    <td>${item.descriptionTr}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unitPrice.toLocaleString('tr-TR')}₺</td>
                    <td>${item.subtotal.toLocaleString('tr-TR')}₺</td>
                    <td>${item.kdvAmount.toLocaleString('tr-TR')}₺</td>
                    <td>${item.total.toLocaleString('tr-TR')}₺</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="total-section">
        <p><strong>Ara Toplam:</strong> ${invoice.subtotal.toLocaleString('tr-TR')}₺</p>
        <p><strong>Toplam KDV:</strong> ${invoice.totalKdv.toLocaleString('tr-TR')}₺</p>
        <p><strong>Genel Toplam:</strong> ${invoice.grandTotal.toLocaleString('tr-TR')}₺</p>
    </div>
    
    <div class="footer">
        <p>Bu fatura Türk Vergi Mevzuatına uygun olarak düzenlenmiştir.</p>
        <p>KDV %20 dahil fiyatlar.</p>
    </div>
</body>
</html>`;
  };

  const generateDeliveryNoteHTML = (deliveryNote: any) => {
    return `
<!DOCTYPE html>
<html dir="ltr" lang="tr">
<head>
    <meta charset="UTF-8">
    <title>İrsaliye - ${deliveryNote.number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-info { margin-bottom: 20px; }
        .customer-info { margin-bottom: 20px; }
        .delivery-details { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>İRSALİYE</h1>
        <h2>${companyInfo.name}</h2>
    </div>
    
    <div class="company-info">
        <h3>Firma Bilgileri</h3>
        <p><strong>Firma Adı:</strong> ${companyInfo.name}</p>
        <p><strong>Adres:</strong> ${companyInfo.address}</p>
        <p><strong>Vergi No:</strong> ${companyInfo.taxNumber}</p>
    </div>
    
    <div class="customer-info">
        <h3>Müşteri Bilgileri</h3>
        <p><strong>Müşteri Adı:</strong> ${customerInfo.name}</p>
        <p><strong>Adres:</strong> ${customerInfo.address}</p>
    </div>
    
    <div class="delivery-details">
        <p><strong>İrsaliye No:</strong> ${deliveryNote.number}</p>
        <p><strong>Tarih:</strong> ${formatTurkishDate(deliveryNote.date)}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Açıklama</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>Toplam</th>
            </tr>
        </thead>
        <tbody>
            ${deliveryNote.products.map((product: any) => `
                <tr>
                    <td>${product.nameTr}</td>
                    <td>${product.quantity}</td>
                    <td>${product.unitPrice.toLocaleString('tr-TR')}₺</td>
                    <td>${(product.quantity * product.unitPrice).toLocaleString('tr-TR')}₺</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        <p>Bu irsaliye Türk Ticaret Kanunu'na uygun olarak düzenlenmiştir.</p>
    </div>
</body>
</html>`;
  };

  return (
    <Card className={`bg-almona-dark border-almona-light/20 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <span>🇹🇷</span>
          <span>{t('turkish.compliance.title', 'Türk Uyumluluk Belgeleri')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Type Selection */}
        <div className="space-y-2">
          <Label className="typography-label text-gray-300">
            {t('turkish.compliance.documentType', 'Belge Türü')}
          </Label>
            <Select value={selectedDocument} onValueChange={setSelectedDocument}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">
                {t('turkish.compliance.invoice', 'Fatura')}
              </SelectItem>
              <SelectItem value="delivery-note">
                {t('turkish.compliance.deliveryNote', 'İrsaliye')}
              </SelectItem>
              <SelectItem value="vat-declaration">
                {t('turkish.compliance.vatDeclaration', 'KDV Beyannamesi')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Company Information */}
        <div className="space-y-3">
          <h4 className="typography-h4 text-white font-medium">
            {t('turkish.compliance.companyInfo', 'Firma Bilgileri')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="companyName" className="typography-label text-gray-300 text-sm">
                {t('turkish.compliance.companyName', 'Firma Adı')}
              </Label>
              <Input
                id="companyName"
                value={companyInfo.name}
                onChange={(e) => handleCompanyInfoChange('name', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-sm"
              />
            </div>
            <div>
              <Label htmlFor="companyTaxNumber" className="typography-label text-gray-300 text-sm">
                {t('turkish.compliance.taxNumber', 'Vergi Numarası')}
              </Label>
              <Input
                id="companyTaxNumber"
                value={companyInfo.taxNumber}
                onChange={(e) => handleCompanyInfoChange('taxNumber', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="companyAddress" className="typography-label text-gray-300 text-sm">
                {t('turkish.compliance.address', 'Adres')}
              </Label>
              <Textarea
                id="companyAddress"
                value={companyInfo.address}
                onChange={(e) => handleCompanyInfoChange('address', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-sm"
                rows={2}
              />
            </div>
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* Customer Information */}
        <div className="space-y-3">
          <h4 className="typography-h4 text-white font-medium">
            {t('turkish.compliance.customerInfo', 'Müşteri Bilgileri')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="customerName" className="typography-label text-gray-300 text-sm">
                {t('turkish.compliance.customerName', 'Müşteri Adı')}
              </Label>
              <Input
                id="customerName"
                value={customerInfo.name}
                onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-sm"
              />
            </div>
            <div>
              <Label htmlFor="customerTaxNumber" className="typography-label text-gray-300 text-sm">
                {t('turkish.compliance.taxNumber', 'Vergi Numarası')}
              </Label>
              <Input
                id="customerTaxNumber"
                value={customerInfo.taxNumber}
                onChange={(e) => handleCustomerInfoChange('taxNumber', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="customerAddress" className="typography-label text-gray-300 text-sm">
                {t('turkish.compliance.address', 'Adres')}
              </Label>
              <Textarea
                id="customerAddress"
                value={customerInfo.address}
                onChange={(e) => handleCustomerInfoChange('address', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-sm"
                rows={2}
              />
            </div>
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* Products */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="typography-h4 text-white font-medium">
              {t('turkish.compliance.products', 'Ürünler')}
            </h4>
            <Button
              onClick={addProduct}
              size="sm"
              className="btn-primary"
            >
              {t('turkish.compliance.addProduct', 'Ürün Ekle')}
            </Button>
          </div>
          
          {products.map((product, index) => (
            <div key={product.id} className="p-3 bg-gray-800/50 rounded border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="typography-label text-gray-300 text-sm">
                    {t('turkish.compliance.productName', 'Ürün Adı')}
                  </Label>
                  <Input
                    value={product.nameTr}
                    onChange={(e) => handleProductChange(index, 'nameTr', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white text-sm"
                  />
                </div>
                <div>
                  <Label className="typography-label text-gray-300 text-sm">
                    {t('turkish.compliance.quantity', 'Miktar')}
                  </Label>
                  <Input
                    type="number"
                    value={product.quantity}
                    onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="bg-gray-700 border-gray-600 text-white text-sm"
                  />
                </div>
                <div>
                  <Label className="typography-label text-gray-300 text-sm">
                    {t('turkish.compliance.unitPrice', 'Birim Fiyat')}
                  </Label>
                  <Input
                    type="number"
                    value={product.unitPrice}
                    onChange={(e) => handleProductChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="bg-gray-700 border-gray-600 text-white text-sm"
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-amber-400 font-medium">
                  {t('turkish.compliance.total', 'Toplam')}: {(product.quantity * product.unitPrice).toLocaleString('tr-TR')}₺
                </span>
                <Button
                  onClick={() => removeProduct(index)}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  {t('turkish.compliance.remove', 'Kaldır')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={generateDocument}
            disabled={!customerInfo.name || products.length === 0}
            className="btn-primary"
          >
            {t('turkish.compliance.generate', 'Belge Oluştur')}
          </Button>
          {generatedDocument && (
            <Button
              onClick={downloadDocument}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {t('turkish.compliance.download', 'İndir')}
            </Button>
          )}
        </div>

        {/* Generated Document Preview */}
        {generatedDocument && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded border border-gray-700">
            <h5 className="text-white font-medium mb-2">
              {t('turkish.compliance.generatedDocument', 'Oluşturulan Belge')}
            </h5>
            <div className="text-sm text-gray-300">
              <p><strong>{t('turkish.compliance.documentType', 'Belge Türü')}:</strong> {generatedDocument.type || 'invoice'}</p>
              <p><strong>{t('turkish.compliance.documentNumber', 'Belge No')}:</strong> {generatedDocument.invoiceNumber || generatedDocument.number}</p>
              <p><strong>{t('turkish.compliance.date', 'Tarih')}:</strong> {formatTurkishDate(generatedDocument.date)}</p>
              {generatedDocument.grandTotal && (
                <p><strong>{t('turkish.compliance.total', 'Toplam')}:</strong> {generatedDocument.grandTotal.toLocaleString('tr-TR')}₺</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TurkishComplianceDocs;
