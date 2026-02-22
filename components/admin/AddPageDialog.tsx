'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface CreatePageResponse {
  success: boolean
  error?: string
  message?: string
}

export function AddPageDialog() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreatePage = async () => {
    // Validation
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Page title is required.',
      })
      return
    }

    if (!slug.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Page slug is required.',
      })
      return
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Slug can only contain lowercase letters, numbers, and hyphens.',
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          content: content.trim(),
          status,
        }),
      })

      const data: CreatePageResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create page')
      }

      // Success
      setOpen(false)
      setTitle('')
      setSlug('')
      setContent('')
      setStatus('draft')
      router.refresh()

      toast({
        title: 'Page Created',
        description: `Page "${title}" has been created successfully.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slug) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setSlug(generatedSlug)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Page
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Page</DialogTitle>
          <DialogDescription>
            Create a static page for your website. Pages can be used for about, contact, privacy policy, etc.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="page-title">Title</Label>
            <Input
              id="page-title"
              placeholder="e.g., About Us"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-slug">Slug</Label>
            <Input
              id="page-slug"
              placeholder="e.g., about-us"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              URL path: /pages/{slug || 'about-us'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value: 'draft' | 'published') => setStatus(value)}
              disabled={isCreating}
            >
              <SelectTrigger id="page-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-content">Content</Label>
            <Textarea
              id="page-content"
              placeholder="Page content (supports Markdown)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isCreating}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreatePage} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Page
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
