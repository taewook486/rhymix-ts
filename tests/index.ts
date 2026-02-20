/**
 * E2E Test Exports
 *
 * This file exports all test utilities, fixtures, and helpers
 * for use across the E2E test suite.
 */

// Re-export fixtures
export * from './fixtures/auth.fixture'

// Re-export helpers
export * from './helpers'

// Test configuration constants
export const TEST_CONFIG = {
  // Timeouts
  DEFAULT_TIMEOUT: 10000,
  NAVIGATION_TIMEOUT: 15000,
  ACTION_TIMEOUT: 10000,

  // Test data
  TEST_BOARD_SLUG: 'free',

  // Viewport sizes for responsive testing
  VIEWPORT_SIZES: {
    mobile: { width: 375, height: 667 },
    mobileLarge: { width: 414, height: 896 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 },
    desktopLarge: { width: 1920, height: 1080 },
  },

  // API endpoints (if needed)
  API: {
    AUTH: '/api/auth',
    BOARD: '/api/board',
    MEMBER: '/api/member',
  },
} as const

// Test data generators
export function generateTestUser() {
  const timestamp = Date.now()
  return {
    email: `test-${timestamp}@example.com`,
    password: 'TestPassword123!',
    displayName: `Test User ${timestamp}`,
  }
}

export function generateTestPost() {
  const timestamp = Date.now()
  return {
    title: `Test Post ${timestamp}`,
    content: `This is a test post content created at ${new Date(timestamp).toISOString()}`,
  }
}
