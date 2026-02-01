/**
 * BOM Replay Metadata Display Component
 * 
 * Displays deterministic replay metadata for BOM generation.
 * Shows AICS-001 Section 7.5 compliance information and replay verification link.
 * 
 * AICS-001 Reference: Section 7.5 (Deterministic Replay Guarantee)
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { CheckCircle2, ExternalLink, FileText, Hash } from 'lucide-react';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';

interface BOMReplayMetadataDisplayProps {
  bom: CompleteBOM;
  compact?: boolean;
}

/**
 * BOM Replay Metadata Display Component
 */
export const BOMReplayMetadataDisplay: React.FC<BOMReplayMetadataDisplayProps> = ({
  bom,
  compact = false,
}) => {
  if (!bom.replayMetadata) {
    return null;
  }

  const { replayMetadata } = bom;

  if (compact) {
    // Compact display: Show badge and verification link only
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-emerald-950/20 border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          AICS-001 Section 7.5
        </Badge>
        {replayMetadata.replayVerificationUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300"
            onClick={() => window.open(replayMetadata.replayVerificationUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Verify Replay
          </Button>
        )}
      </div>
    );
  }

  // Full display: Show all replay metadata
  return (
    <Card className="bg-emerald-950/20 border-emerald-500/30">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Deterministic Replay Guarantee
          </CardTitle>
          <Badge variant="outline" className="bg-emerald-950/30 border-emerald-500/40 text-emerald-300 text-xs">
            {replayMetadata.aics001Compliance}
          </Badge>
        </div>
        <CardDescription className="text-xs text-emerald-400/70 mt-1">
          Same inputs + same truth versions = same result
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Input Hash */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-emerald-300/80">
            <Hash className="h-3 w-3" />
            <span className="font-semibold">Input Hash:</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-400/70 bg-emerald-950/30 p-2 rounded border border-emerald-500/20 break-all">
            {replayMetadata.inputHash}
          </div>
        </div>

        {/* Result Signature */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-emerald-300/80">
            <Hash className="h-3 w-3" />
            <span className="font-semibold">Result Signature:</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-400/70 bg-emerald-950/30 p-2 rounded border border-emerald-500/20 break-all">
            {replayMetadata.resultSignature}
          </div>
        </div>

        {/* Truth Versions */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-emerald-300/80">
            <FileText className="h-3 w-3" />
            <span className="font-semibold">Truth Versions:</span>
          </div>
          <div className="space-y-1 text-[10px] text-emerald-400/70 bg-emerald-950/30 p-2 rounded border border-emerald-500/20">
            <div className="flex justify-between">
              <span>Geometry:</span>
              <span className="font-mono">{replayMetadata.truthVersions.geometry}</span>
            </div>
            <div className="flex justify-between">
              <span>Material:</span>
              <span className="font-mono">{replayMetadata.truthVersions.material}</span>
            </div>
            <div className="flex justify-between">
              <span>Machine:</span>
              <span className="font-mono">{replayMetadata.truthVersions.machine}</span>
            </div>
            <div className="flex justify-between">
              <span>Process:</span>
              <span className="font-mono">{replayMetadata.truthVersions.process}</span>
            </div>
            <div className="flex justify-between">
              <span>Certification:</span>
              <span className="font-mono">{replayMetadata.truthVersions.certification}</span>
            </div>
          </div>
        </div>

        {/* Computation ID */}
        <div className="space-y-1">
          <div className="text-xs text-emerald-300/80">
            <span className="font-semibold">Computation ID:</span>
            <span className="ml-2 font-mono text-[10px] text-emerald-400/70">{replayMetadata.computationId}</span>
          </div>
        </div>

        {/* Verification Link */}
        {replayMetadata.replayVerificationUrl && (
          <div className="pt-2 border-t border-emerald-500/20">
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50 hover:text-emerald-200"
              onClick={() => window.open(replayMetadata.replayVerificationUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Verify Replay Guarantee
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

