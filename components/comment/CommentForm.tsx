'use client'

import { useState, useCallback } from 'react'
import { Send, X, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MAX_CONTENT_LENGTH = 5000
const MIN_CONTENT_LENGTH = 1

interface CommentFormProps {
  onSubmit: (content: string, isSecret: boolean) => Promise<{ success: boolean; error?: string }>
  onCancel?: () => void
  isSubmitting?: boolean
  placeholder?: string
  submitLabel?: string
  initialContent?: string
  initialSecret?: boolean
  className?: string
  showSecretOption?: boolean
}

export function CommentForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  placeholder = 'Write a comment...',
  submitLabel = 'Post Comment',
  initialContent = '',
  initialSecret = false,
  className,
  showSecretOption = true,
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent)
  const [isSecret, setIsSecret] = useState(initialSecret)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const characterCount = content.length
  const isOverLimit = characterCount > MAX_CONTENT_LENGTH
  const isEmpty = characterCount < MIN_CONTENT_LENGTH
  const isValid = !isEmpty && !isOverLimit

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return

    setError(null)
    const result = await onSubmit(content.trim(), isSecret)

    if (result.success) {
      setContent('')
      setIsSecret(false)
    } else {
      setError(result.error || 'Failed to submit comment')
    }
  }, [content, isSecret, isValid, isSubmitting, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleCancel = useCallback(() => {
    setContent('')
    setIsSecret(false)
    setError(null)
    onCancel?.()
  }, [onCancel])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Textarea */}
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={isSubmitting}
          className={cn(
            'min-h-[100px] resize-none',
            isOverLimit && 'border-destructive focus-visible:ring-destructive',
            error && 'border-destructive'
          )}
          aria-label="Comment content"
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
        <div className="flex items-center gap-2">
          {showSecretOption && (
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
          )}
          {isSecret && (
            <span className="text-xs text-muted-foreground">
              Only you and the post author can see this
            </span>
          )}
        </div>

        {/* Right side - Submit/Cancel */}
        <div className="flex items-center gap-2">
          {onCancel && (
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
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="gap-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{submitLabel}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      {focused && (
        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> +{' '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to submit
        </p>
      )}
    </div>
  )
}
