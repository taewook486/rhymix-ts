import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HardDrive, Image, Film, Music, FileText } from 'lucide-react'
import { getFiles } from '@/app/actions/media'
import { MediaUploadArea } from './components/MediaUploadArea'
import { MediaTable } from './components/MediaTable'

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

// Statistics Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
}) {
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

async function MediaPageContent() {
  const result = await getFiles()

  if (!result.success || !result.data) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-destructive">Failed to load media files: {result.error}</p>
      </div>
    )
  }

  const files = result.data

  // Calculate statistics
  const stats = {
    total: files.length,
    images: files.filter(f => f.mime_type.startsWith('image/')).length,
    videos: files.filter(f => f.mime_type.startsWith('video/')).length,
    totalSize: files.reduce((sum, f) => sum + f.file_size, 0),
  }

  return (
    <>
      {/* Statistics Cards */}
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

      {/* Upload Area */}
      <MediaUploadArea />

      {/* Media Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Media Files</CardTitle>
          <CardDescription>Manage your uploaded media files</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaTable files={files} />
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
