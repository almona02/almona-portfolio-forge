import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Factory,
  Layers,
  Package,
  Paintbrush,
  Ruler,
  Settings2,
  ShieldCheck,
  Ticket,
  Wrench,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

type Capability = {
  id: string;
  title: string;
  engine: string;
  href: string;
  icon: React.ReactNode;
  group: 'fabricator' | 'service';
  status: 'ready' | 'active' | 'standby';
};

const CAPABILITIES: Capability[] = [
  {
    id: 'measure',
    title: 'Measuring',
    engine: 'Opening capture',
    href: fabricatorRoutes.studioProjects(),
    icon: <Ruler size={18} />,
    group: 'fabricator',
    status: 'ready',
  },
  {
    id: 'design',
    title: 'Design Studio',
    engine: 'Engineering Bay',
    href: '/fabricator/studio/design',
    icon: <Paintbrush size={18} />,
    group: 'fabricator',
    status: 'active',
  },
  {
    id: 'systems',
    title: 'System library',
    engine: 'Packs & profiles',
    href: fabricatorRoutes.studioData(),
    icon: <Settings2 size={18} />,
    group: 'fabricator',
    status: 'ready',
  },
  {
    id: 'stock',
    title: 'Stock & remnants',
    engine: 'Inventory hub',
    href: fabricatorRoutes.studioDataStock(),
    icon: <Package size={18} />,
    group: 'fabricator',
    status: 'ready',
  },
  {
    id: 'optimize',
    title: 'Cut optimization',
    engine: 'Deterministic solver',
    href: fabricatorRoutes.studioProjects(),
    icon: <Layers size={18} />,
    group: 'fabricator',
    status: 'standby',
  },
  {
    id: 'bom',
    title: 'BOM & cut lists',
    engine: 'Manufacturing docs',
    href: fabricatorRoutes.studioProjects(),
    icon: <ClipboardList size={18} />,
    group: 'fabricator',
    status: 'standby',
  },
  {
    id: 'production',
    title: 'Production floor',
    engine: 'Orders · QC · delivery',
    href: fabricatorRoutes.studioProduction(),
    icon: <Factory size={18} />,
    group: 'fabricator',
    status: 'ready',
  },
  {
    id: 'tickets',
    title: 'Service ticketing',
    engine: 'Almona support',
    href: '/support',
    icon: <Ticket size={18} />,
    group: 'service',
    status: 'ready',
  },
  {
    id: 'machines',
    title: 'Machine registry',
    engine: 'Digital passport',
    href: '/portal/register-machine',
    icon: <Wrench size={18} />,
    group: 'service',
    status: 'ready',
  },
  {
    id: 'shield',
    title: 'YDT Shield',
    engine: 'Advisory channel',
    href: '/ydt',
    icon: <ShieldCheck size={18} />,
    group: 'service',
    status: 'standby',
  },
];

function statusLabel(status: Capability['status']): string {
  switch (status) {
    case 'active':
      return 'In use';
    case 'ready':
      return 'Ready';
    default:
      return 'Standby';
  }
}

export const CommandCapabilityGrid: React.FC<{ className?: string }> = ({ className }) => {
  const fabricator = CAPABILITIES.filter((c) => c.group === 'fabricator');
  const service = CAPABILITIES.filter((c) => c.group === 'service');

  return (
    <div className={cn('space-y-7', className)} data-testid="command-capability-grid">
      <CapabilitySection title="Workshop engines" items={fabricator} />
      <CapabilitySection title="Ticketing & support" items={service} />
    </div>
  );
};

function CapabilitySection({
  title,
  items,
}: {
  title: string;
  items: Capability[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-amber-500/90">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              'group flex items-center justify-between gap-3 rounded-none border border-amber-600/25',
              'bg-[#0c0c0c]/90 px-3.5 py-3 transition-colors',
              'hover:border-amber-500/50 hover:bg-amber-500/[0.04]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
            )}
            data-testid={`command-capability-${item.id}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-amber-600/30 text-amber-400 group-hover:text-amber-200">
                {item.icon}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-amber-100 truncate">
                  {item.title}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-amber-700 font-mono truncate">
                  {item.engine}
                </div>
              </div>
            </div>
            <span
              className={cn(
                'shrink-0 text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 border',
                item.status === 'active' && 'border-emerald-500/40 text-emerald-400',
                item.status === 'ready' && 'border-amber-600/40 text-amber-500',
                item.status === 'standby' && 'border-slate-600 text-slate-500',
              )}
            >
              {statusLabel(item.status)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default CommandCapabilityGrid;
