import { FullConfig, request } from '@playwright/test'
import { chromium } from '@playwright/test'

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

  // Setup for installation tests
  try {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    // Check if installation is complete
    await page.goto(`${baseURL}/install`)
    await page.waitForLoadState('networkidle')

    // Store installation state in a file for tests to use
    const isOnInstallPage = page.url().includes('/install')

    console.log(`[Setup] Installation page accessible: ${isOnInstallPage}`)

    await browser.close()
  } catch (error) {
    console.warn('[Setup] Could not check installation state:', error)
    // Continue anyway - tests will handle this
  }

  // Store any global state if needed
  // For example, you could authenticate a test user here and save the state

  console.log('[Setup] Global setup completed successfully')
}

export default globalSetup
