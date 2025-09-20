import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const SettingsPanel: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = React.useState(false)
  const [enableRealtime, setEnableRealtime] = React.useState(true)

  const saveSettings = () => {
    // Placeholder: persist to server later
    console.info('Save settings', { maintenanceMode, enableRealtime })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between border rounded p-3">
          <div>
            <div className="font-medium">Maintenance Mode</div>
            <div className="text-sm text-muted-foreground">Temporarily disable storefront access.</div>
          </div>
          <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
        </div>
        <div className="flex items-center justify-between border rounded p-3">
          <div>
            <div className="font-medium">Realtime Updates</div>
            <div className="text-sm text-muted-foreground">Enable live updates across admin panels.</div>
          </div>
          <input type="checkbox" checked={enableRealtime} onChange={(e) => setEnableRealtime(e.target.checked)} />
        </div>
        <div className="text-right">
          <Button onClick={saveSettings}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default SettingsPanel
