import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UniversalNavSidebar } from './UniversalNavSidebar'

const authState: { user: { id: string; role?: string } | null } = {
  user: { id: 'u1', role: 'fabricator' },
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/context/FabricatorWorkspaceContext', () => ({
  useFabricatorWorkspace: () => ({
    state: {
      activeProjectId: null,
      activePoseId: null,
      manufacturingSave: null,
    },
  }),
}))

vi.mock('@/hooks/useNarrowStudioShell', () => ({
  useNarrowStudioShell: () => false,
}))

vi.mock('@/stores/fabricatorUIStore', () => ({
  useFabricatorUIStore: (sel: (s: Record<string, unknown>) => unknown) =>
    sel({
      setPanelState: vi.fn(),
      panelStates: { navigation: { leftCollapsed: false, rightCollapsed: false } },
    }),
}))

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: () => ({ currentProject: null }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}))

vi.mock('./CollapsiblePanel', () => ({
  CollapsiblePanel: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <aside aria-label={title}>{children}</aside>
  ),
}))

afterEach(() => {
  cleanup()
  authState.user = { id: 'u1', role: 'fabricator' }
})

describe('UniversalNavSidebar admin entry', () => {
  beforeEach(() => {
    authState.user = { id: 'u1', role: 'fabricator' }
  })

  it('hides Almona Admin for non-admin fabricators', () => {
    render(
      <MemoryRouter initialEntries={['/fabricator/studio/command']}>
        <UniversalNavSidebar />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link', { name: /Navigate to Almona Admin/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Navigate to Factory Admin/i })).not.toBeInTheDocument()
  })

  it('links admins to /admin from Fabricator Pro sidebar', () => {
    authState.user = { id: 'admin-1', role: 'admin' }
    render(
      <MemoryRouter initialEntries={['/fabricator/studio/command']}>
        <UniversalNavSidebar />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Navigate to Almona Admin/i })
    expect(link).toHaveAttribute('href', '/admin')
  })

  it('links fabricator_admin to /fabricator-admin', () => {
    authState.user = { id: 'fa-1', role: 'fabricator_admin' }
    render(
      <MemoryRouter initialEntries={['/fabricator/studio/command']}>
        <UniversalNavSidebar />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Navigate to Factory Admin/i })
    expect(link).toHaveAttribute('href', '/fabricator-admin')
  })
})
