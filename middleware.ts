import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  locales,
  defaultLocale,
  isValidLocale,
  LOCALE_COOKIE_NAME,
  getPathWithoutLocale,
} from '@/lib/i18n/config'

interface Cookie {
  name: string
  value: string
  options?: Record<string, unknown>
}

// Paths that should be accessible during installation
const INSTALLATION_ALLOWED_PATHS = [
  '/install',
  '/signin',
  '/signup',
  '/login',
  '/register',
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
]

// Paths that should not be localized
const I18N_EXCLUDED_PATHS = [
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/install',
  '/admin',
  '/signin',
  '/signup',
  '/login',
  '/register',
  '/reset-password',
  '/auth',
]

// Legacy route redirects (Rhymix PHP compatibility)
// Maps old PHP routes to new Next.js routes
const LEGACY_REDIRECTS: Record<string, string> = {
  // Board routes (plural to singular)
  '/boards': '/board',
  // Member/Auth routes
  '/members/login': '/signin',
  '/members/signin': '/signin',
  '/members/signup': '/signup',
  '/members/logout': '/signin', // Redirect to signin after logout
  '/member/login': '/signin',
  '/member/signin': '/signin',
  '/member/signup': '/signup',
  '/login': '/signin',
  '/register': '/signup',
}

// Note: Installation check is applied to all non-allowed paths in the middleware matcher

/**
 * Check if Supabase environment variables are configured
 */
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Check if installation is complete via API call
 */
async function checkInstallationComplete(request: NextRequest): Promise<boolean> {
  // If Supabase is not configured, redirect to installation
  if (!isSupabaseConfigured()) {
    return false
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(_cookiesToSet: readonly Cookie[]) {
            // We don't need to set cookies in this check
          },
        },
      }
    )

    const { data, error } = await supabase
      .from('installation_status')
      .select('status')
      .limit(1)
      .single()

    if (error || !data) {
      return false
    }

    return data.status === 'completed'
  } catch {
    return false
  }
}

/**
 * Parse Accept-Language header and return the best matching locale
 */
function getLocaleFromHeader(acceptLanguage: string): string | null {
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
 * Check if path should be excluded from i18n routing
 */
function isExcludedFromI18n(pathname: string): boolean {
  // Special case: exact root path
  if (pathname === '/') {
    return true
  }

  // Static files
  if (
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.json')
  ) {
    return true
  }

  return I18N_EXCLUDED_PATHS.some((path) => pathname.startsWith(path))
}

/**
 * Check if pathname already has a locale prefix
 */
function hasLocalePrefix(pathname: string): boolean {
  return locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
}

/**
 * Check if the path is allowed during installation
 */
function isAllowedDuringInstallation(pathname: string): boolean {
  // Exact matches
  if (INSTALLATION_ALLOWED_PATHS.includes(pathname)) {
    return true
  }

  // Prefix matches for install paths
  if (pathname.startsWith('/install')) {
    return true
  }

  // Next.js internal paths
  if (pathname.startsWith('/_next')) {
    return true
  }

  // API routes
  if (pathname.startsWith('/api')) {
    return true
  }

  // Static files
  if (
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  ) {
    return true
  }

  return false
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Step 0: Handle legacy route redirects (Rhymix PHP compatibility)
  // Check for legacy routes and redirect to new routes
  // This handles paths like /ko/boards -> /ko/board, /ko/members/login -> /ko/signin
  for (const [legacyPath, newPath] of Object.entries(LEGACY_REDIRECTS)) {
    // Check direct match (without locale)
    if (pathname === legacyPath) {
      const url = request.nextUrl.clone()
      url.pathname = newPath
      return NextResponse.redirect(url, 301) // Permanent redirect
    }

    // Check with locale prefix (e.g., /ko/boards -> /ko/board)
    for (const locale of locales) {
      const localizedLegacyPath = `/${locale}${legacyPath}`
      const localizedNewPath = `/${locale}${newPath}`

      if (pathname === localizedLegacyPath) {
        const url = request.nextUrl.clone()
        url.pathname = localizedNewPath
        return NextResponse.redirect(url, 301) // Permanent redirect
      }
    }
  }

  // Step 1: Handle i18n locale detection
  // Only redirect non-locale paths to locale-prefixed paths
  // Let Next.js naturally handle app/[locale]/... routes without rewrite
  if (!isExcludedFromI18n(pathname)) {
    const pathnameHasLocale = hasLocalePrefix(pathname)

    if (!pathnameHasLocale) {
      // URL has no locale prefix (e.g., /home, /board) - redirect with locale
      const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value
      const acceptLanguage = request.headers.get('accept-language') || ''
      const headerLocale = getLocaleFromHeader(acceptLanguage)

      let locale: string = defaultLocale
      if (cookieLocale && isValidLocale(cookieLocale)) {
        locale = cookieLocale
      } else if (headerLocale) {
        locale = headerLocale
      }

      // REDIRECT to locale-prefixed URL
      // /home -> /ko/home
      // /board -> /ko/board
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}${pathname}`
      return NextResponse.redirect(url)
    }
    // If pathname has locale (e.g., /ko/home), let Next.js handle it naturally
    // It will match to app/[locale]/... routes without any rewrite
  }

  // Step 2: Check installation status for protected routes
  if (!isAllowedDuringInstallation(pathname)) {
    const isInstalled = await checkInstallationComplete(request)

    if (!isInstalled) {
      // Redirect to installation wizard
      const url = request.nextUrl.clone()
      url.pathname = '/install'
      return NextResponse.redirect(url)
    }
  }

  // Step 3: If installation is complete and user is on /install, redirect to home
  if (pathname.startsWith('/install')) {
    const isInstalled = await checkInstallationComplete(request)

    if (isInstalled && pathname !== '/install/complete') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Step 4: Handle authentication with Supabase
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip Supabase auth if not configured
  if (!isSupabaseConfigured()) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: readonly Cookie[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()

  // Helper to check if path matches (with or without locale prefix)
  const pathMatchesLocaleAware = (basePath: string) => {
    // Check direct match
    if (pathname.startsWith(basePath)) return true
    // Check with locale prefix (e.g., /ko/admin, /en/member)
    for (const locale of locales) {
      if (pathname.startsWith(`/${locale}${basePath}`)) return true
    }
    return false
  }

  // Step 5: Protect admin routes
  if (pathMatchesLocaleAware('/admin')) {
    if (!data.user) {
      const url = request.nextUrl.clone()
      // Extract locale from pathname and preserve it in redirect
      const pathParts = pathname.split('/')
      const locale = locales.includes(pathParts[1] as any) ? pathParts[1] : defaultLocale
      url.pathname = `/${locale}/signin`
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Note: Admin role check should be done in the page/component
    // Middleware cannot reliably query user roles without session
  }

  // Step 6: Protect member routes
  if (pathMatchesLocaleAware('/member')) {
    // Check if it's a public profile
    const pathParts = pathname.split('/')
    // Pattern: /{locale}/member/{username} or /member/{username}
    let isPublicProfile = false

    // Check /{locale}/member/{username} pattern
    // /ko/member/{username} is public IF {username} is NOT 'profile' or 'settings'
    if (pathParts.length === 4 && locales.includes(pathParts[1] as any)) {
      const thirdSegment = pathParts[3] // {username}
      isPublicProfile = thirdSegment !== 'profile' && thirdSegment !== 'settings'
    }
    // Check /member/{username} pattern
    else if (pathParts.length === 3 && pathParts[1] === 'member') {
      const thirdSegment = pathParts[2] // {username}
      isPublicProfile = thirdSegment !== 'profile' && thirdSegment !== 'settings'
    }

    if (!isPublicProfile && !data.user) {
      const url = request.nextUrl.clone()
      // Extract locale from pathname and preserve it in redirect
      const locale = locales.includes(pathParts[1] as any) ? pathParts[1] : defaultLocale
      url.pathname = `/${locale}/signin`
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * But we explicitly handle installation checking, so we match most paths
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
