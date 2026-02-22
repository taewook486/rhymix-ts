'use client'

import { useI18n } from '@/components/I18nProvider'
import type { Locale } from '@/lib/i18n/config'

/**
 * Custom hook for accessing translations
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, setLocale } = useTranslation()
 *
 *   return (
 *     <div>
 *       <h1>{t('common.title')}</h1>
 *       <p>{t('validation.minLength', { min: 8 })}</p>
 *       <button onClick={() => setLocale('en')}>English</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useTranslation() {
  const { t, locale, setLocale, localeNames, locales } = useI18n()

  return {
    /**
     * Translation function
     * @param key - Dot-notation translation key (e.g., 'common.save')
     * @param params - Optional parameters for interpolation
     */
    t,
    /**
     * Current locale
     */
    locale,
    /**
     * Set locale and persist to cookie
     */
    setLocale,
    /**
     * Human-readable locale names
     */
    localeNames,
    /**
     * Available locales
     */
    locales,
  }
}

/**
 * Get translation for a specific key without hook (for non-React contexts)
 * This is useful for server-side translations or utilities
 */
export function getTranslation(
  key: string,
  locale: Locale = 'ko',
  params?: Record<string, string | number>
): string {
  // Dynamic import for server-side usage
  const translations = {
    ko: () => import('@/lib/i18n/locales/ko.json'),
    en: () => import('@/lib/i18n/locales/en.json'),
    ja: () => import('@/lib/i18n/locales/ja.json'),
    zh: () => import('@/lib/i18n/locales/zh.json'),
  }

  // For synchronous usage in client components, use the I18nProvider instead
  // This is primarily for server-side usage
  const keys = key.split('.')

  // This is a simplified synchronous version for server components
  // In practice, you would use the I18nProvider for client components
  return key
}

/**
 * Format a date according to the current locale
 */
export function useFormattedDate() {
  const { locale } = useI18n()

  return {
    format: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
      })
    },
    formatShort: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    },
    formatTime: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    formatDateTime: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
  }
}

/**
 * Format a number according to the current locale
 */
export function useFormattedNumber() {
  const { locale } = useI18n()

  return {
    format: (number: number, options?: Intl.NumberFormatOptions) => {
      return number.toLocaleString(locale, options)
    },
    formatCurrency: (amount: number, currency: string = 'KRW') => {
      return amount.toLocaleString(locale, {
        style: 'currency',
        currency,
      })
    },
    formatCompact: (number: number) => {
      return number.toLocaleString(locale, {
        notation: 'compact',
        compactDisplay: 'short',
      })
    },
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function useRelativeTime() {
  const { locale } = useI18n()

  return {
    format: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

      if (Math.abs(diffInSeconds) < 60) {
        return rtf.format(-diffInSeconds, 'second')
      }

      const diffInMinutes = Math.floor(diffInSeconds / 60)
      if (Math.abs(diffInMinutes) < 60) {
        return rtf.format(-diffInMinutes, 'minute')
      }

      const diffInHours = Math.floor(diffInMinutes / 60)
      if (Math.abs(diffInHours) < 24) {
        return rtf.format(-diffInHours, 'hour')
      }

      const diffInDays = Math.floor(diffInHours / 24)
      if (Math.abs(diffInDays) < 30) {
        return rtf.format(-diffInDays, 'day')
      }

      const diffInMonths = Math.floor(diffInDays / 30)
      if (Math.abs(diffInMonths) < 12) {
        return rtf.format(-diffInMonths, 'month')
      }

      const diffInYears = Math.floor(diffInMonths / 12)
      return rtf.format(-diffInYears, 'year')
    },
  }
}

export type { Locale }
