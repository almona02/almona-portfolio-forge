import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Slider } from '@/components/ui/slider';
import { Factory, Users, TrendingUp, Calculator, CheckCircle2, Star } from 'lucide-react';
import { calculateTieredPrice, calculateDynamicPrice } from '@/lib/pricing';
import { useExperiment } from '@/components/analytics/ABTestProvider';

interface PackageCalculatorProps {
  onPackageRecommend?: (packageId: string, estimatedPrice: number) => void;
  className?: string;
}

interface CalculatorInputs {
  machineCount: number;
  businessSize: 'small' | 'medium' | 'large';
  productionVolume: 'low' | 'medium' | 'high';
  urgency: 'standard' | 'priority' | 'critical';
  location: 'cairo' | 'alexandria' | 'other';
}

interface PackageRecommendation {
  packageId: 'basic' | 'professional' | 'enterprise';
  confidence: number;
  reasoning: string[];
  estimatedPrice: number;
  savings: number;
}

export const PackageCalculator: React.FC<PackageCalculatorProps> = ({
  onPackageRecommend,
  className = ''
}) => {
  const { t, language } = useLanguage();
  const { variant: designVariant, track: trackDesign } = useExperiment('package-card-design');
  const [inputs, setInputs] = useState<CalculatorInputs>({
    machineCount: 3,
    businessSize: 'small',
    productionVolume: 'medium',
    urgency: 'standard',
    location: 'cairo'
  });
  
  const [recommendation, setRecommendation] = useState<PackageRecommendation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Package base prices from services.json
  const packagePrices = {
    basic: 3500,
    professional: 8500,
    enterprise: 15000 // Estimated for calculation
  };

  const calculateRecommendation = (inputs: CalculatorInputs): PackageRecommendation => {
    const score = { basic: 0, professional: 0, enterprise: 0 };
    const reasoning: string[] = [];

    // Machine count scoring
    if (inputs.machineCount <= 3) {
      score.basic += 40;
      reasoning.push(`${inputs.machineCount} machines fits Basic Care (1-3 machines)`);
    } else if (inputs.machineCount <= 10) {
      score.professional += 40;
      reasoning.push(`${inputs.machineCount} machines fits Professional Care (4-10 machines)`);
    } else {
      score.enterprise += 40;
      reasoning.push(`${inputs.machineCount} machines requires Enterprise Care (10+ machines)`);
    }

    // Business size scoring
    switch (inputs.businessSize) {
      case 'small':
        score.basic += 30;
        reasoning.push('Small business benefits from Basic Care features');
        break;
      case 'medium':
        score.professional += 30;
        reasoning.push('Medium business needs Professional Care support');
        break;
      case 'large':
        score.enterprise += 30;
        reasoning.push('Large business requires Enterprise Care capabilities');
        break;
    }

    // Production volume scoring
    switch (inputs.productionVolume) {
      case 'low':
        score.basic += 20;
        reasoning.push('Low production volume suits Basic Care');
        break;
      case 'medium':
        score.professional += 20;
        reasoning.push('Medium production needs Professional monitoring');
        break;
      case 'high':
        score.enterprise += 20;
        reasoning.push('High production requires Enterprise AI features');
        break;
    }

    // Urgency scoring
    switch (inputs.urgency) {
      case 'standard':
        score.basic += 10;
        reasoning.push('Standard urgency fits Basic Care response times');
        break;
      case 'priority':
        score.professional += 10;
        reasoning.push('Priority needs require Professional 24/7 support');
        break;
      case 'critical':
        score.enterprise += 10;
        reasoning.push('Critical operations need Enterprise 4-hour response');
        break;
    }

    // Determine best package
    const bestPackage = Object.entries(score).reduce((a, b) => score[a[0] as keyof typeof score] > score[b[0] as keyof typeof score] ? a : b);
    const packageId = bestPackage[0] as keyof typeof packagePrices;
    const confidence = Math.min(95, Math.max(60, bestPackage[1]));

    // Calculate estimated price with dynamic pricing
    const basePrice = packagePrices[packageId];
    const estimatedPrice = calculateDynamicPrice(
      basePrice,
      inputs.machineCount,
      inputs.businessSize === 'large' ? 'admin' : 'customer',
      'service'
    );

    // Calculate potential savings
    const savings = packageId === 'enterprise' ? estimatedPrice * 0.15 : estimatedPrice * 0.1;

    return {
      packageId,
      confidence,
      reasoning,
      estimatedPrice,
      savings
    };
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    
    // Track calculator usage
    trackDesign('calculator_used');
    
    // Simulate calculation delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = calculateRecommendation(inputs);
    setRecommendation(result);
    onPackageRecommend?.(result.packageId, result.estimatedPrice);
    setIsCalculating(false);
  };

  const handleInputChange = (field: keyof CalculatorInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    // Auto-calculate when inputs change
    if (recommendation) {
      const result = calculateRecommendation({ ...inputs, [field]: value });
      setRecommendation(result);
    }
  };

  const getPackageIcon = (packageId: string) => {
    switch (packageId) {
      case 'basic': return <Factory className="h-6 w-6" />;
      case 'professional': return <Users className="h-6 w-6" />;
      case 'enterprise': return <TrendingUp className="h-6 w-6" />;
      default: return <Factory className="h-6 w-6" />;
    }
  };

  const getPackageColor = (packageId: string) => {
    switch (packageId) {
      case 'basic': return 'from-green-500 to-emerald-600';
      case 'professional': return 'from-yellow-500 to-orange-600';
      case 'enterprise': return 'from-red-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Calculator Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20">
          <Calculator className="h-6 w-6 text-orange-400" />
          <span className="text-orange-400 font-semibold">{t('services.smart_package_calculator')}</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">
          {t('services.find_perfect_package')}
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          {t('services.answer_questions_recommendation')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Calculator className="h-5 w-5 text-orange-400" />
                {t('services.business_information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Machine Count */}
              <div className="space-y-3">
                <Label className="text-white font-medium">{t('services.number_of_machines')}</Label>
                <div className="space-y-4">
                  <div className="relative">
                    <Slider
                      value={[inputs.machineCount]}
                      onValueChange={([value]) => handleInputChange('machineCount', value)}
                      max={20}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-400 mt-2">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        1
                      </span>
                      <span className="font-semibold text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full">
                        {inputs.machineCount} {language === 'ar' ? 'ماكينة' : 'machines'}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        20+
                      </span>
                    </div>
                  </div>
                  
                  {/* Quick selection buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {[1, 3, 5, 10, 15, 20].map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleInputChange('machineCount', count)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                          inputs.machineCount === count
                            ? 'bg-orange-500/20 border-orange-400 text-orange-300 shadow-[0_0_0_1px_rgba(255,153,0,0.4)]'
                            : 'border-slate-600 text-gray-400 hover:border-orange-400/60 hover:text-orange-300'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Business Size */}
              <div className="space-y-3">
                <Label className="text-white font-medium">{t('services.business_size')}</Label>
                <Select value={inputs.businessSize} onValueChange={(value) => handleInputChange('businessSize', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700/70 focus:ring-2 focus:ring-orange-500/50 transition-all duration-200">
                    <SelectValue placeholder="Select business size" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="small" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        {t('services.small_workshop')}
                      </div>
                    </SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        {t('services.medium_factory')}
                      </div>
                    </SelectItem>
                    <SelectItem value="large" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        {t('services.large_facility')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Production Volume */}
              <div className="space-y-3">
                <Label className="text-white font-medium">{t('services.production_volume')}</Label>
                <Select value={inputs.productionVolume} onValueChange={(value) => handleInputChange('productionVolume', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700/70 focus:ring-2 focus:ring-orange-500/50 transition-all duration-200">
                    <SelectValue placeholder="Select production volume" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="low" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        {t('services.low_production')}
                      </div>
                    </SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        {t('services.medium_production')}
                      </div>
                    </SelectItem>
                    <SelectItem value="high" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        {t('services.high_production')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Support Urgency */}
              <div className="space-y-3">
                <Label className="text-white font-medium">{t('services.support_urgency')}</Label>
                <Select value={inputs.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700/70 focus:ring-2 focus:ring-orange-500/50 transition-all duration-200">
                    <SelectValue placeholder="Select support urgency" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="standard" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        {t('services.standard_response')}
                      </div>
                    </SelectItem>
                    <SelectItem value="priority" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        {t('services.priority_response')}
                      </div>
                    </SelectItem>
                    <SelectItem value="critical" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        {t('services.critical_response')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <Label className="text-white font-medium">{t('services.location')}</Label>
                <Select value={inputs.location} onValueChange={(value) => handleInputChange('location', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700/70 focus:ring-2 focus:ring-orange-500/50 transition-all duration-200">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="cairo" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        {t('services.cairo_giza')}
                      </div>
                    </SelectItem>
                    <SelectItem value="alexandria" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        {t('services.alexandria')}
                      </div>
                    </SelectItem>
                    <SelectItem value="other" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        {t('services.other_governorates')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCalculate}
                disabled={isCalculating}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isCalculating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    {t('services.get_recommendation')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recommendation Results */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {recommendation ? (
            <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  Recommended Package
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Package Recommendation */}
                <div className={`p-6 rounded-xl bg-gradient-to-r ${getPackageColor(recommendation.packageId)} text-white`}>
                  <div className="flex items-center gap-3 mb-4">
                    {getPackageIcon(recommendation.packageId)}
                    <div>
                      <h3 className="text-2xl font-bold capitalize">{recommendation.packageId} Care</h3>
                      <p className="text-white/80">{t(`packages.${recommendation.packageId}.description`)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold">
                        {recommendation.estimatedPrice.toLocaleString()} EGP
                        <span className="text-lg font-normal">/month</span>
                      </div>
                      <div className="text-white/80">Estimated monthly cost</div>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {recommendation.confidence}% Match
                    </Badge>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-white">Why This Package?</h4>
                  <ul className="space-y-2">
                    {recommendation.reasoning.map((reason, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Savings */}
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-semibold">Potential Savings</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400 mt-1">
                    {recommendation.savings.toLocaleString()} EGP/year
                  </div>
                  <div className="text-sm text-green-300">
                    Compared to individual service requests
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => {
                    trackDesign('package_selected');
                    onPackageRecommend?.(recommendation.packageId, recommendation.estimatedPrice);
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3"
                >
                  Select {recommendation.packageId.charAt(0).toUpperCase() + recommendation.packageId.slice(1)} Care
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/10">
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-gray-400">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">{t('services.fill_business_details')}</p>
                  <p className="text-sm">{t('services.click_get_recommendation')}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PackageCalculator;
