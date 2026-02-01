import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Loader2, Shield } from 'lucide-react';
import React from 'react';

export const BuildingCodeValidator = () => {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'safe' | 'unsafe'>('idle');
  const [region, setRegion] = React.useState('cairo');

  const handleValidate = () => {
    setStatus('loading');
    // Simulation of validation logic
    setTimeout(() => {
      setStatus('safe');
    }, 1500);
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 /50 overflow-hidden card-dark">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-500" />
      
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="btn-primary">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <span className="block">HBRC Building Code Validator</span>
            <span className="text-xs text-slate-500 font-normal">EN 12210 Wind Load Compliance</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="typography-label text-slate-400 text-xs uppercase tracking-wide">Region (Wind Load Zone)</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cairo">Cairo (Zone 2)</SelectItem>
                <SelectItem value="alexandria">Alexandria (Zone 3)</SelectItem>
                <SelectItem value="aswan">Aswan (Zone 1)</SelectItem>
                <SelectItem value="delta">Delta Region (Zone 2)</SelectItem>
                <SelectItem value="sinai">Sinai (Zone 4)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="typography-label text-slate-400 text-xs uppercase tracking-wide">Profile Height (m)</Label>
            <Input 
              type="number" 
              placeholder="2.1" 
              defaultValue="2.1"
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600"
            />
          </div>
          <div className="space-y-2">
            <Label className="typography-label text-slate-400 text-xs uppercase tracking-wide">Moment of Inertia (Ix cm⁴)</Label>
            <Input 
              type="number" 
              placeholder="12.5" 
              defaultValue="12.5"
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600"
            />
          </div>
          <div className="space-y-2">
            <Label className="typography-label text-slate-400 text-xs uppercase tracking-wide">Wind Load (Pa)</Label>
            <Input 
              type="number" 
              disabled 
              value={region === 'alexandria' ? '1200' : region === 'sinai' ? '1500' : '800'} 
              className="bg-slate-950/50 border-slate-700 text-slate-400"
            />
          </div>
        </div>

        <Button 
          className="btn-primary-gradient" 
          onClick={handleValidate}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Validating Design...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Validate Design
            </>
          )}
        </Button>

        {status === 'safe' && (
          <Alert className="bg-emerald-500/10 border-emerald-500/30">
            <CheckCircle2 className="h-4 w-4 status-valid" />
            <AlertTitle className="font-semibold status-valid">Compliant Design ✓</AlertTitle>
            <AlertDescription className="text-emerald-300/80 text-sm">
              This configuration meets <span className="font-semibold">HBRC</span> and <span className="font-semibold">EN 12210</span> standards for wind load resistance in {region === 'cairo' ? 'Cairo' : region === 'alexandria' ? 'Alexandria' : region === 'aswan' ? 'Aswan' : region === 'delta' ? 'Delta Region' : 'Sinai'}.
            </AlertDescription>
          </Alert>
        )}
        
        {status === 'unsafe' && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertTitle className="text-red-400 font-semibold">Non-Compliant Design</AlertTitle>
            <AlertDescription className="text-red-300/80 text-sm">
              Structural integrity insufficient for the selected wind zone. Increase profile Ix value.
            </AlertDescription>
          </Alert>
        )}

        {/* Compliance Info */}
        <div className="pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Egyptian Building Code (HBRC 2018)</span>
            <span className="text-amber-400">EN 12210 Class C3</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
