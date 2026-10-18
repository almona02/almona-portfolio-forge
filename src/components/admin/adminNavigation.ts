import { BarChart3, Boxes, ClipboardCheck, Cog, DollarSign, Factory, FileText, HardHat, HelpCircle, Package, Settings, ShieldCheck, ShoppingCart, SlidersHorizontal, Tag, UserCog, Users, Wrench, Zap } from 'lucide-react'

/** Sections implemented by the /admin dashboard. Shared with the global menu. */
export const adminNavigationItems = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'analytics', label: 'Business Analytics', icon: BarChart3 },
  { id: 'ydt-performance', label: 'YDT Performance', icon: Zap },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'spare-parts', label: 'Spare Parts', icon: Wrench },
  { id: 'used-machines', label: 'Used Machines', icon: Factory },
  { id: 'machines', label: 'Machine Catalog', icon: Cog },
  { id: 'service-contracts', label: 'Service Contracts', icon: ClipboardCheck },
  { id: 'service-packages', label: 'Service Packages', icon: Tag },
  { id: 'support', label: 'Support Tickets', icon: HelpCircle },
  { id: 'technicians', label: 'Technicians', icon: HardHat },
  { id: 'users', label: 'Users & Roles', icon: UserCog },
  { id: 'audit-log', label: 'Audit Log', icon: ShieldCheck },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'configuration', label: 'Configuration', icon: SlidersHorizontal },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

export const adminSectionHref = (id: string) => `/admin?tab=${encodeURIComponent(id)}`
