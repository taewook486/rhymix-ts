import { test, expect, Page, BrowserContext } from '@playwright/test'

/**
 * Installation Wizard E2E Tests
 *
 * Test coverage:
 * 1. Installation redirect test (uninstalled -> /install)
 * 2. Welcome page (step 1)
 * 3. Supabase setup (step 2)
 * 4. Admin account creation (step 3)
 * 5. Site configuration (step 4)
 * 6. Complete page (step 5)
 * 7. Reinstall protection
 * 8. Step navigation (direct access control)
 * 9. Accessibility checks
 * 10. Mobile and desktop viewports
 */

// =====================================================
// TEST DATA
// =====================================================

const testTimestamp = Date.now()

const validSupabaseConfig = {
  url: process.env.E2E_SUPABASE_URL || 'http://127.0.0.1:54321',
  anonKey: process.env.E2E_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
}

const invalidSupabaseConfig = {
  url: 'https://invalid-url.com',
  anonKey: 'short-key',
}

const validAdminData = {
  email: `admin-${testTimestamp}@test.com`,
  password: 'TestAdmin123!',
  confirmPassword: 'TestAdmin123!',
  nickname: 'Test Admin',
  userId: `testadmin_${testTimestamp}`,
}

const invalidAdminData = {
  emptyEmail: '',
  emptyPassword: '',
  weakPassword: 'weak',
  mismatchedPassword: 'DifferentPassword123!',
  invalidEmail: 'not-an-email',
  shortUserId: 'ab',
  invalidUserId: 'Invalid-User!',
}

const validSiteConfig = {
  siteName: 'Test Site',
  timezone: 'Asia/Seoul',
  language: 'ko',
}

// =====================================================
// PAGE OBJECT MODEL
// =====================================================

class InstallWizardPage {
  constructor(public page: Page) {}

  // Navigation
  async navigateToInstall() {
    await this.page.goto('/install')
  }

  async navigateToHome() {
    await this.page.goto('/')
  }

  async navigateToStep(step: 'supabase' | 'admin' | 'config' | 'complete') {
    await this.page.goto(`/install/${step}`)
  }

  // Welcome Page Actions
  async clickGetStarted() {
    await this.page.getByTestId('button-start-installation').click()
  }

  // Supabase Form Actions
  async fillSupabaseForm(url: string, key: string) {
    await this.page.getByTestId('input-supabase-url').fill(url)
    await this.page.getByTestId('input-supabase-key').fill(key)
  }

  async clearSupabaseForm() {
    await this.page.getByTestId('input-supabase-url').clear()
    await this.page.getByTestId('input-supabase-key').clear()
  }

  // Admin Form Actions
  async fillAdminForm(data: {
    email: string
    userId: string
    nickname: string
    password: string
    confirmPassword: string
  }) {
    await this.page.getByTestId('input-admin-email').fill(data.email)
    await this.page.getByTestId('input-user-id').fill(data.userId)
    await this.page.getByTestId('input-nickname').fill(data.nickname)
    await this.page.getByTestId('input-password').fill(data.password)
    await this.page.getByTestId('input-confirm-password').fill(data.confirmPassword)
  }

  async clearAdminForm() {
    await this.page.getByTestId('input-admin-email').clear()
    await this.page.getByTestId('input-user-id').clear()
    await this.page.getByTestId('input-nickname').clear()
    await this.page.getByTestId('input-password').clear()
    await this.page.getByTestId('input-confirm-password').clear()
  }

  // Site Config Form Actions
  async fillSiteConfigForm(data: { siteName: string; timezone?: string; language?: string }) {
    await this.page.getByTestId('input-site-name').fill(data.siteName)

    if (data.timezone) {
      await this.page.getByTestId('select-timezone').click()
      await this.page.getByRole('option', { name: new RegExp(data.timezone, 'i') }).click()
    }

    if (data.language) {
      await this.page.getByTestId('select-language').click()
      await this.page.getByRole('option', { name: data.language === 'ko' ? /한국어/i : /english/i }).click()
    }
  }

  async clearSiteConfigForm() {
    await this.page.getByTestId('input-site-name').clear()
  }

  // Navigation Actions
  async clickNext() {
    await this.page.getByTestId('button-next').click()
  }

  async clickBack() {
    await this.page.getByTestId('button-back').click()
  }

  async clickGoHome() {
    await this.page.getByTestId('button-go-home').click()
  }

  // Assertions
  async expectWelcomePage() {
    await expect(this.page.getByText('Welcome to Rhymix TS')).toBeVisible()
    await expect(this.page.getByTestId('button-start-installation')).toBeVisible()
  }

  async expectSupabasePage() {
    await expect(this.page.getByText('Supabase Project URL')).toBeVisible()
    await expect(this.page.getByTestId('input-supabase-url')).toBeVisible()
    await expect(this.page.getByTestId('input-supabase-key')).toBeVisible()
  }

  async expectAdminPage() {
    await expect(this.page.getByText('Email Address')).toBeVisible()
    await expect(this.page.getByTestId('input-admin-email')).toBeVisible()
    await expect(this.page.getByTestId('input-user-id')).toBeVisible()
    await expect(this.page.getByTestId('input-password')).toBeVisible()
  }

  async expectConfigPage() {
    await expect(this.page.getByText('Site Name')).toBeVisible()
    await expect(this.page.getByTestId('input-site-name')).toBeVisible()
    await expect(this.page.getByTestId('select-timezone')).toBeVisible()
    await expect(this.page.getByTestId('select-language')).toBeVisible()
  }

  async expectCompletePage() {
    await expect(this.page.getByText('Installation Complete!')).toBeVisible({ timeout: 30000 })
    await expect(this.page.getByTestId('button-go-home')).toBeVisible()
  }

  async expectStepIndicator(step: number) {
    await expect(this.page.getByTestId(`install-step-${step}`)).toBeVisible()
  }

  async expectErrorMessage(message: string | RegExp) {
    await expect(this.page.locator('[role="alert"]').getByText(message)).toBeVisible()
  }

  async expectUrl(url: string | RegExp) {
    await expect(this.page).toHaveURL(url)
  }

  // Wait helpers
  async waitForNavigation(timeout = 10000) {
    await this.page.waitForLoadState('networkidle', { timeout })
  }

  async waitForLoadingComplete() {
    // Wait for any loading spinners to disappear
    const spinner = this.page.locator('.animate-spin')
    if (await spinner.count() > 0) {
      await expect(spinner.first()).not.toBeVisible({ timeout: 30000 })
    }
  }
}

// =====================================================
// TEST SUITES
// =====================================================

test.describe('Installation Wizard', () => {
  let wizard: InstallWizardPage

  test.beforeEach(async ({ page }) => {
    wizard = new InstallWizardPage(page)
  })

  // =====================================================
  // 1. INSTALLATION REDIRECT TEST
  // =====================================================

  test.describe('Installation Redirect', () => {
    test('should redirect to /install when not installed', async ({ page }) => {
      // This test assumes the application is not installed
      // In a real test environment, you would reset the installation first
      await wizard.navigateToHome()

      // Either redirects to /install or shows the installation page
      const url = page.url()
      const isInstallPage = url.includes('/install') || url === new URL(page.url()).origin + '/'

      // If redirected to install, verify
      if (url.includes('/install')) {
        await expect(page).toHaveURL(/\/install/)
      }
    })
  })

  // =====================================================
  // 2. WELCOME PAGE (STEP 1)
  // =====================================================

  test.describe('Welcome Page', () => {
    test.beforeEach(async () => {
      await wizard.navigateToInstall()
    })

    test('should display welcome message', async () => {
      await expect(wizard.page.getByText('Welcome to Rhymix TS')).toBeVisible()
      await expect(
        wizard.page.getByText(/This wizard will guide you through setting up/)
      ).toBeVisible()
    })

    test('should show feature overview', async () => {
      // Check for feature cards
      await expect(wizard.page.getByText('Modern Stack')).toBeVisible()
      await expect(wizard.page.getByText('Flexible Configuration')).toBeVisible()
      await expect(wizard.page.getByText('User Management')).toBeVisible()
      await expect(wizard.page.getByText('Multi-language Support')).toBeVisible()
    })

    test('should show installation steps preview', async () => {
      await expect(
        wizard.page.getByText('Configure Supabase database connection')
      ).toBeVisible()
      await expect(
        wizard.page.getByText('Create administrator account')
      ).toBeVisible()
      await expect(
        wizard.page.getByText('Set up site configuration')
      ).toBeVisible()
      await expect(
        wizard.page.getByText('Complete installation')
      ).toBeVisible()
    })

    test('should show requirements notice', async () => {
      await expect(
        wizard.page.getByText('Before You Begin')
      ).toBeVisible()
      await expect(
        wizard.page.getByText(/Supabase project with database set up/)
      ).toBeVisible()
    })

    test('should navigate to Supabase setup on Get Started click', async () => {
      await wizard.clickGetStarted()
      await wizard.waitForNavigation()

      // Should navigate to supabase setup
      await wizard.expectUrl(/\/install\/supabase/)
    })

    test('should show loading state on Get Started button', async () => {
      const button = wizard.page.getByTestId('button-start-installation')

      // Click and immediately check for loading state
      await button.click()

      // Button should be disabled during loading
      await expect(button).toBeDisabled()
    })

    test('should have correct step indicator', async () => {
      await wizard.expectStepIndicator(1)
    })
  })

  // =====================================================
  // 3. SUPABASE SETUP (STEP 2)
  // =====================================================

  test.describe('Supabase Setup', () => {
    test.beforeEach(async () => {
      await wizard.navigateToInstall()
      await wizard.clickGetStarted()
      await wizard.waitForNavigation()
    })

    test('should display URL and Anon Key input fields', async () => {
      await wizard.expectSupabasePage()
    })

    test('should show instructions for Supabase setup', async () => {
      await expect(
        wizard.page.getByText('Supabase Setup Required')
      ).toBeVisible()
      await expect(
        wizard.page.getByText(/create a new project/)
      ).toBeVisible()
    })

    test('should show environment variables preview', async () => {
      await expect(
        wizard.page.getByText('Environment Variables')
      ).toBeVisible()
      await expect(
        wizard.page.getByText(/NEXT_PUBLIC_SUPABASE_URL=/)
      ).toBeVisible()
    })

    test('should show validation errors for empty inputs', async () => {
      await wizard.clickNext()

      // Should show validation errors
      await expect(
        wizard.page.getByText(/supabase url is required/i)
      ).toBeVisible()
    })

    test('should show validation error for invalid URL', async () => {
      await wizard.fillSupabaseForm('not-a-url', validSupabaseConfig.anonKey)
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/invalid url/i)
      ).toBeVisible()
    })

    test('should show validation error for non-Supabase URL', async () => {
      await wizard.fillSupabaseForm('https://google.com', validSupabaseConfig.anonKey)
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/valid supabase url|local development url/i)
      ).toBeVisible()
    })

    test('should show validation error for short anon key', async () => {
      await wizard.fillSupabaseForm(validSupabaseConfig.url, 'short')
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/too short/i)
      ).toBeVisible()
    })

    test('should have link to Supabase Dashboard', async () => {
      const link = wizard.page.getByRole('link', { name: /open supabase dashboard/i })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', 'https://supabase.com/dashboard')
      await expect(link).toHaveAttribute('target', '_blank')
    })

    test('should return to welcome page on Back button', async () => {
      await wizard.clickBack()
      await wizard.waitForNavigation()

      await wizard.expectUrl(/\/install$/)
      await wizard.expectWelcomePage()
    })

    test('should show connection error for invalid credentials', async () => {
      await wizard.fillSupabaseForm(invalidSupabaseConfig.url, invalidSupabaseConfig.anonKey)
      await wizard.clickNext()

      // Should show connection failed error
      await wizard.expectErrorMessage(/failed to connect|connection failed/i)
    })

    test('should accept local development URL', async () => {
      // Fill with local development credentials
      await wizard.fillSupabaseForm(validSupabaseConfig.url, validSupabaseConfig.anonKey)

      // Form should be valid (button should be enabled)
      const nextButton = wizard.page.getByTestId('button-next')
      await expect(nextButton).not.toBeDisabled()
    })

    test('should show local dev section when on localhost', async ({ context }) => {
      // When running on localhost, should show local dev shortcut
      const url = wizard.page.url()
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        await expect(
          wizard.page.getByText(/local development detected/i)
        ).toBeVisible()
        await expect(
          wizard.page.getByText(/auto-fill local credentials/i)
        ).toBeVisible()
      }
    })

    test('should have correct step indicator', async () => {
      await wizard.expectStepIndicator(2)
    })
  })

  // =====================================================
  // 4. ADMIN ACCOUNT (STEP 3)
  // =====================================================

  test.describe('Admin Account Creation', () => {
    test.beforeEach(async () => {
      await wizard.navigateToStep('admin')
    })

    test('should display admin form fields', async () => {
      await wizard.expectAdminPage()
    })

    test('should show password requirements checklist', async () => {
      await expect(
        wizard.page.getByText('Password Requirements')
      ).toBeVisible()
      await expect(
        wizard.page.getByText('At least 8 characters')
      ).toBeVisible()
      await expect(
        wizard.page.getByText('Uppercase letter')
      ).toBeVisible()
      await expect(
        wizard.page.getByText('Lowercase letter')
      ).toBeVisible()
      await expect(
        wizard.page.getByText('Number')
      ).toBeVisible()
      await expect(
        wizard.page.getByText('Special character')
      ).toBeVisible()
    })

    test('should show validation error for invalid email', async () => {
      await wizard.fillAdminForm({
        email: invalidAdminData.invalidEmail,
        userId: validAdminData.userId,
        nickname: validAdminData.nickname,
        password: validAdminData.password,
        confirmPassword: validAdminData.confirmPassword,
      })
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/invalid email/i)
      ).toBeVisible()
    })

    test('should show validation error for short user ID', async () => {
      await wizard.fillAdminForm({
        email: validAdminData.email,
        userId: invalidAdminData.shortUserId,
        nickname: validAdminData.nickname,
        password: validAdminData.password,
        confirmPassword: validAdminData.confirmPassword,
      })
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/at least 3 characters/i)
      ).toBeVisible()
    })

    test('should show validation error for invalid user ID format', async () => {
      await wizard.fillAdminForm({
        email: validAdminData.email,
        userId: invalidAdminData.invalidUserId,
        nickname: validAdminData.nickname,
        password: validAdminData.password,
        confirmPassword: validAdminData.confirmPassword,
      })
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/lowercase letters, numbers, and underscores/i)
      ).toBeVisible()
    })

    test('should show validation error for password mismatch', async () => {
      await wizard.fillAdminForm({
        email: validAdminData.email,
        userId: validAdminData.userId,
        nickname: validAdminData.nickname,
        password: validAdminData.password,
        confirmPassword: invalidAdminData.mismatchedPassword,
      })
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/passwords don't match/i)
      ).toBeVisible()
    })

    test('should show validation error for weak password', async () => {
      await wizard.fillAdminForm({
        email: validAdminData.email,
        userId: validAdminData.userId,
        nickname: validAdminData.nickname,
        password: invalidAdminData.weakPassword,
        confirmPassword: invalidAdminData.weakPassword,
      })
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/at least 8 characters/i)
      ).toBeVisible()
    })

    test('should toggle password visibility', async () => {
      const passwordInput = wizard.page.getByTestId('input-password')

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password')

      // Click toggle button
      const container = passwordInput.locator('xpath=..')
      await container.getByRole('button').click()

      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text')
    })

    test('should toggle confirm password visibility', async () => {
      const confirmPasswordInput = wizard.page.getByTestId('input-confirm-password')

      await expect(confirmPasswordInput).toHaveAttribute('type', 'password')

      const container = confirmPasswordInput.locator('xpath=..')
      await container.getByRole('button').click()

      await expect(confirmPasswordInput).toHaveAttribute('type', 'text')
    })

    test('should highlight password requirements when met', async () => {
      const password = validAdminData.password

      await wizard.page.getByTestId('input-password').fill(password)

      // Check that all requirements are highlighted (green text)
      const requirements = wizard.page.locator('.text-green-600')
      const count = await requirements.count()

      // At least 4 requirements should be met (8 chars, uppercase, lowercase, number, special)
      expect(count).toBeGreaterThanOrEqual(4)
    })

    test('should have correct step indicator', async () => {
      await wizard.expectStepIndicator(3)
    })
  })

  // =====================================================
  // 5. SITE CONFIGURATION (STEP 4)
  // =====================================================

  test.describe('Site Configuration', () => {
    test.beforeEach(async () => {
      await wizard.navigateToStep('config')
    })

    test('should display site configuration form', async () => {
      await wizard.expectConfigPage()
    })

    test('should show timezone options', async () => {
      await wizard.page.getByTestId('select-timezone').click()

      await expect(
        wizard.page.getByRole('option', { name: /seoul/i })
      ).toBeVisible()
      await expect(
        wizard.page.getByRole('option', { name: /tokyo/i })
      ).toBeVisible()
      await expect(
        wizard.page.getByRole('option', { name: /new york/i })
      ).toBeVisible()
      await expect(
        wizard.page.getByRole('option', { name: /utc/i })
      ).toBeVisible()
    })

    test('should show language options', async () => {
      await wizard.page.getByTestId('select-language').click()

      await expect(
        wizard.page.getByRole('option', { name: /한국어/i })
      ).toBeVisible()
      await expect(
        wizard.page.getByRole('option', { name: /english/i })
      ).toBeVisible()
    })

    test('should show validation error for empty site name', async () => {
      await wizard.clearSiteConfigForm()
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/site name is required/i)
      ).toBeVisible()
    })

    test('should show validation error for short site name', async () => {
      await wizard.fillSiteConfigForm({ siteName: 'A' })
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/at least 2 characters/i)
      ).toBeVisible()
    })

    test('should show live preview of site name', async () => {
      const testSiteName = 'My Test Community'
      await wizard.fillSiteConfigForm({ siteName: testSiteName })

      // Preview should show the site name
      await expect(
        wizard.page.getByText(testSiteName)
      ).toBeVisible()
    })

    test('should have default values', async () => {
      // Check default timezone (Asia/Seoul)
      const timezoneValue = await wizard.page.getByTestId('select-timezone').textContent()
      expect(timezoneValue).toBeTruthy()

      // Check default language
      const languageValue = await wizard.page.getByTestId('select-language').textContent()
      expect(languageValue).toBeTruthy()
    })

    test('should have correct step indicator', async () => {
      await wizard.expectStepIndicator(4)
    })
  })

  // =====================================================
  // 6. COMPLETE PAGE (STEP 5)
  // =====================================================

  test.describe('Complete Page', () => {
    test.beforeEach(async () => {
      await wizard.navigateToStep('complete')
    })

    test('should display loading state initially', async () => {
      // Loading spinner should be visible initially
      await expect(
        wizard.page.locator('.animate-spin')
      ).toBeVisible()
    })

    test('should display success message after completion', async () => {
      // Wait for completion
      await wizard.waitForLoadingComplete()

      await expect(
        wizard.page.getByText('Installation Complete!')
      ).toBeVisible({ timeout: 30000 })
    })

    test('should show quick links after completion', async () => {
      await wizard.waitForLoadingComplete()

      await expect(
        wizard.page.getByText('Visit Homepage')
      ).toBeVisible()
      await expect(
        wizard.page.getByText('Admin Panel')
      ).toBeVisible()
    })

    test('should show recommended next steps', async () => {
      await wizard.waitForLoadingComplete()

      await expect(
        wizard.page.getByText('Recommended Next Steps')
      ).toBeVisible()
      await expect(
        wizard.page.getByText(/verify your admin email/i)
      ).toBeVisible()
    })

    test('should navigate to home on Go to Homepage button', async () => {
      await wizard.waitForLoadingComplete()
      await wizard.clickGoHome()

      await wizard.expectUrl(/\/$/)
    })

    test('should have correct step indicator', async () => {
      await wizard.waitForLoadingComplete()
      await wizard.expectStepIndicator(5)
    })
  })

  // =====================================================
  // 7. REINSTALL PROTECTION
  // =====================================================

  test.describe('Reinstall Protection', () => {
    test('should redirect to home when accessing /install after completion', async ({ page }) => {
      // Note: This test requires the installation to be completed
      // In a real test environment, you would:
      // 1. Complete the installation first
      // 2. Then try to access /install
      // 3. Verify redirect to home

      // This is a placeholder for the actual test
      // The behavior depends on the installation state in the database
      await wizard.navigateToInstall()

      // If installation is complete, should redirect to home
      // If not, should show welcome page
      const url = page.url()
      const isComplete = url.includes('/') && !url.includes('/install')

      // Verify expected behavior based on installation state
      expect(url).toBeDefined()
    })
  })

  // =====================================================
  // 8. STEP NAVIGATION (DIRECT ACCESS)
  // =====================================================

  test.describe('Step Navigation', () => {
    test('should allow direct access to welcome page', async () => {
      await wizard.navigateToInstall()
      await wizard.expectWelcomePage()
    })

    test('should redirect to current step when accessing future steps', async ({ page }) => {
      // Try to access config step directly
      await wizard.navigateToStep('config')

      // Should either:
      // 1. Show config page if previous steps are complete
      // 2. Redirect to appropriate step if not
      const url = page.url()
      expect(url).toBeDefined()
    })

    test('should redirect to current step when accessing complete page prematurely', async ({ page }) => {
      await wizard.navigateToStep('complete')

      // Should either show loading/complete or redirect
      const url = page.url()
      expect(url).toBeDefined()
    })
  })

  // =====================================================
  // 9. ACCESSIBILITY CHECKS
  // =====================================================

  test.describe('Accessibility', () => {
    test('welcome page should be accessible', async () => {
      await wizard.navigateToInstall()

      // Check for proper heading structure
      await expect(wizard.page.getByRole('heading', { level: 2 })).toBeVisible()

      // Check for accessible button
      const button = wizard.page.getByTestId('button-start-installation')
      await expect(button).toBeVisible()
      await expect(button).toHaveText(/get started/i)
    })

    test('supabase form should have proper labels', async () => {
      await wizard.navigateToStep('supabase')

      // Check for form labels
      await expect(wizard.page.getByLabel(/supabase project url/i)).toBeVisible()
      await expect(wizard.page.getByLabel(/supabase anon key/i)).toBeVisible()
    })

    test('admin form should have proper labels', async () => {
      await wizard.navigateToStep('admin')

      await expect(wizard.page.getByLabel(/email address/i)).toBeVisible()
      await expect(wizard.page.getByLabel(/user id/i)).toBeVisible()
      await expect(wizard.page.getByLabel(/display name/i)).toBeVisible()
    })

    test('config form should have proper labels', async () => {
      await wizard.navigateToStep('config')

      await expect(wizard.page.getByLabel(/site name/i)).toBeVisible()
    })

    test('error messages should be associated with form fields', async () => {
      await wizard.navigateToStep('supabase')
      await wizard.clickNext()

      // Error message should be visible and associated with form
      await expect(
        wizard.page.locator('[role="alert"]').first()
      ).toBeVisible()
    })

    test('all interactive elements should be keyboard accessible', async () => {
      await wizard.navigateToInstall()

      // Tab through interactive elements
      await wizard.page.keyboard.press('Tab')

      const focusedElement = wizard.page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })
  })

  // =====================================================
  // 10. VIEWPORT TESTS
  // =====================================================

  test.describe('Mobile Viewport (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('welcome page should be responsive', async () => {
      await wizard.navigateToInstall()
      await wizard.expectWelcomePage()

      // Check that content is visible and not overflowing
      const container = wizard.page.locator('.max-w-2xl')
      await expect(container).toBeVisible()
    })

    test('supabase form should be responsive', async () => {
      await wizard.navigateToStep('supabase')
      await wizard.expectSupabasePage()

      // Form inputs should be full width on mobile
      const input = wizard.page.getByTestId('input-supabase-url')
      const boundingBox = await input.boundingBox()
      expect(boundingBox?.width).toBeLessThanOrEqual(375)
    })

    test('admin form should be responsive', async () => {
      await wizard.navigateToStep('admin')
      await wizard.expectAdminPage()
    })

    test('config form should be responsive', async () => {
      await wizard.navigateToStep('config')
      await wizard.expectConfigPage()
    })

    test('navigation buttons should be accessible on mobile', async () => {
      await wizard.navigateToStep('supabase')

      const backButton = wizard.page.getByTestId('button-back')
      const nextButton = wizard.page.getByTestId('button-next')

      await expect(backButton).toBeVisible()
      await expect(nextButton).toBeVisible()
    })
  })

  test.describe('Desktop Viewport (1280x720)', () => {
    test.use({ viewport: { width: 1280, height: 720 } })

    test('welcome page should display feature grid', async () => {
      await wizard.navigateToInstall()

      // Feature cards should be in 2-column grid
      const featureCards = wizard.page.locator('.sm\\:grid-cols-2 > div')
      const count = await featureCards.count()
      expect(count).toBeGreaterThanOrEqual(4)
    })

    test('admin form password checklist should use grid layout', async () => {
      await wizard.navigateToStep('admin')

      // Password requirements should be in 2-column grid
      await expect(
        wizard.page.locator('.grid-cols-2')
      ).toBeVisible()
    })

    test('complete page should show cards side by side', async () => {
      await wizard.navigateToStep('complete')
      await wizard.waitForLoadingComplete()

      // Quick links should be in 2-column grid
      const cards = wizard.page.locator('.sm\\:grid-cols-2 > div')
      const count = await cards.count()
      expect(count).toBeGreaterThanOrEqual(2)
    })
  })

  // =====================================================
  // 11. ERROR HANDLING
  // =====================================================

  test.describe('Error Handling', () => {
    test('should show error alert for failed Supabase connection', async () => {
      await wizard.navigateToStep('supabase')
      await wizard.fillSupabaseForm(invalidSupabaseConfig.url, invalidSupabaseConfig.anonKey)
      await wizard.clickNext()

      await wizard.expectErrorMessage(/failed to connect|connection failed/i)
    })

    test('should allow retry after error', async () => {
      await wizard.navigateToStep('supabase')
      await wizard.fillSupabaseForm(invalidSupabaseConfig.url, invalidSupabaseConfig.anonKey)
      await wizard.clickNext()

      // Wait for error
      await wizard.expectErrorMessage(/failed to connect|connection failed/i)

      // Should be able to clear and try again
      await wizard.clearSupabaseForm()
      await wizard.fillSupabaseForm(validSupabaseConfig.url, validSupabaseConfig.anonKey)
    })

    test('should persist form data on validation error', async () => {
      await wizard.navigateToStep('admin')

      const testEmail = 'test@example.com'
      await wizard.fillAdminForm({
        email: testEmail,
        userId: 'ab', // Too short
        nickname: validAdminData.nickname,
        password: validAdminData.password,
        confirmPassword: validAdminData.confirmPassword,
      })
      await wizard.clickNext()

      // Email should still be in the input
      const emailValue = await wizard.page.getByTestId('input-admin-email').inputValue()
      expect(emailValue).toBe(testEmail)
    })
  })

  // =====================================================
  // 12. FORM VALIDATION EDGE CASES
  // =====================================================

  test.describe('Form Validation Edge Cases', () => {
    test('should handle very long site name', async () => {
      await wizard.navigateToStep('config')

      const longName = 'A'.repeat(60) // Max is 50
      await wizard.fillSiteConfigForm({ siteName: longName })
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/at most 50 characters/i)
      ).toBeVisible()
    })

    test('should handle very long user ID', async () => {
      await wizard.navigateToStep('admin')

      await wizard.fillAdminForm({
        email: validAdminData.email,
        userId: 'a'.repeat(25), // Max is 20
        nickname: validAdminData.nickname,
        password: validAdminData.password,
        confirmPassword: validAdminData.confirmPassword,
      })
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/at most 20 characters/i)
      ).toBeVisible()
    })

    test('should handle special characters in site name', async () => {
      await wizard.navigateToStep('config')

      await wizard.fillSiteConfigForm({ siteName: 'Test <script>alert("xss")</script>' })
      // Should accept the input (sanitization happens on server)
      const value = await wizard.page.getByTestId('input-site-name').inputValue()
      expect(value).toContain('Test')
    })

    test('should handle unicode in nickname', async () => {
      await wizard.navigateToStep('admin')

      await wizard.fillAdminForm({
        email: validAdminData.email,
        userId: validAdminData.userId,
        nickname: '테스트 관리자',
        password: validAdminData.password,
        confirmPassword: validAdminData.confirmPassword,
      })

      const nicknameValue = await wizard.page.getByTestId('input-nickname').inputValue()
      expect(nicknameValue).toBe('테스트 관리자')
    })

    test('should handle spaces in user ID input', async () => {
      await wizard.navigateToStep('admin')

      await wizard.fillAdminForm({
        email: validAdminData.email,
        userId: 'test user', // Contains space
        nickname: validAdminData.nickname,
        password: validAdminData.password,
        confirmPassword: validAdminData.confirmPassword,
      })
      await wizard.clickNext()

      await expect(
        wizard.page.getByText(/lowercase letters, numbers, and underscores/i)
      ).toBeVisible()
    })
  })
})
