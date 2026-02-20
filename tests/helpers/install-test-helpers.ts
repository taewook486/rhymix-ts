/**
 * Installation Test Helpers
 *
 * Utility functions and fixtures for installation wizard E2E tests.
 */

import { Page, expect } from '@playwright/test'

// =====================================================
// TYPES
// =====================================================

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export interface AdminAccountData {
  email: string
  password: string
  confirmPassword: string
  nickname: string
  userId: string
}

export interface SiteConfig {
  siteName: string
  timezone: string
  language: string
}

export interface InstallationStatus {
  status: 'pending' | 'in_progress' | 'completed'
  currentStep: number
  siteName?: string
  adminEmail?: string
}

// =====================================================
// TEST DATA GENERATORS
// =====================================================

/**
 * Generate unique test data with timestamp
 */
export function generateTestData() {
  const timestamp = Date.now()

  return {
    admin: {
      email: `admin-${timestamp}@test.com`,
      password: 'TestAdmin123!',
      confirmPassword: 'TestAdmin123!',
      nickname: 'Test Admin',
      userId: `testadmin_${timestamp}`,
    } as AdminAccountData,
    site: {
      siteName: `Test Site ${timestamp}`,
      timezone: 'Asia/Seoul',
      language: 'ko',
    } as SiteConfig,
  }
}

/**
 * Generate invalid test data for validation testing
 */
export function generateInvalidTestData() {
  return {
    supabase: {
      invalidUrl: 'not-a-url',
      nonSupabaseUrl: 'https://google.com',
      shortKey: 'short-key',
      emptyUrl: '',
      emptyKey: '',
    },
    admin: {
      emptyEmail: '',
      invalidEmail: 'not-an-email',
      shortEmail: 'a@b',
      emptyPassword: '',
      weakPassword: 'weak',
      noUppercase: 'password123!',
      noLowercase: 'PASSWORD123!',
      noNumber: 'PasswordTest!',
      noSpecial: 'Password123',
      mismatchedPassword: 'DifferentPassword123!',
      shortUserId: 'ab',
      longUserId: 'a'.repeat(25),
      invalidUserId: 'Invalid-User!',
      shortNickname: 'A',
      longNickname: 'A'.repeat(25),
    },
    site: {
      emptyName: '',
      shortName: 'A',
      longName: 'A'.repeat(60),
    },
  }
}

// =====================================================
// PAGE ACTIONS
// =====================================================

/**
 * Complete full installation wizard flow
 */
export async function completeInstallation(
  page: Page,
  options: {
    supabase: SupabaseConfig
    admin?: Partial<AdminAccountData>
    site?: Partial<SiteConfig>
  }
) {
  const testData = generateTestData()
  const adminData = { ...testData.admin, ...options.admin }
  const siteData = { ...testData.site, ...options.site }

  // Step 1: Welcome
  await page.goto('/install')
  await page.getByTestId('button-start-installation').click()
  await page.waitForLoadState('networkidle')

  // Step 2: Supabase
  await page.getByTestId('input-supabase-url').fill(options.supabase.url)
  await page.getByTestId('input-supabase-key').fill(options.supabase.anonKey)
  await page.getByTestId('button-next').click()
  await page.waitForLoadState('networkidle')

  // Step 3: Admin
  await page.getByTestId('input-admin-email').fill(adminData.email)
  await page.getByTestId('input-user-id').fill(adminData.userId)
  await page.getByTestId('input-nickname').fill(adminData.nickname)
  await page.getByTestId('input-password').fill(adminData.password)
  await page.getByTestId('input-confirm-password').fill(adminData.confirmPassword)
  await page.getByTestId('button-next').click()
  await page.waitForLoadState('networkidle')

  // Step 4: Config
  await page.getByTestId('input-site-name').fill(siteData.siteName)
  await page.getByTestId('button-next').click()
  await page.waitForLoadState('networkidle')

  // Step 5: Complete
  await page.waitForSelector('text=Installation Complete!', { timeout: 30000 })

  return { adminData, siteData }
}

/**
 * Navigate to specific installation step
 */
export async function navigateToStep(page: Page, step: number) {
  const routes = ['', 'welcome', 'supabase', 'admin', 'config', 'complete']
  const route = routes[step]

  if (route === '' || route === 'welcome') {
    await page.goto('/install')
  } else {
    await page.goto(`/install/${route}`)
  }

  await page.waitForLoadState('networkidle')
}

/**
 * Fill Supabase configuration form
 */
export async function fillSupabaseForm(page: Page, config: SupabaseConfig) {
  await page.getByTestId('input-supabase-url').fill(config.url)
  await page.getByTestId('input-supabase-key').fill(config.anonKey)
}

/**
 * Fill admin account form
 */
export async function fillAdminForm(page: Page, data: AdminAccountData) {
  await page.getByTestId('input-admin-email').fill(data.email)
  await page.getByTestId('input-user-id').fill(data.userId)
  await page.getByTestId('input-nickname').fill(data.nickname)
  await page.getByTestId('input-password').fill(data.password)
  await page.getByTestId('input-confirm-password').fill(data.confirmPassword)
}

/**
 * Fill site configuration form
 */
export async function fillSiteConfigForm(page: Page, data: Partial<SiteConfig>) {
  if (data.siteName) {
    await page.getByTestId('input-site-name').fill(data.siteName)
  }

  if (data.timezone) {
    await page.getByTestId('select-timezone').click()
    await page.getByRole('option', { name: new RegExp(data.timezone, 'i') }).click()
  }

  if (data.language) {
    await page.getByTestId('select-language').click()
    const langOption = data.language === 'ko' ? /한국어/i : /english/i
    await page.getByRole('option', { name: langOption }).click()
  }
}

// =====================================================
// ASSERTIONS
// =====================================================

/**
 * Assert installation step is visible
 */
export async function assertStepVisible(page: Page, step: number) {
  await expect(page.getByTestId(`install-step-${step}`)).toBeVisible()
}

/**
 * Assert error message is displayed
 */
export async function assertErrorMessage(page: Page, message: string | RegExp) {
  const alert = page.locator('[role="alert"]')
  await expect(alert.getByText(message)).toBeVisible()
}

/**
 * Assert current URL matches pattern
 */
export async function assertUrl(page: Page, pattern: string | RegExp) {
  await expect(page).toHaveURL(pattern)
}

/**
 * Assert form field has value
 */
export async function assertFieldValue(page: Page, testId: string, value: string) {
  const input = page.getByTestId(testId)
  await expect(input).toHaveValue(value)
}

/**
 * Assert button is in loading state
 */
export async function assertButtonLoading(page: Page, testId: string) {
  const button = page.getByTestId(testId)
  await expect(button).toBeDisabled()

  // Check for spinner
  const spinner = button.locator('.animate-spin')
  await expect(spinner).toBeVisible()
}

// =====================================================
// MOCK HELPERS
// =====================================================

/**
 * Mock Supabase connection validation (for isolated testing)
 */
export async function mockSupabaseValidation(page: Page, success: boolean = true) {
  await page.route('**/rest/v1/**', (route) => {
    if (success) {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      })
    } else {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      })
    }
  })
}

/**
 * Mock installation status API
 */
export async function mockInstallationStatus(
  page: Page,
  status: InstallationStatus
) {
  await page.route('**/api/installation-status', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(status),
    })
  })
}

// =====================================================
// CLEANUP HELPERS
// =====================================================

/**
 * Reset installation state (for test isolation)
 * Note: This requires a test API endpoint or database access
 */
export async function resetInstallation(page: Page) {
  // Navigate to a reset endpoint or call an API
  // This is environment-specific
  try {
    await page.request.post('/api/test/reset-installation')
  } catch {
    // Ignore if endpoint doesn't exist
    console.warn('Reset installation endpoint not available')
  }
}

/**
 * Clear all form inputs on a page
 */
export async function clearAllInputs(page: Page) {
  const inputs = await page.locator('input:not([type="hidden"])').all()

  for (const input of inputs) {
    await input.clear()
  }
}

// =====================================================
// WAIT HELPERS
// =====================================================

/**
 * Wait for installation step to complete
 */
export async function waitForStepCompletion(page: Page, timeout = 30000) {
  // Wait for loading spinner to disappear
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout })

  // Wait for navigation or success state
  await page.waitForLoadState('networkidle')
}

/**
 * Wait for form validation to complete
 */
export async function waitForValidation(page: Page) {
  // Small delay to allow form validation to run
  await page.waitForTimeout(500)
}

/**
 * Wait for toast/notification to appear
 */
export async function waitForToast(page: Page, timeout = 5000) {
  await page.waitForSelector('[role="status"], [data-sonner-toast]', { timeout })
}

// =====================================================
// ACCESSIBILITY HELPERS
// =====================================================

/**
 * Check if page is keyboard navigable
 */
export async function checkKeyboardNavigation(page: Page) {
  const focusableElements = await page.locator(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ).all()

  const results: { element: string; visible: boolean }[] = []

  for (const element of focusableElements) {
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase())
    const isVisible = await element.isVisible()

    results.push({ element: tagName, visible: isVisible })
  }

  return results
}

/**
 * Get all ARIA labels on page
 */
export async function getAriaLabels(page: Page) {
  return page.evaluate(() => {
    const elements = document.querySelectorAll('[aria-label]')
    return Array.from(elements).map((el) => ({
      tag: el.tagName.toLowerCase(),
      label: el.getAttribute('aria-label'),
    }))
  })
}

// =====================================================
// VISUAL REGRESSION HELPERS
// =====================================================

/**
 * Take screenshot with consistent naming
 */
export async function takeScreenshot(page: Page, name: string, options?: { fullPage?: boolean }) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: options?.fullPage ?? false,
  })
}

/**
 * Compare current page with baseline
 */
export async function compareWithBaseline(page: Page, name: string) {
  // This would integrate with Playwright's visual comparison
  // For now, just take a screenshot
  await takeScreenshot(page, `current-${name}`)
}
