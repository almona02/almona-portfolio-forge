import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const ReportsPanel: React.FC = () => {
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')

  const generateReport = () => {
    // Placeholder: implement server report generation later
    console.info('Generate report for', { from, to })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="ml-auto">
            <Button onClick={generateReport}>Generate</Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Report output will appear here. We can add charts, tables, and export options in the next pass.</div>
      </CardContent>
    </Card>
  )
}

export default ReportsPanel
