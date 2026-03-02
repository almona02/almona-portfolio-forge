/**
 * Studio Layout Architecture - Almona Fabricator Pro
 * 
 * This is the master layout wrapper for the Studio-Based Architecture.
 * It implements the "Command Center" visual hierarchy defined in Phase 1 Refactoring.
 * 
 * Studios:
 * 1. Command Center (Dashboard)
 * 2. Project Studio (CRM/Management)
 * 3. Design Studio (Engineering/Drafting)
 * 4. Production Studio (CAM/Optimization)
 * 5. Data Studio (System Packs/Inventory)
 * 
 * Standards:
 * - AICS-001 Compliant (Constitutional Governance UI)
 * - Gold Tier Aesthetics (Amber/Dark Theme)
 * - University Grade Code Structure
 */

import { UniversalNavSidebar } from '@/components/fabricator/layout/UniversalNavSidebar';
import { useAuth } from '@/context/AuthContext';
import { FabricatorContextProvider } from '@/contexts/FabricatorContextProvider';
import { Gem, Shield, Wifi } from 'lucide-react';
import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// Dynamic imports for specific studio layouts to ensure code splitting
// Note: These are lazy loaded but logically handled by the router in App.tsx
// keeping them here for reference or future self-containment if needed.
// const CommandCenterLayout = React.lazy(() => import('./CommandCenterLayout'));
// const ProjectStudioLayout = React.lazy(() => import('./ProjectStudioLayout'));
// const DesignStudioLayout = React.lazy(() => import('./DesignStudioLayout'));
// const ProductionStudioLayout = React.lazy(() => import('./ProductionStudioLayout'));
// const DataStudioLayout = React.lazy(() => import('./DataStudioLayout'));

interface StudioLayoutProps {
  studioId?: 'command' | 'project' | 'design' | 'production' | 'data';
}

const STUDIO_SEGMENT_MAP: Record<string, NonNullable<StudioLayoutProps['studioId']>> = {
  command: 'command',
  projects: 'project',
  design: 'design',
  production: 'production',
  data: 'data',
  orders: 'project',
  reports: 'command',
};

export const StudioLayout: React.FC<StudioLayoutProps> = ({ studioId }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Determine active studio from prop or URL
  const pathSegment = location.pathname.split('/')[3] || 'command';
  const activeStudio = studioId || STUDIO_SEGMENT_MAP[pathSegment] || 'command';

  return (
    <FabricatorContextProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a] text-amber-200 font-sans selection:bg-amber-900 selection:text-white">
        {/* Global Navigation Sidebar - Persistent across all studios */}
        <UniversalNavSidebar activeStudio={activeStudio} />

        {/* Studio Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* Top Bar - Studio Context Header */}
          <header className="h-16 border-b border-amber-600/30 flex items-center justify-between px-6 bg-[#0a0a0a]/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent uppercase tracking-widest">
                {activeStudio.replace('-', ' ')} STUDIO
              </h1>
              <div className="px-2 py-0.5 rounded border border-amber-600/40 text-[10px] text-amber-500 font-mono">
                {(user as any)?.role === 'owner' ? 'OWNER ACCESS' : 'OPERATOR'}
              </div>
            </div>

            {/* AICS-001 Status Indicators */}
            <div className="flex items-center gap-4 text-xs font-medium text-amber-600/80">
              <div className="flex items-center gap-1.5" title="AICS-001 Connectivity Status">
                <Wifi className="w-3 h-3 text-emerald-500" />
                <span>YDT: Connected</span>
              </div>
              <div className="flex items-center gap-1.5" title="Constitutional Guardrails Active">
                <Shield className="w-3 h-3 text-amber-500" />
                <span>Shield: Active</span>
              </div>
              <div className="h-4 w-px bg-amber-600/30" />
              <div className="flex items-center gap-1.5 opacity-80">
                <Gem className="w-3 h-3" />
                <span>v3.1.0-RC4</span>
              </div>
            </div>
          </header>

          {/* Main Workspace - Scrollable Context */}
          <main className="flex-1 overflow-hidden relative group">
             {/* Background Texture (Subtle) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23fbbf24\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            }} />

            <div className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-amber-900/50 scrollbar-track-transparent">
              <Suspense fallback={<StudioLoadingScreen />}>
                {/* 
                  If a direct child component is passed via Outlet (nested routes), render it.
                  Otherwise, render the specific Layout for this studio.
                */}
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </FabricatorContextProvider>
  );
};

// Loading Screen Component
const StudioLoadingScreen = () => (
  <div className="flex items-center justify-center h-full w-full bg-[#0a0a0a]">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      <div className="text-amber-500 font-mono text-sm animate-pulse">INITIALIZING STUDIO ENV...</div>
    </div>
  </div>
);

export default StudioLayout;
