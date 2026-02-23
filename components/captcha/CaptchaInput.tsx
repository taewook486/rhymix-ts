'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw } from 'lucide-react'
import { generateCaptchaChallenge } from '@/app/actions/captcha'

interface CaptchaInputProps {
  onTokenChange: (token: string) => void
  onAnswerChange: (answer: string) => void
  disabled?: boolean
  error?: string
}

export function CaptchaInput({ onTokenChange, onAnswerChange, disabled, error }: CaptchaInputProps) {
  const [question, setQuestion] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [answer, setAnswer] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchCaptcha = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await generateCaptchaChallenge()
      if (result.success && result.data) {
        setQuestion(result.data.question)
        setToken(result.data.token)
        onTokenChange(result.data.token)
        setAnswer('')
        onAnswerChange('')
      }
    } catch (err) {
      console.error('Failed to fetch captcha:', err)
    } finally {
      setIsLoading(false)
    }
  }, [onTokenChange, onAnswerChange])

  useEffect(() => {
    fetchCaptcha()
  }, [fetchCaptcha])

  const handleAnswerChange = (value: string) => {
    setAnswer(value)
    onAnswerChange(value)
  }

  return (
    <div className="space-y-3">
      <Label>Spam Prevention</Label>
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Solve:</span>
            <span className="text-lg font-mono font-semibold">{question}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Enter answer"
              value={answer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={disabled || isLoading}
              className="w-32"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={fetchCaptcha}
              disabled={disabled || isLoading}
              title="Refresh captcha"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Please solve the math problem to verify you are human.
      </p>
    </div>
  )
}
