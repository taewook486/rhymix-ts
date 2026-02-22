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
import { Plus, Loader2, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface InstallModuleResponse {
  success: boolean
  error?: string
  message?: string
}

export function InstallModuleDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)
  const { toast } = useToast()

  const handleInstallModule = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Module name is required.',
      })
      return
    }

    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Module title is required.',
      })
      return
    }

    setIsInstalling(true)

    // For now, just show a message since module installation requires file system access
    setTimeout(() => {
      setOpen(false)
      setName('')
      setTitle('')
      setDescription('')
      setUrl('')
      setIsInstalling(false)

      toast({
        title: 'Module Installation',
        description: 'Module installation requires file system access. This feature will be available after server-side module loader implementation.',
      })
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Install Module
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install New Module</DialogTitle>
          <DialogDescription>
            Install a Rhymix module from a package URL or local file. Modules extend the functionality of your CMS.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="module-name">Module Name</Label>
            <Input
              id="module-name"
              placeholder="e.g., blog, gallery, forum"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isInstalling}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for the module (lowercase, letters, numbers)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-title">Module Title</Label>
            <Input
              id="module-title"
              placeholder="e.g., Blog Module"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isInstalling}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-description">Description</Label>
            <Textarea
              id="module-description"
              placeholder="Describe what this module does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isInstalling}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-url">Package URL (Optional)</Label>
            <Input
              id="module-url"
              placeholder="https://example.com/module.zip"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isInstalling}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to upload from local file
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isInstalling}
          >
            Cancel
          </Button>
          <Button onClick={handleInstallModule} disabled={isInstalling}>
            {isInstalling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Install Module
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
