# Rhymix Testing Strategy

## Overview

This document defines the comprehensive testing strategy for the Rhymix PHP CMS to React/Next.js conversion project (SPEC-RHYMIX-001). Our testing approach follows the Hybrid development methodology, combining TDD (Test-Driven Development) for new code and DDD (Domain-Driven Development) for legacy code migration.

## Testing Pyramid

```
           /\
          /  \
         / E2E\      - Critical user flows (Playwright)
        /------\
       /  Integ \    - API endpoints, Server Actions, Database
      /----------\
     /    Unit    \  - Components, Hooks, Utilities (Vitest)
    /--------------\
```

## Coverage Targets

| Category | Target | Notes |
|----------|--------|-------|
| Overall Coverage | 85% | Project-wide minimum |
| New Code | 85% | TDD approach required |
| Legacy Code | 85% | Characterization tests first |
| Critical Paths | 100% | Auth, payments, security |

## Testing Tools

### Unit & Integration Testing
- **Vitest** - Fast, Vite-native test runner
- **@testing-library/react** - React component testing
- **@testing-library/user-event** - User interaction simulation
- **MSW** - Mock Service Worker for API mocking
- **happy-dom** - Lightweight DOM environment

### E2E Testing
- **Playwright** - Cross-browser E2E testing
- **@playwright/test** - Test runner and utilities

### Mocking & Fixtures
- **MSW** - HTTP request mocking
- **Vitest mocks** - Module and function mocking
- **Factory functions** - Test data generation

## Directory Structure

```
tests/
├── unit/                    # Unit tests
│   ├── components/          # Component tests
│   │   ├── ui/             # UI component tests
│   │   ├── board/          # Board component tests
│   │   ├── member/         # Member component tests
│   │   └── comment/        # Comment component tests
│   ├── hooks/              # Custom hook tests
│   ├── lib/                # Utility function tests
│   └── actions/            # Server Action unit tests
├── integration/             # Integration tests
│   ├── api/                # API route tests
│   ├── actions/            # Server Action integration tests
│   ├── auth/               # Authentication flow tests
│   └── database/           # Database operation tests
├── e2e/                    # End-to-end tests
│   ├── auth/               # Authentication flows
│   ├── board/              # Board module flows
│   ├── member/             # Member module flows
│   ├── comment/            # Comment module flows
│   └── admin/              # Admin panel flows
├── mocks/                  # Test mocks and fixtures
│   ├── handlers/           # MSW request handlers
│   ├── factories/          # Test data factories
│   ├── seed/               # Database seed data
│   └── env.ts              # Test environment setup
├── templates/              # Test templates
│   ├── component.test.ts   # Component test template
│   ├── hook.test.ts        # Hook test template
│   ├── action.test.ts      # Server Action test template
│   └── e2e.test.ts         # E2E test template
└── setup/                  # Test setup files
    ├── vitest.setup.ts     # Vitest global setup
    ├── playwright.setup.ts # Playwright global setup
    └── global.d.ts         # Global type definitions
```

## Test Categories

### 1. Unit Tests

Unit tests verify isolated units of code in isolation.

**When to write:**
- Testing utility functions
- Testing custom hooks
- Testing individual component behavior
- Testing validation schemas

**Guidelines:**
- One test file per source file
- Test file location mirrors source location
- Use descriptive test names (should/when/then pattern)
- Mock external dependencies

```typescript
// Example: Unit test structure
describe('formatDate', () => {
  it('should format date in ISO format by default', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    expect(formatDate(date)).toBe('2024-01-15')
  })

  it('should handle invalid date input', () => {
    expect(() => formatDate(null)).toThrow('Invalid date')
  })
})
```

### 2. Integration Tests

Integration tests verify multiple units work together correctly.

**When to write:**
- Testing Server Actions with database
- Testing authentication flows
- Testing API endpoints
- Testing component interactions

**Guidelines:**
- Use test database (Supabase test project)
- Mock external services only
- Test the complete flow
- Verify side effects

```typescript
// Example: Integration test structure
describe('createPost Server Action', () => {
  it('should create post with valid data', async () => {
    const user = await createTestUser()
    const result = await createPost({
      boardId: 'test-board',
      title: 'Test Post',
      content: 'Test content',
    })

    expect(result).toHaveProperty('id')
    expect(result.title).toBe('Test Post')
  })
})
```

### 3. E2E Tests

E2E tests verify complete user workflows in a browser environment.

**When to write:**
- Critical user flows (auth, posting, commenting)
- Cross-page workflows
- User journeys
- Visual regression (optional)

**Guidelines:**
- Test user-facing behavior, not implementation
- Use realistic test data
- Test one user flow per test
- Keep tests independent

```typescript
// Example: E2E test structure
test('user can create and view a post', async ({ page }) => {
  await page.goto('/board/general')
  await page.click('[data-testid="new-post-button"]')
  await page.fill('[name="title"]', 'Test Post Title')
  await page.fill('[name="content"]', 'Test post content')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/board\/general\/[a-f0-9-]+$/)
  await expect(page.locator('h1')).toHaveText('Test Post Title')
})
```

## Hybrid Testing Methodology

### TDD for New Code

New code must follow the RED-GREEN-REFACTOR cycle:

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Improve code quality

```typescript
// Step 1: Write failing test
it('should validate email format', () => {
  expect(isValidEmail('invalid')).toBe(false)
})

// Step 2: Implement minimal code
export function isValidEmail(email: string): boolean {
  return email.includes('@')
}

// Step 3: Refactor and add edge cases
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

### DDD for Legacy Code

Legacy code requires characterization tests first:

1. **ANALYZE**: Understand current behavior
2. **PRESERVE**: Create characterization tests
3. **IMPROVE**: Refactor with test safety net

```typescript
// Step 1: Analyze - Document observed behavior
// Step 2: Preserve - Create characterization test
it('should match current behavior (characterization)', () => {
  // Capture current behavior, even if buggy
  const result = legacyFunction(input)
  expect(result).toMatchSnapshot()
})

// Step 3: Improve - Now safe to refactor
```

## Testing Conventions

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Test files | `*.test.ts` or `*.test.tsx` | `formatDate.test.ts` |
| Test directories | Mirror source structure | `tests/unit/lib/formatDate.test.ts` |
| Test descriptions | should/when pattern | `should return null for invalid input` |

### Test Structure (AAA Pattern)

```typescript
describe('function or component name', () => {
  it('should do something when condition', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = doSomething(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```

### Best Practices

1. **Test Behavior, Not Implementation**
   - Test what the code does, not how it does it
   - Avoid testing internal state

2. **Keep Tests Independent**
   - Each test should run in isolation
   - No shared state between tests
   - Use beforeEach/afterEach for setup/teardown

3. **Use Descriptive Names**
   - Test names should describe the scenario
   - Use "should" for assertions
   - Include context in describe blocks

4. **Avoid Test Interdependencies**
   - Tests should not depend on execution order
   - Each test should clean up after itself

5. **Mock External Dependencies**
   - Mock API calls
   - Mock database in unit tests
   - Use real dependencies in integration tests

## Test Data Management

### Factory Pattern

```typescript
// tests/mocks/factories/user.ts
export function createTestUser(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    email: `test-${Date.now()}@example.com`,
    display_name: 'Test User',
    role: 'user',
    ...overrides,
  }
}

// Usage
const admin = createTestUser({ role: 'admin' })
```

### Database Seeding

```typescript
// tests/mocks/seed/index.ts
export async function seedTestDatabase() {
  const users = await Promise.all([
    createTestUser({ email: 'admin@test.com', role: 'admin' }),
    createTestUser({ email: 'user@test.com', role: 'user' }),
  ])

  const boards = await Promise.all([
    createTestBoard({ slug: 'general', title: 'General' }),
    createTestBoard({ slug: 'qna', title: 'Q&A' }),
  ])

  return { users, boards }
}
```

## Mocking Strategy

### MSW for API Mocking

```typescript
// tests/mocks/handlers/auth.ts
import { http, HttpResponse } from 'msw'

export const authHandlers = [
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      user: createTestUser(),
      session: { access_token: 'mock-token' },
    })
  }),
]
```

### Vitest Module Mocks

```typescript
// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: {
    auth: {
      getUser: vi.fn(() => ({ data: { user: createTestUser() } })),
    },
  },
}))
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

### Pre-commit Hooks

```bash
# Run linting and unit tests before commit
npm run lint && npm run test:unit
```

## Performance Testing

### Load Testing (Optional)

For performance-critical features:
- Use k6 or Artillery for load testing
- Target: 10,000+ concurrent users
- P95 response time < 2s

### Bundle Size Testing

```typescript
// Monitor bundle size impact
expect(bundleSize).toBeLessThan(500 * 1024) // 500KB
```

## Security Testing

### Security Test Cases

1. **Authentication**
   - Invalid credentials rejected
   - Session timeout works
   - Token refresh works

2. **Authorization**
   - Users cannot access other users' data
   - Non-admins cannot access admin routes
   - RLS policies enforced

3. **Input Validation**
   - XSS attempts blocked
   - SQL injection blocked
   - CSRF protection works

4. **Data Protection**
   - Passwords hashed
   - Sensitive data encrypted
   - No credentials in logs

## Test Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Update snapshots
npm run test:update-snapshots

# Run specific test file
npm run test:unit -- path/to/test.ts
```

## Debugging Tests

### Debug Unit Tests

```bash
# Run in UI mode
npm run test:unit -- --ui

# Run specific test with verbose output
npm run test:unit -- --reporter=verbose path/to/test.ts
```

### Debug E2E Tests

```bash
# Run Playwright in debug mode
npx playwright test --debug

# Run with headed browser
npx playwright test --headed

# Generate code
npx playwright codegen http://localhost:3000
```

## Acceptance Criteria Testing

Each acceptance criterion from `acceptance.md` must have corresponding tests:

| AC ID | Test Type | Test Location |
|-------|-----------|---------------|
| AC-F-001 | Unit + E2E | `tests/unit/config/nextjs.test.ts`, `tests/e2e/setup/` |
| AC-A-003 | E2E | `tests/e2e/auth/login.test.ts` |
| AC-B-001 | Integration + E2E | `tests/integration/actions/createPost.test.ts`, `tests/e2e/board/create-post.test.ts` |
| AC-M-001 | E2E | `tests/e2e/member/signup.test.ts` |

## Continuous Improvement

### Test Metrics to Track

1. **Coverage metrics**
   - Line coverage
   - Branch coverage
   - Function coverage

2. **Test quality metrics**
   - Test execution time
   - Flaky test rate
   - Test maintenance effort

3. **Defect metrics**
   - Bugs found by tests
   - Bugs missed by tests
   - Production incident rate

### Regular Review

- Weekly: Review flaky tests
- Monthly: Analyze coverage gaps
- Quarterly: Assess testing strategy effectiveness

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)
- [SPEC-RHYMIX-001](./.moai/specs/SPEC-RHYMIX-001/spec.md)
- [Acceptance Criteria](./.moai/specs/SPEC-RHYMIX-001/acceptance.md)

---

Version: 1.0.0
Last Updated: 2026-02-20
Related: SPEC-RHYMIX-001, acceptance.md
