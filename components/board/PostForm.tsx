'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, User, Lock } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { CaptchaInput } from '@/components/captcha'
import type { Category } from '@/lib/supabase/database.types'
import type { BoardConfig } from '@/types/board'

const postFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  category_id: z.string().optional(),
  is_secret: z.boolean().optional(),
  tags: z.string().optional(),
  // Guest fields
  guest_name: z.string().optional(),
  guest_password: z.string().optional(),
})

type PostFormValues = z.infer<typeof postFormSchema>

interface PostFormProps {
  boardSlug: string
  categories: Category[]
  boardConfig?: BoardConfig
  isLoggedIn: boolean
  initialData?: {
    id: string
    title: string
    content: string
    category_id?: string | null
    is_secret: boolean
    tags: string[]
  }
  onSubmit: (data: PostFormValues & { captcha_token?: string; captcha_answer?: string }) => Promise<void>
  isEditing?: boolean
}

export function PostForm({
  boardSlug,
  categories,
  boardConfig,
  isLoggedIn,
  initialData,
  onSubmit,
  isEditing = false,
}: PostFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string>('')
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('')
  const [captchaError, setCaptchaError] = useState<string | null>(null)

  const allowAnonymous = boardConfig?.allow_anonymous || false
  const allowCaptcha = boardConfig?.allow_captcha || false
  const isGuestMode = !isLoggedIn && allowAnonymous

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      category_id: initialData?.category_id || undefined,
      is_secret: initialData?.is_secret || false,
      tags: initialData?.tags?.join(', ') || '',
      guest_name: '',
      guest_password: '',
    },
  })

  const selectedCategoryId = watch('category_id')
  const isSecret = watch('is_secret')
  const guestName = watch('guest_name')
  const guestPassword = watch('guest_password')

  const handleFormSubmit = async (data: PostFormValues) => {
    setIsSubmitting(true)
    setError(null)
    setCaptchaError(null)

    // Validate guest fields
    if (isGuestMode) {
      if (!guestName || guestName.trim().length < 2) {
        setError('Name must be at least 2 characters.')
        setIsSubmitting(false)
        return
      }
      if (!guestPassword || guestPassword.length < 4) {
        setError('Password must be at least 4 characters.')
        setIsSubmitting(false)
        return
      }
      if (allowCaptcha && !captchaAnswer) {
        setCaptchaError('Please complete the captcha.')
        setIsSubmitting(false)
        return
      }
    }

    try {
      await onSubmit({
        ...data,
        captcha_token: captchaToken,
        captcha_answer: captchaAnswer,
      })
      router.push(`/board/${boardSlug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      // Refresh captcha on error
      if (allowCaptcha) {
        setCaptchaAnswer('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Guest Information (only show for non-logged-in users when guest posting is enabled) */}
      {isGuestMode && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
          <h3 className="font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Guest Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guest_name">Name *</Label>
              <Input
                id="guest_name"
                placeholder="Your name"
                {...register('guest_name')}
                disabled={isSubmitting}
              />
              {errors.guest_name && (
                <p className="text-sm text-destructive">{errors.guest_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest_password">Password *</Label>
              <div className="relative">
                <Input
                  id="guest_password"
                  type="password"
                  placeholder="Password for editing"
                  {...register('guest_password')}
                  disabled={isSubmitting}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Used to edit or delete your post later
              </p>
              {errors.guest_password && (
                <p className="text-sm text-destructive">{errors.guest_password.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Captcha (show for guests when captcha is enabled) */}
      {isGuestMode && allowCaptcha && (
        <CaptchaInput
          onTokenChange={setCaptchaToken}
          onAnswerChange={setCaptchaAnswer}
          disabled={isSubmitting}
          error={captchaError || undefined}
        />
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Enter post title"
          {...register('title')}
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={selectedCategoryId || ''}
            onValueChange={(value) => setValue('category_id', value || undefined)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <RichTextEditor
          content={watch('content')}
          onChange={(html) => setValue('content', html)}
          placeholder="Enter your content..."
          editable={!isSubmitting}
          className="min-h-[300px]"
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          placeholder="Enter tags separated by commas"
          {...register('tags')}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple tags with commas (e.g., discussion, help, feature)
        </p>
      </div>

      {/* Secret post */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_secret"
          className="h-4 w-4 rounded border-gray-300"
          checked={isSecret}
          onChange={(e) => setValue('is_secret', e.target.checked)}
          disabled={isSubmitting}
        />
        <Label htmlFor="is_secret" className="font-normal">
          Secret post (only author and admins can see)
        </Label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Post' : 'Create Post'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
