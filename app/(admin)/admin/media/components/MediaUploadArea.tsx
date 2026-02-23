'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { uploadFile } from '@/app/actions/media'

export function MediaUploadArea() {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size exceeds 50MB limit')
      return
    }

    setIsUploading(true)

    try {
      const result = await uploadFile({ file })

      if (result.success) {
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
