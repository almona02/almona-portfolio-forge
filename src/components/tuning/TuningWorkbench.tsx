/**
 * Tuning Workbench
 * 
 * Main UI shell for the System Tuning Studio - 3-pane layout integrating
 * Micron Parameter Panel, Validation Sandbox, and Role Tagger.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MicronParameterPanel } from './MicronParameterPanel';
import { ValidationSandbox } from './ValidationSandbox';
import { RoleManager } from './RoleManager';
import type { MutableSystemPack, MicronParameters, ValidationReport } from '@/types/tuning';
import { DEFAULT_MICRON_PARAMS, DEFAULT_CONSTRAINTS } from '@/types/tuning';
import { getPilotSystem } from '@/data/pilot-systems';
import { SYSTEM_GALLERY_DATA } from '@/data/systemGallery';

export const TuningWorkbench: React.FC = () => {
  const [searchParams] = useSearchParams();
  const systemId = searchParams.get('systemId');
  
  // Workbench State
  const [activeTab, setActiveTab] = useState<'roles' | 'micron' | 'validation'>('micron');
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

  // Initialize System from URL parameter or create new
  const [system, setSystem] = useState<MutableSystemPack>(() => {
    // Try to load from Gallery if systemId provided
    if (systemId) {
      const gallerySystem = SYSTEM_GALLERY_DATA.find(s => s.id === systemId);
      const pilotSystem = getPilotSystem(systemId as any);
      
      if (gallerySystem || pilotSystem) {
        const category = gallerySystem?.category === 'upvc' ? 'upvc' : 'aluminum';
        return {
          meta: {
            id: gallerySystem?.id || pilotSystem?.id || 'new-system',
            name: gallerySystem?.name || pilotSystem?.name || 'New System',
            brands: [gallerySystem?.manufacturer || 'Custom'],
            regions: ['egypt'],
            defaultStockLengthMm: 6000,
            tuningStatus: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          windowSystemSpec: {
            window_system: gallerySystem?.name || pilotSystem?.name || 'Custom System',
            category: category,
          },
          micronConfig: DEFAULT_MICRON_PARAMS[category],
          constraints: {
            ...DEFAULT_CONSTRAINTS,
            minWidthMm: 400,
            maxWidthMm: 3000,
            minHeightMm: 400,
            maxHeightMm: 3000,
          },
          profiles: [],
          hardwareIds: [],
        };
      }
    }
    
    // Default new system
    return {
      meta: {
        id: 'new-system',
        name: 'New Custom System',
        brands: ['Custom'],
        regions: ['egypt'],
        defaultStockLengthMm: 6000,
        tuningStatus: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      windowSystemSpec: {
        window_system: 'Custom System',
        category: 'aluminum',
      },
      micronConfig: DEFAULT_MICRON_PARAMS.aluminum,
      constraints: DEFAULT_CONSTRAINTS,
      profiles: [],
      hardwareIds: [],
    };
  });

  // Update system when URL parameter changes
  useEffect(() => {
    if (systemId) {
      const gallerySystem = SYSTEM_GALLERY_DATA.find(s => s.id === systemId);
      const pilotSystem = getPilotSystem(systemId as any);
      
      if (gallerySystem || pilotSystem) {
        const category = gallerySystem?.category === 'upvc' ? 'upvc' : 'aluminum';
        setSystem(prev => ({
          ...prev,
          meta: {
            ...prev.meta,
            id: gallerySystem?.id || pilotSystem?.id || prev.meta.id,
            name: gallerySystem?.name || pilotSystem?.name || prev.meta.name,
            brands: [gallerySystem?.manufacturer || 'Custom'],
            updatedAt: new Date(),
          },
          windowSystemSpec: {
            ...prev.windowSystemSpec,
            window_system: gallerySystem?.name || pilotSystem?.name || prev.windowSystemSpec.window_system,
            category: category,
          },
          micronConfig: DEFAULT_MICRON_PARAMS[category],
        }));
      }
    }
  }, [systemId]);

  // Handlers
  const handleMicronChange = (newConfig: MicronParameters) => {
    setSystem(prev => ({
      ...prev,
      micronConfig: newConfig,
      meta: {
        ...prev.meta,
        tuningStatus: prev.meta.tuningStatus === 'draft' ? 'tuned' : prev.meta.tuningStatus,
        updatedAt: new Date(),
      },
    }));
  };

  const handleValidationComplete = (report: ValidationReport) => {
    setValidationReport(report);
    if (report.status === 'passed') {
      setSystem(prev => ({
        ...prev,
        validationReport: report,
        meta: {
          ...prev.meta,
          tuningStatus: 'validated',
          goldTierVerified: report.passRate >= 99.8,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        },
      }));
    } else {
      setSystem(prev => ({
        ...prev,
        validationReport: report,
        meta: {
          ...prev.meta,
          tuningStatus: 'tuned',
          updatedAt: new Date(),
        },
      }));
    }
  };

  const handleSave = () => {
    // TODO: Save to backend/localStorage
    console.log('Saving system pack:', system);
    alert('System pack saved! (Backend integration pending)');
  };

  const systemCategory = system.windowSystemSpec?.category === 'upvc' ? 'upvc' : 'aluminum';

  return (
    <div className="h-screen flex flex-col bg-gray-50" dir="rtl">
      
      {/* Header */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#003366] text-white rounded-lg flex items-center justify-center font-bold text-xl">
            ⚙️
          </div>
          <div>
            <h1 className="font-bold text-gray-800 font-cairo">استوديو ضبط الأنظمة</h1>
            <p className="text-xs text-gray-500">System Tuning Studio • {system.meta.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            system.meta.tuningStatus === 'validated' 
              ? 'bg-green-100 text-green-700' 
              : system.meta.tuningStatus === 'tuned'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {system.meta.tuningStatus}
          </span>
          {validationReport && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              validationReport.passRate >= 99.8
                ? 'bg-[#FFD700] text-[#003366]'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {validationReport.passRate.toFixed(1)}%
            </span>
          )}
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-[#003366] text-white rounded-lg font-bold text-sm hover:bg-[#004488] transition-colors"
          >
            Save & Publish
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Navigation */}
        <aside className="w-64 bg-white border-l flex flex-col shadow-sm">
          <nav className="p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('roles')}
              className={`w-full text-right px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'roles' 
                  ? 'bg-blue-50 text-[#003366] border-2 border-[#003366]' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>1. Profile Roles</span>
                {system.profiles.length > 0 && (
                  <span className="text-xs text-green-500">{system.profiles.length}</span>
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('micron')}
              className={`w-full text-right px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'micron' 
                  ? 'bg-blue-50 text-[#003366] border-2 border-[#003366]' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>2. Micron Parameters</span>
                {system.meta.tuningStatus !== 'draft' && (
                  <span className="text-green-500">✓</span>
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('validation')}
              className={`w-full text-right px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'validation' 
                  ? 'bg-blue-50 text-[#003366] border-2 border-[#003366]' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>3. Validation Sandbox</span>
                {validationReport && (
                  <span className={`text-xs ${
                    validationReport.passRate >= 99.8 ? 'text-green-500' : 'text-yellow-500'
                  }`}>
                    {validationReport.passRate.toFixed(0)}%
                  </span>
                )}
              </div>
            </button>
          </nav>

          {/* System Info Card */}
          <div className="mt-auto p-4 border-t bg-gray-50">
            <div className="text-xs text-gray-500 mb-2">System Info</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-bold">{systemCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Profiles:</span>
                <span className="font-bold">{system.profiles.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Constraints:</span>
                <span className="font-mono text-xs">
                  {system.constraints.minWidthMm}-{system.constraints.maxWidthMm}mm
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Pane: Canvas (Digital Twin Visualization) */}
        <main className="flex-1 bg-[#f0f2f5] p-8 flex items-center justify-center relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-5 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#003366 1px, transparent 1px)', 
              backgroundSize: '20px 20px' 
            }}
          />
          
          {system.profiles.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border p-8 max-w-2xl w-full text-center">
              <div className="text-6xl mb-4">🛠️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 font-cairo">لوحة العمل</h2>
              <p className="text-gray-500 mb-4">
                Select a tool from the navigation panel to configure your system pack.
              </p>
              <p className="text-xs text-gray-400" dir="rtl">
                ابدأ باستيراد ملفات DXF وتعيين الأدوار للمقاطع
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border p-6 max-w-4xl w-full">
              <h2 className="text-lg font-bold text-gray-800 mb-4 font-cairo">System Profiles Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {system.profiles.map(profile => (
                  <div key={profile.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="font-bold text-sm text-gray-800 mb-1">{profile.name}</div>
                    <div className="text-xs text-gray-500 mb-2">
                      {profile.width} × {profile.height}mm
                    </div>
                    {profile.profileRole && (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded uppercase font-bold">
                        {profile.profileRole}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Quick Stats */}
              {validationReport && (
                <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t">
                  <div>
                    <div className="text-2xl font-mono font-bold text-[#003366]">
                      {validationReport.passRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Pass Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-mono font-bold text-green-600">
                      {validationReport.passedTests}
                    </div>
                    <div className="text-xs text-gray-500">Passed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-mono font-bold text-red-600">
                      {validationReport.failedTests}
                    </div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Pane: Properties (Dynamic based on Tab) */}
        <aside className="w-96 bg-white border-r flex flex-col overflow-y-auto shadow-xl z-10">
          <div className="p-6">
            {activeTab === 'micron' && (
              <MicronParameterPanel 
                params={system.micronConfig} 
                category={systemCategory}
                onChange={handleMicronChange}
                systemName={system.meta.name}
              />
            )}
            
            {activeTab === 'validation' && (
              <ValidationSandbox 
                systemPack={system}
                onValidationComplete={handleValidationComplete}
              />
            )}

            {activeTab === 'roles' && (
              <RoleManager 
                system={system}
                onSystemUpdate={setSystem}
              />
            )}
          </div>
        </aside>

      </div>
    </div>
  );
};

