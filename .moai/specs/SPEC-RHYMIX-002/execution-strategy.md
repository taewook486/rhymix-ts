# Execution Strategy - SPEC-RHYMIX-002

## Plan Summary

SPEC-RHYMIX-002는 ASIS Rhymix PHP CMS와 TOBE Next.js 시스템 간의 기능 격차를 해소하는 작업입니다. 총 8개 Use Case와 26개 WHW 요구사항이 있으며, 6개 스프린트로 구성됩니다. 본 실행 전략은 **Sprint 1: Member Management Enhancement**에 집중합니다.

Sprint 1은 7개의 WHW 요구사항을 구현하며, 회원 관리 고급 설정(5개 WHW)과 회원 추가/편집 폼(2개 WHW)을 포함합니다. Hybrid 개발 방법론을 사용하여 신규 코드는 TDD, 기존 코드 수정은 DDD 방식으로 진행합니다.

---

## Requirements Analysis

### Sprint 1: Member Management Enhancement (HIGH Priority)

| WHW ID | Requirement | Complexity | Methodology | Effort |
|--------|------------|------------|-------------|--------|
| WHW-001 | 회원 가입 설정 (enable_join, URL key, 이메일 인증, 만료 시간) | Medium | TDD (NEW) | 4h |
| WHW-002 | 회원 필드 설정 (homepage, blog, birthday, mailing, message) | Medium | TDD (NEW) | 3h |
| WHW-003 | 닉네임 설정 (변경 허용, 이력 기록, 특수문자, 띄어쓰기, 중복) | Medium | TDD (NEW) | 3h |
| WHW-004 | 비밀번호 보안 설정 (강도, 해싱 알고리즘, 워크 팩터, 자동 업그레이드) | High | TDD (NEW) | 6h |
| WHW-005 | 비밀번호 재설정 방식 (링크 전달 vs 임시 비밀번호) | Low | TDD (NEW) | 2h |
| WHW-010 | 회원 추가 폼 (13개 필드) | High | DDD (MODIFY) | 5h |
| WHW-011 | 회원 편집 폼 (상태, 거부 사유, 제한 일자) | Medium | DDD (MODIFY) | 4h |

**Total Sprint 1 Estimate**: 27 hours (~3-4 days)

### Full SPEC Requirements Overview

| Sprint | Use Case | WHW Count | Priority | Total Effort |
|--------|----------|-----------|----------|--------------|
| Sprint 1 | UC-001, UC-002 | 7 | HIGH | 27h |
| Sprint 2 | UC-003, UC-004 | 7 | HIGH | 32h |
| Sprint 3 | UC-005, UC-006 | 7 | HIGH/MEDIUM | 30h |
| Sprint 4 | UC-007, UC-008 | 5 | MEDIUM/LOW | 20h |

---

## Sprint 1 Breakdown (Current Focus)

### Task Decomposition

#### Phase 1: Database Schema (DDD - ANALYZE)

**Task 1.1: Create member_settings table migration**
- **Type**: TDD (NEW code)
- **Files**:
  - `supabase/migrations/XXX_member_settings.sql` (NEW)
- **Dependencies**: None
- **Approach**:
  1. Create Zod schema for validation tests
  2. Write migration with all columns from spec.md
  3. Test migration with rollback
- **Acceptance**:
  - Migration runs successfully
  - All columns match spec.md specification
  - Rollback works correctly

**Task 1.2: Update profiles table schema**
- **Type**: DDD (MODIFY existing)
- **Files**:
  - `supabase/migrations/XXX_profiles_enhancement.sql` (NEW)
  - `lib/supabase/database.types.ts` (MODIFY)
- **Dependencies**: Task 1.1
- **Approach**:
  1. ANALYZE: Read current profiles table structure
  2. PRESERVE: Write characterization tests for existing profile operations
  3. IMPROVE: Add new columns (homepage_url, blog_url, birthday, mailing, message_setting, status, denied_reason, restricted_until, restriction_reason, admin_notes)
- **Acceptance**:
  - Existing profile tests still pass
  - New columns added successfully
  - TypeScript types updated

**Task 1.3: Create RLS policies**
- **Type**: TDD (NEW code)
- **Files**:
  - `supabase/migrations/XXX_member_settings_rls.sql` (NEW)
- **Dependencies**: Task 1.1
- **Approach**:
  1. Define RLS requirements in tests
  2. Create policies for admin-only access to member_settings
  3. Test RLS with different user roles
- **Acceptance**:
  - Admin can read/write settings
  - Non-admin cannot access settings
  - RLS test coverage 100%

---

#### Phase 2: Member Settings API (TDD - RED-GREEN-REFACTOR)

**Task 2.1: Create Zod validation schemas**
- **Type**: TDD (NEW code)
- **Files**:
  - `lib/validations/member-settings.ts` (NEW)
  - `__tests__/validations/member-settings.test.ts` (NEW)
- **Dependencies**: Task 1.1
- **Approach**:
  1. RED: Write tests for all validation rules
  2. GREEN: Implement Zod schemas matching spec.md
  3. REFACTOR: Extract common validation patterns
- **Acceptance**:
  - All validation rules from WHW-001 to WHW-005 covered
  - Test coverage >= 90%
  - Edge cases validated (empty strings, invalid enums)

**Task 2.2: Create GET /api/admin/member-settings endpoint**
- **Type**: TDD (NEW code)
- **Files**:
  - `app/api/admin/member-settings/route.ts` (NEW)
  - `__tests__/api/member-settings/get.test.ts` (NEW)
- **Dependencies**: Task 2.1
- **Approach**:
  1. RED: Write API route tests
  2. GREEN: Implement GET handler
  3. REFACTOR: Extract auth check to middleware
- **Acceptance**:
  - Returns settings with 200 status
  - Returns 401 for unauthenticated users
  - Returns 403 for non-admin users
  - Returns default settings if not configured

**Task 2.3: Create PUT /api/admin/member-settings endpoint**
- **Type**: TDD (NEW code)
- **Files**:
  - `app/api/admin/member-settings/route.ts` (MODIFY)
  - `__tests__/api/member-settings/put.test.ts` (NEW)
- **Dependencies**: Task 2.2
- **Approach**:
  1. RED: Write update tests with validation
  2. GREEN: Implement PUT handler with validation
  3. REFACTOR: Extract update logic to service layer
- **Acceptance**:
  - Updates settings with valid data
  - Returns 400 for invalid data
  - Audit log created on settings change

---

#### Phase 3: Member Settings UI (TDD - RED-GREEN-REFACTOR)

**Task 3.1: Create /admin/settings/member page**
- **Type**: TDD (NEW code)
- **Files**:
  - `app/(admin)/admin/settings/member/page.tsx` (NEW)
  - `__tests__/pages/admin/settings/member.test.tsx` (NEW)
- **Dependencies**: Task 2.2, Task 2.3
- **Approach**:
  1. RED: Write component tests for page structure
  2. GREEN: Implement page with shadcn/ui components
  3. REFACTOR: Extract reusable form sections
- **Acceptance**:
  - Page renders all 5 settings sections
  - Loading state displayed
  - Error handling for API failures

**Task 3.2: Implement Registration Settings Section**
- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/member-settings/RegistrationSettings.tsx` (NEW)
  - `__tests__/components/admin/member-settings/RegistrationSettings.test.tsx` (NEW)
- **Dependencies**: Task 3.1
- **Approach**:
  1. RED: Write tests for all WHW-001 fields
  2. GREEN: Implement form with React Hook Form
  3. REFACTOR: Extract common field components
- **Acceptance**:
  - enable_join radio group works
  - URL key field conditional display
  - Email verification checkbox
  - Expiration time input

**Task 3.3: Implement Nickname Settings Section**
- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/member-settings/NicknameSettings.tsx` (NEW)
  - `__tests__/components/admin/member-settings/NicknameSettings.test.tsx` (NEW)
- **Dependencies**: Task 3.1
- **Approach**:
  1. RED: Write tests for all WHW-003 fields
  2. GREEN: Implement form with validation
  3. REFACTOR: Extract reusable Switch/RadioGroup wrappers
- **Acceptance**:
  - All WHW-003 fields implemented
  - Custom symbol list conditional display
  - Validation for allowed symbols

**Task 3.4: Implement Password Security Settings Section**
- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/member-settings/PasswordSecuritySettings.tsx` (NEW)
  - `__tests__/components/admin/member-settings/PasswordSecuritySettings.test.tsx` (NEW)
- **Dependencies**: Task 3.1
- **Approach**:
  1. RED: Write tests for all WHW-004 and WHW-005 fields
  2. GREEN: Implement form with conditional fields
  3. REFACTOR: Extract security-related utilities
- **Acceptance**:
  - Password strength selector
  - Hashing algorithm dropdown
  - Work factor slider (4-16)
  - Reset method radio group

---

#### Phase 4: Member Add/Edit Forms (DDD - ANALYZE-PRESERVE-IMPROVE)

**Task 4.1: Enhance member add form**
- **Type**: DDD (MODIFY existing)
- **Files**:
  - `app/(admin)/admin/members/new/page.tsx` (MODIFY/NEW)
  - `components/admin/AddMemberDialog.tsx` (MODIFY)
  - `__tests__/pages/admin/members/new.test.tsx` (NEW)
- **Dependencies**: Task 1.2
- **Approach**:
  1. ANALYZE: Read existing AddMemberDialog component
  2. PRESERVE: Write characterization tests for existing behavior
  3. IMPROVE: Add WHW-010 fields (homepage, blog, birthday, mailing, message, admin memo, groups)
- **Acceptance**:
  - All WHW-010 fields present
  - Existing functionality preserved
  - Form validation with Zod

**Task 4.2: Create member edit page**
- **Type**: DDD (MODIFY existing if exists, else TDD NEW)
- **Files**:
  - `app/(admin)/admin/members/[id]/edit/page.tsx` (NEW)
  - `__tests__/pages/admin/members/edit.test.tsx` (NEW)
- **Dependencies**: Task 4.1
- **Approach**:
  1. Check if edit page exists
  2. If exists: DDD (ANALYZE-PRESERVE-IMPROVE)
  3. If not: TDD (RED-GREEN-REFACTOR)
  4. Add WHW-011 fields (status, denied_reason, restricted_until, restriction_reason)
- **Acceptance**:
  - All WHW-011 fields present
  - Status management works
  - Restriction date picker works

**Task 4.3: Update member actions**
- **Type**: DDD (MODIFY existing)
- **Files**:
  - `app/actions/member.ts` (MODIFY)
  - `__tests__/actions/member.test.ts` (MODIFY)
- **Dependencies**: Task 1.2, Task 4.1
- **Approach**:
  1. ANALYZE: Read existing member actions
  2. PRESERVE: Write characterization tests for existing actions
  3. IMPROVE: Add new fields to createMember, updateMember actions
- **Acceptance**:
  - New fields saved to database
  - Existing actions still work
  - Audit logging for changes

---

#### Phase 5: Member List Enhancement (TDD - RED-GREEN-REFACTOR)

**Task 5.1: Add advanced filters**
- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/MembersTable.tsx` (MODIFY)
  - `components/admin/MemberFilters.tsx` (NEW)
  - `__tests__/components/admin/MemberFilters.test.tsx` (NEW)
- **Dependencies**: Task 1.2
- **Approach**:
  1. RED: Write tests for filter components
  2. GREEN: Implement filters (status, group, date range)
  3. REFACTOR: Extract filter utilities
- **Acceptance**:
  - Status filter dropdown
  - Group filter multi-select
  - Date range picker
  - Filters applied to table

**Task 5.2: Add bulk actions**
- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/MembersTable.tsx` (MODIFY)
  - `components/admin/BulkActions.tsx` (NEW)
  - `app/actions/member.ts` (MODIFY - add bulkUpdateMembers)
- **Dependencies**: Task 5.1
- **Approach**:
  1. RED: Write tests for bulk selection and actions
  2. GREEN: Implement checkbox selection and bulk action dropdown
  3. REFACTOR: Extract selection state management
- **Acceptance**:
  - Row checkboxes work
  - Select all checkbox
  - Bulk status change
  - Bulk group assignment

**Task 5.3: Add export functionality**
- **Type**: TDD (NEW code)
- **Files**:
  - `app/api/admin/members/export/route.ts` (NEW)
  - `components/admin/ExportButton.tsx` (NEW)
- **Dependencies**: Task 5.1
- **Approach**:
  1. RED: Write tests for export API
  2. GREEN: Implement CSV export with all fields
  3. REFACTOR: Extract CSV generation utility
- **Acceptance**:
  - CSV download works
  - All fields included
  - Korean characters encoded correctly (UTF-8 BOM)

---

## Technical Approach

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (React Components)                                │
│  - shadcn/ui Card, Tabs, Switch, RadioGroup, Select        │
│  - React Hook Form + Zod validation                         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  API Layer (Next.js App Router)                            │
│  - /api/admin/member-settings (GET/PUT)                     │
│  - /api/admin/members (GET/POST)                            │
│  - /api/admin/members/export (GET)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Action Layer (Server Actions)                              │
│  - updateProfile, getMembers, updateMemberRole             │
│  - bulkUpdateMembers (NEW)                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Database Layer (Supabase)                                  │
│  - member_settings table (NEW)                              │
│  - profiles table (EXTENDED)                                │
│  - RLS policies for admin-only access                       │
└─────────────────────────────────────────────────────────────┘
```

### State Management

- **Form State**: React Hook Form with Zod resolver
- **Server State**: Server Components with revalidation
- **Client State**: Minimal useState for UI-only state

### Validation Strategy

```typescript
// lib/validations/member-settings.ts
export const memberSettingsSchema = z.object({
  // WHW-001: Registration settings
  enable_join: z.enum(['yes', 'no', 'url_key']),
  enable_join_key: z.string().optional(),
  enable_confirm: z.boolean(),
  authmail_expires: z.number().min(60).max(604800), // 1min - 7days

  // WHW-002: Profile settings
  member_profile_view: z.boolean(),

  // WHW-003: Nickname settings
  allow_nickname_change: z.boolean(),
  update_nickname_log: z.boolean(),
  nickname_symbols: z.enum(['yes', 'no', 'custom']),
  nickname_symbols_allowed_list: z.string().optional(),
  nickname_spaces: z.boolean(),
  allow_duplicate_nickname: z.boolean(),

  // WHW-004: Password security
  password_strength: z.enum(['low', 'medium', 'high']),
  password_hashing_algorithm: z.enum(['argon2id', 'bcrypt', 'pbkdf2']),
  password_hashing_work_factor: z.number().min(4).max(16),
  password_hashing_auto_upgrade: z.boolean(),
  password_change_invalidate_other_sessions: z.boolean(),

  // WHW-005: Password reset
  password_reset_method: z.enum(['link', 'random']),
});
```

### Database Pattern

```sql
-- Single-row settings table
CREATE TABLE member_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- All settings from validation schema
  enable_join TEXT CHECK (enable_join IN ('yes', 'no', 'url_key')),
  enable_join_key TEXT,
  enable_confirm BOOLEAN DEFAULT true,
  authmail_expires INTEGER DEFAULT 86400,

  -- ... (all other fields from spec.md)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one row exists
INSERT INTO member_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- RLS Policy
CREATE POLICY "Admin only access" ON member_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### UI Component Pattern

```tsx
// components/admin/member-settings/MemberSettingsForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolver/zod';
import { memberSettingsSchema, type MemberSettings } from '@/lib/validations/member-settings';

export function MemberSettingsForm({ initialData }: { initialData: MemberSettings }) {
  const form = useForm<MemberSettings>({
    resolver: zodResolver(memberSettingsSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: MemberSettings) => {
    // Save logic
  };

  return (
    <Form {...form}>
      <Tabs defaultValue="registration">
        <TabsList>
          <TabsTrigger value="registration">가입 설정</TabsTrigger>
          <TabsTrigger value="nickname">닉네임</TabsTrigger>
          <TabsTrigger value="password">비밀번호</TabsTrigger>
          <TabsTrigger value="profile">프로필</TabsTrigger>
        </TabsList>

        <TabsContent value="registration">
          <RegistrationSettings form={form} />
        </TabsContent>
        {/* ... other tabs */}
      </Tabs>
    </Form>
  );
}
```

---

## Risk Analysis

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Password hashing algorithm compatibility | Medium | High | Test all 3 algorithms with Supabase Auth; document limitations |
| RLS policy performance on member_settings | Low | Medium | Single-row table minimizes impact; add index on id |
| Form validation complexity | Medium | Medium | Use Zod discriminated unions for conditional validation |
| Bulk action timeout | Low | High | Implement chunked processing (100 members/batch) |
| CSV export memory usage | Low | Medium | Stream response for large datasets |

### Integration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Supabase Auth password change | Medium | High | Test session invalidation; document Supabase limitations |
| Existing member actions break | Medium | High | DDD approach with characterization tests |
| UI component library conflicts | Low | Low | Use shadcn/ui consistently; test all components |

### Rollback Plan

1. **Database Rollback**: All migrations include DOWN migrations
2. **Code Rollback**: Git revert to previous commit
3. **Feature Flags**: Add `ENABLE_MEMBER_SETTINGS` env var for gradual rollout

---

## Success Criteria

### Functional Requirements

- [ ] All WHW-001 to WHW-005 settings configurable in UI
- [ ] Settings saved to database and persisted across sessions
- [ ] Member add/edit forms include all required fields
- [ ] Member list filters work correctly
- [ ] Bulk actions execute successfully
- [ ] Export generates valid CSV with Korean support

### Quality Requirements

- [ ] Test coverage >= 85% for all new code
- [ ] Characterization tests cover existing member actions
- [ ] All API endpoints return correct status codes
- [ ] Form validation prevents invalid data
- [ ] No TypeScript errors (strict mode)
- [ ] No ESLint warnings
- [ ] TRUST 5 quality gates passed

### Performance Requirements

- [ ] Settings page load < 2 seconds
- [ ] Settings save response < 500ms
- [ ] Member list filter < 300ms
- [ ] Bulk action (100 members) < 3 seconds
- [ ] CSV export (1000 members) < 5 seconds

### Acceptance Test Scenarios

All Gherkin scenarios from `acceptance.md` Sprint 1 section must pass:
- [ ] AC-001: 회원 가입 설정 (2 scenarios)
- [ ] AC-002: 닉네임 설정 (2 scenarios)
- [ ] AC-003: 비밀번호 보안 설정 (2 scenarios)
- [ ] AC-004: 관리자 회원 추가 (2 scenarios)
- [ ] AC-005: 회원 목록 필터링 (2 scenarios)

---

## Effort Estimate

### Detailed Breakdown

| Task Category | Tasks | Hours | Methodology |
|--------------|-------|-------|-------------|
| Database Schema | 3 | 5h | DDD (1), TDD (2) |
| Member Settings API | 3 | 6h | TDD (3) |
| Member Settings UI | 4 | 8h | TDD (4) |
| Member Forms | 3 | 6h | DDD (3) |
| Member List Enhancement | 3 | 6h | TDD (3) |
| **Sprint 1 Total** | **16** | **31h** | TDD (12), DDD (4) |

### Timeline

**Week 1 (Days 1-3)**: Database + API
- Day 1: Database schema migrations + tests (5h)
- Day 2: API endpoints + validation (6h)
- Day 3: API testing + integration (4h)

**Week 1 (Days 4-5)**: UI Implementation
- Day 4: Member settings page + sections (6h)
- Day 5: Member forms enhancement (6h)

**Week 2 (Days 1-2)**: Enhancement + Testing
- Day 1: Member list filters + bulk actions (6h)
- Day 2: Export + acceptance tests (4h)

**Total Duration**: 7 working days (~1.5 weeks)

---

## Next Steps

1. **Pre-Implementation Review** (Day 0)
   - Review database schema with team
   - Validate UI design mockups (if available)
   - Confirm API endpoint structure

2. **Sprint 1 Kickoff** (Day 1)
   - Start with Task 1.1 (member_settings migration)
   - Follow TDD RED-GREEN-REFACTOR for new code
   - Follow DDD ANALYZE-PRESERVE-IMPROVE for existing code

3. **Daily Checkpoints**
   - Run test suite after each task
   - Update progress in SPEC document
   - Report blockers immediately

4. **Sprint 1 Completion**
   - All acceptance tests pass
   - Code review completed
   - Deploy to staging environment
   - User acceptance testing

---

## Handoff to Implementation Agent

When delegating to `manager-ddd` or `team-backend-dev`/`team-frontend-dev`:

### Context Package

```yaml
spec_id: SPEC-RHYMIX-002
sprint: 1
focus: Member Management Enhancement
methodology: hybrid

tdd_tasks:
  - Task 1.1: member_settings migration (NEW)
  - Task 2.1-2.3: API endpoints (NEW)
  - Task 3.1-3.4: UI components (NEW)
  - Task 5.1-5.3: List enhancements (NEW)

ddd_tasks:
  - Task 1.2: profiles table extension (MODIFY)
  - Task 4.1-4.3: Member forms (MODIFY)

database_changes:
  - member_settings table (NEW)
  - profiles table columns (EXTEND)

api_endpoints:
  - GET /api/admin/member-settings (NEW)
  - PUT /api/admin/member-settings (NEW)
  - GET /api/admin/members/export (NEW)

ui_pages:
  - /admin/settings/member (NEW)
  - /admin/members/new (ENHANCE)
  - /admin/members/[id]/edit (NEW/ENHANCE)

test_requirements:
  coverage: 85%
  characterization_tests: existing member actions
  acceptance_tests: AC-001 to AC-005
```

### Execution Command

```
/moai run SPEC-RHYMIX-002 --sprint 1
```

Or with Agent Teams:

```
/moai run SPEC-RHYMIX-002 --team --sprint 1
```

---

**Document Status**: READY FOR IMPLEMENTATION
**Created**: 2026-03-02
**Author**: manager-strategy agent
**Version**: 1.0.0
