import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Step 1: Check installation status for protected routes
  if (!isAllowedDuringInstallation(pathname)) {
    const isInstalled = await checkInstallationComplete(request)

    if (!isInstalled) {
      // Redirect to installation wizard
      const url = request.nextUrl.clone()
      url.pathname = '/install'
      return NextResponse.redirect(url)
    }
  }

  // Step 2: If installation is complete and user is on /install, redirect to home
  if (pathname.startsWith('/install')) {
    const isInstalled = await checkInstallationComplete(request)

    if (isInstalled && pathname !== '/install/complete') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Step 3: Handle authentication with Supabase
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

  // Step 4: Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!data.user) {
      const url = request.nextUrl.clone()
      url.pathname = '/signin'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Note: Admin role check should be done in the page/component
    // Middleware cannot reliably query user roles without session
  }

  // Step 5: Protect member routes
  if (pathname.startsWith('/member')) {
    // Allow /member/profile/[username] for public profiles
    const pathParts = pathname.split('/')
    const isPublicProfile =
      pathParts.length === 4 &&
      pathParts[1] === 'member' &&
      pathParts[2] !== 'settings' &&
      pathParts[3] !== 'settings'

    if (!isPublicProfile && !data.user) {
      const url = request.nextUrl.clone()
      url.pathname = '/signin'
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
