/**
 * FeedbackDashboard - Feedback Analysis Dashboard
 * 
 * Displays survey responses, response rates, trends, and sentiment analysis
 * 
 * @since Phase 5: Pre-Pilot Hardening (Week 28)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PilotSurveyData, SurveyType } from '@/components/feedback/PilotSurvey';

interface FeedbackDashboardProps {
  surveyData?: PilotSurveyData[];
}

export const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({
  surveyData = []
}) => {
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyType>('week1');

  const surveyTitles: Record<SurveyType, string> = {
    week1: 'Week 1 - First Impressions',
    week2: 'Week 2 - Usability',
    week4: 'Week 4 - Feature Requests',
    week8: 'Week 8 - ROI Validation',
    week12: 'Week 12 - Final Assessment'
  };

  const filteredData = surveyData.filter(s => s.surveyType === selectedSurvey);
  const responseRate = surveyData.length > 0 ? (filteredData.length / surveyData.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl">Pilot Feedback Dashboard</CardTitle>
            <p className="text-gray-400">Analyze survey responses and feedback trends</p>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedSurvey} onValueChange={(v) => setSelectedSurvey(v as SurveyType)}>
              <TabsList className="grid w-full grid-cols-5">
                {(['week1', 'week2', 'week4', 'week8', 'week12'] as SurveyType[]).map((type) => (
                  <TabsTrigger key={type} value={type}>
                    {surveyTitles[type].split(' - ')[0]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {(['week1', 'week2', 'week4', 'week8', 'week12'] as SurveyType[]).map((type) => (
                <TabsContent key={type} value={type} className="mt-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-400">Total Responses</div>
                        <div className="text-2xl font-bold">{filteredData.length}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-400">Response Rate</div>
                        <div className="text-2xl font-bold">{responseRate.toFixed(1)}%</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-400">Average Rating</div>
                        <div className="text-2xl font-bold">
                          {filteredData.length > 0
                            ? (filteredData.reduce((sum, d) => {
                                const ratings = Object.values(d.responses).filter(v => typeof v === 'number') as number[];
                                return sum + (ratings.reduce((s, r) => s + r, 0) / ratings.length);
                              }, 0) / filteredData.length).toFixed(1)
                            : 'N/A'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    {filteredData.map((survey, index) => (
                      <Card key={index} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-400 mb-2">
                            Workshop: {survey.workshopId} | {survey.submittedAt.toLocaleDateString()}
                          </div>
                          <div className="space-y-2">
                            {Object.entries(survey.responses).map(([key, value]) => (
                              <div key={key} className="text-sm">
                                <span className="text-gray-400">{key}:</span>{' '}
                                <span className="text-gray-300">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

