import React from "react";
import { SmartScanUploader } from "@/components/fabricator/smartscan/SmartScanUploader";

const TestScannerPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">SmartScan Test Page</h1>
          <p className="text-zinc-400">
            Test the AI-Assisted Engineering Drawing Scanner with various file formats
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-zinc-900/30 rounded-xl p-6 border border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">Almona Smart Scan</h2>
            <SmartScanUploader />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/30 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-3">Testing Instructions</h3>
              <ul className="space-y-2 text-zinc-400">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <span>Upload catalog images (JPG, PNG, PDF, DXF)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <span>Enter known width for better accuracy (optional)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                  <span>Files process sequentially with progress tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                  <span>Download SVG or open in Profile Tuning Studio</span>
                </li>
              </ul>
            </div>

            <div className="bg-zinc-900/30 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-3">Expected Results</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-zinc-300 mb-1">✅ Successful Scan</h4>
                  <p className="text-sm text-zinc-500">
                    SVG preview, accurate dimensions, confidence score &gt; 70%
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-300 mb-1">⚠️ Verification Needed</h4>
                  <p className="text-sm text-zinc-500">
                    Confidence &lt; 70% or validation errors - manual check recommended
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-300 mb-1">❌ Scan Failed</h4>
                  <p className="text-sm text-zinc-500">
                    File too large, unsupported format, or processing error
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestScannerPage;

