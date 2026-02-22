/**
 * i18n Configuration for Rhymix-TS
 * Supports Korean (ko), English (en), Japanese (ja), Chinese (zh)
 */

export const locales = ['ko', 'en', 'ja', 'zh'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'ko'

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
}

export const localeFlags: Record<Locale, string> = {
  ko: '🇰🇷',
  en: '🇺🇸',
  ja: '🇯🇵',
  zh: '🇨🇳',
}

/**
 * Cookie name for storing language preference
 */
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE'

/**
 * Cookie expiration in days
 */
export const LOCALE_COOKIE_MAX_AGE = 365

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string | undefined): locale is Locale {
  return locales.includes(locale as Locale)
}

/**
 * Get locale from various sources
 * Priority: URL > Cookie > Accept-Language header > Default
 */
export function getLocale(
  urlLocale?: string,
  cookieLocale?: string,
  acceptLanguage?: string
): Locale {
  // Check URL locale
  if (urlLocale && isValidLocale(urlLocale)) {
    return urlLocale
  }

  // Check cookie locale
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale
  }

  // Parse Accept-Language header
  if (acceptLanguage) {
    const preferredLocale = parseAcceptLanguage(acceptLanguage)
    if (preferredLocale) {
      return preferredLocale
    }
  }

  return defaultLocale
}

/**
 * Parse Accept-Language header and return matching locale
 */
function parseAcceptLanguage(acceptLanguage: string): Locale | null {
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, q = 'q=1'] = lang.trim().split(';')
      const quality = parseFloat(q.split('=')[1]) || 0
      return { code: code.toLowerCase(), quality }
    })
    .sort((a, b) => b.quality - a.quality)

  for (const { code } of languages) {
    // Exact match
    if (isValidLocale(code)) {
      return code
    }

    // Language code match (e.g., 'ko-KR' -> 'ko')
    const langCode = code.split('-')[0]
    if (isValidLocale(langCode)) {
      return langCode
    }
  }

  return null
}

/**
 * Get the path without locale prefix
 */
export function getPathWithoutLocale(pathname: string): string {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return pathname.slice(locale.length + 1) || '/'
    }
  }
  return pathname
}

/**
 * Add locale prefix to path
 */
export function getLocalizedPath(pathname: string, locale: Locale): string {
  const pathWithoutLocale = getPathWithoutLocale(pathname)
  return `/${locale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`
}

/**
 * Get browser locale (client-side)
 */
export function getBrowserLocale(): Locale | null {
  if (typeof window === 'undefined') return null

  const browserLang = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage
  if (browserLang) {
    const langCode = browserLang.split('-')[0]
    if (isValidLocale(langCode)) {
      return langCode
    }
  }

  return null
}
