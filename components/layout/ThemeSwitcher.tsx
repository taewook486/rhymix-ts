'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { getThemes, type SiteTheme } from '@/app/actions/theme'
import { useTheme } from 'next-themes'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [themes, setThemes] = useState<SiteTheme[]>([])
  const [activeTheme, setActiveTheme] = useState<SiteTheme | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadThemes()
  }, [])

  const loadThemes = async () => {
    const result = await getThemes()
    if (result.success && result.data) {
      setThemes(result.data)
      const active = result.data.find((t) => t.is_active)
      if (active) {
        setActiveTheme(active)
      }
    }
  }

  const handleThemeSelect = async (selectedTheme: SiteTheme) => {
    // For built-in color schemes, use next-themes
    if (selectedTheme.name === 'light' || selectedTheme.name === 'dark' || selectedTheme.name === 'system') {
      setTheme(selectedTheme.name)
      return
    }

    // For custom site themes, you would activate them via server action
    // This is typically done in admin panel, not in public theme switcher
    setActiveTheme(selectedTheme)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Built-in color schemes */}
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">색상 테마</div>
        <DropdownMenuItem onClick={() => handleThemeSelect({ name: 'light' } as SiteTheme)}>
          <Sun className="mr-2 h-4 w-4" />
          라이트 모드
          {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeSelect({ name: 'dark' } as SiteTheme)}>
          <Moon className="mr-2 h-4 w-4" />
          다크 모드
          {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeSelect({ name: 'system' } as SiteTheme)}>
          <Monitor className="mr-2 h-4 w-4" />
          시스템
          {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Site themes */}
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">사이트 테마</div>
        {themes.map((siteTheme) => (
          <DropdownMenuItem
            key={siteTheme.id}
            onClick={() => handleThemeSelect(siteTheme)}
          >
            <div className="flex items-center gap-2 flex-1">
              <div
                className="h-4 w-4 rounded border"
                style={{
                  backgroundColor: siteTheme.name === 'dark' ? '#1a1a1a' : '#ffffff',
                  borderColor: siteTheme.name === 'dark' ? '#333' : '#ddd',
                }}
              />
              <span className="text-sm">{siteTheme.title}</span>
            </div>
            {activeTheme?.id === siteTheme.id && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
