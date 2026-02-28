import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HardDrive, Image, Film, Music, FileText } from 'lucide-react'
import { getFiles } from '@/app/actions/media'
import { MediaUploadArea } from './components/MediaUploadArea'
import { FileBrowser } from '@/components/admin/FileBrowser'
import type { MediaFile } from '@/app/actions/media'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Skeleton component for loading state
function MediaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-16 w-full bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Statistics Card Component (Server Component)
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}

// Statistics Component (Server Component)
interface StatisticsProps {
  files: MediaFile[]
}

function MediaStatistics({ files }: StatisticsProps) {
  const stats = {
    total: files.length,
    images: files.filter(f => f.mime_type.startsWith('image/')).length,
    videos: files.filter(f => f.mime_type.startsWith('video/')).length,
    totalSize: files.reduce((sum, f) => sum + f.file_size, 0),
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Files"
        value={stats.total}
        icon={HardDrive}
        description="All media files"
      />
      <StatCard
        title="Images"
        value={stats.images}
        icon={Image}
        description="Image files"
      />
      <StatCard
        title="Videos"
        value={stats.videos}
        icon={Film}
        description="Video files"
      />
      <StatCard
        title="Total Size"
        value={formatFileSize(stats.totalSize)}
        icon={FileText}
        description="Storage used"
      />
    </div>
  )
}

async function MediaPageContent() {
  const result = await getFiles()

  if (!result.success || !result.data) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-destructive">Failed to load media files: {result.error}</p>
      </div>
    )
  }

  return (
    <>
      {/* Statistics Cards */}
      <MediaStatistics files={result.data} />

      {/* Upload Area */}
      <MediaUploadArea />

      {/* Enhanced File Browser */}
      <Card>
        <CardHeader>
          <CardTitle>Media Files</CardTitle>
          <CardDescription>Manage your uploaded media files with enhanced browser</CardDescription>
        </CardHeader>
        <CardContent>
          <FileBrowser files={result.data} />
        </CardContent>
      </Card>
    </>
  )
}

export default async function AdminMediaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">Manage media files and attachments</p>
        </div>
      </div>

      <Suspense fallback={<MediaSkeleton />}>
        <MediaPageContent />
      </Suspense>
    </div>
  )
}
