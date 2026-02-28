import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export default async function AdminEditorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editor Settings</h1>
        <p className="text-muted-foreground">Configure the content editor</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Editor Configuration</CardTitle>
            <CardDescription>
              Configure default editor settings and features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-save">Auto-save</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save drafts while editing
                </p>
              </div>
              <Switch id="auto-save" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="spell-check">Spell Check</Label>
                <p className="text-sm text-muted-foreground">
                  Enable browser spell checking
                </p>
              </div>
              <Switch id="spell-check" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="image-upload">Image Upload</Label>
                <p className="text-sm text-muted-foreground">
                  Allow drag-and-drop image uploads
                </p>
              </div>
              <Switch id="image-upload" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editor Skin</CardTitle>
            <CardDescription>
              Select the default editor skin for content editing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Editor skin configuration will be available in a future update.
              The system currently uses the default CKEditor configuration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
