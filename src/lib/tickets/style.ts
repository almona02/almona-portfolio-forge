/**
 * Centralized styling utilities for ticket status & priority visual hierarchy.
 * Keeps color decisions in one place so table rows, badges, and detail views stay consistent.
 * Tailwind utility class strings only (no runtime DOM reads) enabling full tree‑shaking.
 */

import type { TicketPriority, TicketStatus } from '@/types/tickets'

// Base palette tokens (light & dark friendly) – adjust here to re‑theme quickly.
const palette = {
  blue: {
    soft: 'bg-blue-50 dark:bg-blue-900/25',
    solid: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700'
  },
  green: {
    soft: 'bg-green-50 dark:bg-green-900/25',
    solid: 'bg-green-500',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700'
  },
  purple: {
    soft: 'bg-purple-50 dark:bg-purple-900/25',
    solid: 'bg-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700'
  },
  yellow: {
    soft: 'bg-yellow-50 dark:bg-yellow-900/25',
    solid: 'bg-yellow-500',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700'
  },
  orange: {
    soft: 'bg-orange-50 dark:bg-orange-900/25',
    solid: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700'
  },
  red: {
    soft: 'bg-red-50 dark:bg-red-900/25',
    solid: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700'
  },
  gray: {
    soft: 'bg-gray-100 dark:bg-gray-800',
    solid: 'bg-gray-500',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-700'
  }
}

interface StyleConfig {
  badge: string // classes applied to <Badge>
  rowAccent?: string // extra left border / ring hint for table row
  emphasis?: string // used for header accent backgrounds etc.
  subdued?: boolean // indicates low-emphasis (closed/cancelled)
}

const statusMap: Record<TicketStatus, StyleConfig> = {
  open: { badge: `${palette.blue.soft} ${palette.blue.text} border ${palette.blue.border}` },
  assigned: { badge: `${palette.purple.soft} ${palette.purple.text} border ${palette.purple.border}` },
  in_progress: { badge: `${palette.yellow.soft} ${palette.yellow.text} border ${palette.yellow.border}`, rowAccent: 'border-l-2 border-yellow-400' },
  awaiting_parts: { badge: `${palette.orange.soft} ${palette.orange.text} border ${palette.orange.border}` },
  awaiting_customer: { badge: `${palette.orange.soft} ${palette.orange.text} border ${palette.orange.border}` },
  pending_approval: { badge: `${palette.purple.soft} ${palette.purple.text} border ${palette.purple.border}` },
  resolved: { badge: `${palette.green.soft} ${palette.green.text} border ${palette.green.border}`, subdued: true },
  closed: { badge: `${palette.gray.soft} ${palette.gray.text} border ${palette.gray.border}`, subdued: true },
  cancelled: { badge: `${palette.red.soft} ${palette.red.text} border ${palette.red.border}`, subdued: true }
}

const priorityMap: Record<TicketPriority, { badge: string; rowAccent?: string; weight: number }> = {
  low: { badge: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700', weight: 1 },
  medium: { badge: 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700', weight: 2 },
  high: { badge: 'bg-orange-50 dark:bg-orange-900/25 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700', rowAccent: 'border-l-2 border-orange-400', weight: 3 },
  urgent: { badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700', rowAccent: 'border-l-2 border-red-500', weight: 4 },
  critical: { badge: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 shadow-inner border border-red-400 dark:border-red-600', rowAccent: 'border-l-2 border-red-600', weight: 5 }
}

export function statusStyles(status: TicketStatus): StyleConfig {
  return statusMap[status]
}

export function priorityStyles(priority: TicketPriority) {
  return priorityMap[priority]
}

export function combineBadge(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(' ')
}

// Helper to compute row classes (status + priority) for ticket lists.
export function ticketRowClasses(status: TicketStatus, priority: TicketPriority, selected: boolean): string {
  const s = statusStyles(status)
  const p = priorityStyles(priority)

  const base = 'transition-colors group relative'
  const hover = 'hover:bg-muted/50'
  const subdued = s.subdued ? 'opacity-60 hover:opacity-90' : ''
  const selectedCls = selected ? 'bg-muted/70 ring-1 ring-primary/40' : ''
  const accent = p.rowAccent || s.rowAccent || ''

  return [base, hover, subdued, selectedCls, accent].filter(Boolean).join(' ')
}

// Weight comparator for sorting by priority severity if needed.
export function comparePriority(a: TicketPriority, b: TicketPriority) {
  return priorityMap[b].weight - priorityMap[a].weight
}

// --- Enhanced visual hierarchy utilities ----------------------------------
// Lightweight class tokens to unify interaction + status driven styling
// across tables & card layouts without duplicating logic in components.

export const ticketStatusStyles = {
  active: 'bg-opacity-100 saturate-100',
  inactive: 'opacity-55 saturate-75 contrast-90 hover:opacity-85', // resolved / closed / cancelled baseline
  selected: 'ring-2 ring-orange-400/40 shadow-[0_0_0_1px_theme(colors.orange.500/30),0_0_8px_-2px_theme(colors.orange.500/40)]'
}

interface TicketInteractiveOpts { selected?: boolean; inactive?: boolean; focusable?: boolean; lift?: boolean }
export function ticketInteractiveClasses({ selected = false, inactive = false, focusable = true, lift = true }: TicketInteractiveOpts) {
  const focus = focusable ? 'focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:ring-offset-2 focus:ring-offset-background' : ''
  const hover = inactive ? '' : 'hover:bg-muted/30 hover:saturate-110'
  const liftCls = lift ? 'transition-all duration-200 will-change-transform hover:-translate-y-0.5 hover:shadow-sm' : 'transition-colors'
  return [focus, hover, liftCls, selected && ticketStatusStyles.selected, inactive && ticketStatusStyles.inactive].filter(Boolean).join(' ')
}

// Backwards-compatible helper upgrade: allow inactive/selected highlighting.
export function ticketRowEnhanced(status: TicketStatus, priority: TicketPriority, opts: { selected?: boolean } = {}) {
  const inactive = ['resolved','closed','cancelled'].includes(status)
  return [
    ticketRowClasses(status, priority, !!opts.selected),
    ticketInteractiveClasses({ selected: !!opts.selected, inactive })
  ].join(' ')
}
