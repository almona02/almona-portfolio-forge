/**
 * Fabricator Pro Features Component
 * Showcases the key features and benefits of the Fabricator Pro platform
 * Designed to make fabricators feel understood and intrigued
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
  Workflow,
  Sparkles,
  Settings,
  Brain,
  BarChart3,
  Package,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  highlight?: boolean;
}

const features: Feature[] = [
  {
    icon: Workflow,
    title: 'The Complete Workflow',
    description:
      'From the first quote to the final cut, manage your entire fabrication process in one seamless, intelligent platform. No more juggling spreadsheets and disconnected tools.',
    highlight: true,
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Optimization',
    description:
      'Our learning algorithms reduce material waste by an average of 12%, saving you money on every job. Let our AI turn your offcuts back into profit.',
    highlight: true,
  },
  {
    icon: Settings,
    title: 'Profile Calibration Wizard',
    description:
      'Your workshop, your rules. Define any profile from any supplier and calibrate it to match your specific machinery and techniques. We adapt to your expertise.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Suggestions',
    description:
      'Our CalibrationLearner AI acts as your personal advisor, suggesting optimal settings based on the collective knowledge of the entire user base, helping you achieve perfect cuts from day one.',
    highlight: true,
  },
  {
    icon: BarChart3,
    title: 'Personal Analytics Dashboard',
    description:
      'See your workshop\'s performance in real-time. Track your accuracy, identify areas for improvement, and watch your efficiency grow with actionable insights derived from your own data.',
  },
  {
    icon: Package,
    title: 'Remnant Marketplace',
    description:
      'Turn your leftover material into cash. Sell your usable remnants to other workshops in our integrated marketplace, creating a new revenue stream from what was once waste.',
  },
];

export const FabricatorProFeatures: React.FC = () => {
  return (
    <section className="py-16 px-4 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-4">
            <Zap className="h-5 w-5 text-blue-400" />
            <span className="text-blue-400 font-semibold">Fabricator Pro</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built for Fabricators,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Powered by Intelligence
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            A self-learning platform that adapts to your workshop, learns from your expertise, and
            helps you achieve perfect cuts every time.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className={`bg-gray-800/50 border-gray-700 hover:border-blue-500/50 transition-all duration-300 ${
                  feature.highlight
                    ? 'ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10'
                    : 'hover:shadow-xl'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        feature.highlight
                          ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20'
                          : 'bg-gray-700/50'
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          feature.highlight ? 'text-blue-400' : 'text-gray-300'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl text-white mb-2">{feature.title}</CardTitle>
                      {feature.highlight && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400 mb-2">
                          <TrendingUp className="h-3 w-3" />
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-300 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/30 max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-blue-400" />
                <h3 className="text-2xl font-bold text-white">
                  Ready to Transform Your Workshop?
                </h3>
              </div>
              <p className="text-gray-300 mb-6">
                Join fabricators who are already reducing waste, improving accuracy, and growing
                their business with intelligent automation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/fabricator-workflow"
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Start Free Trial
                </a>
                <a
                  href="/demo"
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors border border-gray-600"
                >
                  Watch Demo
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

