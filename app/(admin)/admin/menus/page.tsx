import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, MoreHorizontal, LayoutGrid } from 'lucide-react'

async function getMenus() {
  const supabase = await createClient()

  // For now, return empty array as menus table might not exist yet
  // TODO: Create menus table and fetch from it
  return []
}

function MenusTable({ menus }: { menus: any[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menus.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No menus found. Create your first navigation menu.
              </TableCell>
            </TableRow>
          ) : (
            menus.map((menu) => (
              <TableRow key={menu.id}>
                <TableCell className="font-medium">{menu.name}</TableCell>
                <TableCell>{menu.item_count || 0}</TableCell>
                <TableCell>
                  <Badge variant="outline">{menu.location || 'header'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                    {menu.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function MenusSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-12 w-full bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminMenusPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menus</h1>
          <p className="text-muted-foreground">
            Configure navigation menus for your site
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Menu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Navigation Menus</CardTitle>
          <CardDescription>
            Create and manage site navigation menus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<MenusSkeleton />}>
            {/* @ts-ignore - async component */}
            <MenusWrapper />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Quick Setup
            </CardTitle>
            <CardDescription>
              Common menu configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              Create Header Menu
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Create Footer Menu
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Create User Menu
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Menu Locations</CardTitle>
            <CardDescription>
              Available menu positions in your theme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Header</span>
              <Badge>Primary</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Footer</span>
              <Badge variant="outline">Secondary</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Sidebar</span>
              <Badge variant="outline">Optional</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function MenusWrapper() {
  const menus = await getMenus()
  return <MenusTable menus={menus} />
}
