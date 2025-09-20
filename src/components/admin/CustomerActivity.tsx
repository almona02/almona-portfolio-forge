import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const CustomerActivity: React.FC = () => {
  const activities = [
    { user: 'Ahmed', action: 'Registered', time: '2h ago' },
    { user: 'Sara', action: 'Placed an order', time: '4h ago' },
    { user: 'Mostafa', action: 'Requested a quote', time: '6h ago' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {activities.map((a, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{a.user} • {a.action}</span>
              <span className="text-xs text-muted-foreground">{a.time}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
