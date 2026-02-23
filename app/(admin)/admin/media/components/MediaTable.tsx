'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Film, Music, Image, Eye, Trash2 } from 'lucide-react'
import { deleteFile } from '@/app/actions/media'
import type { MediaFile } from '@/app/actions/media'

interface MediaTableProps {
  files: MediaFile[]
}

export function MediaTable({ files }: MediaTableProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    setIsDeleting(fileId)

    try {
      const result = await deleteFile(fileId)

      if (result.success) {
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

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return Image
    if (type.startsWith('video/')) return Film
    if (type.startsWith('audio/')) return Music
    return FileText
  }

  function getFileTypeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (type.startsWith('image/')) return 'default'
    if (type.startsWith('video/')) return 'outline'
    if (type.startsWith('audio/')) return 'secondary'
    return 'secondary'
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
          <TableHead>Uploaded Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => {
          const Icon = getFileIcon(file.mime_type)
          return (
            <TableRow key={file.id}>
              <TableCell>
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </TableCell>
              <TableCell className="font-medium">{file.original_filename}</TableCell>
              <TableCell>
                <Badge variant={getFileTypeBadgeVariant(file.mime_type)}>
                  {file.mime_type.split('/')[0]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatFileSize(file.file_size)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(file.created_at).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <a href={file.cdn_url} target="_blank" rel="noopener noreferrer">
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
