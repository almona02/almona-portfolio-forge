import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AssemblyReview } from "@/components/assembly/AssemblyReview";
import { scanAssembly, confirmAssembly } from "@/services/smartScanApi";
import type { AssemblyResponse, AssemblyComponent } from "@/types/assembly";
import { Loader2, Upload } from "lucide-react";

const SmartScanAssembly: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [assemblyData, setAssemblyData] = useState<AssemblyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    setFile(selected || null);
    setAssemblyData(null);
    setError(null);
  };

  const handleScan = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await scanAssembly(file);
      setAssemblyData(result);
    } catch (err: any) {
      setError(err?.message || "Assembly scan failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (confirmed: AssemblyComponent[]) => {
    if (!assemblyData) return;
    try {
      await confirmAssembly(assemblyData.assembly_id, confirmed);
      setAssemblyData(null);
      setFile(null);
    } catch (err: any) {
      setError(err?.message || "Failed to confirm assembly");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Smart Assembly Scan</h1>
        <p className="text-gray-600 mt-2">
          Upload shop drawings to detect assembly structure and confirm component roles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Drawing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Input type="file" accept="image/*,.pdf" onChange={handleFileChange} />
            <Button onClick={handleScan} disabled={!file || isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Upload className="h-4 w-4" />
              Analyze Assembly
            </Button>
          </div>
          {file && (
            <div className="text-sm text-gray-600">
              Selected: <span className="font-medium">{file.name}</span>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Scan failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {assemblyData && (
        <AssemblyReview
          assemblyData={assemblyData}
          onConfirm={handleConfirm}
          onCancel={() => setAssemblyData(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default SmartScanAssembly;

