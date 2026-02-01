import { SmartScanUploader } from "@/components/fabricator/smartscan/SmartScanUploader";
import React from "react";

const TestScannerPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 pt-24 bg-slate-950 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 pb-6 border-b border-amber-500/20">
          <h1 className="typography-h1 text-white mb-2 font-bold tracking-wide uppercase">
            SmartScan Test Page
          </h1>
          <p className="text-zinc-400 text-sm">
            Test the AI-Assisted Engineering Drawing Scanner with various file formats
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl p-6 border border-amber-500/20 shadow-lg shadow-amber-500/5">
            <h2 className="typography-h2 text-xl font-semibold text-white mb-4 tracking-wide uppercase">
              Almona Smart Scan
            </h2>
            <SmartScanUploader />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-amber-500/10 shadow-md">
              <h3 className="typography-h3 text-lg text-white mb-3 font-semibold tracking-wide uppercase">
                Testing Instructions
              </h3>
              <ul className="space-y-3 text-zinc-300">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0 shadow-sm shadow-amber-400/50" />
                  <span className="text-sm">Upload catalog images (JPG, PNG, PDF, DXF)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0 shadow-sm shadow-emerald-400/50" />
                  <span className="text-sm">Enter known width for better accuracy (optional)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0 shadow-sm shadow-amber-400/50" />
                  <span className="text-sm">Files process in batch mode with progress tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0 shadow-sm shadow-cyan-400/50" />
                  <span className="text-sm">Download SVG or open in Profile Tuning Studio</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-amber-500/10 shadow-md">
              <h3 className="typography-h3 text-lg text-white mb-3 font-semibold tracking-wide uppercase">
                Expected Results
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <h4 className="typography-h4 font-medium text-emerald-400 mb-1 flex items-center gap-2">
                    <span>✅</span> Successful Scan
                  </h4>
                  <p className="text-sm text-zinc-300">
                    SVG preview, accurate dimensions, confidence score &gt; 70%
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <h4 className="typography-h4 font-medium text-amber-400 mb-1 flex items-center gap-2">
                    <span>⚠️</span> Verification Needed
                  </h4>
                  <p className="text-sm text-zinc-300">
                    Confidence &lt; 70% or validation errors - manual check recommended
                  </p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <h4 className="typography-h4 font-medium text-red-400 mb-1 flex items-center gap-2">
                    <span>❌</span> Scan Failed
                  </h4>
                  <p className="text-sm text-zinc-300">
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

