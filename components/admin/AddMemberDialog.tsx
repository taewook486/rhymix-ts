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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface CreateMemberResponse {
  success: boolean
  error?: string
  message?: string
}

export function AddMemberDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [password, setPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreateMember = async () => {
    // Validation
    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '이메일을 입력해주세요.',
      })
      return
    }

    if (!displayName.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '표시 이름을 입력해주세요.',
      })
      return
    }

    if (!password.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '비밀번호를 입력해주세요.',
      })
      return
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '비밀번호는 최소 6자 이상이어야 합니다.',
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/admin/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          display_name: displayName.trim(),
          role,
          password,
        }),
      })

      const data: CreateMemberResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create member')
      }

      // Success
      setOpen(false)
      setEmail('')
      setDisplayName('')
      setRole('member')
      setPassword('')
      router.refresh()

      toast({
        title: '회원 추가 완료',
        description: `${displayName} 님이 추가되었습니다.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '회원 추가 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Create a new user account. An invitation email will be sent to the user.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isCreating}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value: 'member' | 'admin') => setRole(value)}
              disabled={isCreating}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isCreating}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters. User can change this after first login.
            </p>
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
          <Button onClick={handleCreateMember} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
