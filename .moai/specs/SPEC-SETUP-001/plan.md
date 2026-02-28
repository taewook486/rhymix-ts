# Implementation Plan: Initial Setup System

**SPEC ID:** SPEC-SETUP-001
**Implementation Strategy:** Hybrid DDD (TDD for new code, DDD for integration)
**Estimated Duration:** 2-3 development cycles
**Risk Level:** Medium (database operations, transaction management)

---

## Implementation Overview

This plan implements automatic initial data seeding for the Rhymix TypeScript system, ensuring new installations have functional default content including boards, menus, layouts, pages, widgets, and configuration.

---

## Milestone 1: Database Seeding Migration (Priority: Critical)

**Goal:** Create SQL migration file with all default data seeding logic

### Tasks

1. **Create Seeding Migration File**
   - File: `supabase/migrations/014_initial_data_seed.sql`
   - Priority: P0 (Blocking)
   - Estimated Effort: Medium
   - Dependencies: Migrations 001-013 complete

   **Subtasks:**
   - [ ] Define board seeding INSERT statements
   - [ ] Define menu structure seeding (with CTEs for references)
   - [ ] Define layout seeding INSERT statements
   - [ ] Define welcome page seeding INSERT statements
   - [ ] Define widget configuration seeding
   - [ ] Add transaction wrapper
   - [ ] Add idempotency checks (ON CONFLICT DO NOTHING)
   - [ ] Add verification queries

2. **Create Helper Functions**
   - File: `supabase/migrations/014_initial_data_seed.sql`
   - Priority: P0 (Blocking)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Create `seed_default_boards()` function
   - [ ] Create `seed_default_menus()` function
   - [ ] Create `seed_default_layouts()` function
   - [ ] Create `seed_welcome_page()` function
   - [ ] Create `seed_dashboard_widgets()` function
   - [ ] Create `verify_seeding()` function
   - [ ] Create master `seed_initial_data()` function

3. **Test Migration Locally**
   - Priority: P0 (Blocking)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Run migration on fresh database
   - [ ] Verify all data seeded correctly
   - [ ] Test idempotency (run twice)
   - [ ] Test rollback on error
   - [ ] Verify foreign key constraints
   - [ ] Check RLS policies applied

### Success Criteria
- ✅ Migration executes without errors
- ✅ All default data present in database
- ✅ Re-running migration doesn't create duplicates
- ✅ Transaction rollback works on failure

---

## Milestone 2: Server Action Implementation (Priority: Critical)

**Goal:** Create TypeScript server action to orchestrate seeding process

### Tasks

1. **Create Seeding Server Action**
   - File: `app/actions/seed-initial-data.ts`
   - Priority: P0 (Blocking)
   - Estimated Effort: Medium
   - Dependencies: Migration 014 complete

   **Subtasks:**
   - [ ] Create `seedInitialData()` server action
   - [ ] Implement transaction management
   - [ ] Add error handling and logging
   - [ ] Implement verification logic
   - [ ] Add retry mechanism
   - [ ] Return structured result

2. **Create Seeding Utilities**
   - File: `lib/seeding-utils.ts`
   - Priority: P1 (High)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Create `SeedResult` type definition
   - [ ] Create `SeedError` type definition
   - [ ] Create `verifySeedingIntegrity()` function
   - [ ] Create `logSeedingOperation()` function

3. **Create Seeding Tests**
   - File: `__tests__/actions/seed-initial-data.test.ts`
   - Priority: P1 (High)
   - Estimated Effort: Medium
   - Test Strategy: TDD (write tests first)

   **Subtasks:**
   - [ ] Test successful seeding
   - [ ] Test seeding failure and rollback
   - [ ] Test idempotency
   - [ ] Test verification logic
   - [ ] Test error handling

### Success Criteria
- ✅ Server action executes seeding migration
- ✅ Transaction management works
- ✅ Error handling returns meaningful messages
- ✅ Unit tests passing (85%+ coverage)

---

## Milestone 3: Installation Wizard Integration (Priority: Critical)

**Goal:** Integrate seeding into installation wizard flow

### Tasks

1. **Update Installation Wizard**
   - File: `app/(auth)/install/page.tsx`
   - Priority: P0 (Blocking)
   - Estimated Effort: Medium
   - Dependencies: Server action complete

   **Subtasks:**
   - [ ] Add step 5.5: Data Seeding
   - [ ] Update wizard progress indicator
   - [ ] Add seeding progress UI
   - [ ] Add seeding error handling
   - [ ] Add retry mechanism UI
   - [ ] Update step navigation logic

2. **Update Installation Actions**
   - File: `app/actions/installation.ts`
   - Priority: P0 (Blocking)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Add `completeInstallation()` action
   - [ ] Call `seedInitialData()` at correct step
   - [ ] Update installation status tracking
   - [ ] Handle seeding errors
   - [ ] Log seeding completion

3. **Create Seeding Progress Component**
   - File: `components/install/SeedingProgress.tsx`
   - Priority: P1 (High)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Create progress indicator UI
   - [ ] Show seeding status for each category
   - [ ] Display success/failure states
   - [ ] Show retry button on failure
   - [ ] Display estimated time remaining

4. **Update Installation Status Schema**
   - File: `supabase/migrations/015_update_installation_status.sql`
   - Priority: P1 (High)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Add `seeding_started_at` column
   - [ ] Add `seeding_completed_at` column
   - [ ] Add `seeding_error` JSONB column
   - [ ] Add `seeding_retry_count` column

### Success Criteria
- ✅ Installation wizard includes seeding step
- ✅ Seeding executes at correct point
- ✅ User sees seeding progress
- ✅ Errors halt installation gracefully
- ✅ Retry mechanism works

---

## Milestone 4: Dashboard Widget Components (Priority: High)

**Goal:** Create React components for dashboard widgets

### Tasks

1. **Create Widget Container Component**
   - File: `components/admin/DashboardWidgets.tsx`
   - Priority: P1 (High)
   - Estimated Effort: Medium
   - Test Strategy: TDD

   **Subtasks:**
   - [ ] Create widget container layout
   - [ ] Implement widget positioning (main/sidebar)
   - [ ] Add widget loading states
   - [ ] Add widget error boundaries
   - [ ] Implement widget refresh mechanism
   - [ ] Write unit tests

2. **Create Recent Comments Widget**
   - File: `components/admin/widgets/RecentCommentsWidget.tsx`
   - Priority: P1 (High)
   - Estimated Effort: Medium
   - Test Strategy: TDD

   **Subtasks:**
   - [ ] Create widget UI component
   - [ ] Display comment list (5 items)
   - [ ] Show comment summary + author
   - [ ] Add trash/delete action buttons
   - [ ] Implement action handlers
   - [ ] Write unit tests

3. **Create Latest Documents Widget**
   - File: `components/admin/widgets/LatestDocumentsWidget.tsx`
   - Priority: P1 (High)
   - Estimated Effort: Medium
   - Test Strategy: TDD

   **Subtasks:**
   - [ ] Create widget UI component
   - [ ] Display document list (5 items)
   - [ ] Show document title + author
   - [ ] Add trash/delete action buttons
   - [ ] Implement action handlers
   - [ ] Write unit tests

4. **Create Statistics Widgets**
   - Files:
     - `components/admin/widgets/MemberStatsWidget.tsx`
     - `components/admin/widgets/DocumentStatsWidget.tsx`
   - Priority: P1 (High)
   - Estimated Effort: Medium
   - Test Strategy: TDD

   **Subtasks:**
   - [ ] Create member stats widget UI
   - [ ] Display total + today counts
   - [ ] Add link to member list
   - [ ] Create document stats widget UI
   - [ ] Display total + today counts
   - [ ] Add link to document list
   - [ ] Write unit tests for both

5. **Create Widget Tests**
   - Files:
     - `__tests__/components/admin/DashboardWidgets.test.tsx`
     - `__tests__/components/admin/widgets/*.test.tsx`
   - Priority: P1 (High)
   - Estimated Effort: Medium

   **Subtasks:**
   - [ ] Test widget rendering
   - [ ] Test data display
   - [ ] Test action handlers
   - [ ] Test loading states
   - [ ] Test error states
   - [ ] Achieve 85%+ coverage

### Success Criteria
- ✅ All four widgets render correctly
- ✅ Widgets display real data
- ✅ Widget actions functional
- ✅ Loading/error states handled
- ✅ Unit tests passing (85%+ coverage)

---

## Milestone 5: Dashboard Widget APIs (Priority: High)

**Goal:** Create API endpoints for dashboard widget data retrieval

### Tasks

1. **Create Dashboard Stats API**
   - File: `app/api/admin/dashboard/stats/route.ts`
   - Priority: P1 (High)
   - Estimated Effort: Medium
   - Test Strategy: TDD

   **Subtasks:**
   - [ ] Create GET endpoint
   - [ ] Implement authentication check
   - [ ] Query member statistics
   - [ ] Query document statistics
   - [ ] Query comment statistics
   - [ ] Return structured JSON
   - [ ] Add rate limiting
   - [ ] Write integration tests

2. **Create Recent Comments API**
   - File: `app/api/admin/dashboard/recent-comments/route.ts`
   - Priority: P1 (High)
   - Estimated Effort: Small
   - Test Strategy: TDD

   **Subtasks:**
   - [ ] Create GET endpoint
   - [ ] Implement authentication check
   - [ ] Query recent comments (limit 5)
   - [ ] Format comment data
   - [ ] Return JSON array
   - [ ] Add rate limiting
   - [ ] Write integration tests

3. **Create Latest Documents API**
   - File: `app/api/admin/dashboard/latest-documents/route.ts`
   - Priority: P1 (High)
   - Estimated Effort: Small
   - Test Strategy: TDD

   **Subtasks:**
   - [ ] Create GET endpoint
   - [ ] Implement authentication check
   - [ ] Query latest documents (limit 5)
   - [ ] Format document data
   - [ ] Return JSON array
   - [ ] Add rate limiting
   - [ ] Write integration tests

4. **Create API Tests**
   - Files:
     - `__tests__/api/admin/dashboard/stats.test.ts`
     - `__tests__/api/admin/dashboard/recent-comments.test.ts`
     - `__tests__/api/admin/dashboard/latest-documents.test.ts`
   - Priority: P1 (High)
   - Estimated Effort: Medium

   **Subtasks:**
   - [ ] Test successful data retrieval
   - [ ] Test authentication enforcement
   - [ ] Test rate limiting
   - [ ] Test error handling
   - [ ] Test response format
   - [ ] Achieve 85%+ coverage

### Success Criteria
- ✅ All three API endpoints functional
- ✅ Authentication enforced
- ✅ Rate limiting applied
- ✅ Response time under 200ms
- ✅ Integration tests passing

---

## Milestone 6: Integration and Testing (Priority: High)

**Goal:** Comprehensive integration testing of entire seeding flow

### Tasks

1. **Create E2E Installation Test**
   - File: `e2e/installation.spec.ts`
   - Priority: P1 (High)
   - Estimated Effort: Large
   - Test Strategy: E2E with Playwright

   **Subtasks:**
   - [ ] Test complete installation flow
   - [ ] Verify default boards accessible
   - [ ] Verify menu navigation works
   - [ ] Verify homepage displays welcome content
   - [ ] Verify admin dashboard shows widgets
   - [ ] Test seeding error handling
   - [ ] Test retry mechanism

2. **Create Integration Tests**
   - File: `__tests__/integration/seeding.test.ts`
   - Priority: P1 (High)
   - Estimated Effort: Medium

   **Subtasks:**
   - [ ] Test seeding with fresh database
   - [ ] Test seeding with existing data (idempotency)
   - [ ] Test seeding rollback on error
   - [ ] Test seeding verification
   - [ ] Test installation wizard integration
   - [ ] Test dashboard widget data flow

3. **Performance Testing**
   - Priority: P2 (Medium)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Measure seeding duration
   - [ ] Measure API response times
   - [ ] Measure dashboard load time
   - [ ] Identify performance bottlenecks
   - [ ] Optimize slow operations
   - [ ] Document performance benchmarks

4. **Security Testing**
   - Priority: P1 (High)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Test RLS policies on seeded data
   - [ ] Test API authentication
   - [ ] Test SQL injection prevention
   - [ ] Test XSS prevention in widgets
   - [ ] Verify no sensitive data exposed
   - [ ] Document security considerations

### Success Criteria
- ✅ E2E tests passing
- ✅ Integration tests passing
- ✅ Performance benchmarks met
- ✅ Security tests passing
- ✅ No critical bugs remaining

---

## Milestone 7: Documentation and Cleanup (Priority: Medium)

**Goal:** Complete documentation and code cleanup

### Tasks

1. **Update Installation Documentation**
   - File: `docs/installation-guide.md`
   - Priority: P2 (Medium)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Document seeding process
   - [ ] Document default content
   - [ ] Document customization options
   - [ ] Document troubleshooting
   - [ ] Add screenshots

2. **Update Admin Guide**
   - File: `docs/admin-guide.md`
   - Priority: P2 (Medium)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Document dashboard widgets
   - [ ] Document widget customization
   - [ ] Document default boards
   - [ ] Document menu management

3. **Code Cleanup**
   - Priority: P2 (Medium)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Remove debug logging
   - [ ] Add code comments
   - [ ] Refactor duplicate code
   - [ ] Optimize imports
   - [ ] Run linter and fix issues

4. **Create Developer Notes**
   - File: `docs/developer/seeding-system.md`
   - Priority: P2 (Medium)
   - Estimated Effort: Small

   **Subtasks:**
   - [ ] Document seeding architecture
   - [ ] Document extension points
   - [ ] Document testing strategy
   - [ ] Document troubleshooting

### Success Criteria
- ✅ Documentation complete and accurate
- ✅ Code clean and well-commented
- ✅ No linter warnings
- ✅ Developer notes comprehensive

---

## Risk Mitigation

### High Risk Items

1. **Database Transaction Failures**
   - **Risk:** Transaction deadlocks or timeout
   - **Mitigation:** Keep transactions short, use proper isolation level
   - **Fallback:** Manual seeding via SQL script

2. **Seeding Performance**
   - **Risk:** Seeding takes too long, times out
   - **Mitigation:** Optimize queries, batch operations
   - **Fallback:** Background seeding job

3. **Data Integrity**
   - **Risk:** Partial seeding leaves orphaned data
   - **Mitigation:** Comprehensive rollback logic
   - **Fallback:** Database restore from backup

### Medium Risk Items

4. **Widget Performance**
   - **Risk:** Dashboard loads slowly
   - **Mitigation:** Implement caching, optimize queries
   - **Fallback:** Lazy load widgets

5. **Installation Wizard UX**
   - **Risk:** Users confused by seeding step
   - **Mitigation:** Clear progress indicators, helpful messages
   - **Fallback:** Skip seeding option (manual setup)

---

## Dependencies

### External Dependencies
- Supabase PostgreSQL 16
- Next.js 16 App Router
- React 19
- TypeScript 5.9

### Internal Dependencies
- Database schema (migrations 001-013)
- Installation wizard (6 steps)
- Authentication system
- Admin role system
- RLS policy system

### Blocking Dependencies
- None (this is a foundational feature)

---

## Rollout Strategy

### Phase 1: Development (Current)
- Implement seeding migration
- Implement server actions
- Implement installation wizard integration

### Phase 2: Testing
- Unit testing
- Integration testing
- E2E testing
- Performance testing

### Phase 3: Staging
- Deploy to staging environment
- Test with fresh database
- Verify all default content
- Gather feedback

### Phase 4: Production
- Deploy to production
- Monitor seeding performance
- Monitor error rates
- Gather user feedback

---

## Success Metrics

### Functional Metrics
- 100% of installations have default content
- 0% duplicate data issues
- 100% seeding transaction success rate

### Performance Metrics
- Seeding duration < 5 seconds
- API response time < 200ms
- Dashboard load time < 2 seconds

### Quality Metrics
- Test coverage ≥ 85%
- 0 critical bugs
- All TRUST 5 gates passing

### User Experience Metrics
- Installation completion rate ≥ 95%
- User satisfaction ≥ 4.5/5
- Support tickets related to seeding < 5/month

---

## Next Steps

1. **Immediate:** Review and approve SPEC document
2. **Week 1:** Complete Milestone 1 (Database Seeding)
3. **Week 2:** Complete Milestones 2-3 (Server Actions + Wizard)
4. **Week 3:** Complete Milestones 4-5 (Widgets + APIs)
5. **Week 4:** Complete Milestones 6-7 (Testing + Documentation)

---

**Plan Created:** 2026-02-28
**Last Updated:** 2026-02-28
**Next Review:** Upon SPEC approval
