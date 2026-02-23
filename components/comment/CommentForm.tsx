'use client'

import { useState, useCallback } from 'react'
import { Send, X, Lock, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CaptchaInput } from '@/components/captcha'
import { cn } from '@/lib/utils'
import type { BoardConfig } from '@/types/board'

const MAX_CONTENT_LENGTH = 5000
const MIN_CONTENT_LENGTH = 1

interface CommentFormProps {
  onSubmit: (data: {
    content: string
    isSecret: boolean
    guest_name?: string
    guest_password?: string
    captcha_token?: string
    captcha_answer?: string
  }) => Promise<{ success: boolean; error?: string }>
  onCancel?: () => void
  isSubmitting?: boolean
  placeholder?: string
  submitLabel?: string
  initialContent?: string
  initialSecret?: boolean
  className?: string
  showSecretOption?: boolean
  // Guest posting support
  isLoggedIn?: boolean
  boardConfig?: BoardConfig
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
  isLoggedIn = true,
  boardConfig,
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent)
  const [isSecret, setIsSecret] = useState(initialSecret)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  // Guest posting state
  const [guestName, setGuestName] = useState('')
  const [guestPassword, setGuestPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')

  const allowAnonymous = boardConfig?.allow_anonymous || false
  const allowCaptcha = boardConfig?.allow_captcha || false
  const isGuestMode = !isLoggedIn && allowAnonymous

  const characterCount = content.length
  const isOverLimit = characterCount > MAX_CONTENT_LENGTH
  const isEmpty = characterCount < MIN_CONTENT_LENGTH
  const isValid = !isEmpty && !isOverLimit

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return

    // Validate guest fields
    if (isGuestMode) {
      if (!guestName || guestName.trim().length < 2) {
        setError('Name must be at least 2 characters.')
        return
      }
      if (!guestPassword || guestPassword.length < 4) {
        setError('Password must be at least 4 characters.')
        return
      }
      if (allowCaptcha && !captchaAnswer) {
        setError('Please complete the captcha.')
        return
      }
    }

    setError(null)
    const result = await onSubmit({
      content: content.trim(),
      isSecret,
      guest_name: isGuestMode ? guestName.trim() : undefined,
      guest_password: isGuestMode ? guestPassword : undefined,
      captcha_token: isGuestMode && allowCaptcha ? captchaToken : undefined,
      captcha_answer: isGuestMode && allowCaptcha ? captchaAnswer : undefined,
    })

    if (result.success) {
      setContent('')
      setIsSecret(false)
      setGuestName('')
      setGuestPassword('')
      setCaptchaAnswer('')
    } else {
      setError(result.error || 'Failed to submit comment')
    }
  }, [
    content,
    isSecret,
    isValid,
    isSubmitting,
    onSubmit,
    isGuestMode,
    guestName,
    guestPassword,
    allowCaptcha,
    captchaToken,
    captchaAnswer,
  ])

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
    setGuestName('')
    setGuestPassword('')
    setCaptchaAnswer('')
    onCancel?.()
  }, [onCancel])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Guest Information (only show for non-logged-in users when guest posting is enabled) */}
      {isGuestMode && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <User className="h-4 w-4" />
            Guest Information
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="guest_name" className="text-xs">Name *</Label>
              <Input
                id="guest_name"
                placeholder="Your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={isSubmitting}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guest_password" className="text-xs">Password *</Label>
              <Input
                id="guest_password"
                type="password"
                placeholder="Password"
                value={guestPassword}
                onChange={(e) => setGuestPassword(e.target.value)}
                disabled={isSubmitting}
                className="h-8"
              />
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
        />
      )}

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
