# Acceptance Criteria: Initial Setup System

**SPEC ID:** SPEC-SETUP-001
**Test Strategy:** Hybrid (TDD for new code, Characterization for integration)
**Coverage Target:** 85%+

---

## Test Scenarios

### Feature 1: Default Board Seeding

#### Scenario 1.1: Successful Board Creation
```gherkin
GIVEN a fresh database installation
WHEN the seeding process executes
THEN 3 boards should be created in the boards table
AND each board should have a unique UUID
AND board mids should be "board", "qna", "notice"
AND board titles should be in Korean by default
AND each board should be accessible via its URL path
```

**Test Cases:**
- [ ] Verify board count equals 3
- [ ] Verify board "board" exists with correct properties
- [ ] Verify board "qna" exists with correct properties
- [ ] Verify board "notice" exists with correct properties
- [ ] Verify board URLs accessible (200 response)
- [ ] Verify board permissions configured correctly

#### Scenario 1.2: Board Seeding Idempotency
```gherkin
GIVEN boards already exist from previous seeding
WHEN the seeding process executes again
THEN no duplicate boards should be created
AND the existing boards should remain unchanged
AND no errors should occur
```

**Test Cases:**
- [ ] Run seeding twice
- [ ] Verify board count still equals 3
- [ ] Verify original board IDs preserved
- [ ] Verify no duplicate mids

#### Scenario 1.3: Board Seeding Failure Rollback
```gherkin
GIVEN a fresh database installation
WHEN board seeding fails midway
THEN all created boards should be removed
AND the database should return to pre-seeding state
AND installation status should reflect failure
```

**Test Cases:**
- [ ] Simulate failure during board seeding
- [ ] Verify transaction rollback
- [ ] Verify no orphaned board data
- [ ] Verify installation status updated

---

### Feature 2: Menu Structure Seeding

#### Scenario 2.1: Successful Menu Creation
```gherkin
GIVEN a fresh database installation
WHEN the seeding process executes
THEN 3 menu structures should be created
AND GNB menu should have 4 items
AND UNB menu should have 2 items
AND FNB menu should have 2 items
AND menu items should reference correct boards/pages
```

**Test Cases:**
- [ ] Verify menu count equals 3
- [ ] Verify GNB menu exists with title "Main Menu"
- [ ] Verify GNB has 4 child items
- [ ] Verify UNB menu exists with title "Utility Menu"
- [ ] Verify UNB has 2 child items (shortcuts)
- [ ] Verify FNB menu exists with title "Footer Menu"
- [ ] Verify FNB has 2 child items
- [ ] Verify menu item references correct

#### Scenario 2.2: Menu Hierarchy Navigation
```gherkin
GIVEN seeded menu structures
WHEN a user navigates the frontend
THEN the main menu should display GNB items
AND clicking "Free Board" should navigate to /board
AND clicking "Q&A" should navigate to /qna
AND clicking "Notice" should navigate to /notice
AND utility menu should display external links
AND footer menu should display legal pages
```

**Test Cases:**
- [ ] Verify main menu renders in layout
- [ ] Verify board navigation works
- [ ] Verify external links open in new tab
- [ ] Verify footer menu renders
- [ ] Verify all links functional

#### Scenario 2.3: Menu Item References
```gherkin
GIVEN seeded menu structures
WHEN querying menu items
THEN each board menu item should reference existing board
AND each page menu item should reference existing page
AND shortcut items should have valid URLs
AND no orphaned menu items should exist
```

**Test Cases:**
- [ ] Verify board references valid
- [ ] Verify page references valid
- [ ] Verify shortcut URLs valid
- [ ] Verify no orphaned items

---

### Feature 3: Layout Configuration Seeding

#### Scenario 3.1: Successful Layout Creation
```gherkin
GIVEN a fresh database installation
WHEN the seeding process executes
THEN 2 layouts should be created
AND PC layout should have type "P"
AND mobile layout should have type "M"
AND PC layout should reference all three menus
AND mobile layout should reference main menu
```

**Test Cases:**
- [ ] Verify layout count equals 2
- [ ] Verify PC layout exists with correct type
- [ ] Verify mobile layout exists with correct type
- [ ] Verify PC layout menu references
- [ ] Verify mobile layout menu references
- [ ] Verify layout extra_vars configured

#### Scenario 3.2: Layout Application
```gherkin
GIVEN seeded layouts
WHEN rendering the frontend
THEN the PC layout should apply to desktop browsers
AND the mobile layout should apply to mobile browsers
AND layout configuration should be accessible
AND theme should render correctly
```

**Test Cases:**
- [ ] Verify PC layout applied on desktop
- [ ] Verify mobile layout applied on mobile
- [ ] Verify layout configuration accessible
- [ ] Verify theme renders correctly

---

### Feature 4: Welcome Page Creation

#### Scenario 4.1: Successful Welcome Page Creation
```gherkin
GIVEN a fresh database installation
WHEN the seeding process executes
THEN a welcome page should be created
AND page mid should be "index"
AND page should be set as homepage
AND page content should include welcome message
AND mobile version should exist
```

**Test Cases:**
- [ ] Verify welcome page exists
- [ ] Verify page mid equals "index"
- [ ] Verify homepage displays welcome content
- [ ] Verify welcome message visible
- [ ] Verify mobile content exists

#### Scenario 4.2: Homepage Access
```gherkin
GIVEN a seeded welcome page
WHEN a user visits the root URL "/"
THEN the welcome page should display
AND page title should be "Welcome to Rhymix"
AND content should be accessible to all users
AND mobile users should see mobile version
```

**Test Cases:**
- [ ] Verify root URL returns 200
- [ ] Verify page title correct
- [ ] Verify content accessible without auth
- [ ] Verify mobile version different
- [ ] Verify responsive design works

---

### Feature 5: Dashboard Widget Configuration

#### Scenario 5.1: Widget Seeding
```gherkin
GIVEN a fresh database installation
WHEN the seeding process executes
THEN 4 dashboard widgets should be configured
AND recent_comments widget should exist
AND latest_documents widget should exist
AND member_stats widget should exist
AND document_stats widget should exist
```

**Test Cases:**
- [ ] Verify widget count equals 4
- [ ] Verify recent_comments widget configured
- [ ] Verify latest_documents widget configured
- [ ] Verify member_stats widget configured
- [ ] Verify document_stats widget configured
- [ ] Verify widget positions correct

#### Scenario 5.2: Widget Data Retrieval
```gherkin
GIVEN seeded widgets and sample data
WHEN admin accesses dashboard
THEN recent_comments widget should show latest 5 comments
AND latest_documents widget should show latest 5 documents
AND member_stats widget should show total and today counts
AND document_stats widget should show total and today counts
```

**Test Cases:**
- [ ] Verify recent comments display
- [ ] Verify comment count equals 5
- [ ] Verify latest documents display
- [ ] Verify document count equals 5
- [ ] Verify member stats display
- [ ] Verify document stats display

#### Scenario 5.3: Widget Actions
```gherkin
GIVEN widgets with data
WHEN admin clicks widget action buttons
THEN trash button should move item to trash
AND delete button should permanently delete item
AND widget should refresh after action
AND action should require admin authentication
```

**Test Cases:**
- [ ] Verify trash action works
- [ ] Verify delete action works
- [ ] Verify widget refreshes
- [ ] Verify authentication required
- [ ] Verify permission denied for non-admins

---

### Feature 6: Site Configuration Defaults

#### Scenario 6.1: Configuration Seeding
```gherkin
GIVEN a fresh database installation
WHEN the seeding process executes
THEN all default configuration keys should exist
AND configuration values should match defaults
AND public configs should be accessible
AND admin configs should require authentication
```

**Test Cases:**
- [ ] Verify all config keys present
- [ ] Verify site.name configured
- [ ] Verify site.language equals "ko"
- [ ] Verify site.timezone equals "Asia/Seoul"
- [ ] Verify auth configs present
- [ ] Verify feature configs present

#### Scenario 6.2: Configuration Access
```gherkin
GIVEN seeded configuration
WHEN querying configuration values
THEN public configs should return without auth
AND admin configs should require admin role
AND configuration should be updateable by admin
AND invalid updates should be rejected
```

**Test Cases:**
- [ ] Verify public config accessible
- [ ] Verify admin config protected
- [ ] Verify admin can update config
- [ ] Verify validation works
- [ ] Verify invalid values rejected

---

### Feature 7: Transaction Integrity

#### Scenario 7.1: Successful Transaction Commit
```gherkin
GIVEN a fresh database installation
WHEN all seeding operations succeed
THEN transaction should commit
AND all seeded data should persist
AND installation status should be "completed"
AND verification should pass
```

**Test Cases:**
- [ ] Verify transaction commits
- [ ] Verify data persists
- [ ] Verify installation status updated
- [ ] Verify verification passes

#### Scenario 7.2: Transaction Rollback on Failure
```gherkin
GIVEN a fresh database installation
WHEN any seeding operation fails
THEN transaction should rollback
AND no seeded data should persist
AND installation status should be "failed"
AND error details should be logged
```

**Test Cases:**
- [ ] Simulate failure in board seeding
- [ ] Verify transaction rolls back
- [ ] Verify no data persists
- [ ] Verify installation status reflects failure
- [ ] Verify error logged

#### Scenario 7.3: Partial Seeding Recovery
```gherkin
GIVEN a partial seeding failure
WHEN retry is attempted
THEN previous partial data should be cleaned
AND seeding should start fresh
AND transaction should complete successfully
```

**Test Cases:**
- [ ] Create partial seeding state
- [ ] Attempt retry
- [ ] Verify cleanup occurs
- [ ] Verify fresh seeding succeeds

---

### Feature 8: Installation Wizard Integration

#### Scenario 8.1: Seeding Step Execution
```gherkin
GIVEN installation wizard at step 5
WHEN proceeding to step 6
THEN seeding should execute automatically
AND user should see seeding progress
AND seeding should complete before step 6
AND success message should display
```

**Test Cases:**
- [ ] Verify seeding executes at correct step
- [ ] Verify progress indicator shows
- [ ] Verify step 6 waits for seeding
- [ ] Verify success message displays

#### Scenario 8.2: Seeding Progress Display
```gherkin
GIVEN seeding is executing
WHEN user views progress
THEN current seeding operation should display
AND estimated time remaining should show
AND success/failure for each category should show
AND overall progress percentage should update
```

**Test Cases:**
- [ ] Verify current operation displays
- [ ] Verify time estimate shows
- [ ] Verify category status shows
- [ ] Verify progress updates

#### Scenario 8.3: Seeding Error Handling
```gherkin
GIVEN seeding fails
WHEN error occurs
THEN error message should display
AND retry button should be available
AND installation should not proceed
AND support information should be provided
```

**Test Cases:**
- [ ] Simulate seeding failure
- [ ] Verify error message displays
- [ ] Verify retry button available
- [ ] Verify installation halted
- [ ] Verify support info shown

---

### Feature 9: Seeding Performance

#### Scenario 9.1: Seeding Duration
```gherkin
GIVEN a standard server configuration
WHEN seeding executes
THEN total seeding duration should be under 5 seconds
AND no timeout errors should occur
AND database should remain responsive
```

**Test Cases:**
- [ ] Measure seeding duration
- [ ] Verify duration < 5 seconds
- [ ] Verify no timeout errors
- [ ] Verify database responsive during seeding

#### Scenario 9.2: Resource Usage
```gherkin
GIVEN seeding is executing
WHEN monitoring resource usage
THEN memory usage should stay under 100MB
AND CPU usage should be reasonable
AND no memory leaks should occur
```

**Test Cases:**
- [ ] Monitor memory usage
- [ ] Verify memory < 100MB
- [ ] Monitor CPU usage
- [ ] Check for memory leaks

---

### Feature 10: Dashboard Widget APIs

#### Scenario 10.1: Stats API Success
```gherkin
GIVEN an authenticated admin user
WHEN requesting GET /api/admin/dashboard/stats
THEN response status should be 200
AND response body should contain member stats
AND response body should contain document stats
AND response body should contain comment stats
```

**Test Cases:**
- [ ] Verify 200 response
- [ ] Verify member stats in response
- [ ] Verify document stats in response
- [ ] Verify comment stats in response
- [ ] Verify response time < 200ms

#### Scenario 10.2: API Authentication
```gherkin
GIVEN an unauthenticated user
WHEN requesting dashboard APIs
THEN response status should be 401
AND error message should indicate authentication required
```

**Test Cases:**
- [ ] Request without auth token
- [ ] Verify 401 response
- [ ] Verify error message

#### Scenario 10.3: API Rate Limiting
```gherkin
GIVEN an authenticated admin user
WHEN making excessive API requests
THEN rate limiting should apply
AND 429 response should return after limit
AND retry-after header should be present
```

**Test Cases:**
- [ ] Make excessive requests
- [ ] Verify rate limit applied
- [ ] Verify 429 response
- [ ] Verify retry-after header

---

## Edge Cases

### Edge Case 1: Empty Database
```gherkin
GIVEN a completely empty database (no schema)
WHEN attempting seeding
THEN seeding should fail gracefully
AND error should indicate missing schema
AND no partial data should exist
```

### Edge Case 2: Corrupted Existing Data
```gherkin
GIVEN corrupted data in tables
WHEN seeding executes
THEN seeding should handle corruption
AND idempotency should prevent duplicates
AND verification should detect issues
```

### Edge Case 3: Concurrent Seeding Attempts
```gherkin
GIVEN seeding already in progress
WHEN another seeding attempt starts
THEN second attempt should wait or fail
AND no race conditions should occur
AND data integrity should be maintained
```

### Edge Case 4: Database Connection Loss
```gherkin
GIVEN seeding in progress
WHEN database connection is lost
THEN transaction should rollback
AND error should be logged
AND retry should be possible
```

### Edge Case 5: Insufficient Permissions
```gherkin
GIVEN database user lacks required permissions
WHEN seeding attempts to insert data
THEN permission error should occur
AND seeding should fail gracefully
AND error message should indicate permission issue
```

---

## Security Test Cases

### Security Test 1: SQL Injection Prevention
```gherkin
GIVEN malicious input in configuration
WHEN seeding executes
THEN SQL injection should be prevented
AND no unauthorized data access should occur
```

### Security Test 2: XSS Prevention in Widgets
```gherkin
GIVEN script tags in comment/document content
WHEN widgets display data
THEN scripts should be sanitized
AND no XSS execution should occur
```

### Security Test 3: RLS Policy Enforcement
```gherkin
GIVEN seeded data with RLS policies
WHEN non-admin users query data
THEN RLS policies should restrict access
AND only authorized data should be visible
```

### Security Test 4: API Authorization
```gherkin
GIVEN non-admin authenticated user
WHEN accessing admin dashboard APIs
THEN 403 Forbidden should be returned
AND no data should be exposed
```

---

## Performance Benchmarks

| Operation | Target | Acceptable | Fail |
|-----------|--------|------------|------|
| Total Seeding Duration | < 5s | < 10s | > 10s |
| Single Board Creation | < 100ms | < 500ms | > 500ms |
| Menu Structure Creation | < 200ms | < 1s | > 1s |
| Layout Creation | < 100ms | < 500ms | > 500ms |
| Page Creation | < 100ms | < 500ms | > 500ms |
| Widget Configuration | < 100ms | < 500ms | > 500ms |
| API Response Time | < 200ms | < 500ms | > 500ms |
| Dashboard Load Time | < 2s | < 5s | > 5s |
| Memory Usage | < 100MB | < 200MB | > 200MB |

---

## Test Execution Matrix

| Test Category | Unit | Integration | E2E | Manual |
|---------------|------|-------------|-----|--------|
| Board Seeding | ✅ | ✅ | ✅ | ✅ |
| Menu Seeding | ✅ | ✅ | ✅ | ✅ |
| Layout Seeding | ✅ | ✅ | ✅ | - |
| Page Seeding | ✅ | ✅ | ✅ | ✅ |
| Widget Seeding | ✅ | ✅ | ✅ | ✅ |
| Configuration Seeding | ✅ | ✅ | - | ✅ |
| Transaction Integrity | ✅ | ✅ | - | - |
| Installation Wizard | - | ✅ | ✅ | ✅ |
| Dashboard Widgets | ✅ | ✅ | ✅ | ✅ |
| Widget APIs | ✅ | ✅ | ✅ | - |
| Performance | - | ✅ | - | ✅ |
| Security | ✅ | ✅ | ✅ | ✅ |

---

## Test Data Requirements

### Sample Data for Testing
- 10 sample members (1 admin, 9 regular users)
- 20 sample documents (distributed across boards)
- 30 sample comments (distributed across documents)
- Sample timestamps (today, yesterday, last week)

### Test Database States
1. **Fresh Database:** No data, only schema
2. **Partially Seeded:** Some seeded data exists
3. **Fully Seeded:** All default data present
4. **Corrupted Data:** Invalid references, orphaned records

---

## Test Automation

### Automated Test Suites
- **Unit Tests:** Jest + React Testing Library
- **Integration Tests:** Jest + Supertest
- **E2E Tests:** Playwright
- **Performance Tests:** Custom scripts with timing
- **Security Tests:** OWASP ZAP automation

### CI/CD Integration
- Unit tests: Run on every PR
- Integration tests: Run on merge to develop
- E2E tests: Run on merge to main
- Performance tests: Run nightly
- Security tests: Run weekly

---

## Acceptance Checklist

### Functional Acceptance
- [ ] All 3 boards created and accessible
- [ ] All 3 menus created with correct hierarchy
- [ ] 2 layouts created and applied
- [ ] Welcome page displays as homepage
- [ ] 4 dashboard widgets functional
- [ ] All configuration defaults set
- [ ] Navigation works correctly
- [ ] All test scenarios pass

### Performance Acceptance
- [ ] Seeding completes in < 5 seconds
- [ ] API responses < 200ms
- [ ] Dashboard loads in < 2 seconds
- [ ] Memory usage < 100MB
- [ ] No timeout errors

### Quality Acceptance
- [ ] Test coverage ≥ 85%
- [ ] No critical bugs
- [ ] No high bugs
- [ ] All linter warnings resolved
- [ ] TRUST 5 gates passing

### Security Acceptance
- [ ] SQL injection tests pass
- [ ] XSS prevention tests pass
- [ ] RLS policies enforced
- [ ] API authentication working
- [ ] No sensitive data exposed

### User Experience Acceptance
- [ ] Installation wizard intuitive
- [ ] Seeding progress clear
- [ ] Error messages helpful
- [ ] Default content professional
- [ ] Easy to customize/delete defaults

---

**Acceptance Criteria Created:** 2026-02-28
**Last Updated:** 2026-02-28
**Test Strategy:** Hybrid TDD + DDD
**Coverage Target:** 85%+
