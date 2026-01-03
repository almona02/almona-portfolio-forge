// src/components/fabricator/drafting/DraftingValidationGate.tsx
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { ValidationResult } from './types/drafting';

interface DraftingValidationGateProps {
  result: ValidationResult | null;
  onFixIssues?: () => void;
}

export const DraftingValidationGate: React.FC<DraftingValidationGateProps> = ({
  result,
  onFixIssues
}) => {
  if (!result) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>Click "Validate for ALMONA Execution" to check your design</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        {result.valid ? (
          <CheckCircle className="w-8 h-8 text-green-600" />
        ) : (
          <XCircle className="w-8 h-8 text-red-600" />
        )}
        <h3 className="text-xl font-semibold">
          {result.valid ? 'Design Validated' : 'Validation Failed'}
        </h3>
      </div>
      
      {result.valid && result.data && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Ready for Tier 3 Execution</AlertTitle>
          <AlertDescription className="text-green-700">
            <div className="mt-2 space-y-1">
              <p><strong>Template:</strong> {result.data.template.name}</p>
              <p><strong>Suggested System Pack:</strong> {result.data.suggestedSystemPack}</p>
              <p><strong>Validation ID:</strong> {result.data.validationId}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {result.errors.length > 0 && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Errors</AlertTitle>
          <AlertDescription className="text-red-700">
            <ul className="list-disc list-inside mt-2 space-y-1">
              {result.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {result.warnings.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Warnings</AlertTitle>
          <AlertDescription className="text-yellow-700">
            <ul className="list-disc list-inside mt-2 space-y-1">
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {result.requiresHumanReview && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Human Review Required</AlertTitle>
          <AlertDescription className="text-blue-700">
            This design requires manual review before proceeding to execution.
          </AlertDescription>
        </Alert>
      )}
      
      {!result.valid && onFixIssues && (
        <button
          onClick={onFixIssues}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Fix Issues in Drafting
        </button>
      )}
    </div>
  );
};

