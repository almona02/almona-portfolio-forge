import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const { t } = useTranslation('services');
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
    let score = { basic: 0, professional: 0, enterprise: 0 };
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
          <span className="text-orange-400 font-semibold">Smart Package Calculator</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Find Your Perfect <span className="text-orange-400">Service Package</span>
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Answer a few questions and get an AI-powered recommendation for the ideal service plan for your business.
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
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Machine Count */}
              <div className="space-y-3">
                <Label className="text-white">Number of Machines</Label>
                <div className="space-y-2">
                  <Slider
                    value={[inputs.machineCount]}
                    onValueChange={([value]) => handleInputChange('machineCount', value)}
                    max={20}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>1</span>
                    <span className="font-semibold text-orange-400">{inputs.machineCount} machines</span>
                    <span>20+</span>
                  </div>
                </div>
              </div>

              {/* Business Size */}
              <div className="space-y-3">
                <Label className="text-white">Business Size</Label>
                <Select value={inputs.businessSize} onValueChange={(value) => handleInputChange('businessSize', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small Workshop (1-10 employees)</SelectItem>
                    <SelectItem value="medium">Medium Factory (11-50 employees)</SelectItem>
                    <SelectItem value="large">Large Facility (50+ employees)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Production Volume */}
              <div className="space-y-3">
                <Label className="text-white">Production Volume</Label>
                <Select value={inputs.productionVolume} onValueChange={(value) => handleInputChange('productionVolume', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Seasonal/On-demand)</SelectItem>
                    <SelectItem value="medium">Medium (Regular production)</SelectItem>
                    <SelectItem value="high">High (24/7 production)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Urgency Level */}
              <div className="space-y-3">
                <Label className="text-white">Support Urgency</Label>
                <Select value={inputs.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (48-hour response)</SelectItem>
                    <SelectItem value="priority">Priority (24-hour response)</SelectItem>
                    <SelectItem value="critical">Critical (4-hour response)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <Label className="text-white">Location</Label>
                <Select value={inputs.location} onValueChange={(value) => handleInputChange('location', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cairo">Cairo & Giza</SelectItem>
                    <SelectItem value="alexandria">Alexandria</SelectItem>
                    <SelectItem value="other">Other Governorates</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCalculate}
                disabled={isCalculating}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3"
              >
                {isCalculating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Get Recommendation
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
                  <p className="text-lg">Fill in your business details</p>
                  <p className="text-sm">and click "Get Recommendation" to see your perfect package</p>
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
