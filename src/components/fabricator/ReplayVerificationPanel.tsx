/**
 * Replay Verification Panel Component
 * 
 * Gold-tier deterministic replay verification interface with status indicators,
 * hash visualization, truth version display, and performance metrics.
 * 
 * AICS-001 Reference: Section 7.5 (Deterministic Replay Guarantee)
 * 
 * Blackbox Visual Polish: Prestige dark theme, clear status indicators, hash tooltips, performance metrics
 */

import { DeterministicReplayEngine, type ReplayRequest, type ReplayResult } from '@/core/authority/certification';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/ui/tooltip';
import { CheckCircle2, Clock, Copy, Hash, XCircle, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface ReplayVerificationPanelProps {
  computationId?: string;
  inputHash?: string;
  className?: string;
}

/**
 * Hash Display Component with Copy
 */
const HashDisplay: React.FC<{
  label: string;
  value: string;
  truncated?: boolean;
}> = ({ label, value, truncated = true }) => {
  const [copied, setCopied] = useState(false);
  const displayValue = truncated ? `${value.substring(0, 16)}...${value.substring(value.length - 8)}` : value;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Hash copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-400 uppercase tracking-wider">{label}</Label>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-1 font-mono text-xs text-amber-400 bg-amber-950/20 border border-amber-500/30 rounded px-3 py-2 cursor-help break-all">
                {displayValue}
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-amber-500/30 text-xs font-mono max-w-md">
              <p>{value}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-8 w-8 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
        >
          <Copy className={`h-3 w-3 ${copied ? 'text-emerald-400' : ''}`} />
        </Button>
      </div>
    </div>
  );
};

/**
 * Replay Verification Panel Component
 */
export const ReplayVerificationPanel: React.FC<ReplayVerificationPanelProps> = ({
  inputHash: initialInputHash,
  className,
}) => {
  const [inputHash, setInputHash] = useState(initialInputHash || '');
  const [truthVersions, setTruthVersions] = useState({
    geometry: '1.0.0',
    material: '1.0.0',
    machine: '1.0.0',
    process: '1.0.0',
    certification: '1.0.0',
  });
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    verificationTime?: number;
    computationTime?: number;
  }>({});

  const handleVerify = async () => {
    if (!inputHash) {
      toast.error('Input hash is required');
      return;
    }

    setVerifying(true);
    const startTime = performance.now();

    try {
      const request: ReplayRequest = {
        inputHash,
        truthVersions: {
          ...truthVersions,
          timestamp: new Date(),
        },
      };

      const result = await DeterministicReplayEngine.replayComputation(
        request,
        async () => {
          // This would normally be the actual computation function
          // For verification, we're just checking if the computation exists
          throw new Error('Computation function not provided for verification');
        }
      );

      const endTime = performance.now();
      setPerformanceMetrics({
        verificationTime: endTime - startTime,
      });

      setReplayResult(result);
      toast.success(result.matches ? 'Replay verification successful' : 'Replay verification failed');
    } catch (error) {
      console.error('Replay verification error:', error);
      toast.error('Replay verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={className}>
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-amber-200 flex items-center gap-2">
            <Hash className="h-5 w-5 text-amber-500" />
            Replay Verification
          </CardTitle>
          <CardDescription className="text-slate-400">
            Verify deterministic replay guarantee (AICS-001 Section 7.5)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="inputHash" className="text-slate-300">
                Input Hash
              </Label>
              <Input
                id="inputHash"
                value={inputHash}
                onChange={(e) => setInputHash(e.target.value)}
                placeholder="Enter input hash..."
                className="bg-slate-800/50 border-amber-500/30 text-amber-400 font-mono text-sm mt-1"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">Truth Versions</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Geometry</Label>
                  <Input
                    value={truthVersions.geometry}
                    onChange={(e) => setTruthVersions({ ...truthVersions, geometry: e.target.value })}
                    className="bg-slate-800/50 border-cyan-500/30 text-cyan-400 font-mono text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Material</Label>
                  <Input
                    value={truthVersions.material}
                    onChange={(e) => setTruthVersions({ ...truthVersions, material: e.target.value })}
                    className="bg-slate-800/50 border-cyan-500/30 text-cyan-400 font-mono text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Machine</Label>
                  <Input
                    value={truthVersions.machine}
                    onChange={(e) => setTruthVersions({ ...truthVersions, machine: e.target.value })}
                    className="bg-slate-800/50 border-cyan-500/30 text-cyan-400 font-mono text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Process</Label>
                  <Input
                    value={truthVersions.process}
                    onChange={(e) => setTruthVersions({ ...truthVersions, process: e.target.value })}
                    className="bg-slate-800/50 border-cyan-500/30 text-cyan-400 font-mono text-xs mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-400">Certification</Label>
                  <Input
                    value={truthVersions.certification}
                    onChange={(e) => setTruthVersions({ ...truthVersions, certification: e.target.value })}
                    className="bg-slate-800/50 border-cyan-500/30 text-cyan-400 font-mono text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleVerify}
              disabled={verifying || !inputHash}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {verifying ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Verify Replay
                </>
              )}
            </Button>
          </div>

          {/* Verification Result */}
          {replayResult && (
            <Card className={`border-2 ${
              replayResult.matches 
                ? 'bg-emerald-950/20 border-emerald-500/50' 
                : 'bg-red-950/20 border-red-500/50'
            }`}>
              <CardHeader>
                <CardTitle className={`text-lg flex items-center gap-2 ${
                  replayResult.matches ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {replayResult.matches ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Verification Successful
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5" />
                      Verification Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {replayResult.originalSignature && (
                  <HashDisplay label="Original Result Signature" value={replayResult.originalSignature} />
                )}
                {replayResult.replayedSignature && (
                  <HashDisplay label="Replayed Result Signature" value={replayResult.replayedSignature} />
                )}
                {performanceMetrics.verificationTime && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Zap className="h-3 w-3" />
                    Verification time: {performanceMetrics.verificationTime.toFixed(2)}ms
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          {Object.keys(performanceMetrics).length > 0 && (
            <Card className="bg-slate-800/30 border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  {performanceMetrics.verificationTime && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Verification Time:</span>
                      <span className="text-amber-400 font-mono">{performanceMetrics.verificationTime.toFixed(2)}ms</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

