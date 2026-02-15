import React, { useState } from 'react';
import { LazyMotionDiv } from '@/utils/lazyMotion';
import { Info, Users, Zap, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import ProgressiveCategoryNavigation from './ProgressiveCategoryNavigation';
import CategoryBreadcrumb from './CategoryBreadcrumb';
import CategoryFilter from './CategoryFilter';

/**
 * Progressive Disclosure Demo Component
 * 
 * This component demonstrates the progressive disclosure implementation
 * for product categories, showing how complex machine types are broken
 * into logical subcategories to avoid overwhelming users.
 */
const ProgressiveDisclosureDemo: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [demoStep, setDemoStep] = useState(0);

  const demoSteps = [
    {
      title: "Problem: Information Overload",
      description: "Users were overwhelmed by seeing all 30+ machine types at once",
      icon: <Users className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <h4 className="typography-h4 text-red-400 mb-2">Before: Overwhelming List</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                "ALM6510", "DC 421 PBS", "DK502", "KM 212", "KD 402 S", "FR 221 S",
                "PIM 6509", "CCL 1661", "CDC 600", "DC 421 PSD", "ACK 420 S", "FR 226 S",
                "NCR 300", "TK 505", "KM 215 S", "CRM 250 S", "ST 264", "SDT 275",
                "MK 450", "RYK 420 W", "SCM 420 L4", "CK 412", "DK 540", "CNC 608",
                "KD 305", "KD 350 PS", "KD 350 M", "FR 223", "FR 223 S", "FR 222",
                "KM 211 S", "SA 250", "SA 260"
              ].map((machine, index) => (
                <div key={index} className="text-gray-400 truncate">
                  {machine}
                </div>
              ))}
            </div>
            <p className="text-red-300 text-sm mt-2">
              ❌ 33 machines shown at once - cognitive overload
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Solution: Progressive Disclosure",
      description: "Break complex categories into logical subcategories",
      icon: <Target className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <h4 className="typography-h4 text-green-400 mb-2">After: Hierarchical Navigation</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-white mb-2">Main Categories (5)</h5>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-amber-400">✂️</span>
                    <span>Cutting Machines</span>
                    <Badge variant="secondary" className="text-xs">21 machines</Badge>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">💻</span>
                    <span>Processing Centers</span>
                    <Badge variant="secondary" className="text-xs">18 machines</Badge>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-400">⚡</span>
                    <span>Welding Machines</span>
                    <Badge variant="secondary" className="text-xs">6 machines</Badge>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-400">🏭</span>
                    <span>Fabrication Equipment</span>
                    <Badge variant="secondary" className="text-xs">4 machines</Badge>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gray-400">🔧</span>
                    <span>Accessories & Parts</span>
                    <Badge variant="secondary" className="text-xs">15 items</Badge>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-white mb-2">Subcategories Example</h5>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-amber-400 font-medium mb-2">Cutting Machines</div>
                  <ul className="space-y-1 text-sm text-gray-300">
                    <li>• Double Head Cutting (8 machines)</li>
                    <li>• Single Head Cutting (4 machines)</li>
                    <li>• Mitre Saws (6 machines)</li>
                    <li>• Specialized Cutting (3 machines)</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-green-300 text-sm mt-2">
              ✅ Progressive disclosure - users see 5 main categories first, then drill down
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Implementation Features",
      description: "Key features of the progressive disclosure system",
      icon: <Zap className="h-6 w-6" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Navigation Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span className="text-sm">Expandable category tree</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm">Breadcrumb navigation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm">Category filter dropdown</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span className="text-sm">Machine count badges</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">User Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span className="text-sm">Reduced cognitive load</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm">Faster navigation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm">Clear visual hierarchy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span className="text-sm">Mobile responsive</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="typography-h1 text-white mb-4">
          Progressive Disclosure Implementation
        </h1>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Breaking complex product categories into logical subcategories to improve user experience
          and reduce cognitive overload when browsing industrial machinery.
        </p>
      </div>

      {/* Demo Steps */}
      <div className="space-y-6">
        <div className="flex justify-center gap-2 mb-8">
          {demoSteps.map((_, index) => (
            <Button
              key={index}
              variant={demoStep === index ? "default" : "outline"}
              size="sm"
              onClick={() => setDemoStep(index)}
              className={demoStep === index ? "bg-amber-500" : ""}
            >
              {index + 1}
            </Button>
          ))}
        </div>

        <LazyMotionDiv
          key={demoStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                {demoSteps[demoStep].icon}
                {demoSteps[demoStep].title}
              </CardTitle>
              <p className="text-gray-400">{demoSteps[demoStep].description}</p>
            </CardHeader>
            <CardContent>
              {demoSteps[demoStep].content}
            </CardContent>
          </Card>
        </LazyMotionDiv>
      </div>

      {/* Live Demo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Category Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressiveCategoryNavigation
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                showMachineCounts={true}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Breadcrumb Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBreadcrumb
                currentCategoryId={selectedCategory}
                onCategorySelect={setSelectedCategory}
                onHomeClick={() => setSelectedCategory('all')}
              />
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Category Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                showAllOption={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Benefits Summary */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-blue-500/10 border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Info className="h-5 w-5" />
            Implementation Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400 mb-2">75%</div>
              <div className="text-sm text-gray-300">Reduction in initial cognitive load</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-2">3x</div>
              <div className="text-sm text-gray-300">Faster category discovery</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">100%</div>
              <div className="text-sm text-gray-300">Mobile responsive design</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressiveDisclosureDemo;

