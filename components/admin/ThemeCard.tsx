'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Palette, Check, Eye, Star, Monitor, Smartphone, Tablet, Loader2 } from 'lucide-react'
import { activateTheme } from '@/app/actions/theme'
import { useToast } from '@/hooks/use-toast'

export interface Theme {
  id: string
  name: string
  title: string
  description: string
  version: string
  author: string
  is_active: boolean
  is_responsive: boolean
  preview_image: string
  supports_dark_mode: boolean
  installed_at: string
}

interface ThemeCardProps {
  theme: Theme
}

export function ThemeCard({ theme }: ThemeCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleActivate = () => {
    if (theme.is_active) return

    startTransition(async () => {
      const result = await activateTheme(theme.id)

      if (result.success) {
        toast({
          title: '테마 활성화',
          description: `"${theme.title}" 테마가 활성화되었습니다.`,
        })
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: '오류',
          description: result.error || '테마 활성화에 실패했습니다.',
        })
      }
    })
  }

  const handlePreview = () => {
    // Open preview in new tab with theme parameter
    const previewUrl = `${window.location.origin}?theme=${theme.name}`
    window.open(previewUrl, '_blank')
  }

  return (
    <Card className={`overflow-hidden ${theme.is_active ? 'ring-2 ring-primary' : ''}`}>
      <div className="relative aspect-video bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <Palette className="h-12 w-12 text-muted-foreground/50" />
        </div>
        {theme.is_active && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary text-primary-foreground">
              <Check className="mr-1 h-3 w-3" />
              Active
            </Badge>
          </div>
        )}
        {theme.supports_dark_mode && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              Dark Mode
            </Badge>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{theme.title}</CardTitle>
            <CardDescription className="mt-1">{theme.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>v{theme.version}</span>
            <span>by {theme.author}</span>
          </div>
          <div className="flex items-center gap-1">
            {theme.is_responsive && (
              <>
                <Monitor className="h-3 w-3" />
                <Tablet className="h-3 w-3" />
                <Smartphone className="h-3 w-3" />
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handlePreview}
          >
            <Eye className="mr-1 h-3 w-3" />
            Preview
          </Button>
          {!theme.is_active ? (
            <Button
              size="sm"
              className="flex-1"
              onClick={handleActivate}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Star className="mr-1 h-3 w-3" />
              )}
              Activate
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              <Check className="mr-1 h-3 w-3" />
              Active
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
