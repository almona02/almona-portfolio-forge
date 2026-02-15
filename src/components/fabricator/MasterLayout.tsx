/**
 * Master Layout Component - ALMONA Dark Gold Prestige Ultra
 * 
 * Ultra-prestige layout matching Orgadata/Klaes/iWindow/Moxisys standards:
 * - 80px Luxury Top Bar (ALMONA branding, project info, actions)
 * - 80px Elite Progress Stepper (5 phases with visual indicators)
 * - 3-Column Main Workspace (280px | flex | 400px)
 * - 40px Prestige Status Bar (Constitutional badge, live metrics)
 * 
 * Constitutional: Deterministic layout, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { PrestigeCrownLogo } from '@/components/ui/PrestigeCrownLogo';
import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { FabricatorContextProvider } from '@/contexts/FabricatorContextProvider';
import {
    Box,
    Crown,
    FileCheck,
    Gem,
    Grid3x3,
    Settings,
    Shield,
    Sparkles,
    TrendingUp,
    Zap
} from 'lucide-react';
import React, { ReactNode, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { UniversalNavSidebar } from './layout/UniversalNavSidebar';
import { UNIFIED_STAGES, isUnifiedWorkflowEnabled } from './unifiedWorkflow/unifiedStages';
// Dynamic import for heavy 3D component
const Window3DGenerator = React.lazy(() => import('@/components/fabricator/Window3DGenerator'));
// Dynamic import for NotificationCenter
const NotificationCenter = React.lazy(() => import('@/core/notifications/NotificationCenter.tsx').then(m => ({ default: m.NotificationCenter })));

// Notification Center Wrapper Component
const NotificationCenterWrapper: React.FC = () => {
  const { user } = useAuth();
  
  if (!user?.id) {
    return null;
  }
  
  return (
    <Suspense fallback={null}>
      <NotificationCenter userId={user.id} variant="popover" />
    </Suspense>
  );
};

interface MasterLayoutProps {
  children?: ReactNode;
  currentPhase?: 'design' | 'configure' | 'validate' | 'optimize' | 'export';
  showRightPanel?: boolean;
  onPhaseChange?: (phase: string) => void;
  // Project data
  projectName?: string;
  clientName?: string;
  // Sidebar data
  projectStats?: {
    totalUnits?: number;
    openings?: number;
    area?: string;
    value?: string;
  };
  systemPack?: {
    name: string;
    code: string;
    description: string;
    thermal?: string;
  };
  profiles?: Array<{
    role: string;
    code: string;
    color: 'blue' | 'amber' | 'emerald' | 'cyan';
  }>;
  // Right panel data
  _show3DPreview?: boolean; // Reserved for future use
  _onToggle3DPreview?: () => void; // Reserved for future use
  validationItems?: Array<{
    label: string;
    status: 'valid' | 'warning' | 'error';
  }>;
  bomItems?: Array<{
    category: string;
    qty: string;
    value: string;
    color: 'blue' | 'cyan' | 'amber';
  }>;
  totalProjectValue?: string;
  // Canvas toolbar
  canvasToolbar?: ReactNode;
  canvasContent?: ReactNode;
  // Internal mocks/previews
  _projectStats?: any;
  _systemPack?: any;
  _profiles?: any;
}

// Legacy phases (backward compatible)
const LEGACY_PHASES = [
  { id: 'design', name: 'Design', icon: Grid3x3, order: 1 },
  { id: 'configure', name: 'Configure', icon: Settings, order: 2 },
  { id: 'validate', name: 'Validate', icon: Shield, order: 3 },
  { id: 'optimize', name: 'Optimize', icon: Zap, order: 4 },
  { id: 'export', name: 'Export', icon: FileCheck, order: 5 }
];

// Use unified stages if enabled, otherwise legacy phases
const getPhases = () => {
  if (isUnifiedWorkflowEnabled()) {
    return UNIFIED_STAGES.map(stage => ({
      id: stage.id,
      name: stage.name,
      icon: stage.icon,
      order: stage.order
    }));
  }
  return LEGACY_PHASES;
};

export const MasterLayout: React.FC<MasterLayoutProps> = ({
  children,
  currentPhase = 'design',
  showRightPanel = true,
  onPhaseChange,
  projectName = '',
  clientName = '',
  _projectStats = {
    totalUnits: 24,
    openings: 6,
    area: '3.84m²',
    value: '€2.4K'
  },
  _systemPack = {
    name: 'Caluminium PS v3',
    code: 'PS',
    description: 'Premium Series 60mm',
    thermal: 'U=1.2'
  },
  _profiles = [
    { role: 'Frame', code: 'CAL-FR-001', color: 'blue' },
    { role: 'Sash', code: 'CAL-SA-002', color: 'amber' },
    { role: 'Mullion', code: 'CAL-MU-003', color: 'emerald' },
    { role: 'Transom', code: 'CAL-TR-004', color: 'amber' }
  ],
  _show3DPreview = true,
  _onToggle3DPreview,
  validationItems = [
    { label: 'Grid dimensions', status: 'valid' },
    { label: 'Profile assignments', status: 'valid' },
    { label: 'Hardware compatibility', status: 'valid' },
    { label: 'Thermal performance', status: 'warning' }
  ],
  bomItems = [
    { category: 'Profiles', qty: '17.6m', value: '€890', color: 'blue' },
    { category: 'Glass', qty: '3.84m²', value: '€768', color: 'cyan' },
    { category: 'Hardware', qty: '12 pcs', value: '€456', color: 'amber' },
    { category: 'Accessories', qty: '8 pcs', value: '€124', color: 'amber' }
  ],
  totalProjectValue = '€2,438',
  canvasToolbar,
  canvasContent
}) => {
  const [rightPanelOpen] = useState(showRightPanel);
  const [activeTab, setActiveTab] = useState<'properties' | '3d' | 'bom'>('properties');
  const [showAlgorithmPanel, setShowAlgorithmPanel] = useState(false);
  const [isAlgorithmPanelVisible, setIsAlgorithmPanelVisible] = useState(false);
  const location = useLocation();
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { state: workspaceState } = useFabricatorWorkspace();
  const [isPro3D] = useState<boolean>(true);

  // Get phases based on unified mode
  const phases = React.useMemo(() => getPhases(), []);
  const currentPhaseIndex = phases.findIndex(p => p.id === currentPhase);
  
  // Check if we're on a workflow page (design phase or after)
  // Intelligence Hub should only be visible on workflow pages (design and after)
  // Only show workflow UI on actual workflow routes, not on general fabricator pages like /projects, /customers, etc.
  const isWorkflowPage = location.pathname.includes('/fabricator/workflow/') || 
                         location.pathname.includes('/fabricator-workflow');
  const isGeneralFabricatorPage = location.pathname.startsWith('/fabricator/') && 
                                   !location.pathname.includes('/fabricator/workflow/') &&
                                   !location.pathname.includes('/fabricator-workflow');
  const isDesignOrAfter = currentPhaseIndex >= 0; // design is index 0, so any phase >= 0 means design or after
  const shouldShowIntelligenceHub = isWorkflowPage && isDesignOrAfter && rightPanelOpen;
  
  // Hide workflow stepper and project intelligence panel on non-workflow pages
  // Don't show on general fabricator pages like /fabricator/projects, /fabricator/customers, etc.
  const shouldShowWorkflowStepper = isWorkflowPage && !isGeneralFabricatorPage;
  // Check if we're in measuring phase (should not show design toolbar)
  // The toolbar should only show in Design/Engineering Bay phase, not in Measuring
  const isMeasuringRoute = location.pathname.includes('/fabricator-workflow') && 
                           !location.pathname.includes('/fabricator/workflow/engineering-bay') &&
                           !location.pathname.includes('/fabricator/workflow/quality-control');
  const isDesignRoute = location.pathname.includes('/fabricator/workflow/engineering-bay') || 
                        location.pathname.includes('/fabricator/workflow/quality-control');
  // Only show design toolbar on actual design/engineering-bay routes, not on general pages
  const shouldShowDesignToolbar = shouldShowWorkflowStepper && 
                                   currentPhase === 'design' && 
                                   isDesignRoute && 
                                   !isMeasuringRoute &&
                                   !isGeneralFabricatorPage;
  
  // Handler for Save Draft button
  const handleSaveDraft = useCallback(() => {
    try {
      // Save current workflow state to localStorage
      const draftState = {
        currentPhase,
        projectName,
        clientName,
        timestamp: new Date().toISOString(),
        pathname: location.pathname,
      };
      localStorage.setItem('almona-workflow-draft', JSON.stringify(draftState));
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft');
    }
  }, [currentPhase, projectName, clientName, location.pathname]);

  // Handler for Continue button - advances to next phase
  const handleContinue = useCallback(() => {
    if (!onPhaseChange) {
      toast.warning('Phase change handler not available');
      return;
    }
    
    const nextPhaseIndex = currentPhaseIndex + 1;
    if (nextPhaseIndex < phases.length) {
      const nextPhase = phases[nextPhaseIndex];
      onPhaseChange(nextPhase.id);
      toast.success(`Moving to ${nextPhase.name} phase`);
    } else {
      toast.info('Already on the last phase');
    }
  }, [onPhaseChange, currentPhaseIndex, phases]);
  
  // Check if Continue button should be enabled (not on last phase)
  const canContinue = currentPhaseIndex >= 0 && currentPhaseIndex < phases.length - 1;
  
  // Check if we're on optimization page or phase
  const isOptimizationActive = currentPhase === 'optimize' || 
                                location.pathname.includes('optimization') ||
                                location.pathname.includes('optimize');

  // Auto-hide algorithm panel after 5 seconds
  useEffect(() => {
    if (isOptimizationActive && isAlgorithmPanelVisible) {
      // Clear existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      // Set new timeout to hide after 5 seconds
      hideTimeoutRef.current = setTimeout(() => {
        setIsAlgorithmPanelVisible(false);
      }, 5000);
    } else {
      // Clear timeout if not in optimization
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      setIsAlgorithmPanelVisible(false);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isOptimizationActive, isAlgorithmPanelVisible]);

  // Show panel when optimization starts
  useEffect(() => {
    if (isOptimizationActive) {
      setIsAlgorithmPanelVisible(true);
    }
  }, [isOptimizationActive]);

  // Extract page title and description logic
  const pageTitle = React.useMemo(() => {
    if (shouldShowWorkflowStepper) {
      return projectName;
    }
    
    if (isGeneralFabricatorPage) {
      if (location.pathname.includes('/projects')) return 'Projects & Positions';
      if (location.pathname.includes('/customers')) return 'Customer Management';
      if (location.pathname.includes('/inventory')) return 'Inventory Management';
      if (location.pathname.includes('/profiles')) return 'Profile Management';
      if (location.pathname.includes('/commercial')) return 'Commercial & Pricing';
      if (location.pathname.includes('/reports')) return 'Reports & Analytics';
    }
    
    return 'Fabricator Workspace';
  }, [shouldShowWorkflowStepper, isGeneralFabricatorPage, location.pathname, projectName]);

  const pageDescription = React.useMemo(() => {
    if (shouldShowWorkflowStepper) {
      return `Client: ${clientName}`;
    }
    
    if (isGeneralFabricatorPage) {
      if (location.pathname.includes('/projects')) return 'Manage your fabrication projects';
      if (location.pathname.includes('/customers')) return 'Customer database and contacts';
      if (location.pathname.includes('/inventory')) return 'Stock and material management';
      if (location.pathname.includes('/profiles')) return 'Profile library and specifications';
      if (location.pathname.includes('/commercial')) return 'Quotes, invoices, and payments';
      if (location.pathname.includes('/reports')) return 'Business intelligence and analytics';
    }
    
    return 'Project Management';
  }, [shouldShowWorkflowStepper, isGeneralFabricatorPage, location.pathname, clientName]);

  return (
    <FabricatorContextProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        {/* Universal Navigation Sidebar */}
        <UniversalNavSidebar />
      
      {/* Main Layout Content - Existing MasterLayout structure */}
      <div className="flex flex-col flex-1 h-screen bg-[#0a0a0a] font-sans text-amber-200 overflow-hidden relative">
      {/* Classical Textured Background */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `
          radial-gradient(circle at 2px 2px, rgba(245, 158, 11, 0.15) 1px, transparent 0),
          linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.03) 50%, transparent 100%),
          linear-gradient(0deg, transparent 0%, rgba(245, 158, 11, 0.03) 50%, transparent 100%)
        `,
        backgroundSize: '40px 40px, 200px 200px, 200px 200px',
        backgroundPosition: '0 0, 0 0, 0 0'
      }} />
      
      {/* Ornate Border Frame */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Border with Pediment */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-8 border-t border-x border-amber-600/50 rounded-t-lg" />
        
        {/* Side Pillars */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-600/30 via-amber-500/20 to-amber-600/30" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-600/30 via-amber-500/20 to-amber-600/30" />
        
        {/* Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
      </div>

      {/* ===== LUXURY TOP BAR (Compact 56px) ===== */}
      <div className="h-14 border-b border-amber-600/40 flex items-center px-4 justify-between relative overflow-hidden z-10 card-glass-dark">
        {/* Classical texture overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(245, 158, 11, 0.1) 2px, rgba(245, 158, 11, 0.1) 4px)'
        }} />
        
        {/* Animated background gradient - minimized to thin line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent animate-pulse pointer-events-none" />
        
        {/* Left Section: Logo + Title */}
        <div className="flex items-center gap-4 relative z-10 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <PrestigeCrownLogo 
              size={28} 
              className="flex-shrink-0" 
            />
            <div className="flex-shrink-0 flex flex-col justify-center">
              <div className="text-lg font-bold text-amber-400 tracking-wider text-shadow-glow-subtle leading-none">
                ALMONA
              </div>
              <div className="text-[10px] text-amber-600/90 tracking-[0.2em] uppercase font-semibold leading-none mt-0.5">Prestige Edition</div>
            </div>
          </div>
          
          <div className="h-6 w-px bg-gradient-to-b from-transparent via-amber-600/60 to-transparent flex-shrink-0" />
          
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <div className="text-xs text-amber-200 font-medium truncate leading-tight">{pageTitle}</div>
            <div className="text-[10px] text-amber-600/70 truncate leading-tight">{pageDescription}</div>
          </div>
        </div>
        
        {/* Right Section: Actions + Badge */}
        <div className="flex items-center gap-3 relative z-10 flex-shrink-0">
          {/* Notification Center - Gold Tier Feature */}
          <NotificationCenterWrapper />
          
          <div className="flex items-center gap-1.5 px-2 py-1 card-dark rounded">
            <Gem className="w-3 h-3 text-amber-400 text-shadow-glow flex-shrink-0" />
            <span className="text-xs text-amber-200 font-semibold tracking-wide whitespace-nowrap">AICS-001</span>
          </div>
          
          {shouldShowWorkflowStepper && (
            <>
              <button 
                onClick={handleSaveDraft}
                className="btn-secondary text-xs whitespace-nowrap px-3 py-1.5 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title="Save current progress"
              >
                Save
              </button>
              <button 
                onClick={handleContinue}
                disabled={!canContinue}
                className="btn-primary-gradient text-xs px-4 py-1.5 whitespace-nowrap transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title={canContinue ? "Continue to next phase" : "Already on the last phase"}
              >
                Continue →
              </button>
            </>
          )}
        </div>
      </div>


      {/* ===== PREMIUM WORKSPACE ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===== CENTER CANVAS - Premium Design Space ===== */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] relative overflow-hidden">
          {/* Classical textured grid pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: `
              radial-gradient(circle at 2px 2px, rgba(245, 158, 11, 0.2) 1px, transparent 0),
              repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(245, 158, 11, 0.05) 2px, rgba(245, 158, 11, 0.05) 4px)
            `,
            backgroundSize: '40px 40px, 100px 100px'
          }} />

          {/* Premium Toolbar - Only show in Design phase (not in Measuring) */}
          {shouldShowDesignToolbar && canvasToolbar && (
            <div className="h-16 -xl border-b border-amber-600/30 flex items-center px-6 gap-4 relative z-10 card-glass-dark">
              {canvasToolbar}
            </div>
          )}

          {/* Canvas Area - Engineering Bay controls its own padding/scroll */}
          <div className={`flex-1 flex flex-col ${
              location.pathname.includes('/engineering-bay') ? 'p-0' : (shouldShowWorkflowStepper ? 'p-8' : 'p-4')
          } overflow-hidden relative z-10`}>
            <div className={`flex-1 flex flex-col ${
                location.pathname.includes('/engineering-bay') 
                    ? 'overflow-hidden' // Delegate to component
                    : (location.pathname.includes('/reports') || location.pathname.includes('/inventory') ? 'overflow-y-auto' : 'overflow-hidden')
            }`}>
              {canvasContent || children || <Outlet /> || (
              <div className="max-w-5xl mx-auto">
                <div className="card-premium p-12 relative overflow-hidden">
                  {/* Classical corner accents with ornate design */}
                  <div className="absolute top-0 left-0 w-32 h-32">
                    <div className="absolute top-0 left-0 w-24 h-24 border-t border-l border-amber-600/50 rounded-tl-lg" />
                    <div className="absolute top-2 left-2 w-20 h-20 border-t border-l border-amber-500/30" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-32 h-32">
                    <div className="absolute bottom-0 right-0 w-24 h-24 border-b border-r border-amber-600/50 rounded-br-lg" />
                    <div className="absolute bottom-2 right-2 w-20 h-20 border-b border-r border-amber-500/30" />
                  </div>
                  
                  {/* Grid Visualization */}
                  <div className="grid grid-cols-3 grid-rows-2 gap-3 aspect-[3/2] relative">
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={i}
                        className="btn-secondary-dark"
                      >
                        {/* Classical shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="text-center">
                            <div className="text-sm font-bold text-amber-300 mb-1 text-shadow-glow">Opening {i + 1}</div>
                            <div className="text-xs text-amber-600/70">Click to configure</div>
                          </div>
                        </div>
                        
                        {/* Classical corner indicators */}
                        <div className="absolute top-2 left-2 w-3 h-3 border-t border-l rounded-tl card-premium" />
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r rounded-br card-premium" />
                      </div>
                    ))}
                  </div>

                  {/* Dimension Labels */}
                  <div className="mt-6 flex justify-between text-sm text-amber-600/80">
                    <span className="flex items-center gap-2">
                      <div className="btn-working-green" />
                      800mm per column
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="btn-working-green" />
                      800mm per row
                    </span>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

        </div>

        {/* ===== RIGHT PANEL (400px) - Intelligence Dashboard ===== */}
        {shouldShowIntelligenceHub && (
          <div className="hidden xl:flex w-80 2xl:w-96 border-l-2 flex-col relative z-10 card-glass-dark flex-shrink-0">
            {/* Side pillar decoration */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-600/20 via-amber-500/10 to-amber-600/20" />
            {/* Panel Header */}
            <div className="h-16 border-b border-amber-600/30 flex items-center px-6 justify-between">
              <h3 className="typography-h3 text-sm text-amber-300 tracking-[0.15em] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500 text-shadow-glow" />
                Intelligence Hub
              </h3>
              <div className="flex gap-1">
                {['Properties', '3D', 'BOM'].map((tab, i) => {
                  const tabId = i === 0 ? 'properties' : i === 1 ? '3d' : 'bom';
                  return (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tabId as any)}
                      className={`px-3 py-1 text-xs rounded border transition-all duration-300 ${
                        activeTab === tabId
                          ? 'bg-[#1a1a1a]/80 text-amber-300 border-amber-600/50 shadow-glow' 
                          : 'text-amber-600/60 hover:text-amber-500 border-amber-600/20 hover:border-amber-500/40'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3D Preview Window */}
            {activeTab === '3d' && (
              <div className="h-64 border-b border-amber-600/30 bg-[#0a0a0a] relative overflow-hidden">
                {workspaceState.currentProject ? (
                  <React.Suspense fallback={
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b border-amber-500 mx-auto mb-2"></div>
                        <div className="text-sm text-amber-600/70">Loading 3D Preview...</div>
                      </div>
                    </div>
                  }>
                    <Window3DGenerator
                      windowUnit={workspaceState.currentProject}
                      profiles={[]}
                      showControls={false}
                      presentationMode={false}
                      showErrorDetection={false}
                      mode={isPro3D ? 'pro' : 'standard'}
                    />
                  </React.Suspense>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Box className="w-16 h-16 text-amber-600/40 mx-auto mb-3 animate-pulse" />
                      <div className="text-sm text-amber-600/70">3D Preview Loading...</div>
                      <div className="text-xs text-amber-600/50 mt-1">Three.js Renderer</div>
                    </div>
                  </div>
                )}
                {/* Classical scan line effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-600/10 to-transparent animate-pulse pointer-events-none" />
              </div>
            )}

            {/* Validation Status */}
            {activeTab === 'properties' && (
              <div className="p-6 border-b border-amber-600/20">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-amber-500 text-shadow-glow" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-[0.15em]">Validation Status</span>
                </div>
                
                <div className="space-y-2">
                  {validationItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 card-dark rounded">
                      <span className="text-sm text-amber-200 font-medium">{item.label}</span>
                      <span className={`${item.status === 'valid' ? 'status-valid-dot' : item.status === 'warning' ? 'status-warning-dot' : 'status-error-dot'}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BOM Preview */}
            {activeTab === 'bom' && (
              <div className="flex-1 p-6 overflow-auto">
                <div className="flex items-center gap-2 mb-4">
                  <FileCheck className="w-4 h-4 text-amber-500 text-shadow-glow" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-[0.15em]">Bill of Materials</span>
                </div>
                
                <div className="space-y-3">
                  {bomItems.map(item => (
                    <div key={item.category} className="card-dark p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-amber-200">{item.category}</span>
                        <span className="text-xs text-amber-500 font-semibold">{item.qty}</span>
                      </div>
                      <div className="text-lg font-bold text-amber-400 text-shadow-glow-strong">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 card-dark shadow-glow-strong">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-amber-600/80 font-semibold">Total Project Value</span>
                    <Crown className="w-5 h-5 text-amber-500 text-shadow-glow-strong" />
                  </div>
                  <div className="text-3xl font-bold text-amber-400 text-shadow-glow-intense">{totalProjectValue}</div>
                  <div className="text-xs text-amber-600/70 mt-1">Including 14% VAT</div>
                </div>
              </div>
            )}

            {/* Export Actions */}
            <div className="p-6 border-t border-amber-600/30 -sm card-glass-dark">
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-secondary-dark text-xs px-3 py-2">
                  Export DXF
                </button>
                <button className="btn-secondary-dark text-xs px-3 py-2">
                  Export Excel
                </button>
                <button className="btn-secondary-dark text-xs px-3 py-2">
                  Export PDF
                </button>
                <button className="btn-primary-gradient text-xs px-3 py-2">
                  Send to CNC
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== PRESTIGE STATUS BAR (Minimal 32px) ===== */}
      <div className="h-8 border-t flex items-center px-4 text-[10px] justify-between -xl relative z-10 card-glass-dark">
        {/* Decorative horizontal bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-0.5 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
        
        <div className="flex items-center gap-4 text-amber-600/80">
          <span className="flex items-center gap-1.5">
            <Gem className="w-2.5 h-2.5 text-amber-500 text-shadow-glow" />
            <span className="font-semibold">AICS-001 v1.0.0</span>
          </span>
          <span className="text-amber-600/30">|</span>
          <span className="font-medium">99.8% Accuracy</span>
          <span className="text-amber-600/30">|</span>
          <span className="font-medium">Tier 3 Determinism</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Algorithm Panel - Only visible during optimization */}
          {isOptimizationActive && (
            <div 
              className={`transition-all duration-500 overflow-hidden ${
                isAlgorithmPanelVisible 
                  ? 'max-w-md opacity-100' 
                  : 'max-w-0 opacity-0'
              }`}
              onMouseEnter={() => {
                if (hideTimeoutRef.current) {
                  clearTimeout(hideTimeoutRef.current);
                }
                setIsAlgorithmPanelVisible(true);
              }}
              onMouseLeave={() => {
                if (hideTimeoutRef.current) {
                  clearTimeout(hideTimeoutRef.current);
                }
                hideTimeoutRef.current = setTimeout(() => {
                  setIsAlgorithmPanelVisible(false);
                }, 2000);
              }}
            >
              <div className="flex items-center gap-3 px-4 py-1.5 card-dark rounded border border-amber-600/30">
                <div className="w-5 h-5 bg-gradient-to-br from-amber-600 to-amber-500 rounded border border-amber-400/50 flex items-center justify-center shadow-glow-premium flex-shrink-0">
                  <Zap className="w-2.5 h-2.5 text-[#0a0a0a]" />
                </div>
                <div className="flex-shrink-0">
                  <div className="text-[9px] text-amber-500 uppercase tracking-[0.1em] font-bold leading-tight">Algorithm</div>
                  <div className="text-[10px] font-bold text-amber-200 leading-tight">Greedy Heuristic</div>
                </div>
                {showAlgorithmPanel && (
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-amber-600/30">
                    <div className="text-[9px] text-amber-400 font-semibold">Waste: 15-20%</div>
                    <span className="text-amber-600/30">|</span>
                    <div className="text-[9px] text-amber-400 font-semibold">&lt;100ms</div>
                  </div>
                )}
                <button
                  onClick={() => setShowAlgorithmPanel(!showAlgorithmPanel)}
                  className="ml-2 text-amber-600/70 hover:text-amber-400 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-amber-400 font-bold">System Active</span>
          </div>
          <span className="text-amber-600/30">|</span>
          <span className="text-amber-600/70 font-medium">47ms</span>
        </div>
      </div>
      </div>
      </div>
    </FabricatorContextProvider>
  );
};

/**
 * Layout Content Component - Structured content for master layout
 */
interface LayoutContentProps {
  sidebar?: ReactNode;
  main: ReactNode;
  rightPanel?: ReactNode;
}

export const LayoutContent: React.FC<LayoutContentProps> = ({
  sidebar,
  main,
  rightPanel
}) => {
  return (
    <>
      {sidebar}
      {main}
      {rightPanel}
    </>
  );
};

export default MasterLayout;
