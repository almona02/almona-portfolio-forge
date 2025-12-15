import { yilmazMachines, type Machine } from '@/constants/yilmazMachines';
import { useQuote } from '@/context/QuoteContext';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Label } from '@/shared/ui/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/ui/radio-group';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Building2,
  CheckCircle,
  Cpu,
  Download,
  FileText,
  Printer,
  Settings,
  ShoppingCart,
  Sparkles,
  Square,
  TrendingUp
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
  const [step, setStep] = useState<Step>('material');
  const [answers, setAnswers] = useState<WizardAnswers>({ 
    material: 'both', 
    application: 'fabrication-equipment', 
    automation: 'optimized',
    production: ''
  });
  const [usePresetBundle, setUsePresetBundle] = useState(true);
  const [recommendations, setRecommendations] = useState<Machine[]>([]);
  const { addToQuote } = useQuote();
  const { toast } = useToast();

  const steps = [
    { id: 'material', title: 'Material Type', icon: Building2 },
    { id: 'application', title: 'Application', icon: Square },
    { id: 'automation', title: 'Automation Level', icon: Cpu },
    { id: 'production', title: 'Production Scale', icon: TrendingUp },
    { id: 'results', title: 'Recommendations', icon: Award }
  ];

  const categoryMeta: Record<string, { label: string; icon: string; description: string }> = {
    'processing-centers': {
      label: 'Processing Centers',
      icon: '🧠',
      description: 'CNC machining, drilling, and profile processing lines'
    },
    'cutting-machines': {
      label: 'Cutting & Mitre',
      icon: '✂️',
      description: 'Mitre saws, compound cutting, and high-precision length cuts'
    },
    'welding-machines': {
      label: 'Welding Lines',
      icon: '🔗',
      description: 'UPVC welding, seamless finish, and multi-head production'
    },
    'corner-crimping': {
      label: 'Corner Crimping',
      icon: '🧱',
      description: 'Aluminium corner joining with deformation-free results'
    },
    'end-milling': {
      label: 'End Milling',
      icon: '🛠️',
      description: 'End preparation for tight joints and tolerance control'
    },
    'copy-routers': {
      label: 'Copy Routers',
      icon: '📐',
      description: 'Lock/hinge routing with multi-side accuracy'
    },
    'fabrication-equipment': {
      label: 'Fabrication Lines',
      icon: '🏭',
      description: 'Integrated welding/cleaning lines for high throughput'
    },
    routers: {
      label: 'Routers',
      icon: '🌀',
      description: 'NC routing and multi-surface machining'
    },
    accessories: {
      label: 'Accessories',
      icon: '⚙️',
      description: 'Cooling units, robot transfer, and supporting equipment'
    }
  };

  const categoryKeywordMap: Record<string, string[]> = useMemo(() => ({
    'processing-centers': ['processing', 'milling', 'drilling', 'cnc', 'machining'],
    'cutting-machines': ['cutting', 'mitre', 'miter', 'saw'],
    'welding-machines': ['welding', 'seamless', 'fusion'],
    'corner-crimping': ['crimp', 'crimping'],
    'end-milling': ['end-milling', 'end milling'],
    'copy-routers': ['router', 'routing', 'copy'],
    'fabrication-equipment': ['fabrication', 'line', 'cleaning', 'robot', 'welding line'],
    routers: ['router', 'nc'],
    accessories: ['accessory', 'cooling', 'robot', 'unit']
  }), []);

  const bundleIdMap: Record<'small-scale' | 'medium-scale' | 'high-volume', string[]> = {
    'small-scale': [
      'ym-010', // DC-421-PSD cutting
      'ym-029', // FR-223-S router
      'ym-004', // KM-212 end-milling
      'ym-025', // KD-305 mitre saw
      'ym-003', // DK 502 welding
      'ym-022', // CK 412 glazing
      'ym-031'  // KM-211-S end milling/manual
    ],
    'medium-scale': [
      'ym-002', // DC-421-PBS cutting
      'ym-010', // DC-421-PSD cutting
      'ym-016', // CRM-250-S copy router
      'ym-015', // KM-215-S end milling
      'ym-003', // DK 502 welding
      'ym-023', // DK 540 welding line
      'ym-022', // CK 412 glazing
      'ym-004', // KM-212
      'ym-026', // KD-350-PS mitre
      'ym-028', // FR-223 portable router
      'ym-018', // SDT 275 reinforcement saw
      'ym-011'  // ACK-420-S up-cut saw
    ],
    'high-volume': [
      'ym-009', // CDC 600 compound cutting
      'ym-002', // DC-421-PBS
      'ym-010', // DC-421-PSD
      'ym-007', // PIM 6509 processing center
      'ym-001', // AIM 3410 processing center
      'ym-023', // DK 540 welding line
      'ym-008', // CCL 1661 fabrication line
      'ym-016', // CRM-250-S
      'ym-015', // KM-215-S
      'ym-018', // SDT 275
      'ym-011', // ACK-420-S
      'ym-022', // CK 412
      'ym-004', // KM-212
      'ym-026', // KD-350-PS
      'ym-025', // KD-305
      'ym-028'  // FR-223
    ]
  };

  const bundleForScale = (production: string): Machine[] => {
    const ids = bundleIdMap[production as keyof typeof bundleIdMap];
    if (!ids) return [];
    return ids
      .map(id => yilmazMachines.find(m => m.id === id))
      .filter((m): m is Machine => Boolean(m));
  };

  const filterMachines = useCallback((criteria: WizardAnswers, options: { allowIncomplete?: boolean } = {}) => {
    const { allowIncomplete = false } = options;
    let filtered = yilmazMachines;

    // Material-based filtering
    if (criteria.material === 'aluminum') {
      filtered = filtered.filter(m => 
        m.tags?.some(tag => tag.toLowerCase().includes('aluminum')) ||
        m.name.toLowerCase().includes('aluminum') ||
        m.category.includes('aluminum') ||
        m.category.includes('cutting') ||
        m.category.includes('crimping')
      );
    } else if (criteria.material === 'upvc') {
      filtered = filtered.filter(m => 
        m.tags?.some(tag => tag.toLowerCase().includes('pvc') || tag.toLowerCase().includes('upvc')) ||
        m.name.toLowerCase().includes('pvc') ||
        m.category.includes('pvc') ||
        m.category.includes('welding') ||
        m.category.includes('cutting')
      );
    } else if (criteria.material === 'both') {
      filtered = filtered.filter(m => 
        m.tags?.some(tag => 
          tag.toLowerCase().includes('aluminum') || 
          tag.toLowerCase().includes('pvc') || 
          tag.toLowerCase().includes('upvc')
        ) ||
        m.name.toLowerCase().includes('aluminum') ||
        m.name.toLowerCase().includes('pvc') ||
        m.category.includes('cutting') ||
        m.category.includes('welding') ||
        m.category.includes('processing')
      );
    }

    // Application-based filtering using category keywords
    if (criteria.application) {
      const keywords = categoryKeywordMap[criteria.application] || [criteria.application];
      filtered = filtered.filter((m) => {
        const haystack = [
          m.category.toLowerCase(),
          m.name.toLowerCase(),
          ...(m.tags || []).map((t) => t.toLowerCase())
        ];
        return (
          m.category === criteria.application ||
          keywords.some((kw) => haystack.some((text) => text.includes(kw)))
        );
      });
    }

    // Automation-based filtering
    if (criteria.automation) {
      if (criteria.automation === 'cnc') {
        filtered = filtered.filter(m => 
          m.tags?.includes('CNC') || 
          m.type.toLowerCase().includes('cnc') ||
          m.name.toLowerCase().includes('cnc')
        );
      } else if (criteria.automation === 'automatic') {
        filtered = filtered.filter(m => 
          m.tags?.includes('Automatic') || 
          m.type.toLowerCase().includes('automatic') ||
          m.name.toLowerCase().includes('automatic')
        );
      } else if (criteria.automation === 'manual') {
        filtered = filtered.filter(m => 
          !m.tags?.includes('CNC') && 
          !m.tags?.includes('Automatic') &&
          !m.name.toLowerCase().includes('cnc') &&
          !m.name.toLowerCase().includes('automatic')
        );
      } else if (criteria.automation === 'optimized') {
        // Prefer CNC or Automatic, but keep a broader set until production scale is chosen
        filtered = filtered.filter(m => 
          m.tags?.includes('CNC') ||
          m.tags?.includes('Automatic') ||
          m.type.toLowerCase().includes('cnc') ||
          m.type.toLowerCase().includes('automatic') ||
          m.name.toLowerCase().includes('cnc') ||
          m.name.toLowerCase().includes('automatic')
        );
      }
    }

    // Production scale filtering (skip when incomplete if allowed)
    if (criteria.production) {
      if (criteria.production === 'high-volume') {
        filtered = filtered.filter(m => 
          m.tags?.includes('High Volume') || 
          m.tags?.includes('Production Line') ||
          m.name.toLowerCase().includes('production') ||
          m.name.toLowerCase().includes('line')
        );
      } else if (criteria.production === 'small-scale') {
        filtered = filtered.filter(m => 
          m.tags?.includes('Small Scale') || 
          m.tags?.includes('Manual') ||
          m.name.toLowerCase().includes('manual') ||
          m.name.toLowerCase().includes('small')
        );
      }
      // medium-scale keeps balanced set; no extra filter
    } else if (!allowIncomplete) {
      return [];
    }

    return filtered;
  }, [categoryKeywordMap]);

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    yilmazMachines.forEach((machine) => {
      counts.set(machine.category, (counts.get(machine.category) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([id, count]) => {
        const meta = categoryMeta[id] ?? {
          label: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: '🛠️',
          description: 'Industrial machinery'
        };
        return { id, count, ...meta };
      })
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalMachines = yilmazMachines.length;
  const previewMatches = useMemo(() => filterMachines(answers, { allowIncomplete: true }), [answers, filterMachines]);
  const SelectionStrip = () => (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
      <Badge variant="outline" className="border-gray-600 text-gray-200">Material: {answers.material || '—'}</Badge>
      <Badge variant="outline" className="border-gray-600 text-gray-200">Operation: {answers.application || '—'}</Badge>
      <Badge variant="outline" className="border-gray-600 text-gray-200">Automation: {answers.automation || '—'}</Badge>
      <Badge variant="outline" className="border-gray-600 text-gray-200">Production: {answers.production || '—'}</Badge>
      <Badge variant="secondary" className="bg-gray-700/60 text-gray-100 border-gray-600">
        Matching: {previewMatches.length} / {totalMachines}
      </Badge>
      {usePresetBundle && (
        <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 border-orange-400/40">
          Preset bundles on
        </Badge>
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
        title: "Download Started",
        description: `Downloading specifications for ${machine.name}`,
      });
    } else {
      toast({
        title: "No Specifications Available",
        description: "Specifications are not available for this machine",
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
    
    addToQuote(shopProduct);
    toast({
      title: "Added to Quote",
      description: `${machine.name} has been added to your quote`,
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
      return `<tr><th>${label}</th>${cells}</tr>`;
    };

    const headCells = recommendations
      .map((m) => `<th>${m.name}</th>`)
      .join('');

    const html = `
      <html>
        <head>
          <title>Machine Comparison Report</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: "Inter", Arial, sans-serif; padding: 16px; color: #0f172a; }
            h1 { margin: 0 0 4px 0; }
            h2 { margin: 0 0 12px 0; font-size: 14px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; font-weight: 600; }
            tr:nth-child(even) td { background: #fbfdff; }
            .tag { display: inline-block; padding: 2px 6px; margin: 2px; border-radius: 6px; background: #fee9d7; color: #9a3412; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>Machine Comparison (${recommendations.length})</h1>
          <h2>Side-by-side specifications and power/safety highlights</h2>
          <table>
            <thead>
              <tr>
                <th>Specification</th>
                ${headCells}
              </tr>
            </thead>
            <tbody>
              ${specRow('Type', (m) => m.type)}
              ${specRow('Category', (m) => m.category)}
              ${specRow('Power', (m) => m.powerSpec?.consumption)}
              ${specRow('Voltage', (m) => m.powerSpec?.voltage)}
              ${specRow('Dimensions', (m) => m.dimensions ? `${m.dimensions.length} × ${m.dimensions.width} × ${m.dimensions.height}` : undefined)}
              ${specRow('Air', (m) => m.airSpec?.consumption ? `${m.airSpec.consumption}${m.airSpec.pressure ? ` @ ${m.airSpec.pressure}` : ''}` : undefined)}
              ${specRow('Safety', (m) => (m.safetyFeatures || []).join(', '))}
              ${specRow('Tags', (m) => (m.tags || []).map(t => `<span class="tag">${t}</span>`).join(' '))}
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
PRECISION MACHINE BRIEF
Generated: ${new Date().toLocaleDateString()}

SELECTIONS:
- Material: ${answers.material}
- Application: ${answers.application}
- Automation: ${answers.automation}
- Production Scale: ${answers.production}

RECOMMENDED MACHINES:
${recommendations.map((m, i) => `${i + 1}. ${m.name} - ${m.description}`).join('\n')}

Produced by the Almona Precision AI Machine Wizard (Industry 4.0 aligned).
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
      title: "Summary Exported",
      description: "Your recommendation summary has been downloaded",
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
      const bundled = bundleForScale(answers.production);
      setRecommendations(bundled.length ? bundled : filtered);
    } else {
      setRecommendations(filtered);
    }
    setStep('results');
  };

  const resetWizard = () => {
    setStep('material');
    setAnswers({ material: 'both', application: 'fabrication-equipment', automation: 'optimized', production: '' });
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
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-almona-orange mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Select Primary Substrate</h3>
              <p className="text-gray-400 text-sm sm:text-base">What substrate dominates your current or planned production mix?</p>
            </div>
            <SelectionStrip />
            <RadioGroup value={answers.material} onValueChange={(v) => handleValueChange('material', v)}>
              <div className="grid gap-3 sm:gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${answers.material === 'aluminum' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('material', 'aluminum')}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <RadioGroupItem value="aluminum" id="aluminum" className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor="aluminum" className="text-base sm:text-lg font-semibold cursor-pointer">Aluminum</Label>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">High-rigidity frames with premium finishing and corrosion resistance</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">High Strength</Badge>
                          <Badge variant="secondary" className="text-xs">Weather Resistant</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.material === 'upvc' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('material', 'upvc')}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <RadioGroupItem value="upvc" id="upvc" className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor="upvc" className="text-base sm:text-lg font-semibold cursor-pointer">UPVC</Label>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">Thermal-first systems with low maintenance and superior acoustic insulation</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">Energy Efficient</Badge>
                          <Badge variant="secondary" className="text-xs">Low Maintenance</Badge>
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
                        <Label htmlFor="both" className="text-base sm:text-lg font-semibold cursor-pointer">Both Materials</Label>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">Dual-line capability for mixed aluminum and UPVC portfolios</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">Versatile</Badge>
                          <Badge variant="secondary" className="text-xs">Multi-Material</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </RadioGroup>
          </motion.div>
        );
      case 'application':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Square className="h-10 w-10 sm:h-12 sm:w-12 text-almona-orange mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Core Operation Focus</h3>
              <p className="text-gray-400 text-sm sm:text-base">
                Choose the operation family that drives your current workload.
              </p>
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
                        usePresetBundle ? 'border-orange-400 bg-orange-500' : 'border-gray-500'
                      }`}
                      aria-hidden="true"
                    />
                    <Label className="text-base sm:text-lg font-semibold cursor-pointer">
                      Workshop Bundle (recommended)
                    </Label>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">
                  Auto-selects a complete workshop set based on your production scale:
                  1-50 units/day ≈ 7 machines, 50-100 units/day ≈ 12 machines, 100+ units/day scales up accordingly.
                </p>
              </CardContent>
            </Card>
            <RadioGroup value={answers.application} onValueChange={(v) => handleValueChange('application', v)}>
              <div className="grid gap-3 sm:gap-4">
                {categoryStats.map((category) => {
                  const isSelected = answers.application === category.id;
                  return (
                    <Card
                      key={category.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'
                      }`}
                      onClick={() => handleValueChange('application', category.id)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          <RadioGroupItem value={category.id} id={category.id} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={category.id} className="text-base sm:text-lg font-semibold cursor-pointer">
                              {category.label}
                            </Label>
                            <p className="text-xs sm:text-sm text-gray-400 mt-1">
                              {category.description}
                            </p>
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2 items-center">
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <span>{category.icon}</span>
                                <span>Category</span>
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {category.count} machines
                              </Badge>
                              {category.id === 'fabrication-equipment' && (
                                <Badge variant="outline" className="text-[11px] border-orange-400/50 text-orange-300">
                                  Full line (recommended)
                                </Badge>
                              )}
                              {usePresetBundle && category.id === 'fabrication-equipment' && (
                                <Badge variant="secondary" className="text-[11px] bg-orange-500/20 text-orange-200 border-orange-400/50">
                                  Workshop set active
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </RadioGroup>
          </motion.div>
        );
      case 'automation':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Cpu className="h-12 w-12 text-almona-orange mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Automation Level</h3>
              <p className="text-gray-400">Select the control philosophy that matches your quality and throughput targets.</p>
            </div>
            <SelectionStrip />
            <RadioGroup value={answers.automation} onValueChange={(v) => handleValueChange('automation', v)}>
              <div className="grid gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${answers.automation === 'manual' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('automation', 'manual')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="manual" id="manual" />
                      <div className="flex-1">
                        <Label htmlFor="manual" className="text-lg font-semibold cursor-pointer">Manual Operation</Label>
                        <p className="text-sm text-gray-400 mt-1">Operator-first cells for bespoke work and low-volume series</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">Operator Control</Badge>
                          <Badge variant="secondary">Custom Work</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.automation === 'automatic' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('automation', 'automatic')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="automatic" id="automatic" />
                      <div className="flex-1">
                        <Label htmlFor="automatic" className="text-lg font-semibold cursor-pointer">Semi-Automatic</Label>
                        <p className="text-sm text-gray-400 mt-1">Assisted automation with safeguarded repeatability and human oversight</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">Automated Process</Badge>
                          <Badge variant="secondary">Operator Supervised</Badge>
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
                        <Label htmlFor="optimized" className="text-lg font-semibold cursor-pointer">Optimized (Recommended)</Label>
                        <p className="text-sm text-gray-400 mt-1">Auto-prioritize CNC/automatic cells for throughput and quality.</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">Preset</Badge>
                          <Badge variant="secondary">Balanced Speed/QA</Badge>
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
                        <Label htmlFor="cnc" className="text-lg font-semibold cursor-pointer">CNC & Fully Automatic</Label>
                        <p className="text-sm text-gray-400 mt-1">Closed-loop CNC control for high-volume output and micron-level fidelity</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">CNC Control</Badge>
                          <Badge variant="secondary">High Precision</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </RadioGroup>
          </motion.div>
        );
      case 'production':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-almona-orange mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Production Scale</h3>
              <p className="text-gray-400">Align capacity with demand to right-size the cell and investment.</p>
            </div>
            <SelectionStrip />
            <RadioGroup value={answers.production} onValueChange={(v) => handleValueChange('production', v)}>
              <div className="grid gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${answers.production === 'small-scale' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('production', 'small-scale')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="small-scale" id="small-scale" />
                      <div className="flex-1">
                        <Label htmlFor="small-scale" className="text-lg font-semibold cursor-pointer">Small Scale (1-50 units/day)</Label>
                        <p className="text-sm text-gray-400 mt-1">Custom work, prototyping, and boutique fabrication lines</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">Custom Work</Badge>
                          <Badge variant="secondary">Flexible</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.production === 'medium-scale' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('production', 'medium-scale')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="medium-scale" id="medium-scale" />
                      <div className="flex-1">
                        <Label htmlFor="medium-scale" className="text-lg font-semibold cursor-pointer">Medium Scale (50-200 units/day)</Label>
                        <p className="text-sm text-gray-400 mt-1">Balanced throughput for regional demand with disciplined quality</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">Regional Scale</Badge>
                          <Badge variant="secondary">Growing Business</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${answers.production === 'high-volume' ? 'ring-2 ring-almona-orange bg-almona-orange/10' : 'hover:bg-gray-800/50'}`}
                  onClick={() => handleValueChange('production', 'high-volume')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="high-volume" id="high-volume" />
                      <div className="flex-1">
                        <Label htmlFor="high-volume" className="text-lg font-semibold cursor-pointer">High Volume (200+ units/day)</Label>
                        <p className="text-sm text-gray-400 mt-1">Integrated production lines for sustained volume with QA checkpoints</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">Production Line</Badge>
                          <Badge variant="secondary">High Volume</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
          </div>
            </RadioGroup>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2">
              <p className="text-xs text-gray-400">
                Production scale is mandatory — it drives the final recommendation set.
              </p>
              <Button
                size="sm"
                variant={usePresetBundle ? 'default' : 'outline'}
                className="flex items-center gap-2"
                onClick={() => setUsePresetBundle(prev => !prev)}
              >
                {usePresetBundle ? 'Preset bundles enabled' : 'Enable preset bundles'}
              </Button>
            </div>
            {answers.production && usePresetBundle && (
              <div className="text-xs text-gray-300 bg-gray-800/60 border border-gray-700/60 rounded-lg p-3">
                We’ll prioritize a balanced production set for {answers.production.replace('-', ' ')}. Example bundle for high-volume could include dual cutters, routers, milling, cleaning, and welding stations sized to ~100 units/day.
              </div>
            )}
          </motion.div>
        );
      case 'results':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Award className="h-10 w-10 sm:h-12 sm:w-12 text-almona-orange mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Precision-Fit Recommendations</h3>
              <p className="text-gray-400 text-sm sm:text-base">Curated to your inputs with CE/ISO-grade alignment and production readiness.</p>
            </div>

            {/* Summary Report */}
            <Card className="bg-gray-800/50 border-gray-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-almona-orange" />
                    Selection Brief
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportSummary}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Brief
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Material:</span>
                    <p className="font-medium capitalize">{answers.material}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Application:</span>
                    <p className="font-medium capitalize">{answers.application.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Automation:</span>
                    <p className="font-medium capitalize">{answers.automation}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Production:</span>
                    <p className="font-medium capitalize">{answers.production.replace('-', ' ')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto">
              {recommendations.length > 0 ? recommendations.map(machine => (
                <Card key={machine.id} className="hover:bg-gray-800/50 transition-colors">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-almona-orange" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base sm:text-lg">{machine.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1 line-clamp-2">{machine.description}</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                          {machine.tags?.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button 
                          size="sm" 
                          className="bg-almona-orange hover:bg-almona-orange-dark text-xs sm:text-sm"
                          onClick={() => handleDownloadSpecs(machine)}
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          View Specs
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs sm:text-sm"
                          onClick={() => handleAddToQuote(machine)}
                        >
                          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Add to Quote
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold mb-2">Let’s Curate This Together</h4>
                    <p className="text-gray-400 mb-4">Share your project constraints and we will build a precision short-list for you.</p>
                    <Button asChild className="bg-almona-orange hover:bg-almona-orange-dark">
                      <Link to="/contact">
                        Contact Our Experts
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-3xl sm:max-w-4xl h-[82vh] sm:h-[85vh] max-h-[760px] sm:max-h-[800px] overflow-hidden flex flex-col top-[52%]">
        <DialogHeader className="border-b border-gray-700 pb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-almona-orange" />
                <span className="truncate">Precision AI Machine Wizard</span>
              </DialogTitle>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                ISO-grade, Industry 4.0 aligned guidance for aluminum & UPVC production investments.
              </p>
            </div>
            <div className="text-sm text-gray-400 flex-shrink-0">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2 overflow-x-auto">
              {steps.map((stepItem, index) => {
                const Icon = stepItem.icon;
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={stepItem.id} className="flex items-center flex-shrink-0">
                    <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all ${
                      isCompleted 
                        ? 'bg-almona-orange border-almona-orange text-white' 
                        : isCurrent 
                        ? 'border-almona-orange text-almona-orange' 
                        : 'border-gray-600 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-6 sm:w-12 h-0.5 mx-1 sm:mx-2 transition-all ${
                        isCompleted ? 'bg-almona-orange' : 'bg-gray-600'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-center">
              <span className="text-xs sm:text-sm font-medium text-almona-orange">
                {steps[currentStepIndex]?.title}
              </span>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 sm:py-6 px-2 sm:px-0">
          <AnimatePresence mode="wait">
        {renderStep()}
          </AnimatePresence>
        </div>
        
        <DialogFooter className="border-t border-gray-700 pt-4 flex-shrink-0">
          <div className="w-full flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-gray-700/60 text-gray-100 border-gray-600">
                  {previewMatches.length} matching now
                </Badge>
                <span className="text-[11px] text-gray-400">Filters stay active through the wizard.</span>
              </div>
              {usePresetBundle && (
                <Badge variant="outline" className="text-[11px] border-orange-400/50 text-orange-200">
                  Preset bundles enabled
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-between w-full gap-3">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              
              <div className="flex gap-2 w-full sm:w-auto">
                {step === 'results' ? (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handlePrintReport}
                      className="bg-almona-orange hover:bg-almona-orange-dark flex items-center gap-2 flex-1 sm:flex-none"
                    >
                      <Printer className="h-4 w-4" />
                      Print Report
                    </Button>
                    <Button variant="outline" onClick={resetWizard} className="flex items-center gap-2 flex-1 sm:flex-none">
                      <Sparkles className="h-4 w-4" />
                      Start Over
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={nextStep}
                    disabled={!answers[step as keyof WizardAnswers]}
                    className="bg-almona-orange hover:bg-almona-orange-dark flex items-center gap-2 flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">
                      {currentStepIndex === steps.length - 2 ? 'Get Recommendations' : 'Next'}
                    </span>
                    <span className="sm:hidden">
                      {currentStepIndex === steps.length - 2 ? 'Get Results' : 'Next'}
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
