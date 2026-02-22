'use client'

import { useState, useCallback } from 'react'
import { Check, X, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CommentWithAuthor } from '@/types/board'

const MAX_CONTENT_LENGTH = 5000
const MIN_CONTENT_LENGTH = 1

interface CommentEditorProps {
  comment: CommentWithAuthor
  onSubmit: (content: string, isSecret: boolean) => Promise<{ success: boolean; error?: string }>
  onCancel: () => void
  isSubmitting?: boolean
  className?: string
}

export function CommentEditor({
  comment,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
}: CommentEditorProps) {
  const [content, setContent] = useState(comment.content)
  const [isSecret, setIsSecret] = useState(comment.is_secret)
  const [error, setError] = useState<string | null>(null)

  const characterCount = content.length
  const isOverLimit = characterCount > MAX_CONTENT_LENGTH
  const isEmpty = characterCount < MIN_CONTENT_LENGTH
  const isValid = !isEmpty && !isOverLimit
  const hasChanges = content !== comment.content || isSecret !== comment.is_secret

  const handleSubmit = useCallback(async () => {
    if (!isValid || !hasChanges || isSubmitting) return

    setError(null)
    const result = await onSubmit(content.trim(), isSecret)

    if (!result.success) {
      setError(result.error || 'Failed to update comment')
    }
  }, [content, isSecret, isValid, hasChanges, isSubmitting, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
      // Cancel on Escape
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [handleSubmit, onCancel]
  )

  const handleCancel = useCallback(() => {
    setContent(comment.content)
    setIsSecret(comment.is_secret)
    setError(null)
    onCancel()
  }, [comment.content, comment.is_secret, onCancel])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Editing
        </Badge>
        {isSecret && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Lock className="w-3 h-3" />
            Secret
          </Badge>
        )}
      </div>

      {/* Textarea */}
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Edit your comment..."
          disabled={isSubmitting}
          autoFocus
          className={cn(
            'min-h-[100px] resize-none',
            isOverLimit && 'border-destructive focus-visible:ring-destructive',
            error && 'border-destructive'
          )}
          aria-label="Edit comment content"
        />

        {/* Character counter */}
        <div
          className={cn(
            'absolute bottom-2 right-2 text-xs transition-colors',
            isOverLimit ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {characterCount}/{MAX_CONTENT_LENGTH}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Left side - Secret toggle */}
        <Button
          type="button"
          variant={isSecret ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setIsSecret(!isSecret)}
          disabled={isSubmitting}
          className={cn('gap-1', isSecret && 'bg-secondary')}
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs">Secret</span>
        </Button>

        {/* Right side - Save/Cancel */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || !hasChanges || isSubmitting}
            className="gap-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Change indicator */}
      {hasChanges && !isSubmitting && (
        <p className="text-xs text-muted-foreground">
          You have unsaved changes
        </p>
      )}

      {/* Keyboard shortcut hint */}
      <p className="text-xs text-muted-foreground">
        Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> +{' '}
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to save or{' '}
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> to cancel
      </p>
    </div>
  )
}
