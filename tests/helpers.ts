import { Page, Locator } from '@playwright/test'

/**
 * Test Helpers for E2E Tests
 *
 * Common utilities and helper functions for Playwright tests
 */

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}

/**
 * Generate a random string for test data
 */
export function randomString(length: number = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}

/**
 * Generate a random email for testing
 */
export function randomEmail(domain: string = 'test.example.com'): string {
  return `test-${randomString(8)}@${domain}`
}

/**
 * Generate a random username for testing
 */
export function randomUsername(): string {
  return `testuser_${randomString(8)}`
}

/**
 * Check if element is visible within viewport
 */
export async function isInViewport(locator: Locator): Promise<boolean> {
  try {
    const box = await locator.boundingBox()
    if (!box) return false

    const viewport = locator.page().viewportSize()
    if (!viewport) return false

    return (
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height
    )
  } catch {
    return false
  }
}

/**
 * Scroll element into view if needed
 */
export async function scrollIntoViewIfNeeded(locator: Locator): Promise<void> {
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 5000 })
  } catch {
    // Element might not exist or not be scrollable
  }
}

/**
 * Click element and wait for navigation
 */
export async function clickAndWait(
  locator: Locator,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout || 10000

  await Promise.all([
    locator.page().waitForURL(/.*/, { timeout }),
    locator.click(),
  ])
}

/**
 * Fill form field and verify value
 */
export async function fillAndVerify(
  locator: Locator,
  value: string
): Promise<void> {
  await locator.fill(value)
  await locator.page().waitForTimeout(100) // Small delay for React state updates
}

/**
 * Clear and fill input field
 */
export async function clearAndFill(
  locator: Locator,
  value: string
): Promise<void> {
  await locator.clear()
  await locator.fill(value)
}

/**
 * Get text content of element, handling null case
 */
export async function getTextContent(locator: Locator): Promise<string> {
  try {
    const text = await locator.textContent()
    return text?.trim() || ''
  } catch {
    return ''
  }
}

/**
 * Check if element exists
 */
export async function exists(locator: Locator): Promise<boolean> {
  try {
    const count = await locator.count()
    return count > 0
  } catch {
    return false
  }
}

/**
 * Wait for element to be hidden or detached
 */
export async function waitForElementToDisappear(
  locator: Locator,
  timeout: number = 5000
): Promise<void> {
  try {
    await locator.waitFor({ state: 'hidden', timeout })
  } catch {
    // Element might already be gone
  }
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
  })
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  url: string,
  response: object,
  options?: { status?: number }
): Promise<void> {
  await page.route(url, (route) => {
    route.fulfill({
      status: options?.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}

/**
 * Clear all mocks
 */
export async function clearMocks(page: Page): Promise<void> {
  await page.unrouteAll({ behavior: 'ignoreErrors' })
}

/**
 * Accessibility check helpers
 */
export async function checkAccessibility(
  page: Page,
  options?: {
    rules?: Record<string, { enabled: boolean }>
  }
): Promise<void> {
  // This would integrate with axe-core if available
  // For now, it's a placeholder for accessibility testing
  console.log('Accessibility check with options:', options)
}

/**
 * Form validation helpers
 */
export async function getValidationErrors(page: Page): Promise<string[]> {
  const errors = await page.locator('[role="alert"], .error, .destructive').allTextContents()
  return errors.map((e) => e.trim()).filter((e) => e.length > 0)
}

export async function hasValidationError(page: Page): Promise<boolean> {
  const errors = await getValidationErrors(page)
  return errors.length > 0
}

/**
 * Date/time helpers for testing
 */
export function getTestDate(daysOffset: number = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date
}

export function formatTestDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Local storage helpers
 */
export async function setLocalStorage(
  page: Page,
  key: string,
  value: string
): Promise<void> {
  await page.evaluate(
    ({ k, v }) => {
      localStorage.setItem(k, v)
    },
    { k: key, v: value }
  )
}

export async function getLocalStorage(
  page: Page,
  key: string
): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key)
}

export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear())
}

/**
 * Cookie helpers
 */
export async function getCookies(
  page: Page
): Promise<Array<{ name: string; value: string }>> {
  const context = page.context()
  const cookies = await context.cookies()
  return cookies.map((c) => ({ name: c.name, value: c.value }))
}

export async function clearCookies(page: Page): Promise<void> {
  const context = page.context()
  await context.clearCookies()
}

/**
 * Responsive testing helpers
 */
export const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667 },
  mobileLarge: { width: 414, height: 896 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  desktopLarge: { width: 1920, height: 1080 },
} as const

export type ViewportSize = keyof typeof VIEWPORT_SIZES

export async function setViewport(
  page: Page,
  size: ViewportSize
): Promise<void> {
  const viewport = VIEWPORT_SIZES[size]
  await page.setViewportSize(viewport)
}

/**
 * Performance helpers
 */
export async function measurePageLoad(page: Page): Promise<number> {
  const timing = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return navigation ? navigation.loadEventEnd - navigation.fetchStart : 0
  })
  return timing
}

/**
 * Network helpers
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
}

export async function blockImages(page: Page): Promise<void> {
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg}', (route) => {
    route.abort()
  })
}

export async function blockFonts(page: Page): Promise<void> {
  await page.route('**/*.{woff,woff2,ttf,otf}', (route) => {
    route.abort()
  })
}
