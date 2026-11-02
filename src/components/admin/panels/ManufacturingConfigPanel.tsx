import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FabricatorConfigurator } from '@/components/fabricator/FabricatorConfigurator'
import {
  MANUFACTURING_ADMIN_GROUP_LABELS,
  MANUFACTURING_ADMIN_LINKS,
  MANUFACTURING_READ_ONLY_CONSTRAINTS,
  type ManufacturingAdminLinkGroup,
} from '@/components/admin/manufacturingAdminLinks'
import { ExternalLink, Lock, ShieldCheck } from 'lucide-react'

const GROUP_ORDER: ManufacturingAdminLinkGroup[] = ['authority', 'workshop', 'library', 'platform']

/**
 * Admin → Manufacturing Config hub.
 * Links every admin-editable manufacturing configurator and embeds the
 * workshop configurator (profiles, accessories, kits, rules, tuning, packs).
 * Hard constraints are listed read-only — AICS-001 Tier-3 guarantees are not
 * exposed as editable settings.
 */
export const ManufacturingConfigPanel: React.FC = () => {
  return (
    <div className="space-y-6" data-testid="manufacturing-config-panel">
      <section aria-labelledby="manufacturing-links-heading" className="space-y-4">
        <h2 id="manufacturing-links-heading" className="sr-only">Manufacturing configurators</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUP_ORDER.map((group) => {
            const links = MANUFACTURING_ADMIN_LINKS.filter((l) => l.group === group)
            if (links.length === 0) return null
            return (
              <Card key={group} data-testid={`manufacturing-group-${group}`}>
                <CardHeader>
                  <CardTitle className="text-base">{MANUFACTURING_ADMIN_GROUP_LABELS[group]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {links.map((link) => (
                      <li key={link.id} className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{link.label}</span>
                            {link.adminOnly && (
                              <Badge variant="outline" className="border-amber-500/40 text-warning">
                                <ShieldCheck aria-hidden="true" className="mr-1 h-3 w-3" /> admin only
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{link.edits}</p>
                        </div>
                        <Button asChild size="sm" variant="outline" className="shrink-0">
                          <Link to={link.href} data-testid={`manufacturing-link-${link.id}`}>
                            Open <ExternalLink aria-hidden="true" className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="manufacturing-configurator-heading" className="space-y-2">
        <div>
          <h2 id="manufacturing-configurator-heading" className="text-lg font-semibold">Workshop configurator</h2>
          <p className="text-sm text-muted-foreground">
            Profiles, accessories, set kits, manufacturing rules, tuning defaults and system packs. Rows are scoped to
            the signed-in account&apos;s workshop; rules and tuning are also visible to platform admins.
          </p>
        </div>
        <FabricatorConfigurator />
      </section>

      <Card data-testid="manufacturing-constraints">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock aria-hidden="true" className="h-4 w-4 text-warning" /> Non-editable manufacturing constraints
          </CardTitle>
          <CardDescription>
            These guarantees are enforced in code and server RPCs. They are shown here so admins know what cannot be
            changed from this panel; none of them is an input.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2">
            {MANUFACTURING_READ_ONLY_CONSTRAINTS.map((c) => (
              <div key={c.id} className="rounded-md border p-3" data-testid={`manufacturing-constraint-${c.id}`}>
                <dt className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                  <span>{c.label}</span>
                  <Badge variant="secondary" className="font-mono text-xs">{c.value}</Badge>
                </dt>
                <dd className="mt-1 text-xs text-muted-foreground">{c.why}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

export default ManufacturingConfigPanel
