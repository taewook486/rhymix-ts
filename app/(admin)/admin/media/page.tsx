import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Upload, Image, FileText, Film, Music, HardDrive, Calendar, Download, Trash2, Eye, RefreshCw } from 'lucide-react'
import { getFiles } from '@/app/actions/media'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

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

// Upload Area Component - Client Component
function UploadArea() {
  'use client'

  const { useState } = require('react')
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const { uploadFile } = await import('@/app/actions/media')
      const result = await uploadFile({ file })

      if (result.success) {
        const { useRouter } = await import('next/navigation')
        const router = useRouter()
        router.refresh()
      } else {
        alert(`Upload failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

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
        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
            {isUploading ? (
              <div className="space-y-2">
                <div className="h-10 w-10 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, GIF, SVG, PDF, MP4, MP3 (Max 50MB)
                </p>
              </>
            )}
            <input
              type="file"
              name="file"
              accept="image/*,video/*,audio/*,.pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Media Files Table Component
function MediaTable({ files }: { files: any[] }) {
  'use client'

  const { useState } = require('react')
  const [isDeleting, setIsDeleting] = useState(null)

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    setIsDeleting(fileId)

    try {
      const { deleteFile } = await import('@/app/actions/media')
      const result = await deleteFile(fileId)

      if (result.success) {
        const { useRouter } = await import('next/navigation')
        const router = useRouter()
        router.refresh()
      } else {
        alert(`Delete failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Delete failed. Please try again.')
    } finally {
      setIsDeleting(null)
    }
  }

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
          const Icon = getFileIcon(file.mime_type.split('/')[0] || 'file')
          return (
            <TableRow key={file.id}>
              <TableCell>
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </TableCell>
              <TableCell className="font-medium">{file.filename}</TableCell>
              <TableCell>
                <Badge variant={getFileTypeBadgeVariant(file.mime_type.split('/')[0])}>
                  {file.mime_type.split('/')[0]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatFileSize(file.file_size)}
              </TableCell>
              <TableCell className="text-muted-foreground">{file.uploader_email || 'Unknown'}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(file.created_at).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <a href={file.storage_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(file.id)}
                    disabled={isDeleting === file.id}
                  >
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
  // Fetch real data from database
  const result = await getFiles()
  const files = result.success && result.data ? result.data : []

  // Calculate statistics
  const totalFiles = files.length
  const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0)
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
