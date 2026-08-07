import { vi } from 'vitest';

/**
 * App Router Mock Helper
 *
 * Provides centralized mocks for Next.js App Router request-scope context:
 * - next/headers: headers(), cookies()
 * - next/navigation: useSearchParams()
 *
 * @MX:NOTE: Shared helper prevents test failures from "headers() was called outside a request scope"
 * @MX:REASON: vitest jsdom environment doesn't provide App Router request-scope context
 * @MX:SPEC: SPEC-TEST-APP-ROUTER-001
 */

export interface AppRouterMockConfig {
  /** Optional header values to return from headers() */
  headers?: Record<string, string>;
  /** Optional cookie values to return from cookies().get() */
  cookies?: Record<string, string>;
  /** Optional search params to return from useSearchParams() */
  searchParams?: Record<string, string>;
}

/**
 * Setup mocks for Next.js App Router request-scope functions.
 * Call this in test file setup (beforeEach or test body).
 *
 * @example
 * ```ts
 * // Basic usage (defaults to empty values)
 * setupAppRouterMocks()
 *
 * // With custom values
 * setupAppRouterMocks({
 *   headers: { 'x-test': 'value' },
 *   searchParams: { key: 'val' }
 * })
 * ```
 */
export function setupAppRouterMocks(config?: AppRouterMockConfig): void {
  const {
    headers: headerValues = {},
    cookies: cookieValues = {},
    searchParams: searchParamValues = {},
  } = config || {};

  // Mock next/headers
  vi.mock('next/headers', () => ({
    headers: vi.fn(() => {
      const mockHeaders = new Headers();
      Object.entries(headerValues).forEach(([key, value]) => {
        mockHeaders.set(key, value);
      });
      return mockHeaders;
    }),
    cookies: vi.fn(() => ({
      get: vi.fn((name: string) => cookieValues[name]),
      getAll: vi.fn(() =>
        Object.entries(cookieValues).map(([name, value]) => ({ name, value }))
      ),
      has: vi.fn((name: string) => cookieValues[name] !== undefined),
      set: vi.fn(),
      delete: vi.fn(),
      forEach: vi.fn(),
      toString: vi.fn(() => ''),
    })),
  }));

  // Mock next/navigation
  vi.mock('next/navigation', () => ({
    useSearchParams: vi.fn(() => {
      const params = new URLSearchParams();
      Object.entries(searchParamValues).forEach(([key, value]) => {
        params.set(key, value);
      });
      return params;
    }),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    })),
    usePathname: vi.fn(() => '/'),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
  }));
}
