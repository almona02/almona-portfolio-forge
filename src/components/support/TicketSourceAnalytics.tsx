import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/shared/ui/ui/progress'
import { Badge } from '@/components/ui/badge'

interface SourceStat { source: string; total: number; resolved: number; resolutionRate: number }

export const TicketSourceAnalytics: React.FC = () => {
  const { data, isLoading, error } = useQuery<SourceStat[]>({
    queryKey: ['ticket-source-analytics'],
    queryFn: () => api.fetchTicketSourceAnalytics()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <div className="text-sm text-muted-foreground">Loading analytics...</div>}
        {error && <div className="text-sm text-destructive">Failed to load analytics</div>}
        {!isLoading && !error && (!data || data.length === 0) && (
          <div className="text-sm text-muted-foreground">No ticket data yet.</div>
        )}
        {data && data.map(stat => {
          const pct = Math.round(stat.resolutionRate * 100)
          return (
            <div key={stat.source} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize font-medium flex items-center gap-2">
                  {stat.source.replace('_',' ')}
                  <Badge variant="secondary" className="text-xs">{stat.resolved}/{stat.total}</Badge>
                </span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
