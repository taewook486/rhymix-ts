'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react'
import { createBoard, updateBoard, deleteBoard } from '@/app/actions/admin'
import { useToast } from '@/hooks/use-toast'

interface Board {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  is_locked: boolean
  post_count: number
  created_at: string
}

export function BoardsTable({ boards }: { boards: Board[] }) {
  const router = useRouter()
  const { toast } = useToast()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Posts</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No boards found. Create your first board to get started.
              </TableCell>
            </TableRow>
          ) : (
            boards.map((board) => (
              <TableRow key={board.id}>
                <TableCell className="font-medium">{board.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{board.slug}</code>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {board.description || 'No description'}
                </TableCell>
                <TableCell>{board.post_count || 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={board.is_active ? 'default' : 'secondary'}>{board.is_active ? 'Active' : 'Inactive'}</Badge>
                    {board.is_locked && <Badge variant="destructive">Locked</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <BoardActions board={board} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function BoardActions({ board }: { board: Board }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteBoard(board.id)

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Board deleted successfully',
        })
        router.refresh()
        setShowDeleteDialog(false)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete board',
        })
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Board
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <BoardsTable.EditBoardDialog board={board} open={showEditDialog} onOpenChange={setShowEditDialog} />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{board.name}&quot;? This action cannot be undone. All posts and comments in
              this board will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Create Board Dialog
function CreateBoardDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    is_locked: false,
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    setFormData((prev) => ({ ...prev, name, slug }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Board name is required',
      })
      return
    }

    if (!formData.slug.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Board slug is required',
      })
      return
    }

    startTransition(async () => {
      const result = await createBoard({
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        is_active: formData.is_active,
        is_locked: formData.is_locked,
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Board created successfully',
        })
        router.refresh()
        setOpen(false)
        setFormData({ name: '', slug: '', description: '', is_active: true, is_locked: false })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create board',
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>Create a new discussion board for your community.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Board Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="General Discussion"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug <span className="text-red-500">*</span>
            </Label>
            <Input
              id="slug"
              placeholder="general-discussion"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">URL-friendly identifier. Use lowercase letters, numbers, and hyphens.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="A place for general community discussions"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active</Label>
              <p className="text-xs text-muted-foreground">Make this board visible to users</p>
            </div>
            <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => handleChange('is_active', checked)} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_locked">Locked</Label>
              <p className="text-xs text-muted-foreground">Prevent new posts in this board</p>
            </div>
            <Switch id="is_locked" checked={formData.is_locked} onCheckedChange={(checked) => handleChange('is_locked', checked)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Board
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Edit Board Dialog
function EditBoardDialog({ board, open, onOpenChange }: { board: Board; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    name: board.name || '',
    slug: board.slug || '',
    description: board.description || '',
    is_active: board.is_active ?? true,
    is_locked: board.is_locked ?? false,
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Board name is required',
      })
      return
    }

    startTransition(async () => {
      const result = await updateBoard(board.id, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        is_active: formData.is_active,
        is_locked: formData.is_locked,
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Board updated successfully',
        })
        router.refresh()
        onOpenChange(false)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update board',
        })
      }
    })
  }

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: board.name,
        slug: board.slug,
        description: board.description || '',
        is_active: board.is_active,
        is_locked: board.is_locked,
      })
    }
  }, [open, board])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Board</DialogTitle>
          <DialogDescription>Update the board settings.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">
              Board Name <span className="text-red-500">*</span>
            </Label>
            <Input id="edit-name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-slug">
              Slug <span className="text-red-500">*</span>
            </Label>
            <Input id="edit-slug" value={formData.slug} onChange={(e) => handleChange('slug', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="edit-is_active">Active</Label>
              <p className="text-xs text-muted-foreground">Make this board visible to users</p>
            </div>
            <Switch
              id="edit-is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="edit-is_locked">Locked</Label>
              <p className="text-xs text-muted-foreground">Prevent new posts in this board</p>
            </div>
            <Switch
              id="edit-is_locked"
              checked={formData.is_locked}
              onCheckedChange={(checked) => handleChange('is_locked', checked)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Assign components
export { CreateBoardDialog, EditBoardDialog }
BoardsTable.CreateBoardDialog = CreateBoardDialog
BoardsTable.EditBoardDialog = EditBoardDialog
