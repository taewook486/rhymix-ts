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

interface CreatePermissionResponse {
  success: boolean
  error?: string
  message?: string
}

const MODULES = [
  'board',
  'member',
  'document',
  'comment',
  'menu',
  'page',
  'file',
  'admin',
  'settings',
  'widget',
]

export function AddPermissionDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [module, setModule] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreatePermission = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Permission name is required.',
      })
      return
    }

    if (name.trim().length < 3) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Permission name must be at least 3 characters.',
      })
      return
    }

    if (!module) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please select a module.',
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          module,
        }),
      })

      const data: CreatePermissionResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create permission')
      }

      // Success
      setOpen(false)
      setName('')
      setDescription('')
      setModule('')
      router.refresh()

      toast({
        title: 'Permission Created',
        description: `Permission "${name}" has been created successfully.`,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Permission
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Permission</DialogTitle>
          <DialogDescription>
            Define a new access control permission for role-based access management.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="permission-name">Permission Name</Label>
            <Input
              id="permission-name"
              placeholder="e.g., create_post, delete_comment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Use descriptive names like: create_post, edit_board, delete_user
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="permission-module">Module</Label>
            <Select value={module} onValueChange={setModule} disabled={isCreating}>
              <SelectTrigger id="permission-module">
                <SelectValue placeholder="Select a module" />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map((mod) => (
                  <SelectItem key={mod} value={mod}>
                    {mod.charAt(0).toUpperCase() + mod.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="permission-description">Description</Label>
            <Textarea
              id="permission-description"
              placeholder="Describe what this permission allows..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={3}
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
          <Button onClick={handleCreatePermission} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Permission
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
