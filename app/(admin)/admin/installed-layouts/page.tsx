import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layout, Settings, Eye } from 'lucide-react'
import Link from 'next/link'

async function getInstalledLayouts() {
  // Placeholder - in real implementation, fetch from database
  return [
    {
      id: 'default',
      name: 'Default Layout',
      type: 'PC',
      description: 'Default desktop layout',
      isDefault: true,
    },
    {
      id: 'mobile',
      name: 'Mobile Layout',
      type: 'Mobile',
      description: 'Default mobile layout',
      isDefault: true,
    },
  ]
}

export default async function AdminInstalledLayoutsPage() {
  const layouts = await getInstalledLayouts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Installed Layouts</h1>
        <p className="text-muted-foreground">Manage installed layouts</p>
      </div>

      <div className="grid gap-4">
        {layouts.map((layout) => (
          <Card key={layout.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">{layout.name}</CardTitle>
                    <CardDescription>{layout.description}</CardDescription>
                  </div>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {layout.type}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/layout/preview/${layout.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Link>
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Layout</CardTitle>
          <CardDescription>
            Install a new layout from the marketplace or upload your own
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/admin/easy-install">
              Browse Layouts in Easy Install
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
