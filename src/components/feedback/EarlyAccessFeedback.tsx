/**
 * EarlyAccessFeedback - Feedback Collection Interface
 * 
 * Collects structured feedback from early access workshops:
 * - Feature-specific feedback
 * - Accuracy validation
 * - Usability ratings
 * - Real-world project data
 * 
 * @since Early Access Program (Weeks 8-10)
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/ui/radio-group';
import { CheckCircle2, Star } from 'lucide-react';
import React, { useState } from 'react';

export interface EarlyAccessFeedbackData {
  workshopId: string;
  projectId: string;
  feature: 'fly_screen' | 'quick_order' | 'egyptian_specials' | 'custom_mullion';
  accuracy: {
    bomAccuracy: number; // 0-100
    hardwareAccuracy: number; // 0-100
    overallAccuracy: number; // 0-100
  };
  usability: {
    easeOfUse: number; // 1-5
    timeSavings: number; // minutes saved
    satisfaction: number; // 1-5
  };
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    feature: string;
  }>;
  suggestions: string;
  wouldRecommend: boolean;
}

interface EarlyAccessFeedbackProps {
  workshopId?: string;
  projectId?: string;
  onSubmit?: (data: EarlyAccessFeedbackData) => void;
}

export const EarlyAccessFeedback: React.FC<EarlyAccessFeedbackProps> = ({
  workshopId,
  projectId,
  onSubmit
}) => {
  const [feature, setFeature] = useState<'fly_screen' | 'quick_order' | 'egyptian_specials' | 'custom_mullion'>('fly_screen');
  const [bomAccuracy, setBomAccuracy] = useState<number>(99);
  const [hardwareAccuracy, setHardwareAccuracy] = useState<number>(99);
  const [overallAccuracy, setOverallAccuracy] = useState<number>(99);
  const [easeOfUse, setEaseOfUse] = useState<number>(5);
  const [timeSavings, setTimeSavings] = useState<number>(0);
  const [satisfaction, setSatisfaction] = useState<number>(5);
  const [issues, setIssues] = useState<Array<{ severity: string; description: string; feature: string }>>([]);
  const [suggestions, setSuggestions] = useState<string>('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const data: EarlyAccessFeedbackData = {
      workshopId: workshopId || 'unknown',
      projectId: projectId || 'unknown',
      feature,
      accuracy: {
        bomAccuracy,
        hardwareAccuracy,
        overallAccuracy
      },
      usability: {
        easeOfUse,
        timeSavings,
        satisfaction
      },
      issues: issues as any,
      suggestions,
      wouldRecommend
    };

    onSubmit?.(data);
    setSubmitted(true);
  };

  const addIssue = () => {
    setIssues([...issues, { severity: 'medium', description: '', feature: '' }]);
  };

  if (submitted) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="text-gray-400">Your feedback has been submitted successfully.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl">Early Access Feedback</CardTitle>
            <p className="text-gray-400">Help us improve by sharing your experience</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Which feature are you testing?</Label>
              <Select value={feature} onValueChange={(v) => setFeature(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fly_screen">Fly Screen Presets</SelectItem>
                  <SelectItem value="quick_order">Quick Order Mode</SelectItem>
                  <SelectItem value="egyptian_specials">Egyptian Special Presets</SelectItem>
                  <SelectItem value="custom_mullion">Custom Mullion Validation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Accuracy Validation</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>BOM Accuracy (%)</Label>
                  <Input
                    type="number"
                    value={bomAccuracy}
                    onChange={(e) => setBomAccuracy(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hardware Accuracy (%)</Label>
                  <Input
                    type="number"
                    value={hardwareAccuracy}
                    onChange={(e) => setHardwareAccuracy(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Overall Accuracy (%)</Label>
                  <Input
                    type="number"
                    value={overallAccuracy}
                    onChange={(e) => setOverallAccuracy(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Usability</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Ease of Use (1-5)</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setEaseOfUse(rating)}
                        className={`p-2 rounded ${
                          easeOfUse >= rating
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        <Star className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Time Saved (minutes)</Label>
                  <Input
                    type="number"
                    value={timeSavings}
                    onChange={(e) => setTimeSavings(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700"
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Overall Satisfaction (1-5)</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setSatisfaction(rating)}
                        className={`p-2 rounded ${
                          satisfaction >= rating
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        <Star className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Issues Encountered</h3>
                <Button
                  variant="outline"
                  onClick={addIssue}
                  className="bg-gray-800 border-gray-700"
                >
                  Add Issue
                </Button>
              </div>
              {issues.map((issue, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={issue.severity}
                      onValueChange={(v) => {
                        const newIssues = [...issues];
                        newIssues[index].severity = v;
                        setIssues(newIssues);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={issue.description}
                      onChange={(e) => {
                        const newIssues = [...issues];
                        newIssues[index].description = e.target.value;
                        setIssues(newIssues);
                      }}
                      className="bg-gray-700 border-gray-600"
                      placeholder="Describe the issue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Feature</Label>
                    <Input
                      value={issue.feature}
                      onChange={(e) => {
                        const newIssues = [...issues];
                        newIssues[index].feature = e.target.value;
                        setIssues(newIssues);
                      }}
                      className="bg-gray-700 border-gray-600"
                      placeholder="Feature name"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Suggestions for Improvement</Label>
              <Textarea
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                className="bg-gray-800 border-gray-700"
                rows={4}
                placeholder="Share your suggestions..."
              />
            </div>

            <div className="space-y-2">
              <Label>Would you recommend this feature to other workshops?</Label>
              <RadioGroup
                value={wouldRecommend ? 'yes' : 'no'}
                onValueChange={(v) => setWouldRecommend(v === 'yes')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="recommend-yes" />
                  <Label htmlFor="recommend-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="recommend-no" />
                  <Label htmlFor="recommend-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Submit Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

