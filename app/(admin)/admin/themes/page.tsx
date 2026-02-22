import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Palette, Check, Eye, Download, Trash2, Star, Monitor, Smartphone, Tablet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ThemeCard, InstallThemeDialog } from '@/components/admin'
import type { Theme } from '@/components/admin/ThemeCard'

// =====================================================
// Skeleton Component
// =====================================================

function ThemesSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="h-48 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-3 w-48 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  )
}

// =====================================================
// Data Fetching
// =====================================================

async function getThemes(): Promise<Theme[]> {
  const supabase = await createClient()

  // Try to get from site_themes table first (if it exists)
  const { data, error } = await supabase
    .from('site_themes')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  // If site_themes table exists, return that data
  if (!error) {
    return (data || []) as Theme[]
  }

  // Final fallback: Return mock data until site_themes table is created
  // TODO: Create site_themes table migration
  return [
    {
      id: '1',
      name: 'default',
      title: 'Default Theme',
      description: 'Clean and modern default theme for Rhymix TS',
      version: '1.0.0',
      author: 'Rhymix',
      is_active: true,
      is_responsive: true,
      preview_image: '/themes/default/preview.png',
      supports_dark_mode: true,
      installed_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'simple',
      title: 'Simple Theme',
      description: 'Minimalist theme focused on content readability',
      version: '1.0.0',
      author: 'Rhymix',
      is_active: false,
      is_responsive: true,
      preview_image: '/themes/simple/preview.png',
      supports_dark_mode: true,
      installed_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      name: 'classic',
      title: 'Classic Theme',
      description: 'Traditional forum-style theme with sidebar layout',
      version: '1.0.0',
      author: 'Rhymix',
      is_active: false,
      is_responsive: true,
      preview_image: '/themes/classic/preview.png',
      supports_dark_mode: false,
      installed_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '4',
      name: 'dark',
      title: 'Dark Theme',
      description: 'Dark mode first theme for night browsing',
      version: '1.0.0',
      author: 'Community',
      is_active: false,
      is_responsive: true,
      preview_image: '/themes/dark/preview.png',
      supports_dark_mode: true,
      installed_at: '2024-01-05T00:00:00Z',
    },
    {
      id: '5',
      name: 'magazine',
      title: 'Magazine Theme',
      description: 'News and magazine style theme with featured posts',
      version: '0.9.0',
      author: 'Community',
      is_active: false,
      is_responsive: true,
      preview_image: '/themes/magazine/preview.png',
      supports_dark_mode: true,
      installed_at: '2024-01-10T00:00:00Z',
    },
  ]
}

// =====================================================
// Page Component
// =====================================================

export default async function AdminThemesPage() {
  const themes = await getThemes()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Themes</h1>
          <p className="text-muted-foreground">Manage site themes and appearance</p>
        </div>
        <InstallThemeDialog />
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{themes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Active Theme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {themes.find((t) => t.is_active)?.title || 'None'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Dark Mode Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {themes.filter((t) => t.supports_dark_mode).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Responsive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {themes.filter((t) => t.is_responsive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Themes Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Installed Themes
          </CardTitle>
          <CardDescription>
            Preview and activate themes. Only one theme can be active at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ThemesSkeleton />}>
            {themes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No themes found. Install your first theme to get started.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {themes.map((theme) => (
                  <ThemeCard key={theme.id} theme={theme} />
                ))}
              </div>
            )}
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
