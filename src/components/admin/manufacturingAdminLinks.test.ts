/**
 * Admin sidebar → Manufacturing Config reachability.
 * Every hub link must resolve to a route declared in App.tsx (or an admin tab),
 * so the configurators never go "buried" again after a route rename.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { adminNavigationItems } from './adminNavigation'
import {
  MANUFACTURING_ADMIN_LINKS,
  MANUFACTURING_READ_ONLY_CONSTRAINTS,
} from './manufacturingAdminLinks'

const appSource = readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8')

/** Collect absolute `path="..."` plus nested `/fabricator/studio/<group>/<leaf>` routes from App.tsx. */
function declaredRoutePaths(): Set<string> {
  const paths = new Set<string>()
  const absolute = appSource.matchAll(/<Route\s+path="(\/[^"]*)"/g)
  for (const m of absolute) paths.add(m[1])
  // Studio children: `path="<leaf>"` under `/fabricator/studio` and its `data/*`, `production/*` groups.
  const studioLeaf = appSource.matchAll(/<Route\s+path="([a-z-]+)"/g)
  for (const m of studioLeaf) {
    paths.add(`/fabricator/studio/${m[1]}`)
    paths.add(`/fabricator/studio/data/${m[1]}`)
    paths.add(`/fabricator/studio/production/${m[1]}`)
  }
  return paths
}

describe('Manufacturing Config admin hub', () => {
  it('is reachable from the admin sidebar as its own tab', () => {
    const tab = adminNavigationItems.find((i) => i.id === 'manufacturing')
    expect(tab).toBeDefined()
    expect(tab?.label).toBe('Manufacturing Config')
  })

  it('links only to routes that exist (studio, factory admin, admin tabs)', () => {
    const routes = declaredRoutePaths()
    const adminTabs = new Set<string>(adminNavigationItems.map((i) => i.id))
    for (const link of MANUFACTURING_ADMIN_LINKS) {
      const [pathname, query] = link.href.split('#')[0].split('?')
      if (pathname === '/admin') {
        const tab = new URLSearchParams(query).get('tab')
        expect(tab && adminTabs.has(tab), `${link.id} → unknown admin tab ${tab}`).toBe(true)
        continue
      }
      expect(routes.has(pathname), `${link.id} → ${pathname} is not declared in App.tsx`).toBe(true)
    }
  })

  it('has unique ids and a description of what the admin can edit', () => {
    const ids = MANUFACTURING_ADMIN_LINKS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const link of MANUFACTURING_ADMIN_LINKS) expect(link.edits.length).toBeGreaterThan(20)
  })

  it('covers every configurator family named in the admin scope', () => {
    const labels = MANUFACTURING_ADMIN_LINKS.map((l) => l.label.toLowerCase()).join(' | ')
    for (const needle of ['approvals', 'system packs', 'tuning studio', 'accessories', 'stock', 'pattern', 'factory admin', 'configuration']) {
      expect(labels, `missing hub link for "${needle}"`).toContain(needle)
    }
  })

  it('keeps Tier-3 guarantees read-only and documented', () => {
    const ids = MANUFACTURING_READ_ONLY_CONSTRAINTS.map((c) => c.id)
    expect(ids).toEqual(expect.arrayContaining(['tier3-algorithms', 'authority-fail-closed', 'cut-ledger', 'stock-fail-closed', 'intelligence-gate']))
    const tier3 = MANUFACTURING_READ_ONLY_CONSTRAINTS.find((c) => c.id === 'tier3-algorithms')
    expect(tier3?.value).toBe('greedy | linear')
    for (const c of MANUFACTURING_READ_ONLY_CONSTRAINTS) expect(c.why).toMatch(/AICS-001|FP-0|PR #122|fail|block/i)
  })
})
