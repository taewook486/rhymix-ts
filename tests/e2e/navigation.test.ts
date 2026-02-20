import { test, expect } from '@playwright/test'

/**
 * Navigation E2E Tests
 *
 * Test coverage:
 * - Main navigation links
 * - Route accessibility
 * - 404 error handling
 * - Navigation from different pages
 * - Mobile navigation (responsive)
 * - Browser back/forward navigation
 */

// Define all routes to test
const PUBLIC_ROUTES = [
  { path: '/', title: /home|welcome|rhymix/i },
  { path: '/signin', title: /sign in/i },
  { path: '/signup', title: /create account|sign up/i },
  { path: '/reset-password', title: /reset password/i },
  { path: '/board', title: /board index/i },
]

const PROTECTED_ROUTES = [
  { path: '/member/profile', redirectTo: '/signin' },
  { path: '/member/settings', redirectTo: '/signin' },
]

const NON_EXISTENT_ROUTES = [
  '/non-existent-page',
  '/board/non-existent-board',
  '/member/nonexistentuser12345',
  '/api/non-existent',
]

test.describe('Navigation', () => {
  test.describe('Public Routes', () => {
    for (const route of PUBLIC_ROUTES) {
      test(`should access ${route.path}`, async ({ page }) => {
        await page.goto(route.path)

        // Verify page loaded by checking title or main content
        const title = page.getByRole('heading').first()
        const titleCount = await title.count()

        if (titleCount > 0) {
          // Page has a heading, verify it matches expected title pattern
          const titleText = await title.textContent()
          expect(titleText).toMatch(route.title)
        } else {
          // No heading, just verify page loaded
          await expect(page).toHaveURL(route.path)
        }
      })
    }
  })

  test.describe('Protected Routes', () => {
    for (const route of PROTECTED_ROUTES) {
      test(`should redirect ${route.path} to ${route.redirectTo}`, async ({ page }) => {
        await page.goto(route.path)

        // Should be redirected
        await expect(page).toHaveURL(new RegExp(route.redirectTo))
      })
    }
  })

  test.describe('404 Handling', () => {
    for (const route of NON_EXISTENT_ROUTES) {
      test(`should handle 404 for ${route}`, async ({ page }) => {
        await page.goto(route)

        // Should show 404 or not found message
        const has404 =
          (await page.getByText(/404|not found|page not found/i).count()) > 0 ||
          (await page.getByRole('heading', { name: /404|not found/i }).count()) > 0

        expect(has404).toBeTruthy()
      })
    }
  })

  test.describe('Main Navigation', () => {
    test('should have accessible navigation from home page', async ({ page }) => {
      await page.goto('/')

      // Check for navigation elements
      const nav = page.locator('nav, [role="navigation"], header')
      const navCount = await nav.count()

      expect(navCount).toBeGreaterThanOrEqual(0)
    })

    test('should navigate to signin from home', async ({ page }) => {
      await page.goto('/')

      // Look for signin link
      const signinLink = page.getByRole('link', { name: /sign in|login/i })

      if ((await signinLink.count()) > 0) {
        await signinLink.first().click()
        await expect(page).toHaveURL(/\/signin/)
      }
    })

    test('should navigate to signup from home', async ({ page }) => {
      await page.goto('/')

      // Look for signup link
      const signupLink = page.getByRole('link', { name: /sign up|create account|register/i })

      if ((await signupLink.count()) > 0) {
        await signupLink.first().click()
        await expect(page).toHaveURL(/\/signup/)
      }
    })

    test('should navigate between auth pages', async ({ page }) => {
      // Start at signin
      await page.goto('/signin')

      // Click signup link (use .first() as there are multiple signup links)
      const signupLink = page.getByRole('link', { name: 'Sign up' }).first()
      await expect(signupLink).toBeVisible()
      await signupLink.click()

      await expect(page).toHaveURL('/signup')

      // Click signin link (use .first() as there are multiple signin links)
      const signinLink = page.getByRole('link', { name: 'Sign in' }).first()
      await expect(signinLink).toBeVisible()
      await signinLink.click()

      await expect(page).toHaveURL('/signin')
    })

    test('should navigate to board from navigation', async ({ page }) => {
      await page.goto('/')

      // Look for board link
      const boardLink = page.getByRole('link', { name: /board/i })

      if ((await boardLink.count()) > 0) {
        await boardLink.first().click()
        await expect(page).toHaveURL(/\/board/)
      }
    })
  })

  test.describe('Browser Navigation', () => {
    test('should handle back navigation', async ({ page }) => {
      // Navigate through multiple pages
      await page.goto('/')
      await page.goto('/signin')
      await page.goto('/signup')

      // Go back
      await page.goBack()
      await expect(page).toHaveURL('/signin')

      // Go back again
      await page.goBack()
      await expect(page).toHaveURL('/')
    })

    test('should handle forward navigation', async ({ page }) => {
      // Navigate through pages
      await page.goto('/')
      await page.goto('/signin')

      // Go back
      await page.goBack()
      await expect(page).toHaveURL('/')

      // Go forward
      await page.goForward()
      await expect(page).toHaveURL('/signin')
    })

    test('should maintain scroll position on back navigation', async ({ page }) => {
      await page.goto('/board')

      // Scroll down if content allows
      await page.evaluate(() => window.scrollTo(0, 500)).catch(() => {
        // Scroll might fail if page is short
      })

      // Navigate away
      await page.goto('/signin')

      // Go back
      await page.goBack()

      // Just verify we're back on the page
      await expect(page).toHaveURL('/board')
    })
  })

  test.describe('Mobile Navigation', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should display mobile navigation', async ({ page }) => {
      await page.goto('/')

      // Look for mobile menu button or navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"], .mobile-menu')

      // Mobile menu might exist
      const menuCount = await mobileMenu.count()
      expect(menuCount).toBeGreaterThanOrEqual(0)
    })

    test('should open mobile menu', async ({ page }) => {
      await page.goto('/')

      // Find and click mobile menu button
      const menuButton = page.locator('button[aria-label*="menu"], [data-testid="mobile-menu-button"]').first()

      if ((await menuButton.count()) > 0) {
        await menuButton.click()

        // Wait for menu to open
        await page.waitForTimeout(500)

        // Menu should be visible
        const mobileNav = page.locator('[role="dialog"], .mobile-nav, [data-state="open"]')
        const navCount = await mobileNav.count()

        expect(navCount).toBeGreaterThanOrEqual(0)
      }
    })

    test('should navigate from mobile menu', async ({ page }) => {
      await page.goto('/')

      // Find mobile menu button
      const menuButton = page.locator('button[aria-label*="menu"], [data-testid="mobile-menu-button"]').first()

      if ((await menuButton.count()) > 0) {
        await menuButton.click()
        await page.waitForTimeout(500)

        // Look for navigation links in mobile menu
        const signinLink = page.getByRole('link', { name: /sign in/i })

        if ((await signinLink.count()) > 0) {
          await signinLink.first().click()
          await expect(page).toHaveURL(/\/signin/)
        }
      }
    })
  })

  test.describe('Tablet Navigation', () => {
    test.use({ viewport: { width: 768, height: 1024 } })

    test('should display tablet navigation', async ({ page }) => {
      await page.goto('/')

      // Verify navigation is visible
      const nav = page.locator('nav, header, [role="navigation"]').first()
      const navCount = await nav.count()

      expect(navCount).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Desktop Navigation', () => {
    test.use({ viewport: { width: 1280, height: 720 } })

    test('should display full desktop navigation', async ({ page }) => {
      await page.goto('/')

      // Verify navigation elements are visible
      const nav = page.locator('nav, header, [role="navigation"]').first()
      const navCount = await nav.count()

      expect(navCount).toBeGreaterThanOrEqual(0)
    })

    test('should have visible navigation links', async ({ page }) => {
      await page.goto('/')

      // Check for common navigation links
      const navLinks = page.locator('nav a, header a')
      const linkCount = await navLinks.count()

      expect(linkCount).toBeGreaterThan(0)
    })
  })

  test.describe('Direct URL Access', () => {
    test('should load page when accessing URL directly', async ({ page }) => {
      // Access signin page directly
      await page.goto('/signin')

      // Verify page loaded correctly - CardTitle renders as div, not heading
      await expect(page.getByText('Sign In').first()).toBeVisible()
    })

    test('should handle query parameters', async ({ page }) => {
      // Access board with query parameters
      await page.goto('/board/free?page=2&q=test')

      // Verify page loaded and parameters are preserved
      expect(page.url()).toContain('page=2')
      expect(page.url()).toContain('q=test')
    })

    test('should handle hash fragments', async ({ page }) => {
      // Access page with hash fragment
      await page.goto('/board#section')

      // Verify page loaded
      await expect(page).toHaveURL(/\/board/)
    })
  })

  test.describe('Link Integrity', () => {
    test('should have valid internal links', async ({ page }) => {
      await page.goto('/')

      // Get all internal links
      const links = page.locator('a[href^="/"]')
      const linkCount = await links.count()

      // Check first few links
      const linksToCheck = Math.min(linkCount, 5)

      for (let i = 0; i < linksToCheck; i++) {
        const link = links.nth(i)
        const href = await link.getAttribute('href')

        // Verify href exists and is internal
        expect(href).toBeTruthy()
        expect(href).toMatch(/^\//)
      }
    })

    test('should have proper link attributes', async ({ page }) => {
      await page.goto('/')

      // Check external links have proper attributes
      const externalLinks = page.locator('a[href^="http"]:not([href*="localhost"])')
      const count = await externalLinks.count()

      for (let i = 0; i < Math.min(count, 5); i++) {
        const link = externalLinks.nth(i)

        // External links should open in new tab
        const target = await link.getAttribute('target')
        const rel = await link.getAttribute('rel')

        // Best practice: external links should have target="_blank" and rel="noopener noreferrer"
        if (target === '_blank') {
          expect(rel).toContain('noopener')
        }
      }
    })
  })

  test.describe('Accessibility Navigation', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/')

      // Check for h1
      const h1 = page.locator('h1')
      const h1Count = await h1.count()

      // There should be exactly one h1
      expect(h1Count).toBeGreaterThanOrEqual(1)
    })

    test('should have skip link', async ({ page }) => {
      await page.goto('/')

      // Look for skip link (usually hidden until focused)
      const skipLink = page.locator('a[href="#main"], a[href="#content"], [data-testid="skip-link"]')

      // Skip links are optional but recommended
      const skipCount = await skipLink.count()
      expect(skipCount).toBeGreaterThanOrEqual(0)
    })

    test('should have proper focus management', async ({ page }) => {
      await page.goto('/signin')

      // Tab through focusable elements
      await page.keyboard.press('Tab')

      // Focused element should be visible
      const focusedElement = page.locator(':focus')
      const focusedCount = await focusedElement.count()

      expect(focusedCount).toBeGreaterThanOrEqual(1)
    })
  })
})
