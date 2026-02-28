import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export default async function AdminNotificationCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Center</h1>
        <p className="text-muted-foreground">Configure in-app notification settings</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>
              Enable or disable different notification types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-comment">Comment Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when someone comments on your content
                </p>
              </div>
              <Switch id="notify-comment" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-mention">Mention Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when someone mentions you
                </p>
              </div>
              <Switch id="notify-mention" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-message">Message Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when you receive a private message
                </p>
              </div>
              <Switch id="notify-message" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-system">System Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Notify about system announcements
                </p>
              </div>
              <Switch id="notify-system" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Configure how notifications are displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound">Notification Sound</Label>
                <p className="text-sm text-muted-foreground">
                  Play sound for new notifications
                </p>
              </div>
              <Switch id="sound" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="desktop">Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show desktop notifications when available
                </p>
              </div>
              <Switch id="desktop" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
