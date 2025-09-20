import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const TopProducts: React.FC = () => {
  const products = [
    { name: 'UPVC Cutting Machine', sales: 124 },
    { name: 'Aluminum Profile', sales: 98 },
    { name: 'Sealant (Box)', sales: 76 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {products.map((p, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{p.name}</span>
              <span className="text-sm text-muted-foreground">{p.sales} sales</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
