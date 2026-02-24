'use client'

import { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

// @MX:ANCHOR: Media upload handler for editor
// @MX:REASON: Provides client-side file upload with progress tracking
interface MediaUploaderProps {
  onUpload: (file: File) => Promise<string>
  onError?: (error: string) => void
}

export function useMediaUploader({ onUpload, onError }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      setUploading(true)
      setProgress(0)
      setError(null)

      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 100)

        const url = await onUpload(file)

        clearInterval(progressInterval)
        setProgress(100)

        return url
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed'
        setError(errorMessage)
        onError?.(errorMessage)
        return null
      } finally {
        setUploading(false)
      }
    },
    [onUpload, onError]
  )

  return {
    uploadFile,
    uploading,
    progress,
    error,
  }
}

// @MX:NOTE: Standalone media uploader component for drag-and-drop
interface MediaUploaderComponentProps {
  onUpload: (file: File) => Promise<string>
  accept?: string
  maxSize?: number // in bytes
}

export function MediaUploader({
  onUpload,
  accept = 'image/*,.pdf,.doc,.docx',
  maxSize = 50 * 1024 * 1024, // 50MB
}: MediaUploaderComponentProps) {
  const { uploadFile, uploading, progress, error } = useMediaUploader({
    onUpload,
  })

  const handleFileSelect = async (file: File) => {
    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0)
      alert(`File size exceeds ${maxSizeMB}MB limit`)
      return
    }

    await uploadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
      >
        <input
          type="file"
          id="media-upload"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor="media-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground">
            Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
          </p>
        </label>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// @MX:NOTE: Image preview component for uploaded images
interface ImagePreviewProps {
  src: string
  alt?: string
  onRemove?: () => void
}

export function ImagePreview({ src, alt, onRemove }: ImagePreviewProps) {
  return (
    <div className="relative group inline-block">
      <img
        src={src}
        alt={alt || 'Preview'}
        className="max-w-xs rounded-lg border"
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
