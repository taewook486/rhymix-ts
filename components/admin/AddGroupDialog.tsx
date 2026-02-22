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
import { Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface CreateGroupResponse {
  success: boolean
  error?: string
  message?: string
}

export function AddGroupDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreateGroup = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Group name is required.',
      })
      return
    }

    if (name.trim().length < 2) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Group name must be at least 2 characters.',
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || '',
        }),
      })

      const data: CreateGroupResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create group')
      }

      // Success - use window.location.reload() instead of router.refresh() to avoid infinite loop
      toast({
        title: 'Group Created',
        description: `Group "${name}" has been created successfully.`,
      })

      // Reset form and close dialog
      setOpen(false)
      setName('')
      setDescription('')

      // Use setTimeout to avoid potential race conditions
      setTimeout(() => {
        window.location.reload()
      }, 100)
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
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a user group to organize members and manage permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g., Moderators, Editors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              placeholder="Describe the purpose of this group..."
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
          <Button onClick={handleCreateGroup} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
