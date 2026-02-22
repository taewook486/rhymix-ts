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
import { Loader2, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface EditGroupDialogProps {
  group: {
    id: string
    name: string
    description: string
  }
}

interface UpdateGroupResponse {
  success: boolean
  error?: string
  message?: string
  group?: any
}

export function EditGroupDialog({ group }: EditGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleUpdateGroup = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '그룹 이름을 입력해주세요.',
      })
      return
    }

    if (name.trim().length < 2) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '그룹 이름은 최소 2자 이상이어야 합니다.',
      })
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/admin/groups/${group.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      })

      const data: UpdateGroupResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update group')
      }

      // Success - use window.location.reload() instead of router.refresh() to avoid infinite loop
      toast({
        title: '그룹 수정 완료',
        description: `${name} 그룹이 수정되었습니다.`,
      })

      // Close dialog
      setOpen(false)

      // Use setTimeout to avoid potential race conditions
      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '그룹 수정 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>
            Update the group name and description.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Group Name</Label>
            <Input
              id="edit-name"
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isUpdating}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Group description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUpdating}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false)
              setName(group.name)
              setDescription(group.description || '')
            }}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdateGroup} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Group'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
