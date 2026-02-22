import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Rhymix/)
  })

  test('should display navigation', async ({ page }) => {
    await page.goto('/')

    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('should display footer', async ({ page }) => {
    await page.goto('/')

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
  })
})

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should show signup form', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

test.describe('Boards', () => {
  test('should display board list', async ({ page }) => {
    await page.goto('/boards')

    await expect(page.locator('h1')).toContainText('Board')
  })

  test('should navigate to board detail', async ({ page }) => {
    await page.goto('/boards')

    // This test assumes there's at least one board
    const firstBoard = page.locator('a[href^="/board/"]').first()
    if (await firstBoard.isVisible()) {
      await firstBoard.click()
      await expect(page).toHaveURL(/\/board\/.*/)
    }
  })
})
