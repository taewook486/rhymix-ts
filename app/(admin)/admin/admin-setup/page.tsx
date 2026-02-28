import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'

export default async function AdminAdminSetupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Setup</h1>
        <p className="text-muted-foreground">Configure the admin interface</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Interface</CardTitle>
            <CardDescription>
              Configure admin panel appearance and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode">Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use a more compact layout for the admin panel
                </p>
              </div>
              <Switch id="compact-mode" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sticky-sidebar">Sticky Sidebar</Label>
                <p className="text-sm text-muted-foreground">
                  Keep sidebar visible while scrolling
                </p>
              </div>
              <Switch id="sticky-sidebar" defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="items-per-page">Items Per Page</Label>
              <Input id="items-per-page" type="number" defaultValue="20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Menu</CardTitle>
            <CardDescription>
              Configure admin menu settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="remember-state">Remember Menu State</Label>
                <p className="text-sm text-muted-foreground">
                  Remember expanded/collapsed menu sections
                </p>
              </div>
              <Switch id="remember-state" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Footer</CardTitle>
            <CardDescription>
              Customize the admin panel footer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Admin footer customization options will be available in a future update.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
