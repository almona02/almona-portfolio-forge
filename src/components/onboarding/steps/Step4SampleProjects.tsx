/**
 * Step4SampleProjects - Sample Project Import
 * 
 * Import a sample project to get started quickly
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download } from 'lucide-react';
import React from 'react';
import type { OnboardingData } from '../OnboardingWizard';

const SAMPLE_PROJECTS = [
  { id: 'simple_window', name: 'Simple Window', description: 'Basic single-sash window - perfect for beginners' },
  { id: 'double_sash', name: 'Double Sash Window', description: 'Two-sash window with opening mechanism' },
  { id: 'sliding_door', name: 'Sliding Door', description: 'Standard sliding door configuration' },
  { id: 'casement_window', name: 'Casement Window', description: 'Casement window with hardware' },
  { id: 'complex_assembly', name: 'Complex Assembly', description: 'Multi-unit window assembly' }
];

interface Step4SampleProjectsProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
}

export const Step4SampleProjects: React.FC<Step4SampleProjectsProps> = ({
  data,
  onUpdate
}) => {
  const importProject = (projectId: string) => {
    onUpdate({ sampleProject: projectId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Sample Projects</h3>
        <p className="text-gray-400 mb-6">Import a sample project to explore the system (optional)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SAMPLE_PROJECTS.map((project) => (
          <Card
            key={project.id}
            className={`bg-gray-800 border-gray-700 cursor-pointer transition-colors ${
              data.sampleProject === project.id ? 'border-blue-600' : ''
            }`}
            onClick={() => importProject(project.id)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold">{project.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{project.description}</div>
                </div>
                <Download className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => onUpdate({ sampleProject: null })}
          className="bg-gray-800 border-gray-700"
        >
          Skip - I'll create my own project
        </Button>
      </div>
    </div>
  );
};

