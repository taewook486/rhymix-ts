# Installation Wizard E2E Tests

## Overview

This test suite provides comprehensive E2E testing for the Rhymix TS installation wizard using Playwright.

## Files Created

- `tests/e2e/install.test.ts` - Main test file with all test scenarios
- `tests/helpers/install-test-helpers.ts` - Helper utilities and Page Object Model
- `tests/setup/playwright.setup.ts` - Updated global setup for installation tests
- `.env.test.example` - Environment configuration template
- `package.json` - Added new test scripts

## Test Scenarios

### 1. Installation Redirect Test
- Redirect to /install when application is not installed

### 2. Welcome Page (Step 1)
- Display welcome message
- Show feature overview (Next.js, React, Supabase, Tailwind)
- Navigation to Supabase setup on "Get Started" click
- Loading state handling

### 3. Supabase Setup (Step 2)
- Display URL and Anon Key input fields
- Show validation errors for invalid inputs
- Test connection failure scenarios
- Environment variables preview
- Link to Supabase Dashboard
- Back button navigation

### 4. Admin Account (Step 3)
- Display admin form fields (email, password, confirm, nickname, user_id)
- Password visibility toggle
- Password requirements checklist
- Validation: password mismatch, weak password, invalid email, invalid user ID
- Form data persistence on validation errors

### 5. Site Configuration (Step 4)
- Display site name, timezone, language inputs
- Select dropdowns for timezone and language
- Live preview of site name
- Validation errors

### 6. Complete Page (Step 5)
- Loading state during finalization
- Success message display
- Quick links (Homepage, Admin Panel)
- Recommended next steps
- Navigation to home

### 7. Reinstall Protection
- Redirect to home when accessing /install after completion

### 8. Step Navigation
- Direct access control to steps
- Redirect to current step when accessing future steps

### 9. Accessibility
- Proper heading structure
- Form labels association
- Error message accessibility
- Keyboard navigation

### 10. Viewport Tests
- Mobile viewport (375x667)
- Desktop viewport (1280x720)
- Responsive layout verification

### 11. Error Handling
- Connection failure alerts
- Retry after error
- Form data persistence

### 12. Edge Cases
- Very long inputs
- Special characters
- Unicode support
- Spaces in inputs

## Running Tests

```bash
# Run all installation tests
npm run test:e2e:install

# Run with UI for debugging
npm run test:e2e:install:ui

# Run in debug mode
npm run test:e2e:install:debug

# Run all E2E tests
npm run test:e2e

# View test report
npm run test:e2e:report
```

## Test Data

The tests use dynamically generated test data with timestamps to ensure uniqueness:

```typescript
const testTimestamp = Date.now()
const adminEmail = `admin-${testTimestamp}@test.com`
const userId = `testadmin_${testTimestamp}`
```

## Environment Configuration

Copy `.env.test.example` to `.env.test.local` and configure:

```
E2E_SUPABASE_URL=https://your-test-project.supabase.co
E2E_SUPABASE_ANON_KEY=your-test-anon-key
E2E_BASE_URL=http://localhost:3000
```

## Page Object Model

The `InstallWizardPage` class encapsulates all page interactions:

```typescript
const wizard = new InstallWizardPage(page)

// Navigation
await wizard.navigateToInstall()
await wizard.navigateToStep('admin')

// Actions
await wizard.fillSupabaseForm(url, key)
await wizard.fillAdminForm(adminData)
await wizard.clickNext()

// Assertions
await wizard.expectWelcomePage()
await wizard.expectErrorMessage(/invalid/i)
```

## Best Practices

1. **Test Isolation**: Each test file is independent and can run in any order
2. **Descriptive Names**: Test names clearly describe the scenario being tested
3. **Assertions**: Multiple assertions per test to verify complete behavior
4. **Error Messages**: Regular expressions for flexible error message matching
5. **Wait Strategies**: Proper wait handling for async operations
6. **Accessibility**: Built-in accessibility checks
7. **Viewport Testing**: Both mobile and desktop viewports tested

## Notes

- Tests require a running development server
- Some tests may require a fresh (uninstalled) database state
- Supabase connection tests will fail without valid credentials
- Use the UI mode (`--ui`) for interactive debugging
