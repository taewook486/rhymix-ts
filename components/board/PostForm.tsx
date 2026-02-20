'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Category } from '@/lib/supabase/database.types'

const postFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  category_id: z.string().optional(),
  is_secret: z.boolean().optional(),
  tags: z.string().optional(),
})

type PostFormValues = z.infer<typeof postFormSchema>

interface PostFormProps {
  boardSlug: string
  categories: Category[]
  initialData?: {
    id: string
    title: string
    content: string
    category_id?: string | null
    is_secret: boolean
    tags: string[]
  }
  onSubmit: (data: PostFormValues) => Promise<void>
  isEditing?: boolean
}

export function PostForm({
  boardSlug,
  categories,
  initialData,
  onSubmit,
  isEditing = false,
}: PostFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    },
  })

  const selectedCategoryId = watch('category_id')
  const isSecret = watch('is_secret')

  const handleFormSubmit = async (data: PostFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit(data)
      router.push(`/board/${boardSlug}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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
        <Textarea
          id="content"
          placeholder="Write your post content..."
          className="min-h-[300px] resize-y"
          {...register('content')}
          disabled={isSubmitting}
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
