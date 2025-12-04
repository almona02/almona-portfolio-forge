import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Recycle } from 'lucide-react';

interface ImportMeterProps {
  savedUSD: number;
  exchangeRate: number;
  materialTons: number;
}

export const ImportSubstitutionMeter: React.FC<ImportMeterProps> = ({ savedUSD, exchangeRate, materialTons }) => {
  const savedEGP = savedUSD * exchangeRate;
  
  // Calculate percentage of a target (e.g., $100M goal)
  const targetUSD = 100000000; // $100M target
  const progressPercent = Math.min((savedUSD / targetUSD) * 100, 100);
  
  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border-slate-800 overflow-hidden relative">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wider text-slate-400 font-medium">
            Contribution to Foreign Reserves
          </CardTitle>
          <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <TrendingUp className="h-4 w-4 text-orange-400" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="flex flex-col space-y-6">
          {/* Main USD value */}
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
              ${savedUSD.toLocaleString()}
            </span>
            <span className="text-sm text-slate-500 mb-2">USD Saved</span>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Import Substitution Progress</span>
              <span className="text-orange-400">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs text-slate-600 text-right">
              Target: $100M by 2026
            </div>
          </div>
          
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-amber-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wide">EGP Equivalent</p>
              </div>
              <p className="font-mono text-xl text-white font-semibold">
                {savedEGP.toLocaleString()}
                <span className="text-sm text-slate-500 ml-1">EGP</span>
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Recycle className="h-4 w-4 text-emerald-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wide">Material Diverted</p>
              </div>
              <p className="font-mono text-xl text-white font-semibold">
                {materialTons.toLocaleString()}
                <span className="text-sm text-slate-500 ml-1">Tons</span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
