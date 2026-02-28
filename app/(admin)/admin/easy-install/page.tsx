import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Package, RefreshCw } from 'lucide-react'

export default async function AdminEasyInstallPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Easy Install</h1>
          <p className="text-muted-foreground">Install modules, themes, and widgets</p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Available Packages</CardTitle>
            <CardDescription>
              Browse and install packages from the Rhymix marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">Modules</p>
                  <p className="text-xs text-muted-foreground">Board, page, and utility modules</p>
                  <Button size="sm" className="mt-4">
                    <Download className="mr-2 h-4 w-4" />
                    Browse
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">Themes</p>
                  <p className="text-xs text-muted-foreground">Site themes and skins</p>
                  <Button size="sm" className="mt-4">
                    <Download className="mr-2 h-4 w-4" />
                    Browse
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">Widgets</p>
                  <p className="text-xs text-muted-foreground">Content widgets and addons</p>
                  <Button size="sm" className="mt-4">
                    <Download className="mr-2 h-4 w-4" />
                    Browse
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installed Packages</CardTitle>
            <CardDescription>
              Manage installed packages and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No packages have been installed through Easy Install yet.
              Browse the marketplace to find and install packages.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
