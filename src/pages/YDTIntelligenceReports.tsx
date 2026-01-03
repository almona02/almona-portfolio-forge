/**
 * YDT Intelligence Reports - Standalone Product Page
 * 
 * Sells market intelligence reports as standalone product:
 * - Monthly Market Analysis
 * - Regional Intelligence
 * - Competitive Dashboard
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { BarChart3, Check, MapPin, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';

interface Report {
  id: string;
  title: string;
  description: string;
  price: number;
  features: string[];
  icon: React.ReactNode;
}

export const YDTIntelligenceReports: React.FC = () => {
  const [selectedReport] = useState<string | null>(null);

  const reports: Report[] = [
    {
      id: 'monthly_market_analysis',
      title: 'التقرير الشهري - القاهرة',
      description: 'Monthly market analysis for Cairo region',
      price: 2500,
      features: [
        'أسعار السوق الأسبوعية',
        'تحليل المنافسين',
        'تنبيهات نقص المواد',
        'أنماط النوافذ الأكثر طلباً',
        'توصيات هوامش الربح',
      ],
      icon: <TrendingUp className="w-8 h-8" />,
    },
    {
      id: 'regional_intelligence',
      title: 'الذكاء الإقليمي - الإسكندرية',
      description: 'Regional intelligence for Alexandria',
      price: 1800,
      features: [
        'استراتيجيات التسعير التنافسية',
        'نقاط ضعف المنافسين',
        'فرص السوق غير المستغلة',
        'توصيات القيمة المضافة',
      ],
      icon: <MapPin className="w-8 h-8" />,
    },
    {
      id: 'competitive_dashboard',
      title: 'لوحة التحكم التنافسية',
      description: 'Competitive dashboard for all regions',
      price: 3500,
      features: [
        'تحليل شامل للمنافسين',
        'مقارنة الأسعار',
        'استراتيجيات التسويق',
        'توصيات التموضع',
      ],
      icon: <BarChart3 className="w-8 h-8" />,
    },
  ];

  const handleSubscribe = async (reportId: string) => {
    try {
      // Would call API to subscribe
      console.log('Subscribing to report:', reportId);
      // await ydt.subscribeToReport(reportId);
      alert('Subscription initiated');
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Subscription failed');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">YDT Intelligence Reports</h1>
        <p className="text-gray-500">
          تقارير استخبارات السوق (منتج منفصل)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="text-blue-500">{report.icon}</div>
                <Badge variant="outline">Premium</Badge>
              </div>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                {report.price.toLocaleString()} <span className="text-lg">جنيه/شهر</span>
              </div>

              <ul className="space-y-2">
                {report.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                onClick={() => handleSubscribe(report.id)}
                variant={selectedReport === report.id ? 'default' : 'outline'}
              >
                Subscribe
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle>Why YDT Intelligence Reports?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">
            Get access to proprietary market intelligence that helps you make better pricing decisions,
            understand competition, and identify market opportunities. Based on real data from hundreds
            of Egyptian workshops.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

