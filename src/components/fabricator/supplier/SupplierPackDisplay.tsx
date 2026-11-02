/**
 * Supplier Pack Display Component
 * 
 * Displays supplier pack information with certification status.
 * Market leader-inspired UI with high precision.
 * 
 * @since Phase 2: Precision Upgrade Plan (January 2026)
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SupplierPack } from '@/lib/fabricator/supplier';
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';
import React from 'react';

interface SupplierPackDisplayProps {
  supplierPack: SupplierPack;
  className?: string;
}

export const SupplierPackDisplay: React.FC<SupplierPackDisplayProps> = ({
  supplierPack,
  className = '',
}) => {
  const { metadata, certification } = supplierPack;
  const certificationStatus = certification.certificationStatus;
  const validationResults = certification.validationResults;

  const getStatusIcon = () => {
    switch (certificationStatus) {
      case 'certified':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-warning" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'superseded':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusBadge = () => {
    switch (certificationStatus) {
      case 'certified':
        return <Badge variant="default" className="bg-green-600/20 text-success border-green-600/50">CERTIFIED</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-600/50 text-warning">PENDING</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-600/50 text-destructive">REJECTED</Badge>;
      case 'superseded':
        return <Badge variant="outline" className="border-amber-600/50 text-warning">SUPERSEDED</Badge>;
      default:
        return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <Card className={`card-glass-dark shadow-glow-strong ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg tracking-[0.02em] uppercase font-semibold text-warning">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-warning" />
              <span>{metadata.name}</span>
            </div>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription className="text-xs text-warning/80 font-medium">
            Tier {metadata.tier} • {metadata.volume} volume • {metadata.predictability} predictability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Supplier Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-warning">Supplier ID:</span>
              <span className="font-mono text-warning">{metadata.supplierId}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-warning">Regions:</span>
              <div className="flex gap-1">
                {metadata.regions.map((region) => (
                  <Badge key={region} variant="outline" className="text-xs border-amber-600/30 text-warning">
                    {region.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-warning">Contact:</span>
              <a
                href={`mailto:${metadata.contact.email}`}
                className="text-warning hover:text-warning underline"
              >
                {metadata.contact.email}
              </a>
            </div>
          </div>

          {/* Certification Status */}
          <div className="space-y-2 pt-2 border-t-2 border-amber-600/30">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-semibold text-warning">Certification Status</span>
            </div>
            <div className="space-y-1 text-xs text-warning/70">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <span className="font-mono">{certificationStatus.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Certified By:</span>
                <span className="font-mono">{certification.certifiedBy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Certification Date:</span>
                <span className="font-mono">
                  {new Date(certification.certificationDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Validation Results */}
          <div className="space-y-2 pt-2 border-t-2 border-amber-600/30">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold text-warning">Validation Results</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-warning/70">Geometry Compatibility:</span>
                <Badge
                  variant={
                    validationResults.geometryCompatibility.status === 'PASS'
                      ? 'default'
                      : 'outline'
                  }
                  className={`text-xs ${
                    validationResults.geometryCompatibility.status === 'FAIL'
                      ? 'border-red-600/50 text-destructive'
                      : ''
                  }`}
                >
                  {validationResults.geometryCompatibility.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-warning/70">Constraint Compliance:</span>
                <Badge
                  variant={
                    validationResults.constraintCompliance.status === 'PASS'
                      ? 'default'
                      : 'outline'
                  }
                  className={`text-xs ${
                    validationResults.constraintCompliance.status === 'FAIL'
                      ? 'border-red-600/50 text-destructive'
                      : ''
                  }`}
                >
                  {validationResults.constraintCompliance.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-warning/70">Version Lock:</span>
                <Badge
                  variant={validationResults.versionLock.status === 'PASS' ? 'default' : 'outline'}
                  className={`text-xs ${
                    validationResults.versionLock.status === 'FAIL'
                      ? 'border-red-600/50 text-destructive'
                      : ''
                  }`}
                >
                  {validationResults.versionLock.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Constitutional Note */}
          <div className="pt-2 border-t-2 border-amber-600/30">
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-2 text-xs text-warning/70 cursor-help">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Tier 2 Advisory Data</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs text-xs">
                  <p>
                    This supplier pack is Tier 2 advisory data. All suggestions must pass Tier 3
                    validation before use. Prices and availability are advisory and may change.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

