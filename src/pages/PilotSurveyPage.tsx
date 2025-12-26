import React from 'react';
import { PilotSurvey } from '@/components/feedback/PilotSurvey';
import { useSearchParams } from 'react-router-dom';

export default function PilotSurveyPage() {
  const [searchParams] = useSearchParams();
  const surveyType = (searchParams.get('type') || 'week1') as 'week1' | 'week2' | 'week4' | 'week8' | 'week12';
  const workshopId = searchParams.get('workshopId') || undefined;

  return <PilotSurvey surveyType={surveyType} workshopId={workshopId} />;
}

