import { usePublicCopy } from '@/hooks/usePublicCopy';
import { yilmazMachines, type Machine } from '@/constants/yilmazMachines';
import { WIZARD_OPERATIONS, WIZARD_AUTOMATION, WIZARD_PRODUCTION, resolveBundle, operationMachineCount } from '@/constants/machineWizardConfig';
import { useQuote } from '@/context/QuoteContext';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Label } from '@/shared/ui/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/ui/radio-group';
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Settings,
  ShoppingCart
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

interface MachineRecommendationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'material' | 'application' | 'automation' | 'production' | 'results';

interface WizardAnswers {
  material: string;
  application: string;
  automation: string;
  production: string;
}

const MachineRecommendationWizard: React.FC<MachineRecommendationWizardProps> = ({ open, onOpenChange }) => {
  const copy = usePublicCopy();
  const [step, setStep] = useState<Step>('material');
  const [answers, setAnswers] = useState<WizardAnswers>({ 
    material: 'both', 
    application: 'profile-cutting', 
    automation: 'optimized',
    production: ''
  });
  const [usePresetBundle, setUsePresetBundle] = useState(true);
  const [recommendations, setRecommendations] = useState<Machine[]>([]);
  const { addToQuote } = useQuote();
  const { toast } = useToast();

  const steps = [
    { id: 'material', title: copy("Material Type") },
    { id: 'application', title: copy("Application") },
    { id: 'automation', title: copy("Automation Level") },
    { id: 'production', title: copy("Production Scale") },
    { id: 'results', title: copy("Recommendations") }
  ];

  const operationStats = WIZARD_OPERATIONS.map((op) => ({
    ...op,
    count: operationMachineCount(yilmazMachines, op),
  })).sort((a, b) => b.count - a.count);

  const filterMachines = useCallback((criteria: WizardAnswers, options: { allowIncomplete?: boolean } = {}) => {
    const { allowIncomplete = false } = options;
    let filtered = yilmazMachines;

    if (criteria.material === 'aluminium') {
      filtered = filtered.filter((m) => m.material === 'aluminium' || m.material === 'both');
    } else if (criteria.material === 'pvc') {
      filtered = filtered.filter((m) => m.material === 'pvc' || m.material === 'both');
    }

    if (criteria.application) {
      const op = WIZARD_OPERATIONS.find((o) => o.id === criteria.application);
      if (op) filtered = filtered.filter((m) => op.categories.includes(m.category));
    }

    if (criteria.automation) {
      const isCnc = (m: Machine) => m.tags?.includes('CNC') || m.type.toLowerCase().includes('cnc') || m.name.toLowerCase().includes('cnc');
      const isAuto = (m: Machine) => m.tags?.includes('Automatic') || m.type.toLowerCase().includes('automatic') || m.name.toLowerCase().includes('automatic');
      if (criteria.automation === 'cnc') filtered = filtered.filter(isCnc);
      else if (criteria.automation === 'semi-automatic') filtered = filtered.filter(isAuto);
      else if (criteria.automation === 'manual') filtered = filtered.filter((m) => !isCnc(m) && !isAuto(m));
      else if (criteria.automation === 'optimized') filtered = filtered.filter((m) => isCnc(m) || isAuto(m));
    }

    if (criteria.production) {
      if (criteria.production === 'high') {
        filtered = filtered.filter((m) => m.tags?.includes('High Volume') || m.tags?.includes('Production Line') || m.name.toLowerCase().includes('production') || m.name.toLowerCase().includes('line'));
      } else if (criteria.production === 'small') {
        filtered = filtered.filter((m) => m.tags?.includes('Small Scale') || m.tags?.includes('Manual') || m.name.toLowerCase().includes('manual') || m.name.toLowerCase().includes('small'));
      }
    } else if (!allowIncomplete) {
      return [];
    }

    return filtered;
  }, []);

  const totalMachines = yilmazMachines.length;
  const previewMatches = useMemo(() => filterMachines(answers, { allowIncomplete: true }), [answers, filterMachines]);
  const answerLabel = useCallback((key: keyof WizardAnswers): string => {
    const v = answers[key];
    if (!v) return '—';
    switch (key) {
      case 'material':
        return v === 'aluminium' ? copy('Aluminum') : v === 'pvc' ? copy('UPVC') : copy('Both Materials');
      case 'application':
        return WIZARD_OPERATIONS.find((o) => o.id === v)?.label ?? v;
      case 'automation':
        return WIZARD_AUTOMATION.find((a) => a.id === v)?.label ?? v;
      case 'production':
        return WIZARD_PRODUCTION.find((p) => p.id === v)?.label ?? v;
      default:
        return v;
    }
  }, [answers, copy]);
  const SelectionStrip = () => (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
      <Badge variant="outline" className="border-gray-600 text-gray-200">{copy("Material:")}{answerLabel('material')}</Badge>
      <Badge variant="outline" className="border-gray-600 text-gray-200">{copy("Operation:")}{answerLabel('application')}</Badge>
      <Badge variant="outline" className="border-gray-600 text-gray-200">{copy("Automation:")}{answerLabel('automation')}</Badge>
      <Badge variant="outline" className="border-gray-600 text-gray-200">{copy("Production:")}{answerLabel('production')}</Badge>
      <Badge variant="secondary" className="bg-gray-700/60 text-gray-100 border-gray-600">{copy("Matching:")}{previewMatches.length} / {totalMachines}
      </Badge>
      {usePresetBundle && (
        <Badge variant="secondary" className="btn-primary">{copy("Preset bundles on")}</Badge>
      )}
    </div>
  );

  const currentStepIndex = steps.findIndex(s => s.id === step);

  // Helper function to download PDF specs
  const handleDownloadSpecs = (machine: Machine) => {
    if (machine.specPdf) {
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = machine.specPdf;
      link.download = `${machine.name.replace(/\s+/g, '_')}_specs.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: copy("Download Started"),
        description: `${copy('Downloading specifications')}: ${machine.name}`,
      });
    } else {
      toast({
        title: copy("No Specifications Available"),
        description: copy("Specifications are not available for this machine"),
        variant: "destructive"
      });
    }
  };

  // Helper function to add machine to quote
  const handleAddToQuote = (machine: Machine) => {
    const shopProduct = {
      id: machine.id,
      name: machine.name,
      description: machine.description,
      imageUrl: machine.imageUrl,
      category: machine.category,
      tags: machine.tags || [],
      stock: 0, // Default stock
      pricing: {
        base: 0,
        currency: 'EGP',
        tax: 0
      }
    };

    void addToQuote(shopProduct);
    toast({
      title: copy("Added to Quote"),
      description: `${copy('Added to your quote')}: ${machine.name}`,
    });
  };

  const handlePrintReport = () => {
    if (!recommendations.length) return;
    const reportWindow = window.open('', 'report');
    if (!reportWindow) return;

    const specRow = (label: string, selector: (m: Machine) => string | undefined) => {
      const cells = recommendations
        .map((m) => selector(m) || '—')
        .map((v) => `<td>${v}</td>`)
        .join('');
      return `<tr><th>${copy(label)}</th>${cells}</tr>`;
    };

    const headCells = recommendations
      .map((m) => `<th>${m.name}</th>`)
      .join('');

    const html = `
      <html dir="${document.documentElement.dir}" lang="${document.documentElement.lang}">
        <head>
          <title>${copy('Machine Comparison Report')}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: "Inter", Arial, sans-serif; padding: 16px; color: #0f172a; }
            h1 { margin: 0 0 4px 0; }
            h2 { margin: 0 0 12px 0; font-size: 14px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: start; vertical-align: top; }
            th { background: #f8fafc; font-weight: 600; }
            tr:nth-child(even) td { background: #fbfdff; }
            .tag { display: inline-block; padding: 2px 6px; margin: 2px; border-radius: 6px; background: #fee9d7; color: #9a3412; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>${copy('Machine Comparison')} (${recommendations.length})</h1>
          <h2>${copy('Side-by-side specifications and power/safety highlights')}</h2>
          <table>
            <thead>
              <tr>
                <th>${copy('Specification')}</th>
                ${headCells}
              </tr>
            </thead>
            <tbody>
              ${specRow('Type', (m) => copy(m.type))}
              ${specRow('Category', (m) => copy(m.category))}
              ${specRow('Power', (m) => m.powerSpec?.consumption)}
              ${specRow('Voltage', (m) => m.powerSpec?.voltage)}
              ${specRow('Dimensions', (m) => m.dimensions ? `${m.dimensions.length} × ${m.dimensions.width} × ${m.dimensions.height}` : undefined)}
              ${specRow('Air', (m) => m.airSpec?.consumption ? `${m.airSpec.consumption}${m.airSpec.pressure ? ` @ ${m.airSpec.pressure}` : ''}` : undefined)}
              ${specRow('Safety', (m) => (m.safetyFeatures || []).map(copy).join(', '))}
              ${specRow('Tags', (m) => (m.tags || []).map(t => `<span class="tag">${copy(t)}</span>`).join(' '))}
            </tbody>
          </table>
        </body>
      </html>
    `;

    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  // Helper function to export summary as PDF
  const handleExportSummary = () => {
    // Create a simple text-based summary for now
    const summaryText = `
${copy('Machine selection brief')}
${copy('Generated')}: ${new Date().toLocaleDateString(document.documentElement.lang || 'en')}

${copy('Selections')}:
- ${copy('Material:')} ${answerLabel('material')}
- ${copy('Application:')} ${answerLabel('application')}
- ${copy('Automation:')} ${answerLabel('automation')}
- ${copy('Production Scale')}: ${answerLabel('production')}

${copy('Recommended machines')}:
${recommendations.map((m, i) => `${i + 1}. ${m.name} - ${copy(m.description)}`).join('\n')}

${copy('Prepared by ALMONA.')}
    `.trim();

    // Create and download the summary as a text file
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `machine_recommendation_summary_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: copy("Summary Exported"),
      description: copy("Your recommendation summary has been downloaded"),
    });
  };

  const handleValueChange = (key: keyof typeof answers, value: string) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [key]: value };

      // Smart reset: If material changes, clear application selection
      if (key === 'material') {
        newAnswers.application = '';
      }

      // Smart reset: If application changes, clear automation selection
      if (key === 'application') {
        newAnswers.automation = '';
      }

      return newAnswers;
    });
  };

  const getRecommendations = () => {
    const filtered = filterMachines(answers, { allowIncomplete: false });
    if (usePresetBundle && answers.production) {
      const bundled = resolveBundle(answers.material, answers.production, yilmazMachines);
      setRecommendations(bundled.length ? bundled : filtered);
    } else {
      setRecommendations(filtered);
    }
    setStep('results');
  };

  const resetWizard = () => {
    setStep('material');
    setAnswers({ material: 'both', application: 'profile-cutting', automation: 'optimized', production: '' });
    setUsePresetBundle(true);
    setRecommendations([]);
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length - 1) {
      setStep(steps[nextIndex].id as Step);
    } else {
      getRecommendations();
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].id as Step);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'material':
        return (
          <LazyMotionDiv
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{copy("Select Material")}</h3>
              <p className="text-gray-400 text-sm">{copy("Which material dominates your production mix?")}</p>
            </div>
            <SelectionStrip />
            <RadioGroup value={answers.material} onValueChange={(v) => handleValueChange('material', v)}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card 
                  className={`cursor-pointer transition-all ${answers.material === 'aluminium' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('material', 'aluminium')}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <RadioGroupItem value="aluminium" id="aluminium" className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor="aluminium" className="typography-label text-base sm:text-lg font-semibold cursor-pointer">{copy("Aluminum")}</Label>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">{copy("Rigid frames, premium finish and corrosion resistance")}</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">{copy("High Strength")}</Badge>
                          <Badge variant="secondary" className="text-xs">{copy("Weather Resistant")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.material === 'pvc' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('material', 'pvc')}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <RadioGroupItem value="pvc" id="pvc" className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor="pvc" className="typography-label text-base sm:text-lg font-semibold cursor-pointer">{copy("UPVC")}</Label>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">{copy("Thermal insulation, low maintenance and acoustic insulation")}</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">{copy("Energy Efficient")}</Badge>
                          <Badge variant="secondary" className="text-xs">{copy("Low Maintenance")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.material === 'both' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('material', 'both')}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <RadioGroupItem value="both" id="both" className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor="both" className="typography-label text-base sm:text-lg font-semibold cursor-pointer">{copy("Both Materials")}</Label>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">{copy("Mixed aluminium and UPVC production")}</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">{copy("Versatile")}</Badge>
                          <Badge variant="secondary" className="text-xs">{copy("Multi-Material")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </RadioGroup>
          </LazyMotionDiv>
        );
      case 'application':
        return (
          <LazyMotionDiv
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{copy("Application")}</h3>
              <p className="text-gray-400 text-sm">{copy("Select the operation that matches your main workload.")}</p>
            </div>
            <SelectionStrip />
            <Card
              className={`cursor-pointer transition-all ${usePresetBundle ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
              onClick={() => setUsePresetBundle(prev => !prev)}
              role="button"
              tabIndex={0}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                        usePresetBundle ? 'border-amber-400 bg-amber-500' : 'border-gray-500'
                      }`}
                      aria-hidden="true"
                    />
                    <Label className="typography-label text-base sm:text-lg font-semibold cursor-pointer">{copy("Workshop Bundle (recommended)")}</Label>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">{copy("Selects a complete workshop set based on your production scale: 1-50 units/day ≈ 7 machines, 50-100 units/day ≈ 12 machines, 100+ units/day scales accordingly.")}</p>
              </CardContent>
            </Card>
            <RadioGroup value={answers.application} onValueChange={(v) => handleValueChange('application', v)}>
              <div className="grid gap-3 sm:grid-cols-2">
                {operationStats.map((op) => {
                  const isSelected = answers.application === op.id;
                  return (
                    <Card
                      key={op.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'
                      }`}
                      onClick={() => handleValueChange('application', op.id)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          <RadioGroupItem value={op.id} id={op.id} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={op.id} className="typography-label text-base sm:text-lg font-semibold cursor-pointer">
                              {op.label}
                            </Label>
                            <p className="text-xs sm:text-sm text-gray-400 mt-1">
                              {copy(op.description)}
                            </p>
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2 items-center">
                                                            <Badge variant="secondary" className="text-xs">
                                {op.count}{copy("machines")}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </RadioGroup>
          </LazyMotionDiv>
        );
      case 'automation':
        return (
          <LazyMotionDiv
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{copy("Automation Level")}</h3>
              <p className="text-gray-400">{copy("Select the automation level for your quality and throughput targets.")}</p>
            </div>
            <SelectionStrip />
            <RadioGroup value={answers.automation} onValueChange={(v) => handleValueChange('automation', v)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card 
                  className={`cursor-pointer transition-all ${answers.automation === 'manual' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('automation', 'manual')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="manual" id="manual" />
                      <div className="flex-1">
                        <Label htmlFor="manual" className="typography-label text-lg font-semibold cursor-pointer">{copy("Manual Operation")}</Label>
                        <p className="text-sm text-gray-400 mt-1">{copy("Operator-controlled for custom work and low-volume production")}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{copy("Operator Control")}</Badge>
                          <Badge variant="secondary">{copy("Custom Work")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.automation === 'semi-automatic' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('automation', 'semi-automatic')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="semi-automatic" id="semi-automatic" />
                      <div className="flex-1">
                        <Label htmlFor="semi-automatic" className="typography-label text-lg font-semibold cursor-pointer">{copy("Semi-Automatic")}</Label>
                        <p className="text-sm text-gray-400 mt-1">{copy("Semi-automatic with operator supervision")}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{copy("Automated Process")}</Badge>
                          <Badge variant="secondary">{copy("Operator Supervised")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.automation === 'optimized' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('automation', 'optimized')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="optimized" id="optimized" />
                      <div className="flex-1">
                        <Label htmlFor="optimized" className="typography-label text-lg font-semibold cursor-pointer">{copy("Optimized (Recommended)")}</Label>
                        <p className="text-sm text-gray-400 mt-1">{copy("Prioritize CNC/automatic machines for throughput and quality.")}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{copy("Preset")}</Badge>
                          <Badge variant="secondary">{copy("Balanced Speed/QA")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.automation === 'cnc' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('automation', 'cnc')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="cnc" id="cnc" />
                      <div className="flex-1">
                        <Label htmlFor="cnc" className="typography-label text-lg font-semibold cursor-pointer">{copy("CNC & Fully Automatic")}</Label>
                        <p className="text-sm text-gray-400 mt-1">{copy("CNC control for high-volume output and repeatable precision")}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{copy("CNC Control")}</Badge>
                          <Badge variant="secondary">{copy("High Precision")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </RadioGroup>
          </LazyMotionDiv>
        );
      case 'production':
        return (
          <LazyMotionDiv
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{copy("Production Scale")}</h3>
              <p className="text-gray-400">{copy("Match capacity to your daily production target.")}</p>
            </div>
            <SelectionStrip />
            <RadioGroup value={answers.production} onValueChange={(v) => handleValueChange('production', v)}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card 
                  className={`cursor-pointer transition-all ${answers.production === 'small' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('production', 'small')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="small" id="small" />
                      <div className="flex-1">
                        <Label htmlFor="small" className="typography-label text-lg font-semibold cursor-pointer">{copy("Small Scale (1-50 units/day)")}</Label>
                        <p className="text-sm text-gray-400 mt-1">{copy("Custom work and prototyping")}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{copy("Custom Work")}</Badge>
                          <Badge variant="secondary">{copy("Flexible")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.production === 'medium' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('production', 'medium')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="medium" id="medium" />
                      <div className="flex-1">
                        <Label htmlFor="medium" className="typography-label text-lg font-semibold cursor-pointer">{copy("Medium Scale (50-200 units/day)")}</Label>
                        <p className="text-sm text-gray-400 mt-1">{copy("Balanced throughput for regional demand")}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{copy("Regional Scale")}</Badge>
                          <Badge variant="secondary">{copy("Growing Business")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.production === 'high' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('production', 'high')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="high" id="high" />
                      <div className="flex-1">
                        <Label htmlFor="high" className="typography-label text-lg font-semibold cursor-pointer">{copy("High Volume (200+ units/day)")}</Label>
                        <p className="text-sm text-gray-400 mt-1">{copy("Integrated production lines for sustained volume with QA checkpoints")}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{copy("Production Line")}</Badge>
                          <Badge variant="secondary">{copy("High Volume")}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
          </div>
            </RadioGroup>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2">
              <p className="text-xs text-gray-400">{copy("Production scale is mandatory — it drives the final recommendation set.")}</p>
              <Button
                size="sm"
                variant={usePresetBundle ? 'default' : 'outline'}
                className="flex items-center gap-2"
                onClick={() => setUsePresetBundle(prev => !prev)}
              >
                {copy(usePresetBundle ? 'Preset bundles enabled' : 'Enable preset bundles')}
              </Button>
            </div>
            {answers.production && usePresetBundle && (
              <div className="text-xs text-gray-300 bg-gray-800/60 border border-gray-700/60 rounded-lg p-3">{copy("A balanced production set for")}{answerLabel('production')}{copy(". Example bundle for high-volume could include dual cutters, routers, milling, cleaning, and welding stations sized to ~100 units/day.")}</div>
            )}
          </LazyMotionDiv>
        );
      case 'results':
        return (
          <LazyMotionDiv
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{copy("Recommended Machines")}</h3>
              <p className="text-gray-400 text-sm">{copy("Matched to your selections.")}</p>
            </div>

            {/* Summary Report */}
            <Card className="bg-gray-800/50 border-gray-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="typography-h4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-almona-orange" />{copy("Selection Brief")}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportSummary}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />{copy("Export Brief")}</Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">{copy("Material:")}</span>
                    <p className="font-medium capitalize">{answerLabel('material')}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">{copy("Application:")}</span>
                    <p className="font-medium capitalize">{answerLabel('application')}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">{copy("Automation:")}</span>
                    <p className="font-medium capitalize">{answerLabel('automation')}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">{copy("Production:")}</span>
                    <p className="font-medium capitalize">{answerLabel('production')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto">
              {recommendations.length > 0 ? recommendations.map(machine => (
                <Card key={machine.id} className="hover:bg-gray-800/50 transition-colors">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-almona-orange" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="typography-h4 text-base sm:text-lg">{machine.name}</h4>
                          <p className="text-xs sm:text-sm text-gray-400 mt-1 line-clamp-2">{copy(machine.description)}</p>
                          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                            {machine.tags?.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-col sm:flex-shrink-0 sm:items-stretch">
                        <Button 
                          size="sm" 
                          className="flex-1 sm:flex-none bg-almona-orange hover:bg-almona-orange-dark text-xs sm:text-sm"
                          onClick={() => handleDownloadSpecs(machine)}
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />{copy("View Specs")}</Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                          onClick={() => handleAddToQuote(machine)}
                        >
                          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />{copy("Add to Quote")}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="typography-h4 mb-2">{copy("No Machines Matched")}</h4>
                    <p className="text-gray-400 mb-4">{copy("Adjust your selections to see matching machines.")}</p>
                    <Button asChild className="bg-almona-orange hover:bg-almona-orange-dark">
                      <Link to="/contact">{copy("Contact Our Experts")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </LazyMotionDiv>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] sm:w-[92vw] max-w-3xl sm:max-w-4xl h-[88vh] max-h-[840px] overflow-hidden flex flex-col top-[50%]">
        <DialogHeader className="border-b border-gray-700 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-3 min-w-0">
              <DialogTitle className="text-lg font-bold truncate">{copy("Machine Wizard")}</DialogTitle>
              <span className="text-xs text-gray-400 flex-shrink-0">{copy("Step")} {currentStepIndex + 1}/{steps.length}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {steps.map((_, index) => (
                <div key={index} className={`w-2 h-2 rounded-full transition-all ${index <= currentStepIndex ? 'bg-almona-orange' : 'bg-gray-600'}`} />
              ))}
            </div>
          </div>
          <div className="mt-1.5 text-xs font-medium text-almona-orange">{steps[currentStepIndex]?.title}</div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 sm:py-4 px-2 sm:px-0">
          <LazyAnimatePresence mode="wait">
        {renderStep()}
          </LazyAnimatePresence>
        </div>

        <DialogFooter className="border-t border-gray-700 pt-4 flex-shrink-0">
          <div className="w-full flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-gray-700/60 text-gray-100 border-gray-600">
                  {previewMatches.length}{copy("matching")}</Badge>
                <span className="text-[11px] text-gray-400">{copy("Filters stay active through the wizard.")}</span>
              </div>
              {usePresetBundle && (
                <Badge variant="outline" className="text-[11px] border-amber-400/50 text-amber-200">{copy("Preset bundles enabled")}</Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-between w-full gap-3">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />{copy("Back")}</Button>

              <div className="flex gap-2 w-full sm:w-auto">
                {step === 'results' ? (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handlePrintReport}
                      className="bg-almona-orange hover:bg-almona-orange-dark flex items-center gap-2 flex-1 sm:flex-none"
                    >
                      <Printer className="h-4 w-4" />{copy("Print Report")}</Button>
                    <Button variant="outline" onClick={resetWizard} className="flex items-center gap-2 flex-1 sm:flex-none">
                      <RefreshCw className="h-4 w-4" />{copy("Start Over")}</Button>
                  </>
                ) : (
                  <Button 
                    onClick={nextStep}
                    disabled={!answers[step as keyof WizardAnswers]}
                    className="bg-almona-orange hover:bg-almona-orange-dark flex items-center gap-2 flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">
                      {copy(currentStepIndex === steps.length - 2 ? 'Get Recommendations' : 'Next')}
                    </span>
                    <span className="sm:hidden">
                      {copy(currentStepIndex === steps.length - 2 ? 'Get Results' : 'Next')}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MachineRecommendationWizard;
