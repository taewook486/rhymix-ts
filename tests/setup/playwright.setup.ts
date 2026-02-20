import { FullConfig, request } from '@playwright/test'

/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use

  // Verify the application is running
  try {
    const context = await request.newContext({ baseURL })
    const response = await context.get('/')

    if (!response.ok()) {
      throw new Error(`Application is not running at ${baseURL}`)
    }

    console.log(`[Setup] Application is running at ${baseURL}`)
  } catch (error) {
    console.error('[Setup] Failed to connect to application:', error)
    throw error
  }

  // Store any global state if needed
  // For example, you could authenticate a test user here and save the state

  console.log('[Setup] Global setup completed successfully')
}

export default globalSetup
