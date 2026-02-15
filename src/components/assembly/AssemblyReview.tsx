import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
    AssemblyComponent,
    AssemblyResponse,
    AssemblyReviewState,
} from "@/types/assembly";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Download,
    Eye,
    Loader2,
    X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface AssemblyReviewProps {
  assemblyData: AssemblyResponse | null;
  onConfirm: (confirmedComponents: AssemblyComponent[]) => void;
  onCancel: () => void;
  onExport?: () => void;
  isLoading?: boolean;
}

export const AssemblyReview: React.FC<AssemblyReviewProps> = ({
  assemblyData,
  onConfirm,
  onCancel,
  onExport,
  isLoading = false,
}) => {
  const [components, setComponents] = useState<AssemblyComponent[]>([]);
  const [reviewState, setReviewState] = useState<AssemblyReviewState>("idle");

  useEffect(() => {
    if (assemblyData) {
      setComponents(assemblyData.components || []);
      setReviewState("review");
    }
  }, [assemblyData]);

  const handleRoleChange = (componentId: string, newRole: string) => {
    setComponents((prev) =>
      prev.map((comp) =>
        comp.id === componentId
          ? { ...comp, user_confirmed_role: newRole }
          : comp,
      ),
    );
  };

  const handleConfirm = () => {
    const confirmedComponents = components.map((comp) => ({
      ...comp,
      final_role: comp.user_confirmed_role || comp.detected_role,
    }));
    setReviewState("confirmed");
    onConfirm(confirmedComponents);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8)
      return "bg-green-100 text-green-800 border-green-300 hover:bg-green-200";
    if (confidence >= 0.6)
      return "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200";
    return "bg-red-100 text-red-800 border-red-300 hover:bg-red-200";
  };

  const getSystemColor = (systemType: string): string => {
    const colors: Record<string, string> = {
      sliding: "bg-blue-100 text-blue-800 border-blue-300",
      casement: "bg-amber-100 text-amber-800 border-amber-300",
      fixed: "bg-gray-100 text-gray-800 border-gray-300",
      tilt_turn: "bg-cyan-100 text-cyan-800 border-cyan-300",
      unknown: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return colors[systemType] || colors.unknown;
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Analyzing assembly structure...</p>
            <p className="text-sm text-gray-500">
              Detecting components and connections
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assemblyData || reviewState === "idle") {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Eye className="h-12 w-12 text-gray-400" />
            <p className="text-gray-600">
              Upload a shop drawing to begin assembly analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assemblyData.success) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Assembly Analysis Failed</AlertTitle>
            <AlertDescription>
              Unable to analyze the shop drawing. Please try again with a clearer
              image.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-end">
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { system, validation_results, missing_components, connections, confidence } =
    assemblyData;
  const hasIssues =
    (validation_results?.issues?.length ?? 0) > 0 ||
    (missing_components?.length ?? 0) > 0;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Assembly Review</CardTitle>
              <CardDescription>
                Review detected components and confirm their roles in the assembly
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={`px-3 py-1.5 text-sm ${getSystemColor(system.system_type)}`}>
                {system.system_type.toUpperCase()}
              </Badge>
              <Badge className={`px-3 py-1.5 text-sm ${getConfidenceColor(confidence)}`}>
                {Math.round(confidence * 100)}% Confidence
              </Badge>
              {hasIssues && (
                <Badge variant="default" className="px-3 py-1.5 text-sm bg-red-600 text-white">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Review
                </Badge>
              )}
            </div>
          </div>
          <Progress value={confidence * 100} className="mt-4" />
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {components.map((component) => (
          <Card key={component.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">
                    {component.profile_code || "Hardware Component"}
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Detected as:{" "}
                    <span className="font-medium">{component.detected_role}</span>
                  </CardDescription>
                </div>
                <Badge className={getConfidenceColor(component.confidence)}>
                  {Math.round(component.confidence * 100)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="typography-label block text-sm font-medium mb-2">Confirm Role</label>
                <Select
                  value={component.user_confirmed_role || component.detected_role}
                  onValueChange={(value) => handleRoleChange(component.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={component.detected_role}>
                      {component.detected_role} (detected)
                    </SelectItem>
                    {component.suggestions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {component.crop_image_url && (
                <div className="border rounded-lg p-2 bg-gray-50">
                  <img
                    src={component.crop_image_url}
                    alt="Component"
                    className="w-full h-32 object-contain"
                  />
                </div>
              )}

              {component.metadata?.hardware_type && (
                <div className="text-sm text-gray-600">
                  Hardware type:{" "}
                  <span className="font-medium">{component.metadata.hardware_type}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Connections</CardTitle>
            <CardDescription>How components connect in the assembly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {connections.map((conn, idx) => (
                <div
                  key={`${conn.from_component}-${conn.to_component}-${idx}`}
                  className="flex items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-3">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium">{conn.from_component}</span>
                      <div className="mx-3 text-gray-400">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{conn.to_component}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {conn.connection_type}
                      {conn.location_hint && ` · ${conn.location_hint}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasIssues && (
        <div className="space-y-4">
          {missing_components?.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing Components</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {missing_components.map((comp, idx) => (
                    <li key={comp + idx}>{comp}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation_results?.issues?.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation Issues</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {validation_results.issues.map((issue: string, idx: number) => (
                    <li key={issue + idx}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation_results?.warnings?.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {validation_results.warnings.map((warning: string, idx: number) => (
                    <li key={warning + idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Separator />

      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2">
        <div className="text-sm text-gray-600">
          {components.length} components detected • {connections.length} connections
          {assemblyData.processing_time_ms > 0 && (
            <span> • Processed in {assemblyData.processing_time_ms}ms</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onCancel} variant="outline" className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          {onExport && (
            <Button onClick={onExport} variant="secondary" className="gap-2">
              <Download className="h-4 w-4" />
              Export BOM
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={reviewState === "confirmed"}
          >
            <CheckCircle className="h-4 w-4" />
            {reviewState === "confirmed" ? "Confirmed" : "Confirm Assembly"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ArrowRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

export default AssemblyReview;

