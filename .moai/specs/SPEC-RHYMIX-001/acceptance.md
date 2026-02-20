# Acceptance Criteria: Rhymix PHP CMS to React/Next.js Conversion

**SPEC Reference:** SPEC-RHYMIX-001
**Document Version:** 1.0.0
**Last Updated:** 2026-02-20

## Overview

This document defines the acceptance criteria for the Rhymix conversion project. Each requirement from `spec.md` has corresponding test scenarios in Given-When-Then format, quality gate criteria, and verification methods.

**TAG BLOCK Traceability:**
```
SPEC-ID: SPEC-RHYMIX-001
DOCUMENT: acceptance.md
VERSION: 1.0.0
RELATED: spec.md, plan.md
FORMAT: Given-When-Then (Gherkin)
```

---

## Phase 1: Foundation Setup Acceptance Criteria

### AC-F-001: Next.js 16 App Router Setup

**Requirement:** REQ-F-001 (Ubiquitous) - The system shall use Next.js 16 with App Router for all routing.

**Given-When-Then Scenarios:**

**Scenario 1: Verify Next.js version**
```
Given the project is initialized
When I check package.json
Then Next.js version should be 16 or higher
```

**Scenario 2: Verify App Router structure**
```
Given the project uses Next.js 16
When I examine the app directory structure
Then I should see app/ directory with layout.tsx and page.tsx files
And I should NOT see pages/ directory
```

**Scenario 3: Verify routing works**
```
Given the Next.js app is running in development
When I navigate to /test-route
Then the page should render without errors
```

**Quality Gate:**
- [ ] Next.js 16+ installed
- [ ] App Router structure verified
- [ ] No Pages Router artifacts present
- [ ] All routes render correctly

**Verification Method:**
```bash
# Check Next.js version
npm list next

# Verify App Router structure
ls -la app/

# Verify routing
npm run dev && curl http://localhost:3000
```

---

### AC-F-002: TypeScript 5.9+ Strict Mode

**Requirement:** REQ-F-002 (Ubiquitous) - The system shall use TypeScript 5.9+ in strict mode for all source files.

**Given-When-Then Scenarios:**

**Scenario 1: Verify TypeScript version**
```
Given the project uses TypeScript
When I check package.json
Then TypeScript version should be 5.9 or higher
```

**Scenario 2: Verify strict mode enabled**
```
Given TypeScript is configured
When I check tsconfig.json
Then strict should be set to true
And strictNullChecks should be true
```

**Scenario 3: Verify type safety**
```
Given TypeScript strict mode is enabled
When I run tsc --noEmit
Then there should be zero type errors
```

**Quality Gate:**
- [ ] TypeScript 5.9+ installed
- [ ] Strict mode enabled in tsconfig.json
- [ ] Zero type errors
- [ ] All files use .ts or .tsx extension

**Verification Method:**
```bash
# Check TypeScript version
npm list typescript

# Verify strict mode
cat tsconfig.json | grep strict

# Type check
npx tsc --noEmit
```

---

### AC-F-003: Tailwind CSS + shadcn/ui

**Requirement:** REQ-F-003 (Ubiquitous) - The system shall use Tailwind CSS with shadcn/ui component library.

**Given-When-Then Scenarios:**

**Scenario 1: Verify Tailwind CSS setup**
```
Given the project uses Tailwind CSS
When I check tailwind.config.ts
Then content should include app and components directories
```

**Scenario 2: Verify shadcn/ui components**
```
Given shadcn/ui is installed
When I check components/ui directory
Then I should see Button and Input components
```

**Scenario 3: Verify styling works**
```
Given a component uses Tailwind classes
When I render the component
Then styles should be applied correctly
```

**Quality Gate:**
- [ ] Tailwind CSS configured
- [ ] shadcn/ui initialized
- [ ] Base components available (Button, Input, Card)
- [ ] Styles render correctly

**Verification Method:**
```bash
# Verify Tailwind
cat tailwind.config.ts

# Verify shadcn/ui
ls components/ui/

# Visual verification
npm run dev
```

---

### AC-F-004: Supabase Environment Variables

**Requirement:** REQ-F-004 (Event-Driven) - WHEN the application initializes, THEN the system shall establish Supabase client connection.

**Given-When-Then Scenarios:**

**Scenario 1: Verify environment variables exist**
```
Given the application starts
When I check environment variables
Then NEXT_PUBLIC_SUPABASE_URL should be defined
And NEXT_PUBLIC_SUPABASE_ANON_KEY should be defined
```

**Scenario 2: Verify Supabase client initialization**
```
Given environment variables are set
When I create Supabase client
Then the client should initialize without errors
```

**Scenario 3: Handle missing environment variables**
```
Given environment variables are missing
When the application starts
Then it should display a clear error message
And should not crash with undefined errors
```

**Quality Gate:**
- [ ] Environment variables documented in .env.example
- [ ] Supabase client initializes successfully
- [ ] Missing variables handled gracefully
- [ ] No credentials in version control

**Verification Method:**
```typescript
// Test: Supabase client initialization
import { createClient } from '@supabase/supabase-js'

test('Supabase client initializes with valid credentials', () => {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  expect(client).toBeDefined()
})
```

---

## Phase 2: Core Architecture Acceptance Criteria

### AC-A-001: Supabase PostgreSQL Database

**Requirement:** REQ-A-001 (Ubiquitous) - The system shall use Supabase PostgreSQL 16 as the primary database.

**Given-When-Then Scenarios:**

**Scenario 1: Verify database connection**
```
Given the application is running
When I query the database
Then the connection should succeed without errors
```

**Scenario 2: Verify PostgreSQL version**
```
Given the database is connected
When I check the version
Then PostgreSQL version should be 16 or higher
```

**Scenario 3: Verify schema exists**
```
Given migrations have run
When I list database tables
Then all required tables should exist (profiles, boards, posts, comments)
```

**Quality Gate:**
- [ ] Supabase PostgreSQL 16+ verified
- [ ] All tables created via migrations
- [ ] Database connection successful
- [ ] Migration history tracked

**Verification Method:**
```sql
-- Verify PostgreSQL version
SELECT version();

-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'boards', 'posts', 'comments');
```

---

### AC-A-002: Row-Level Security (RLS)

**Requirement:** REQ-A-002 (Ubiquitous) - The system shall implement Row-Level Security (RLS) policies for all multi-tenant data.

**Given-When-Then Scenarios:**

**Scenario 1: Verify RLS enabled**
```
Given a table contains user data
When I check RLS status
Then RLS should be enabled for the table
```

**Scenario 2: Verify user isolation**
```
Given user A has posts
When user B queries the posts table
Then user B should not see user A's posts
```

**Scenario 3: Verify admin access**
```
Given an admin user queries data
When RLS policies are evaluated
Then the admin should see all data
```

**Quality Gate:**
- [ ] RLS enabled on all user data tables
- [ ] Users can only access their own data
- [ ] Admins have appropriate access
- [ ] No data leakage between users

**Verification Method:**
```sql
-- Test RLS policy
SET ROLE authenticated;
SELECT * FROM posts WHERE author_id = 'other-user-id';
-- Should return empty

SET ROLE postgres;
SELECT * FROM posts;
-- Should return all posts
```

---

### AC-A-003: Authentication Flow

**Requirement:** REQ-A-003 (Event-Driven) - WHEN a user signs in, THEN the system shall establish authenticated Supabase session.

**Given-When-Then Scenarios:**

**Scenario 1: User logs in successfully**
```
Given I am on the login page
When I enter valid email and password
Then I should be redirected to the home page
And my session should be established
```

**Scenario 2: Invalid credentials**
```
Given I am on the login page
When I enter invalid email or password
Then I should see an error message
And should remain on the login page
```

**Scenario 3: Session persistence**
```
Given I am logged in
When I refresh the page
Then my session should persist
And I should remain logged in
```

**Scenario 4: Logout functionality**
```
Given I am logged in
When I click logout
Then my session should be cleared
And I should be redirected to login page
```

**Quality Gate:**
- [ ] Login works with valid credentials
- [ ] Invalid credentials show error
- [ ] Session persists across refreshes
- [ ] Logout clears session correctly

**Verification Method:**
```typescript
// E2E Test: Login flow
test('user can log in with valid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/')
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
})
```

---

### AC-A-005: Protected Routes

**Requirement:** REQ-A-005 (State-Driven) - IF a user attempts to access protected resources, THEN the system shall verify authentication.

**Given-When-Then Scenarios:**

**Scenario 1: Unauthenticated user accesses protected route**
```
Given I am not logged in
When I navigate to a protected route
Then I should be redirected to login page
And the original URL should be preserved
```

**Scenario 2: Authenticated user accesses protected route**
```
Given I am logged in
When I navigate to a protected route
Then the page should load successfully
```

**Scenario 3: Admin route protection**
```
Given I am logged in as a regular user
When I navigate to an admin route
Then I should be redirected with "forbidden" error
```

**Quality Gate:**
- [ ] Unauthenticated users redirected from protected routes
- [ ] Authenticated users can access protected routes
- [ ] Admin routes protected by role check
- [ ] Original URL preserved for redirect after login

**Verification Method:**
```typescript
// E2E Test: Protected route
test('unauthenticated user cannot access protected routes', async ({ page }) => {
  await page.goto('/settings')
  await expect(page).toHaveURL('/login?redirect=/settings')
})
```

---

### AC-A-006: Server Actions for Mutations

**Requirement:** REQ-A-006 (Ubiquitous) - The system shall use Server Actions for all data mutations.

**Given-When-Then Scenarios:**

**Scenario 1: Create post with Server Action**
```
Given I am authenticated
When I submit the post creation form
Then the Server Action should execute
And the post should be created in the database
```

**Scenario 2: Server Action error handling**
```
Given a Server Action fails
When the error occurs
Then a user-friendly error message should display
And the error should be logged appropriately
```

**Scenario 3: Server Action revalidation**
```
Given a Server Action modifies data
When the action completes
Then affected routes should be revalidated
And updated data should display immediately
```

**Quality Gate:**
- [ ] All mutations use Server Actions
- [ ] Error handling implemented
- [ ] Revalidation configured
- [ ] No client-side direct database mutations

**Verification Method:**
```typescript
// Unit Test: Server Action
test('createPost Server Action creates post', async () => {
  const result = await createPost({
    boardId: 'test-board',
    title: 'Test Post',
    content: 'Test content',
  })

  expect(result).toHaveProperty('id')
  expect(result.title).toBe('Test Post')
})
```

---

### AC-A-007: File Upload to Supabase Storage

**Requirement:** REQ-A-007 (Event-Driven) - WHEN a file is uploaded, THEN the system shall store files in Supabase Storage.

**Given-When-Then Scenarios:**

**Scenario 1: Upload valid file**
```
Given I am authenticated
When I select a valid file and upload
Then the file should be stored in Supabase Storage
And I should receive the file URL
```

**Scenario 2: Upload invalid file type**
```
Given I am authenticated
When I attempt to upload an invalid file type
Then the upload should be rejected
And I should see an error message
```

**Scenario 3: Upload file exceeding size limit**
```
Given I am authenticated
When I attempt to upload a file exceeding size limit
Then the upload should be rejected
And I should see size limit error message
```

**Quality Gate:**
- [ ] Valid files upload successfully
- [ ] File type validation works
- [ ] Size limits enforced
- [ ] Error messages are user-friendly

**Verification Method:**
```typescript
// Integration Test: File upload
test('valid file uploads to Supabase Storage', async () => {
  const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
  const result = await uploadFile(file, 'avatars')

  expect(result).toHaveProperty('path')
  expect(result).toHaveProperty('url')
})
```

---

## Phase 3: Board Module Acceptance Criteria

### AC-B-001: Create Board Post

**Requirement:** REQ-B-001 (Event-Driven) - WHEN a user creates a new board post, THEN the system shall store the post.

**Given-When-Then Scenarios:**

**Scenario 1: Create post with valid data**
```
Given I am logged in
And I navigate to board creation page
When I enter title, content, and select category
And I click submit
Then the post should be created
And I should be redirected to the post detail page
```

**Scenario 2: Create post with missing fields**
```
Given I am on the post creation page
When I submit without required fields
Then I should see validation errors
And the post should not be created
```

**Scenario 3: Create post in draft**
```
Given I am creating a post
When I select "draft" status
And I click submit
Then the post should be saved as draft
And should not be visible to other users
```

**Quality Gate:**
- [ ] Posts create with valid data
- [ ] Validation errors display appropriately
- [ ] Draft status works correctly
- [ ] Author is automatically assigned

**Verification Method:**
```typescript
// E2E Test: Create post
test('authenticated user can create post', async ({ page }) => {
  await page.goto('/board/general/new')
  await page.fill('[name="title"]', 'Test Post Title')
  await page.fill('[name="content"]', 'Test post content')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/board\/general\/[a-f0-9-]+$/)
})
```

---

### AC-B-002: Board List with Pagination

**Requirement:** REQ-B-002 (Event-Driven) - WHEN a user views a board list, THEN the system shall display posts with pagination.

**Given-When-Then Scenarios:**

**Scenario 1: View board list**
```
Given I navigate to a board page
When the page loads
Then I should see posts in reverse chronological order
And each post should show title, author, date
```

**Scenario 2: Pagination functionality**
```
Given a board has more than 20 posts
When I view the board list
Then I should see only first 20 posts
And pagination controls should be visible
```

**Scenario 3: Navigate to next page**
```
Given I am on page 1 of a board
When I click "Next" page button
Then I should see posts 21-40
And page 2 should be highlighted
```

**Scenario 4: Category filtering**
```
Given I am viewing a board
When I select a category from filter
Then only posts in that category should display
```

**Quality Gate:**
- [ ] Board list displays correctly
- [ ] Pagination works for all pages
- [ ] Category filtering works
- [ ] Posts are in correct order

**Verification Method:**
```typescript
// E2E Test: Board list pagination
test('board list shows 20 posts per page', async ({ page }) => {
  await page.goto('/board/general')
  const posts = await page.locator('[data-testid="post-card"]').all()
  expect(posts.length).toBeLessThanOrEqual(20)
})
```

---

### AC-B-004: Edit Own Post

**Requirement:** REQ-B-004 (Event-Driven) - WHEN a user edits their own post, THEN the system shall verify ownership and update.

**Given-When-Then Scenarios:**

**Scenario 1: Edit own post**
```
Given I created a post
When I navigate to the post edit page
And I modify the title and content
And I click save
Then the post should be updated
And changes should be visible immediately
```

**Scenario 2: Cannot edit other's post**
```
Given I am logged in
When I attempt to edit another user's post
Then I should see "forbidden" error
And should not see edit form
```

**Scenario 3: Edit button visibility**
```
Given I am viewing a post
When the post author matches my user ID
Then I should see edit and delete buttons
When the post author does not match
Then I should not see edit and delete buttons
```

**Quality Gate:**
- [ ] Users can edit own posts
- [ ] Ownership verification works
- [ ] Edit button shows conditionally
- [ ] Updates persist correctly

**Verification Method:**
```typescript
// E2E Test: Edit post
test('user can edit own post', async ({ page, authUser }) => {
  const post = await createTestPost({ author_id: authUser.id })

  await page.goto(`/board/general/${post.id}/edit`)
  await page.fill('[name="title"]', 'Updated Title')
  await page.click('button[type="submit"]')

  await expect(page.locator('h1')).toHaveText('Updated Title')
})
```

---

### AC-B-005: Ownership Verification

**Requirement:** REQ-B-005 (Unwanted) - The system shall not allow users to edit or delete posts they do not own.

**Given-When-Then Scenarios:**

**Scenario 1: Prevent unauthorized edit**
```
Given I am logged in as user A
When I attempt to edit user B's post via direct URL
Then the request should be blocked
And I should see 403 Forbidden error
```

**Scenario 2: Prevent unauthorized delete**
```
Given I am logged in as user A
When I attempt to delete user B's post
Then the request should be blocked
And the post should remain unchanged
```

**Scenario 3: Admin can edit any post**
```
Given I am logged in as admin
When I edit any user's post
Then the edit should succeed
```

**Quality Gate:**
- [ ] Authorization checks prevent unauthorized access
- [ ] 403 errors returned for unauthorized requests
- [ ] Admins can bypass ownership check
- [ ] No security bypasses possible

**Verification Method:**
```typescript
// Security Test: Ownership verification
test('cannot update post without ownership', async () => {
  const userA = await createTestUser()
  const userB = await createTestUser()
  const post = await createTestPost({ author_id: userA.id })

  // User B attempts to update User A's post
  const result = await updatePost(post.id, { title: 'Hacked' }, userB.id)
  expect(result).toHaveProperty('error', 'Forbidden')
})
```

---

### AC-B-006: Soft Delete to Trash

**Requirement:** REQ-B-006 (Event-Driven) - WHEN an admin deletes a post, THEN the system shall soft delete.

**Given-When-Then Scenarios:**

**Scenario 1: Soft delete post**
```
Given I am an admin
When I delete a post
Then the post status should change to "trash"
And the post should not appear in normal lists
```

**Scenario 2: View trash posts**
```
Given posts are in trash
When I navigate to trash view
Then I should see all trashed posts
```

**Scenario 3: Restore from trash**
```
Given a post is in trash
When I click restore
Then the post status should change to "published"
And the post should appear in normal lists
```

**Scenario 4: Permanent delete**
```
Given a post is in trash
When I click permanent delete
Then the post should be removed from database
```

**Quality Gate:**
- [ ] Soft delete works correctly
- [ ] Trash view shows trashed posts
- [ ] Restore functionality works
- [ ] Permanent delete removes data

**Verification Method:**
```sql
-- Test soft delete
SELECT * FROM posts WHERE id = 'test-post-id';
-- status should be 'trash'

-- Test permanent delete
DELETE FROM posts WHERE id = 'test-post-id' AND status = 'trash';
-- row should be removed
```

---

## Phase 4: Member Module Acceptance Criteria

### AC-M-001: User Registration

**Requirement:** REQ-M-001 (Event-Driven) - WHEN a new user registers, THEN the system shall validate and create user.

**Given-When-Then Scenarios:**

**Scenario 1: Register with valid data**
```
Given I am on the signup page
When I enter valid email, password, and display name
And I submit the form
Then a user account should be created
And I should be redirected to email verification page
```

**Scenario 2: Register with duplicate email**
```
Given a user with email exists
When I attempt to register with same email
Then I should see "email already exists" error
```

**Scenario 3: Register with weak password**
```
Given I am on signup page
When I enter a weak password
Then I should see password strength requirements
```

**Quality Gate:**
- [ ] Valid registration creates account
- [ ] Duplicate emails are rejected
- [ ] Password validation works
- [ ] Email verification is sent

**Verification Method:**
```typescript
// E2E Test: User registration
test('user can register with valid data', async ({ page }) => {
  await page.goto('/signup')
  await page.fill('[name="email"]', `test-${Date.now()}@example.com`)
  await page.fill('[name="password"]', 'SecurePass123!')
  await page.fill('[name="displayName"]', 'Test User')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/verify-email/)
})
```

---

### AC-M-002: User Login

**Requirement:** REQ-M-002 (Event-Driven) - WHEN a user logs in, THEN the system shall authenticate via Supabase Auth.

**Given-When-Then Scenarios:**

**Scenario 1: Login with correct credentials**
```
Given I have a registered account
When I enter my email and password
Then I should be logged in
And redirected to home page
```

**Scenario 2: Login with incorrect password**
```
Given I have a registered account
When I enter incorrect password
Then I should see "invalid credentials" error
```

**Scenario 3: Login with unverified email**
```
Given I registered but did not verify email
When I attempt to log in
Then I should see "email not verified" error
```

**Quality Gate:**
- [ ] Correct credentials log in user
- [ ] Incorrect credentials show error
- [ ] Email verification is enforced
- [ ] Session is established correctly

**Verification Method:**
```typescript
// E2E Test: User login
test('user can log in with correct credentials', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'correct-password')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/')
})
```

---

### AC-M-003: Profile Update

**Requirement:** REQ-M-003 (Event-Driven) - WHEN a user updates their profile, THEN the system shall validate and update.

**Given-When-Then Scenarios:**

**Scenario 1: Update display name**
```
Given I am logged in
When I navigate to profile settings
And I change my display name
And I save changes
Then my display name should be updated
```

**Scenario 2: Upload avatar**
```
Given I am on profile settings
When I upload a new avatar image
Then my avatar should be updated
And the image should display immediately
```

**Scenario 3: Cannot modify other's profile**
```
Given I am logged in as user A
When I attempt to update user B's profile
Then the request should be blocked
```

**Quality Gate:**
- [ ] Profile updates work correctly
- [ ] Avatar upload works
- [ ] Users can only update own profile
- [ ] Changes reflect immediately

**Verification Method:**
```typescript
// E2E Test: Profile update
test('user can update profile', async ({ page }) => {
  await page.goto('/settings')
  await page.fill('[name="displayName"]', 'New Display Name')
  await page.click('button[type="submit"]')

  await expect(page.locator('[data-testid="display-name"]')).toHaveText('New Display Name')
})
```

---

## Phase 5: Comment Module Acceptance Criteria

### AC-C-001: Create Comment

**Requirement:** REQ-C-001 (Event-Driven) - WHEN a user posts a comment, THEN the system shall store comment with parent reference.

**Given-When-Then Scenarios:**

**Scenario 1: Comment on post**
```
Given I am viewing a post
When I enter comment text and submit
Then the comment should be created
And should appear below the post
```

**Scenario 2: Reply to comment**
```
Given I am viewing a post with comments
When I click reply on a comment
And I enter my reply text
Then the reply should be created
And should appear nested under parent comment
```

**Scenario 3: Empty comment validation**
```
Given I am on a post
When I submit empty comment form
Then I should see validation error
And comment should not be created
```

**Quality Gate:**
- [ ] Comments create successfully
- [ ] Nested replies work correctly
- [ ] Validation prevents empty comments
- [ ] Real-time updates work

**Verification Method:**
```typescript
// E2E Test: Create comment
test('user can comment on post', async ({ page }) => {
  await page.goto('/board/general/test-post')
  await page.fill('[name="content"]', 'Test comment')
  await page.click('button[type="submit"]')

  await expect(page.locator('[data-testid="comment-list"]')).toContainText('Test comment')
})
```

---

### AC-C-003: Real-time Comment Notifications

**Requirement:** REQ-C-003 (Event-Driven) - WHEN a comment is posted, THEN the system shall notify via Supabase Realtime.

**Given-When-Then Scenarios:**

**Scenario 1: Real-time comment appearance**
```
Given I am viewing a post
And another user posts a comment
When the comment is created
Then the comment should appear on my screen
Without page refresh
```

**Scenario 2: Real-time reply notification**
```
Given I commented on a post
When someone replies to my comment
Then I should see notification
And the reply should appear in thread
```

**Quality Gate:**
- [ ] Real-time subscription works
- [ ] Comments appear without refresh
- [ ] Multiple users see updates simultaneously
- [ ] Connection errors handled gracefully

**Verification Method:**
```typescript
// Integration Test: Real-time comments
test('comments appear in real-time', async ({ page, browser }) => {
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  await page1.goto('/board/general/test-post')

  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  await page2.goto('/board/general/test-post')

  // Post comment from page2
  await page2.fill('[name="content"]', 'Real-time test comment')
  await page2.click('button[type="submit"]')

  // Verify comment appears on page1 without refresh
  await expect(page1.locator('[data-testid="comment-list"]')).toContainText('Real-time test comment', { timeout: 5000 })
})
```

---

## Phase 6: Advanced Features Acceptance Criteria

### AC-L-001: Multi-language Support

**Requirement:** REQ-L-001 (Event-Driven) - WHEN a user selects language, THEN the system shall load translations.

**Given-When-Then Scenarios:**

**Scenario 1: Switch language**
```
Given I am viewing the site in English
When I select Korean from language switcher
Then all UI text should change to Korean
```

**Scenario 2: Persist language preference**
```
Given I selected Korean language
When I refresh the page
Then the site should still display in Korean
```

**Scenario 3: Missing translation fallback**
```
Given a translation key is missing in Korean
When I view the page in Korean
Then the English text should display
And a translation indicator should be visible
```

**Quality Gate:**
- [ ] Language switching works
- [ ] Language preference persists
- [ ] Missing translations fallback to English
- [ ] All core languages supported (en, ko, ja, zh)

**Verification Method:**
```typescript
// E2E Test: Language switching
test('language switcher changes UI language', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="language-switcher"]')
  await page.click('button[value="ko"]')

  await expect(page.locator('h1')).toHaveText(/한글/)
})
```

---

### AC-S-001: Search Functionality

**Requirement:** REQ-S-001 (Event-Driven) - WHEN a user performs search, THEN the system shall query full-text search.

**Given-When-Then Scenarios:**

**Scenario 1: Search for content**
```
Given I am on the search page
When I enter search query "Rhymix"
And I click search
Then results should include posts with "Rhymix"
```

**Scenario 2: Search result ranking**
```
Given I search for a term
When results are displayed
Then most relevant results should appear first
And relevance score should be visible
```

**Scenario 3: Search filters**
```
Given I have search results
When I apply date filter
Then only results within date range should display
```

**Quality Gate:**
- [ ] Search returns relevant results
- [ ] Ranking works correctly
- [ ] Filters work as expected
- [ ] Performance is acceptable (< 1s)

**Verification Method:**
```typescript
// E2E Test: Search
test('search returns relevant results', async ({ page }) => {
  await page.goto('/search')
  await page.fill('[name="query"]', 'test post')
  await page.click('button[type="submit"]')

  const results = await page.locator('[data-testid="search-result"]').all()
  expect(results.length).toBeGreaterThan(0)

  for (const result of results) {
    await expect(result).toContainText(/test/i)
  }
})
```

---

### AC-ADM-001: Admin Panel Access

**Requirement:** REQ-ADM-001 (Event-Driven) - WHEN an admin accesses admin panel, THEN the system shall verify admin role.

**Given-When-Then Scenarios:**

**Scenario 1: Admin can access panel**
```
Given I am logged in as admin
When I navigate to /admin
Then the admin dashboard should load
```

**Scenario 2: Non-admin cannot access panel**
```
Given I am logged in as regular user
When I navigate to /admin
Then I should be redirected with "forbidden" error
```

**Scenario 3: Admin dashboard displays**
```
Given I am on admin dashboard
When the page loads
Then I should see site statistics
And recent activity
And quick action links
```

**Quality Gate:**
- [ ] Admins can access admin panel
- [ ] Non-admins are blocked
- [ ] Dashboard displays correctly
- [ ] All admin features work

**Verification Method:**
```typescript
// E2E Test: Admin access
test('admin can access admin panel', async ({ page }) => {
  const admin = await createTestUser({ role: 'admin' })
  await loginAs(page, admin)

  await page.goto('/admin')
  await expect(page.locator('h1')).toContainText('Admin Dashboard')
})
```

---

## Phase 7: Data Migration Acceptance Criteria

### AC-MIG-001: Schema Migration

**Requirement:** REQ-MIG-001 (Event-Driven) - WHEN migration is executed, THEN the system shall convert MySQL to Supabase schema.

**Given-When-Then Scenarios:**

**Scenario 1: Migrate user schema**
```
Given the Rhymix MySQL database has users table
When I run user migration script
Then users table should exist in Supabase
With equivalent columns and data types
```

**Scenario 2: Migrate posts with foreign keys**
```
Given the source has posts with author references
When I run posts migration
Then posts table should exist in Supabase
With proper foreign key constraints
```

**Scenario 3: Verify data integrity**
```
Given migration completed
When I compare source and target row counts
Then counts should match exactly
```

**Quality Gate:**
- [ ] All tables migrated
- [ ] Foreign keys preserved
- [ ] Data integrity verified
- [ ] Migration is repeatable

**Verification Method:**
```sql
-- Verify row counts match
SELECT 'users' as table_name, COUNT(*) FROM source_users
UNION ALL
SELECT 'users', COUNT(*) FROM profiles;

SELECT 'posts' as table_name, COUNT(*) FROM source_posts
UNION ALL
SELECT 'posts', COUNT(*) FROM posts;
```

---

### AC-MIG-002: User Data Migration

**Requirement:** REQ-MIG-002 (Event-Driven) - WHEN user data is migrated, THEN the system shall preserve passwords.

**Given-When-Then Scenarios:**

**Scenario 1: Migrate user with password hash**
```
Given a user exists in source database
When I migrate the user
Then the user should exist in Supabase profiles
And password hash should be preserved
```

**Scenario 2: User can log in after migration**
```
Given a user was migrated
When I log in with original password
Then authentication should succeed
```

**Quality Gate:**
- [ ] All users migrated
- [ ] Password hashes preserved
- [ ] Users can log in with original credentials
- [ ] User metadata preserved

**Verification Method:**
```typescript
// Migration Test: User migration
test('migrated users can log in with original credentials', async ({ page }) => {
  const user = await getMigratedUser()

  await page.goto('/login')
  await page.fill('[name="email"]', user.email)
  await page.fill('[name="password"]', 'original-password')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/')
})
```

---

## Quality Gates Summary

### Code Quality Gates

**Tested Pillar:**
- [ ] 85%+ code coverage achieved
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Characterization tests for legacy analysis

**Readable Pillar:**
- [ ] Zero ESLint warnings
- [ ] Clear naming conventions followed
- [ ] Comments for complex logic
- [ ] TypeScript types properly defined

**Unified Pillar:**
- [ ] Prettier formatting applied
- [ ] Consistent import patterns
- [ ] No duplicate code
- [ ] Consistent component structure

**Secured Pillar:**
- [ ] Zero critical security vulnerabilities
- [ ] OWASP Top 10 compliance verified
- [ ] Input validation on all forms
- [ ] RLS policies enabled on all tables
- [ ] No credentials in version control

**Trackable Pillar:**
- [ ] Conventional commit messages used
- [ ] All requirements traceable to commits
- [ ] SPEC reference in all PRs
- [ ] Change log maintained

---

## Definition of Done

A feature is considered complete when:

1. **Requirements:**
   - [ ] All SPEC requirements implemented
   - [ ] All acceptance criteria pass
   - [ ] Edge cases handled

2. **Testing:**
   - [ ] Unit tests written and passing
   - [ ] Integration tests passing
   - [ ] E2E tests passing
   - [ ] 85%+ code coverage

3. **Quality:**
   - [ ] Zero TypeScript errors
   - [ ] Zero ESLint warnings
   - [ ] Prettier formatting applied
   - [ ] Code reviewed by peer

4. **Security:**
   - [ ] No critical vulnerabilities
   - [ ] Input validation implemented
   - [ ] Authorization checks in place
   - [ ] No hardcoded secrets

5. **Documentation:**
   - [ ] Code documented where complex
   - [ ] API endpoints documented
   - [ ] README updated
   - [ ] CHANGELOG entry added

---

## Test Execution Order

**Recommended Testing Sequence:**

1. **Phase 1 Tests** (Foundation)
   - Verify Next.js setup
   - Verify TypeScript configuration
   - Verify Tailwind and shadcn/ui

2. **Phase 2 Tests** (Core Architecture)
   - Database connection tests
   - Authentication flow tests
   - Authorization tests
   - File upload tests

3. **Phase 3 Tests** (Core Modules)
   - Board module tests
   - Member module tests
   - Document module tests
   - Comment module tests
   - Menu module tests

4. **Phase 4 Tests** (Advanced Features)
   - Multi-language tests
   - Search functionality tests
   - Admin panel tests
   - Theme system tests

5. **Phase 5 Tests** (Migration & Deployment)
   - Migration tests
   - Deployment tests
   - Smoke tests on production

---

**TAG BLOCK Traceability:**
```
SPEC-ID: SPEC-RHYMIX-001
DOCUMENT: acceptance.md
TRACEABILITY-TO: spec.md (requirements mapping), plan.md (milestone verification)
SUCCESS-CRITERIA: All acceptance criteria pass, TRUST 5 gates passed
NEXT-ACTION: /moai:3-sync SPEC-RHYMIX-001 (after implementation)
```
