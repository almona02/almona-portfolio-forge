/**
 * @tier Tier 3 (Analytics & Reporting)
 * @constitutional_compliance AICS-001 §6 (Deterministic Reporting)
 * @region Egypt-specific YILMAZ ROI calculator
 *
 * GOVERNANCE:
 * - Calculates ROI based on deterministic Rules Engine output
 * - Compares "Preventive Cost" (Parts) vs. "Failure Cost" (Simulated multiplier)
 * - Provides bilingual Excel export for accounting
 * Migrated from Ant Design to Shadcn (Phase 3.1)
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/ui/table';
import { DollarSign, Download, Globe, LineChart, Shield } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { yilmazTelemetrySimulator } from '../../services/ticketing/yilmaz/core/YilmazTelemetrySimulator';
import { YilmazRuleResult, yilmazEgyptRulesEngine } from '../../services/ticketing/yilmaz/rules/YilmazEgyptRules';

interface AnalyticsRow {
  key: string;
  machine: string;
  model: string;
  riskLevel: string;
  preventiveCost: number;
  failureCost: number;
  roi: number;
  downtimeSaved: number;
}

export const YilmazAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  const FAILURE_COST_MULTIPLIER = 4.5;
  const DOWNTIME_HOURLY_COST_EGP = 2500;

  useEffect(() => {
    calculateMetrics();
  }, []);

  const calculateMetrics = () => {
    setLoading(true);
    const machines = yilmazTelemetrySimulator.generateAllMachines();

    const rows: AnalyticsRow[] = machines.map((machine) => {
      const input = yilmazTelemetrySimulator.toTechnicianInput(machine);
      const result: YilmazRuleResult = yilmazEgyptRulesEngine.executeRules(input);
      const preventiveCost = result.totalCostEGP;
      const effectivePreventive = preventiveCost > 0 ? preventiveCost : 0;
      const failureCost =
        result.ruleMatched
          ? effectivePreventive * FAILURE_COST_MULTIPLIER +
            result.estimatedDowntimeHours * DOWNTIME_HOURLY_COST_EGP
          : 0;

      return {
        key: machine.machineSerial,
        machine: machine.machineSerial,
        model: machine.machineModel,
        riskLevel: result.urgency,
        preventiveCost: effectivePreventive,
        failureCost,
        roi: failureCost - effectivePreventive,
        downtimeSaved: result.ruleMatched ? result.estimatedDowntimeHours : 0,
      };
    });

    setData(rows);
    setLoading(false);
  };

  const downloadCSV = () => {
    const headers =
      lang === 'en'
        ? [
            'Machine Serial',
            'Model',
            'Risk Level',
            'Preventive Cost (EGP)',
            'Potential Failure Cost (EGP)',
            'ROI (EGP)',
            'Downtime Saved (Hours)',
          ]
        : [
            'الرقم التسلسلي',
            'الطراز',
            'مستوى الخطر',
            'تكلفة وقائية (ج.م)',
            'تكلفة الفشل المحتمل (ج.م)',
            'العائد على الاستثمار (ج.م)',
            'ساعات التوقف الموفرة',
          ];

    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        [
          row.machine,
          row.model,
          row.riskLevel,
          row.preventiveCost,
          row.failureCost,
          row.roi,
          row.downtimeSaved,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `yilmaz_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalROI = data.reduce((sum, row) => sum + row.roi, 0);
  const totalDowntime = data.reduce((sum, row) => sum + row.downtimeSaved, 0);

  const getRiskBadgeVariant = (risk: string) => {
    if (risk === 'critical') return 'destructive';
    if (risk === 'high') return 'default';
    return 'secondary';
  };

  return (
    <div className="p-6 bg-muted/30">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <LineChart className="w-6 h-6" />
          {lang === 'en' ? 'Maintenance Analytics' : 'تحليلات الصيانة'}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLang((l) => (l === 'en' ? 'ar' : 'en'))}>
            <Globe className="w-4 h-4 mr-2" />
            {lang === 'en' ? 'العربية' : 'English'}
          </Button>
          <Button size="sm" onClick={downloadCSV}>
            <Download className="w-4 h-4 mr-2" />
            {lang === 'en' ? 'Export CSV' : 'تصدير Excel'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {lang === 'en' ? 'Total Return on Investment (ROI)' : 'العائد الإجمالي على الاستثمار'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{totalROI.toLocaleString()} EGP</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === 'en' ? 'Compared to reactive emergency repairs' : 'مقارنة بالإصلاحات الطارئة التفاعلية'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {lang === 'en' ? 'Production Hours Saved' : 'ساعات الإنتاج الموفرة'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">{totalDowntime.toFixed(1)}h</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {lang === 'en' ? 'Active Risk Alerts' : 'تنبيهات المخاطر النشطة'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {data.filter((r) => r.riskLevel !== 'low').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'en' ? 'Machine Risk & ROI Breakdown' : 'تحليل مخاطر الآلات والعائد'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === 'en' ? 'Machine' : 'الآلة'}</TableHead>
                  <TableHead>{lang === 'en' ? 'Risk' : 'الخطر'}</TableHead>
                  <TableHead>{lang === 'en' ? 'Preventive Cost' : 'التكلفة الوقائية'}</TableHead>
                  <TableHead>{lang === 'en' ? 'Avoided Cost' : 'التكلفة المتجنبة'}</TableHead>
                  <TableHead>ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.machine}</TableCell>
                    <TableCell>
                      <Badge variant={getRiskBadgeVariant(row.riskLevel)}>{row.riskLevel.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>EGP {row.preventiveCost.toLocaleString()}</TableCell>
                    <TableCell>EGP {row.failureCost.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      + EGP {row.roi.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
