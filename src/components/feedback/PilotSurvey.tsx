/**
 * PilotSurvey - Structured Pilot Surveys
 * 
 * 5 pilot surveys:
 * 1. Week 1 - First Impressions
 * 2. Week 2 - Usability
 * 3. Week 4 - Feature Requests
 * 4. Week 8 - ROI Validation
 * 5. Week 12 - Final Assessment
 * 
 * @since Phase 5: Pre-Pilot Hardening (Week 28)
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';

export type SurveyType = 'week1' | 'week2' | 'week4' | 'week8' | 'week12';

export interface PilotSurveyData {
  surveyType: SurveyType;
  workshopId: string;
  responses: Record<string, any>;
  submittedAt: Date;
}

interface PilotSurveyProps {
  surveyType: SurveyType;
  workshopId?: string;
  onSubmit?: (data: PilotSurveyData) => void;
}

const SURVEY_QUESTIONS: Record<SurveyType, Array<{
  id: string;
  type: 'rating' | 'text' | 'select' | 'textarea';
  label: string;
  options?: string[];
  min?: number;
  max?: number;
}>> = {
  week1: [
    { id: 'onboarding', type: 'rating', label: 'Onboarding Experience (1-5)', min: 1, max: 5 },
    { id: 'training', type: 'rating', label: 'Training Materials Quality (1-5)', min: 1, max: 5 },
    { id: 'setup', type: 'rating', label: 'Initial Setup Difficulty (1-5, 1=Very Easy)', min: 1, max: 5 },
    { id: 'first_project', type: 'select', label: 'First Project Success', options: ['Yes', 'No', 'Partial'] },
    { id: 'feedback', type: 'textarea', label: 'Open Feedback' }
  ],
  week2: [
    { id: 'discoverability', type: 'rating', label: 'Feature Discoverability (1-5)', min: 1, max: 5 },
    { id: 'ui_satisfaction', type: 'rating', label: 'UI/UX Satisfaction (1-5)', min: 1, max: 5 },
    { id: 'performance', type: 'rating', label: 'Performance Satisfaction (1-5)', min: 1, max: 5 },
    { id: 'most_used', type: 'text', label: 'Most Used Features' },
    { id: 'pain_points', type: 'textarea', label: 'Pain Points' }
  ],
  week4: [
    { id: 'missing_features', type: 'textarea', label: 'Missing Features' },
    { id: 'priorities', type: 'textarea', label: 'Feature Priorities' },
    { id: 'workflow', type: 'textarea', label: 'Workflow Improvements' },
    { id: 'integrations', type: 'textarea', label: 'Integration Needs' }
  ],
  week8: [
    { id: 'time_savings', type: 'text', label: 'Time Savings (hours/week)' },
    { id: 'material_savings', type: 'text', label: 'Material Savings (%)' },
    { id: 'accuracy', type: 'text', label: 'Accuracy Improvements' },
    { id: 'business_impact', type: 'textarea', label: 'Business Impact' },
    { id: 'nps', type: 'rating', label: 'Would you recommend? (NPS 0-10)', min: 0, max: 10 }
  ],
  week12: [
    { id: 'overall_satisfaction', type: 'rating', label: 'Overall Satisfaction (1-10)', min: 1, max: 10 },
    { id: 'feature_completeness', type: 'rating', label: 'Feature Completeness (1-10)', min: 1, max: 10 },
    { id: 'support_quality', type: 'rating', label: 'Support Quality (1-10)', min: 1, max: 10 },
    { id: 'value', type: 'rating', label: 'Value for Money (1-10)', min: 1, max: 10 },
    { id: 'testimonial', type: 'textarea', label: 'Testimonial (Optional)' },
    { id: 'renewal', type: 'select', label: 'Renewal Intent', options: ['Definitely', 'Probably', 'Maybe', 'Probably Not', 'Definitely Not'] }
  ]
};

export const PilotSurvey: React.FC<PilotSurveyProps> = ({
  surveyType,
  workshopId,
  onSubmit
}) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const questions = SURVEY_QUESTIONS[surveyType];
  const surveyTitles: Record<SurveyType, string> = {
    week1: 'Week 1 Survey - First Impressions',
    week2: 'Week 2 Survey - Usability',
    week4: 'Week 4 Survey - Feature Requests',
    week8: 'Week 8 Survey - ROI Validation',
    week12: 'Week 12 Survey - Final Assessment'
  };

  const handleSubmit = () => {
    const data: PilotSurveyData = {
      surveyType,
      workshopId: workshopId || 'unknown',
      responses,
      submittedAt: new Date()
    };
    onSubmit?.(data);
    setSubmitted(true);
  };

  const updateResponse = (id: string, value: any) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  };

  if (submitted) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="text-gray-400">Your survey has been submitted successfully.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl">{surveyTitles[surveyType]}</CardTitle>
            <p className="text-gray-400">Your feedback helps us improve</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label>{question.label}</Label>
                {question.type === 'rating' && (
                  <div className="flex gap-2">
                    {Array.from({ length: (question.max || 5) - (question.min || 1) + 1 }, (_, i) => {
                      const value = (question.min || 1) + i;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateResponse(question.id, value)}
                          className={`w-12 h-12 rounded ${
                            responses[question.id] === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                )}
                {question.type === 'text' && (
                  <Input
                    value={responses[question.id] || ''}
                    onChange={(e) => updateResponse(question.id, e.target.value)}
                    className="bg-gray-800 border-gray-700"
                  />
                )}
                {question.type === 'select' && (
                  <Select
                    value={responses[question.id] || ''}
                    onValueChange={(v) => updateResponse(question.id, v)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {question.options?.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {question.type === 'textarea' && (
                  <Textarea
                    value={responses[question.id] || ''}
                    onChange={(e) => updateResponse(question.id, e.target.value)}
                    className="bg-gray-800 border-gray-700"
                    rows={4}
                  />
                )}
              </div>
            ))}

            <Button
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Submit Survey
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

