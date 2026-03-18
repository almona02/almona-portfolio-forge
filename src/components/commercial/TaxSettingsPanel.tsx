/**
 * Tax Settings Panel
 * 
 * Gold-tier tax configuration panel with regional tax rules,
 * exemption management, and tax rate settings.
 * 
 * Features:
 * - Regional tax rate configuration
 * - Exemption certificate management
 * - Tax rule customization
 * - Prestige theme styling
 * 
 * Usage:
 * ```tsx
 * <TaxSettingsPanel region="EG" />
 * ```
 */

import { TaxCalculationEngine, TaxExemptionHandler, type ExemptionCertificate, type TaxRegion } from '@/lib/tax';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/ui/table';
import { format } from 'date-fns';
import {
    Calendar,
    CheckCircle2,
    FileText,
    Plus,
    Settings,
    Trash2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TaxSettingsPanelProps {
  /** Tax region */
  region: TaxRegion;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tax Settings Panel Component
 */
export const TaxSettingsPanel: React.FC<TaxSettingsPanelProps> = ({
  region,
  className,
}) => {
  const [taxRule] = useState(TaxCalculationEngine.getTaxRule(region));
  const [exemptions, setExemptions] = useState<ExemptionCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddExemption, setShowAddExemption] = useState(false);
  const [newExemption, setNewExemption] = useState({
    customerId: '',
    certificateNumber: '',
    exemptionType: 'full' as 'full' | 'partial',
    exemptionRate: 1,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: '',
    issuedBy: '',
  });

  const loadExemptions = async () => {
    setLoading(true);
    try {
      // Load all exemptions for region (would need customer context in real app)
      const expiring = await TaxExemptionHandler.getExpiringExemptions(365);
      setExemptions(expiring.filter(e => e.region === region));
    } catch (error) {
      console.error('Failed to load exemptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExemptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  const handleAddExemption = async () => {
    try {
      if (!newExemption.certificateNumber || !newExemption.customerId) {
        toast.error('Certificate number and customer ID are required');
        return;
      }

      await TaxExemptionHandler.createCertificate({
        customerId: newExemption.customerId,
        certificateNumber: newExemption.certificateNumber,
        region,
        exemptionType: newExemption.exemptionType,
        exemptionRate: newExemption.exemptionType === 'partial' ? newExemption.exemptionRate : undefined,
        validFrom: new Date(newExemption.validFrom),
        validUntil: new Date(newExemption.validUntil),
        status: 'active',
        reason: newExemption.reason,
        issuedBy: newExemption.issuedBy,
      });

      toast.success('Exemption certificate created');
      setShowAddExemption(false);
      setNewExemption({
        customerId: '',
        certificateNumber: '',
        exemptionType: 'full',
        exemptionRate: 1,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: '',
        issuedBy: '',
      });
      void loadExemptions();
    } catch (error) {
      console.error('Failed to create exemption:', error);
      toast.error('Failed to create exemption certificate');
    }
  };

  const handleRevokeExemption = async (certificateId: string) => {
    try {
      await TaxExemptionHandler.revokeCertificate(certificateId, 'Revoked by administrator');
      toast.success('Exemption certificate revoked');
      void loadExemptions();
    } catch (error) {
      console.error('Failed to revoke exemption:', error);
      toast.error('Failed to revoke exemption certificate');
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tax Rule Configuration */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tax Configuration - {region}
          </CardTitle>
          <CardDescription className="text-sm text-amber-600/70">
            Regional tax rules and rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-amber-300/70">Standard Tax Rate</Label>
              <div className="mt-1 p-3 bg-[#0f0f0f]/60 border border-amber-600/30 rounded text-amber-200">
                {(taxRule.standardRate * 100).toFixed(2)}% {taxRule.taxName}
              </div>
            </div>
            <div>
              <Label className="text-sm text-amber-300/70">Tax Inclusive</Label>
              <div className="mt-1 p-3 bg-[#0f0f0f]/60 border border-amber-600/30 rounded text-amber-200">
                {taxRule.taxInclusive ? 'Yes' : 'No'}
              </div>
            </div>
          </div>

          {taxRule.additionalTax && (
            <div>
              <Label className="text-sm text-amber-300/70">Additional Tax</Label>
              <div className="mt-1 p-3 bg-[#0f0f0f]/60 border border-amber-600/30 rounded text-amber-200">
                {(taxRule.additionalTax.rate * 100).toFixed(2)}% {taxRule.additionalTax.name}
                <span className="text-xs text-amber-600/50 ml-2">
                  (applies to {taxRule.additionalTax.appliesTo})
                </span>
              </div>
            </div>
          )}

          {taxRule.reducedRates && Object.keys(taxRule.reducedRates).length > 0 && (
            <div>
              <Label className="text-sm text-amber-300/70 mb-2 block">Reduced Rates</Label>
              <div className="space-y-2">
                {Object.entries(taxRule.reducedRates).map(([category, rate]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-2 bg-[#0f0f0f]/60 border border-amber-600/30 rounded"
                  >
                    <span className="text-amber-200 capitalize">{category}</span>
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
                      {(rate * 100).toFixed(2)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exemption Certificates */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tax Exemption Certificates
              </CardTitle>
              <CardDescription className="text-sm text-amber-600/70 mt-1">
                Manage tax exemption certificates for customers
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddExemption(!showAddExemption)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Certificate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddExemption && (
            <Card className="bg-[#0f0f0f]/60 border-amber-600/20 p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-amber-300/70">Customer ID</Label>
                    <Input
                      value={newExemption.customerId}
                      onChange={(e) => setNewExemption({ ...newExemption, customerId: e.target.value })}
                      className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                      placeholder="Customer UUID"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-amber-300/70">Certificate Number</Label>
                    <Input
                      value={newExemption.certificateNumber}
                      onChange={(e) => setNewExemption({ ...newExemption, certificateNumber: e.target.value })}
                      className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                      placeholder="CERT-XXXXX"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-amber-300/70">Exemption Type</Label>
                    <Select
                      value={newExemption.exemptionType}
                      onValueChange={(v) => setNewExemption({ ...newExemption, exemptionType: v as 'full' | 'partial' })}
                    >
                      <SelectTrigger className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                        <SelectItem value="full">Full Exemption</SelectItem>
                        <SelectItem value="partial">Partial Exemption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newExemption.exemptionType === 'partial' && (
                    <div>
                      <Label className="text-sm text-amber-300/70">Exemption Rate (0-1)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={newExemption.exemptionRate}
                        onChange={(e) => setNewExemption({ ...newExemption, exemptionRate: parseFloat(e.target.value) || 0 })}
                        className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-amber-300/70">Valid From</Label>
                    <Input
                      type="date"
                      value={newExemption.validFrom}
                      onChange={(e) => setNewExemption({ ...newExemption, validFrom: e.target.value })}
                      className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-amber-300/70">Valid Until</Label>
                    <Input
                      type="date"
                      value={newExemption.validUntil}
                      onChange={(e) => setNewExemption({ ...newExemption, validUntil: e.target.value })}
                      className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-amber-300/70">Reason</Label>
                  <Input
                    value={newExemption.reason}
                    onChange={(e) => setNewExemption({ ...newExemption, reason: e.target.value })}
                    className="mt-1 bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                    placeholder="Exemption reason"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => void handleAddExemption()}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Create Certificate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddExemption(false)}
                    className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="text-center py-8 text-amber-600/70">Loading exemptions...</div>
          ) : exemptions.length === 0 ? (
            <div className="text-center py-8 text-amber-600/70">
              No exemption certificates found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <TableHead className="text-amber-300/70">Certificate</TableHead>
                  <TableHead className="text-amber-300/70">Customer</TableHead>
                  <TableHead className="text-amber-300/70">Type</TableHead>
                  <TableHead className="text-amber-300/70">Valid Until</TableHead>
                  <TableHead className="text-amber-300/70">Status</TableHead>
                  <TableHead className="text-amber-300/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exemptions.map((exemption) => {
                  const isExpiring = exemption.validUntil.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                  const isExpired = exemption.validUntil < new Date();

                  return (
                    <TableRow key={exemption.id} className="border-amber-600/10">
                      <TableCell className="text-amber-200 font-mono text-sm">
                        {exemption.certificateNumber}
                      </TableCell>
                      <TableCell className="text-amber-200">
                        {exemption.customerId.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-amber-600/30',
                            exemption.exemptionType === 'full'
                              ? 'bg-green-500/20 text-green-200'
                              : 'bg-amber-500/20 text-amber-200'
                          )}
                        >
                          {exemption.exemptionType === 'full' ? 'Full' : `${(exemption.exemptionRate || 0) * 100}%`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-amber-200">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-600/50" />
                          {format(exemption.validUntil, 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge variant="outline" className="bg-red-500/20 text-red-200 border-red-500/30">
                            Expired
                          </Badge>
                        ) : isExpiring ? (
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-200 border-yellow-500/30">
                            Expiring Soon
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {exemption.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleRevokeExemption(exemption.id)}
                            className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

