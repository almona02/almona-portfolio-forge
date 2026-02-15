import React, { useState } from 'react';
import { Ruler, Grid3x3, Box, Settings, FileCheck, Zap, ChevronRight, Info, Crown, Sparkles, Shield, Gem, TrendingUp, Award } from 'lucide-react';

const AlmonaPrestigeUltra = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [showAlgorithmPanel, setShowAlgorithmPanel] = useState(false);
  const [show3DPreview, setShow3DPreview] = useState(true);

  const steps = [
    { id: 1, name: 'Design', icon: Grid3x3 },
    { id: 2, name: 'Configure', icon: Settings },
    { id: 3, name: 'Validate', icon: Shield },
    { id: 4, name: 'Optimize', icon: Zap },
    { id: 5, name: 'Export', icon: FileCheck }
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans text-slate-100">
      {/* Luxury Top Bar */}
      <div className="h-20 bg-gradient-to-r from-slate-900/95 via-amber-900/20 to-slate-900/95 backdrop-blur-xl border-b border-amber-500/20 flex items-center px-8 justify-between relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent animate-pulse" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-amber-400" />
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                ALMONA
              </div>
              <div className="text-xs text-amber-600/80 tracking-widest uppercase">Prestige Edition</div>
            </div>
          </div>
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent" />
          <div className="flex flex-col">
            <div className="text-sm text-slate-300 font-medium">Villa Complex North - Unit A</div>
            <div className="text-xs text-slate-500">Client: Elite Developments Ltd.</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <Gem className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-slate-300">AICS-001 Certified</span>
          </div>
          <button className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-all duration-300">
            Save Draft
          </button>
          <button className="px-6 py-2 text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-amber-500/20">
            Continue →
          </button>
        </div>
      </div>

      {/* Elite Progress Bar */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-8 py-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div 
                className={`flex flex-col items-center gap-3 cursor-pointer transition-all duration-500 group ${
                  activeStep === step.id ? 'scale-110' : 'opacity-50 hover:opacity-80'
                }`}
                onClick={() => setActiveStep(step.id)}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center relative transition-all duration-500 ${
                  activeStep === step.id
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-2xl shadow-amber-500/50' 
                    : 'bg-slate-800 border border-slate-700 group-hover:border-amber-500/30'
                }`}>
                  <step.icon className={`w-7 h-7 ${activeStep === step.id ? 'text-slate-900' : 'text-slate-400'}`} />
                  {activeStep === step.id && (
                    <div className="absolute -inset-1 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl blur-xl opacity-50 animate-pulse" />
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <div className={`text-xs tracking-wider uppercase ${activeStep === step.id ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                    Phase {step.id}
                  </div>
                  <div className={`text-sm font-medium ${activeStep === step.id ? 'text-slate-100' : 'text-slate-400'}`}>
                    {step.name}
                  </div>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 mx-4 relative">
                  {activeStep > step.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-400 animate-pulse" />
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Premium Workspace - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Quick Actions & Stats */}
        <div className="w-72 bg-slate-900/50 border-r border-slate-700/30 flex flex-col backdrop-blur-sm">
          {/* Project Stats */}
          <div className="p-6 border-b border-slate-700/30">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Project Intelligence</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-3">
                <div className="text-xs text-blue-300 mb-1">Total Units</div>
                <div className="text-2xl font-bold text-blue-400">24</div>
              </div>
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-3">
                <div className="text-xs text-cyan-300 mb-1">Openings</div>
                <div className="text-2xl font-bold text-cyan-400">6</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-3">
                <div className="text-xs text-emerald-300 mb-1">Area</div>
                <div className="text-2xl font-bold text-emerald-400">3.84m²</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-3">
                <div className="text-xs text-amber-300 mb-1">Value</div>
                <div className="text-2xl font-bold text-amber-400">€2.4K</div>
              </div>
            </div>
          </div>

          {/* System Pack */}
          <div className="p-6 border-b border-slate-700/30">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 block">
              System Pack
            </label>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-amber-500/30 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-slate-900 font-bold text-sm">PS</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">Caluminium PS v3</div>
                  <div className="text-xs text-slate-500">Premium Series 60mm</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Thermal: U=1.2</span>
                <span className="text-emerald-400">✓ Selected</span>
              </div>
            </div>
          </div>

          {/* Profile Assignments */}
          <div className="p-6 flex-1 overflow-auto">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 block">
              Profile Matrix
            </label>
            <div className="space-y-2">
              {[
                { role: 'Frame', code: 'CAL-FR-001', color: 'blue' },
                { role: 'Sash', code: 'CAL-SA-002', color: 'cyan' },
                { role: 'Mullion', code: 'CAL-MU-003', color: 'emerald' },
                { role: 'Transom', code: 'CAL-TR-004', color: 'amber' }
              ].map(profile => (
                <div key={profile.role} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300 font-medium">{profile.role}</span>
                    <div className={`w-2 h-2 rounded-full bg-${profile.color}-400`} />
                  </div>
                  <div className="text-xs text-slate-500 font-mono">{profile.code}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Constitutional Badge */}
          <div className="p-6 border-t border-slate-700/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-300">Tier 3 Protected</span>
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              100% deterministic execution. Zero AI/ML in critical path. AICS-001 v1.0.0 certified.
            </div>
          </div>
        </div>

        {/* Center Canvas - Premium Design Space */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-800/30 to-slate-900/30 relative overflow-hidden">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle, #f59e0b 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />

          {/* Premium Toolbar */}
          <div className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 flex items-center px-6 gap-4 relative z-10">
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all duration-300 flex items-center gap-2 border border-slate-700">
                <Grid3x3 className="w-4 h-4" />
                3×2 Grid
              </button>
              <div className="w-px h-6 bg-slate-700" />
              {['Fixed', 'Casement', 'Tilt-Turn', 'Pivot'].map(type => (
                <button key={type} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-all duration-300">
                  {type}
                </button>
              ))}
            </div>
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 rounded-lg border border-slate-700/50">
                <Ruler className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-300">2400mm × 1600mm</span>
              </div>
              <button 
                onClick={() => setShow3DPreview(!show3DPreview)}
                className={`px-4 py-2 text-sm rounded-lg transition-all duration-300 ${
                  show3DPreview 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Box className="w-4 h-4 inline mr-2" />
                3D Preview
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 p-8 overflow-auto relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl p-12 border border-slate-700/50 relative overflow-hidden">
                {/* Luxury corner accents */}
                <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-amber-500/30 rounded-tl-2xl" />
                <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-amber-500/30 rounded-br-2xl" />
                
                {/* Grid Visualization */}
                <div className="grid grid-cols-3 grid-rows-2 gap-3 aspect-[3/2] relative">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i}
                      className="border-2 border-cyan-500/30 rounded-xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 hover:from-cyan-500/10 hover:to-blue-500/10 cursor-pointer transition-all duration-500 relative group overflow-hidden"
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="text-center">
                          <div className="text-sm font-semibold text-cyan-300 mb-1">Opening {i + 1}</div>
                          <div className="text-xs text-slate-400">Click to configure</div>
                        </div>
                      </div>
                      
                      {/* Corner indicators */}
                      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/50 rounded-tl" />
                      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/50 rounded-br" />
                    </div>
                  ))}
                </div>

                {/* Dimension Labels */}
                <div className="mt-6 flex justify-between text-sm text-slate-400">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                    800mm per column
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                    800mm per row
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Algorithm Panel */}
          <div 
            className="absolute bottom-6 right-6 bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/20 overflow-hidden transition-all duration-500 z-20"
            style={{ width: showAlgorithmPanel ? '380px' : '280px' }}
            onMouseEnter={() => setShowAlgorithmPanel(true)}
            onMouseLeave={() => setShowAlgorithmPanel(false)}
          >
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <div className="text-xs text-amber-400 uppercase tracking-wider">Algorithm</div>
                  <div className="text-sm font-bold text-slate-100">Greedy Heuristic</div>
                </div>
              </div>
              
              <div className={`transition-all duration-500 overflow-hidden ${
                showAlgorithmPanel ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="text-cyan-400 font-semibold mb-1">Selection Rationale:</div>
                    <p>Rule 1.1: &lt;50 cuts detected → Greedy algorithm selected</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2">
                      <div className="text-emerald-400 text-xs mb-1">Waste</div>
                      <div className="text-lg font-bold text-emerald-300">15-20%</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                      <div className="text-blue-400 text-xs mb-1">Duration</div>
                      <div className="text-lg font-bold text-blue-300">&lt;100ms</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Sparkles className="w-3 h-3" />
                    <span>Deterministic • Auditable • Constitutional</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Intelligence Dashboard */}
        <div className="w-96 bg-slate-900/50 border-l border-slate-700/30 flex flex-col backdrop-blur-sm">
          {/* Panel Header */}
          <div className="h-16 border-b border-slate-700/30 flex items-center px-6 justify-between">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Intelligence Hub
            </h3>
            <div className="flex gap-1">
              {['Properties', '3D', 'BOM'].map((tab, i) => (
                <button key={tab} className={`px-3 py-1 text-xs rounded-lg transition-all duration-300 ${
                  i === 0 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Preview Window */}
          {show3DPreview && (
            <div className="h-64 border-b border-slate-700/30 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Box className="w-16 h-16 text-slate-600 mx-auto mb-3 animate-pulse" />
                  <div className="text-sm text-slate-500">3D Preview Loading...</div>
                  <div className="text-xs text-slate-600 mt-1">Three.js Renderer</div>
                </div>
              </div>
              {/* Scan line effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent animate-pulse" />
            </div>
          )}

          {/* Validation Status */}
          <div className="p-6 border-b border-slate-700/30">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Validation Status</span>
            </div>
            
            <div className="space-y-2">
              {[
                { label: 'Grid dimensions', status: 'valid' },
                { label: 'Profile assignments', status: 'valid' },
                { label: 'Hardware compatibility', status: 'valid' },
                { label: 'Thermal performance', status: 'warning' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'valid' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                </div>
              ))}
            </div>
          </div>

          {/* BOM Preview */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex items-center gap-2 mb-4">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Bill of Materials</span>
            </div>
            
            <div className="space-y-3">
              {[
                { category: 'Profiles', qty: '17.6m', value: '€890', color: 'blue' },
                { category: 'Glass', qty: '3.84m²', value: '€768', color: 'cyan' },
                { category: 'Hardware', qty: '12 pcs', value: '€456', color: 'cyan' },
                { category: 'Accessories', qty: '8 pcs', value: '€124', color: 'amber' }
              ].map(item => (
                <div key={item.category} className={`bg-gradient-to-r from-${item.color}-500/5 to-transparent border border-${item.color}-500/20 rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">{item.category}</span>
                    <span className={`text-xs text-${item.color}-400`}>{item.qty}</span>
                  </div>
                  <div className="text-lg font-bold text-slate-100">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Total Project Value</span>
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-400">€2,438</div>
              <div className="text-xs text-slate-500 mt-1">Including 14% VAT</div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="p-6 border-t border-slate-700/30 bg-slate-900/80">
            <div className="grid grid-cols-2 gap-2">
              <button className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all duration-300 border border-slate-700">
                Export DXF
              </button>
              <button className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all duration-300 border border-slate-700">
                Export Excel
              </button>
              <button className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all duration-300 border border-slate-700">
                Export PDF
              </button>
              <button className="px-3 py-2 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-semibold rounded-lg transition-all duration-300">
                Send to CNC
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prestige Status Bar */}
      <div className="h-10 bg-gradient-to-r from-slate-900 via-amber-900/10 to-slate-900 border-t border-amber-500/20 flex items-center px-8 text-xs justify-between backdrop-blur-xl">
        <div className="flex items-center gap-6 text-slate-500">
          <span className="flex items-center gap-2">
            <Gem className="w-3 h-3 text-amber-400" />
            AICS-001 v1.0.0 Certified
          </span>
          <span className="text-slate-700">|</span>
          <span>99.8% Accuracy Framework</span>
          <span className="text-slate-700">|</span>
          <span>Tier 3 Protected Determinism</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-medium">System Active</span>
          </div>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">Response: 47ms</span>
        </div>
      </div>
    </div>
  );
};

export default AlmonaPrestigeUltra;