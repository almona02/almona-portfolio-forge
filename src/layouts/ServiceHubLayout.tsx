import { YDTAssistantFloating } from '@/components/services/YDTAssistantFloating';
import { cn } from '@/lib/utils';
import {
    Activity,
    BarChart3,
    Bell,
    BookOpen,
    Briefcase,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    FileText,
    HardHat,
    LayoutDashboard,
    Search,
    Settings,
    ShieldCheck,
    UserCircle,
    Users,
    Wrench
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

type PersonaType = 'owner' | 'technician' | 'dealer';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const NAV_CONFIG: Record<PersonaType, NavItem[]> = {
  owner: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/service/owner/dashboard' },
    { id: 'machines', label: 'My Fleet', icon: Activity, path: '/service/owner/machines' },
    { id: 'contracts', label: 'Service Contracts', icon: ShieldCheck, path: '/service/owner/contracts' },
    { id: 'invoices', label: 'Invoices', icon: FileText, path: '/service/owner/invoices' },
    { id: 'reports', label: 'ROI Reports', icon: BarChart3, path: '/service/owner/reports' },
  ],
  technician: [
    { id: 'tasks', label: 'My Tasks', icon: ClipboardCheck, path: '/service/tech/tasks', badge: 3 },
    { id: 'machines', label: 'Machine Locker', icon: Wrench, path: '/service/tech/machines' },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, path: '/service/tech/kb' },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity, path: '/service/tech/diagnostics' },
  ],
  dealer: [
    { id: 'dashboard', label: 'Dealer Hub', icon: Briefcase, path: '/service/dealer/dashboard' },
    { id: 'claims', label: 'Warranty Claims', icon: ShieldCheck, path: '/service/dealer/claims', badge: 5 },
    { id: 'parts', label: 'Parts Orders', icon: Settings, path: '/service/dealer/orders' },
    { id: 'customers', label: 'Customer Fleet', icon: Users, path: '/service/dealer/customers' },
  ]
};

const PERSONA_LABELS: Record<PersonaType, string> = {
  owner: 'Equipment Owner',
  technician: 'Field Technician',
  dealer: 'Authorized Dealer'
};

export default function ServiceHubLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePersona, setActivePersona] = useState<PersonaType>('owner');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize persona from localStorage or default
  useEffect(() => {
    const saved = localStorage.getItem('ydt-persona') as PersonaType;
    if (saved && ['owner', 'technician', 'dealer'].includes(saved)) {
      setActivePersona(saved);
    }
    setMounted(true);
  }, []);

  const handlePersonaChange = (persona: PersonaType) => {
    setActivePersona(persona);
    localStorage.setItem('ydt-persona', persona);
    // Navigate to the first item of the new persona
    const firstPath = NAV_CONFIG[persona][0]?.path || '/service';
    navigate(firstPath);
  };

  const navItems = NAV_CONFIG[activePersona];

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside 
        className={cn(
          "relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out z-20",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800/50">
          <div className={cn("flex items-center gap-3 overflow-hidden transition-all", isSidebarCollapsed ? "justify-center w-full" : "")}>
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/20">
              <span className="font-bold text-slate-900 text-lg">A</span>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                 <span className="font-bold text-lg tracking-tight text-white">Service<span className="text-amber-500">Hub</span></span>
                 <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Gold Tier</span>
              </div>
            )}
          </div>
        </div>

        {/* Persona Switcher (Dev Mode) */}
        {!isSidebarCollapsed && (
            <div className="px-4 py-4">
                <div className="p-1 bg-slate-800/50 rounded-lg flex flex-col gap-1 border border-slate-800">
                    <p className="text-[10px] uppercase text-slate-500 font-semibold px-2 py-1">Persona View</p>
                    {(['owner', 'technician', 'dealer'] as PersonaType[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => handlePersonaChange(p)}
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all",
                                activePersona === p 
                                    ? "bg-amber-500/10 text-amber-500 font-medium" 
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                            )}
                        >
                            {p === 'owner' && <UserCircle className="w-4 h-4" />}
                            {p === 'technician' && <HardHat className="w-4 h-4" />}
                            {p === 'dealer' && <Briefcase className="w-4 h-4" />}
                            <span className="capitalize">{p}</span>
                            {activePersona === p && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative flex items-center w-full rounded-lg transition-all duration-200 group",
                  isSidebarCollapsed ? "justify-center p-3" : "px-3 py-2.5",
                  isActive 
                    ? "bg-gradient-to-r from-amber-500/20 to-transparent text-amber-500" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-amber-500 rounded-r-full" />
                )}
                <item.icon className={cn(
                    "flex-shrink-0 transition-colors", 
                    isSidebarCollapsed ? "w-6 h-6" : "w-5 h-5",
                    isActive ? "text-amber-500" : "text-slate-500 group-hover:text-white"
                )} />
                
                {!isSidebarCollapsed && (
                    <>
                        <span className={cn("ml-3 font-medium text-sm")}>{item.label}</span>
                        {item.badge && (
                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-900">
                                {item.badge}
                            </span>
                        )}
                    </>
                )}
              </button>
            )
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800">
             <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={cn(
                    "flex items-center w-full rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors",
                    isSidebarCollapsed ? "justify-center p-2" : "px-3 py-2"
                )}
             >
                {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : (
                    <>
                        <ChevronLeft className="w-5 h-5" />
                        <span className="ml-3 text-sm font-medium">Collapse</span>
                    </>
                )}
             </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm z-10">
           <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white tracking-tight">{PERSONA_LABELS[activePersona]}</h1>
                <span className="text-xs text-slate-500">Welcome back, {user ? user.firstName : 'User'}</span>
           </div>

           <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search assets, tickets..." 
                        className="bg-slate-900 border border-slate-800 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 w-64"
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border border-slate-900"></span>
                </button>

                {/* User Generic Avatar */}
                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center font-bold">
                    U
                </div>
           </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
                 <Outlet context={{ activePersona }} />
            </div>
        </main>
      </div>
      <YDTAssistantFloating />
    </div>
  );
}

// Mock user for standard dev usage if context is missing
const user = { firstName: 'Ali', lastName: 'Hassan' };
