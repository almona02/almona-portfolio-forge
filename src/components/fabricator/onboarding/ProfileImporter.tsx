/**
 * Profile Importer Component
 * Excel/CSV profile importer with column mapping and validation
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { ProfileImporter as ProfileImporterUtil } from '@/lib/import/ProfileImporter';
import type { Profile } from '@/types/fabricator';

interface ProfileImporterProps {
  onImport: (profiles: Profile[]) => void;
  userId: string;
}

export const ProfileImporter: React.FC<ProfileImporterProps> = ({ onImport, userId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setError(null);
      setLoading(true);

      try {
        const importer = new ProfileImporterUtil();
        const result = await importer.parseFile(selectedFile);

        // Auto-detect column mapping
        const autoMapping = importer.detectColumnMapping(result.headers);
        setColumnMapping(autoMapping);

        // Preview first 5 rows
        setPreview(result.rows.slice(0, 5));
        setValidationErrors([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file');
        setFile(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const importer = new ProfileImporterUtil();
      const profiles = await importer.importProfiles(file, columnMapping, userId);

      // Validate profiles
      const errors = importer.validateProfiles(profiles);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      onImport(profiles);
      // Reset
      setFile(null);
      setPreview([]);
      setColumnMapping({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import profiles');
    } finally {
      setLoading(false);
    }
  }, [file, columnMapping, userId, onImport]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        void handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-amber-400" />
          Import Profiles
        </CardTitle>
        <CardDescription>
          Upload an Excel or CSV file with your profile data. We'll help you map the columns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div>
          <Label>Profile File (Excel/CSV)</Label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-dashed border-gray-700 rounded-lg p-8 text-center /50 transition-colors cursor-pointer mt-2 card-premium"
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <p className="text-sm text-gray-400">Parsing file...</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
                <p className="text-sm font-medium">{file.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                    setColumnMapping({});
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-300">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-gray-500">Excel (.xlsx) or CSV format</p>
                <Input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      void handleFileSelect(selectedFile);
                    }
                  }}
                  className="hidden"
                  id="profile-file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('profile-file-upload')?.click()}
                >
                  Browse Files
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription>
              <div className="text-yellow-300 text-sm">
                <p className="font-medium mb-2">Validation Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx} className="text-xs">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Column Mapping */}
        {preview.length > 0 && Object.keys(columnMapping).length > 0 && (
          <div className="space-y-2">
            <Label>Column Mapping</Label>
            <div className="space-y-2 p-3 bg-gray-900/50 rounded">
              {Object.entries(columnMapping).map(([csvColumn, profileField]) => (
                <div key={csvColumn} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{csvColumn}</span>
                  <Select
                    value={profileField}
                    onValueChange={(value) => {
                      setColumnMapping({ ...columnMapping, [csvColumn]: value });
                    }}
                  >
                    <SelectTrigger className="w-40 bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="width">Width</SelectItem>
                      <SelectItem value="height">Height</SelectItem>
                      <SelectItem value="cost_per_meter">Cost per Meter</SelectItem>
                      <SelectItem value="weight_per_meter">Weight per Meter</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="ignore">Ignore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="space-y-2">
            <Label>Preview (first 5 rows)</Label>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-900/50 sticky top-0">
                  <tr>
                    {Object.keys(preview[0] || {}).map((key) => (
                      <th key={key} className="p-2 text-left border-b border-gray-700">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      {Object.values(row).map((value: any, colIdx) => (
                        <td key={colIdx} className="p-2 text-gray-300">
                          {String(value || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Button */}
        {file && preview.length > 0 && (
          <Button
            onClick={handleImport}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Import Profiles
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

