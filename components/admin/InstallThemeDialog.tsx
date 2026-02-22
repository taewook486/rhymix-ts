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
import { Download, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function InstallThemeDialog() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)
  const { toast } = useToast()

  const handleInstall = async () => {
    if (!url.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '테마 URL을 입력해주세요.',
      })
      return
    }

    setIsInstalling(true)

    // Simulate installation (in real app, this would download and install the theme)
    setTimeout(() => {
      setIsInstalling(false)
      setOpen(false)
      setUrl('')
      toast({
        title: '테마 설치',
        description: '테마 설치 기능은 준비 중입니다. DB 테이블 생성 후 구현됩니다.',
      })
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Install Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install New Theme</DialogTitle>
          <DialogDescription>
            Enter the URL of the theme package to install. Theme packages should be in ZIP format.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="theme-url">Theme Package URL</Label>
            <Input
              id="theme-url"
              placeholder="https://example.com/theme.zip"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isInstalling}
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: .zip, .tar.gz
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isInstalling}
          >
            Cancel
          </Button>
          <Button onClick={handleInstall} disabled={isInstalling}>
            {isInstalling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Install
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
