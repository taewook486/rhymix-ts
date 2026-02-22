'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from '@/hooks/useTranslation'
import type { Locale } from '@/lib/i18n/config'

export function LanguageSwitcher() {
  const { locale, localeNames, locales } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = (newLocale: Locale) => {
    // Remove current locale prefix from path if present
    let pathWithoutLocale = pathname
    for (const l of locales) {
      if (pathname.startsWith(`/${l}/`) || pathname === `/${l}`) {
        pathWithoutLocale = pathname.slice(l.length + 1) || '/'
        break
      }
    }

    // Build new path with locale prefix
    const newPath = pathWithoutLocale === '/'
      ? `/${newLocale}`
      : `/${newLocale}${pathWithoutLocale}`

    // Navigate to the new locale path
    router.push(newPath)
  }

  const localeFlags: Record<Locale, string> = {
    ko: '🇰🇷',
    en: '🇺🇸',
    ja: '🇯🇵',
    zh: '🇨🇳',
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{localeNames[locale]}</span>
          <span className="sm:hidden">{localeFlags[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => handleLocaleChange(l)}
            className={l === locale ? 'bg-accent' : ''}
          >
            <span className="mr-2">{localeFlags[l]}</span>
            {localeNames[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Compact language switcher for mobile/space-constrained UIs
 */
export function LanguageSwitcherCompact() {
  const { locale, locales } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()

  const cycleLocale = () => {
    const currentIndex = locales.indexOf(locale)
    const nextIndex = (currentIndex + 1) % locales.length
    const nextLocale = locales[nextIndex]

    // Remove current locale prefix from path if present
    let pathWithoutLocale = pathname
    for (const l of locales) {
      if (pathname.startsWith(`/${l}/`) || pathname === `/${l}`) {
        pathWithoutLocale = pathname.slice(l.length + 1) || '/'
        break
      }
    }

    // Build new path with locale prefix
    const newPath = pathWithoutLocale === '/'
      ? `/${nextLocale}`
      : `/${nextLocale}${pathWithoutLocale}`

    router.push(newPath)
  }

  return (
    <Button variant="ghost" size="sm" onClick={cycleLocale}>
      {locale.toUpperCase()}
    </Button>
  )
}
