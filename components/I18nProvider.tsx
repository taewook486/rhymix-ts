'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import {
  Locale,
  defaultLocale,
  locales,
  LOCALE_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE,
} from '@/lib/i18n/config'

// Import all locale translations
import koTranslations from '@/lib/i18n/locales/ko.json'
import enTranslations from '@/lib/i18n/locales/en.json'
import jaTranslations from '@/lib/i18n/locales/ja.json'
import zhTranslations from '@/lib/i18n/locales/zh.json'

type Translations = typeof koTranslations

const translations: Record<Locale, Translations> = {
  ko: koTranslations,
  en: enTranslations,
  ja: jaTranslations,
  zh: zhTranslations,
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
  localeNames: Record<Locale, string>
  locales: readonly Locale[]
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

interface I18nProviderProps {
  children: ReactNode
  initialLocale?: Locale
}

const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setCurrentLocale] = useState<Locale>(initialLocale || defaultLocale)
  const [mounted, setMounted] = useState(false)

  // Get initial locale from cookie or browser on mount
  useEffect(() => {
    setMounted(true)

    if (initialLocale) {
      setCurrentLocale(initialLocale)
      return
    }

    // Check cookie first
    const cookieLocale = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${LOCALE_COOKIE_NAME}=`))
      ?.split('=')[1]

    if (cookieLocale && locales.includes(cookieLocale as Locale)) {
      setCurrentLocale(cookieLocale as Locale)
      return
    }

    // Check browser language
    const browserLang = navigator.language.split('-')[0]
    if (locales.includes(browserLang as Locale)) {
      setCurrentLocale(browserLang as Locale)
    }
  }, [initialLocale])

  // Set locale and persist to cookie
  const setLocale = useCallback((newLocale: Locale) => {
    setCurrentLocale(newLocale)

    // Set cookie with expiration
    const maxAge = LOCALE_COOKIE_MAX_AGE * 24 * 60 * 60
    document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale};path=/;max-age=${maxAge};SameSite=Lax`
  }, [])

  // Translation function with nested key support and parameter interpolation
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.')
      let value: unknown = translations[locale]

      // Navigate through nested keys
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k]
        } else {
          // Key not found, return key itself
          console.warn(`Translation key not found: ${key}`)
          return key
        }
      }

      if (typeof value !== 'string') {
        console.warn(`Translation value is not a string: ${key}`)
        return key
      }

      // Interpolate parameters
      if (params) {
        return Object.entries(params).reduce(
          (str, [paramKey, paramValue]) =>
            str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)),
          value
        )
      }

      return value
    },
    [locale]
  )

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <I18nContext.Provider
        value={{
          locale: defaultLocale,
          setLocale: () => {},
          t: (key) => key,
          localeNames,
          locales,
        }}
      >
        {children}
      </I18nContext.Provider>
    )
  }

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        localeNames,
        locales,
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Re-export useTranslation as an alias for convenience
export const useTranslation = useI18n
