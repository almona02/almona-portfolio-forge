/**
 * BetaFeedbackPortal - Comprehensive Feedback Interface
 * 
 * Comprehensive feedback collection for beta testing program:
 * - Multi-feature feedback
 * - Usage analytics
 * - Accuracy validation
 * - Satisfaction surveys
 * 
 * @since Beta Testing Program (Weeks 18-20)
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import React, { useState } from 'react';
import type { EarlyAccessFeedbackData } from './EarlyAccessFeedback';
import { EarlyAccessFeedback } from './EarlyAccessFeedback';

export interface BetaFeedbackData extends EarlyAccessFeedbackData {
  tier: 'wizard' | 'pattern_library' | 'expert_canvas';
  onboardingTime: number; // minutes
  firstProjectTime: number; // minutes
  pricingAccuracy: number; // 0-100
  visualAccuracy: number; // 0-100
}

interface BetaFeedbackPortalProps {
  workshopId?: string;
  onSubmit?: (data: BetaFeedbackData) => void;
}

export const BetaFeedbackPortal: React.FC<BetaFeedbackPortalProps> = ({
  workshopId,
  onSubmit
}) => {
  const [activeTab, setActiveTab] = useState('wizard');

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-gray-900 border-gray-800 card-dark">
          <CardHeader>
            <CardTitle className="text-2xl">Beta Testing Feedback Portal</CardTitle>
            <p className="text-gray-400">Help us improve by testing all features and sharing your experience</p>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="wizard">Smart Wizard (Tier 1)</TabsTrigger>
                <TabsTrigger value="patterns">Pattern Library (Tier 2)</TabsTrigger>
                <TabsTrigger value="bom">BOM & Pricing</TabsTrigger>
              </TabsList>

              <TabsContent value="wizard" className="mt-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="typography-h3 text-lg mb-4">Smart Wizard Feedback</h3>
                    <EarlyAccessFeedback
                      workshopId={workshopId}
                      onSubmit={(data) => {
                        onSubmit?.({
                          ...data,
                          tier: 'wizard',
                          onboardingTime: 0,
                          firstProjectTime: 0,
                          pricingAccuracy: 0,
                          visualAccuracy: 0
                        });
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="patterns" className="mt-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="typography-h3 text-lg mb-4">Pattern Library Feedback</h3>
                    <EarlyAccessFeedback
                      workshopId={workshopId}
                      onSubmit={(data) => {
                        onSubmit?.({
                          ...data,
                          tier: 'pattern_library',
                          onboardingTime: 0,
                          firstProjectTime: 0,
                          pricingAccuracy: 0,
                          visualAccuracy: 0
                        });
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bom" className="mt-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="typography-h3 text-lg mb-4">BOM & Pricing Feedback</h3>
                    <EarlyAccessFeedback
                      workshopId={workshopId}
                      onSubmit={(data) => {
                        onSubmit?.({
                          ...data,
                          tier: 'expert_canvas',
                          onboardingTime: 0,
                          firstProjectTime: 0,
                          pricingAccuracy: 0,
                          visualAccuracy: 0
                        });
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

