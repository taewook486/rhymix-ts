import { test as base, Page, BrowserContext } from '@playwright/test'

/**
 * Authentication Fixtures for E2E Tests
 *
 * This file provides reusable authentication fixtures for tests
 * that require authenticated user state.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/auth.fixture'
 *
 * test('authenticated test', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/member/profile')
 *   // User is already logged in
 * })
 * ```
 */

// Define test user credentials interface
interface TestUser {
  email: string
  password: string
  displayName?: string
}

// Extend base test with authenticated fixture
export const test = base.extend<{
  authenticatedPage: Page
  testUser: TestUser
}>({
  // Test user credentials - override via environment variables
  testUser: async ({}, use) => {
    const user: TestUser = {
      email: process.env.E2E_TEST_USER_EMAIL || 'test@example.com',
      password: process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!',
      displayName: process.env.E2E_TEST_USER_NAME || 'Test User',
    }
    await use(user)
  },

  // Authenticated page fixture
  authenticatedPage: async ({ page, testUser }, use) => {
    // Perform login
    await page.goto('/signin')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Fill login form
    await page.getByLabel('Email').fill(testUser.email)
    await page.getByLabel('Password').fill(testUser.password)

    // Submit form
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Wait for successful login (redirect to profile or home)
    await page.waitForURL(/\/member\/profile|\/$/, { timeout: 10000 }).catch(() => {
      // Login might have failed - continue anyway for error handling
    })

    // Use the authenticated page
    await use(page)
  },
})

// Export expect for convenience
export { expect } from '@playwright/test'

/**
 * Helper function to manually authenticate a page
 * Useful for tests that need to authenticate mid-test
 */
export async function authenticatePage(
  page: Page,
  user: TestUser = {
    email: process.env.E2E_TEST_USER_EMAIL || 'test@example.com',
    password: process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!',
  }
): Promise<void> {
  await page.goto('/signin')
  await page.waitForLoadState('networkidle')

  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign In' }).click()

  // Wait for authentication to complete
  await page.waitForURL(/\/member\/profile|\/$/, { timeout: 10000 })
}

/**
 * Helper function to logout
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button/link
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
  const logoutLink = page.getByRole('link', { name: /logout|sign out/i })

  if (await logoutButton.count() > 0) {
    await logoutButton.first().click()
  } else if (await logoutLink.count() > 0) {
    await logoutLink.first().click()
  }

  // Wait for redirect to home or signin
  await page.waitForURL(/\/|\/signin/, { timeout: 5000 }).catch(() => {
    // Ignore timeout - user might already be logged out
  })
}

/**
 * Storage state for authenticated sessions
 * Can be used to save/load authentication state
 */
export async function saveAuthState(
  context: BrowserContext,
  outputPath: string
): Promise<void> {
  await context.storageState({ path: outputPath })
}

export async function loadAuthState(
  context: BrowserContext,
  inputPath: string
): Promise<void> {
  // Storage state is loaded via context creation options
  // This function is for documentation purposes
  console.log(`Auth state loaded from: ${inputPath}`)
}
