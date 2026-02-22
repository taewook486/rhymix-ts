import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Upload, Image, FileText, Film, Music, HardDrive, Calendar, Download, Trash2, Eye } from 'lucide-react'

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

// Mock data for media files
const mockMediaFiles = [
  {
    id: '1',
    name: 'hero-banner.jpg',
    type: 'image',
    size: 2457600,
    uploaded_by: 'admin',
    created_at: '2026-02-20T10:30:00Z',
    url: '/uploads/hero-banner.jpg',
  },
  {
    id: '2',
    name: 'logo.svg',
    type: 'image',
    size: 15360,
    uploaded_by: 'admin',
    created_at: '2026-02-19T14:20:00Z',
    url: '/uploads/logo.svg',
  },
  {
    id: '3',
    name: 'user-guide.pdf',
    type: 'document',
    size: 5242880,
    uploaded_by: 'moderator',
    created_at: '2026-02-18T09:15:00Z',
    url: '/uploads/user-guide.pdf',
  },
  {
    id: '4',
    name: 'welcome-video.mp4',
    type: 'video',
    size: 52428800,
    uploaded_by: 'admin',
    created_at: '2026-02-17T16:45:00Z',
    url: '/uploads/welcome-video.mp4',
  },
  {
    id: '5',
    name: 'notification.mp3',
    type: 'audio',
    size: 512000,
    uploaded_by: 'admin',
    created_at: '2026-02-21T08:00:00Z',
    url: '/uploads/notification.mp3',
  },
]

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileIcon(type: string) {
  switch (type) {
    case 'image':
      return Image
    case 'document':
      return FileText
    case 'video':
      return Film
    case 'audio':
      return Music
    default:
      return FileText
  }
}

function getFileTypeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'image':
      return 'default'
    case 'document':
      return 'secondary'
    case 'video':
      return 'outline'
    case 'audio':
      return 'secondary'
    default:
      return 'outline'
  }
}

// Server Actions placeholder
async function uploadFile(formData: FormData) {
  'use server'
  // TODO: Implement file upload logic
  // 1. Validate file type and size
  // 2. Generate unique filename
  // 3. Upload to storage (Supabase Storage or local)
  // 4. Save metadata to database
  // 5. Return file URL
  console.log('Upload file action called')
}

async function deleteFile(fileId: string) {
  'use server'
  // TODO: Implement file deletion logic
  // 1. Verify user permissions
  // 2. Delete from storage
  // 3. Delete metadata from database
  console.log('Delete file action called for:', fileId)
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

// Upload Area Component
function UploadArea() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Files
        </CardTitle>
        <CardDescription>Drag and drop files here or click to browse</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={uploadFile} className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG, GIF, SVG, PDF, MP4, MP3 (Max 50MB)
            </p>
            <input
              type="file"
              name="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Media Files Table Component
function MediaTable({ files }: { files: typeof mockMediaFiles }) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No media files found. Upload your first file to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead>File Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Uploaded By</TableHead>
          <TableHead>Uploaded Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => {
          const Icon = getFileIcon(file.type)
          return (
            <TableRow key={file.id}>
              <TableCell>
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </TableCell>
              <TableCell className="font-medium">{file.name}</TableCell>
              <TableCell>
                <Badge variant={getFileTypeBadgeVariant(file.type)}>
                  {file.type}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatFileSize(file.size)}
              </TableCell>
              <TableCell className="text-muted-foreground">{file.uploaded_by}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(file.created_at).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" title="View">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Delete" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default async function AdminMediaPage() {
  // Use mock data for now
  // In production, this would fetch from Supabase storage
  const files = mockMediaFiles

  // Calculate statistics
  const totalFiles = files.length
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const todayUploads = files.filter((file) => {
    const today = new Date()
    const uploadDate = new Date(file.created_at)
    return uploadDate.toDateString() === today.toDateString()
  }).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">Manage media files and attachments</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Files"
          value={totalFiles}
          icon={FileText}
          description="All uploaded media"
        />
        <StatCard
          title="Storage Used"
          value={formatFileSize(totalSize)}
          icon={HardDrive}
          description="Total storage consumption"
        />
        <StatCard
          title="Uploads Today"
          value={todayUploads}
          icon={Calendar}
          description="Files uploaded today"
        />
      </div>

      {/* Upload Area */}
      <UploadArea />

      {/* Media Files Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            All Media Files
          </CardTitle>
          <CardDescription>View and manage all uploaded media files</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<MediaSkeleton />}>
            <MediaTable files={files} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
