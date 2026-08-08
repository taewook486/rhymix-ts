# SPEC-MEMBER-PARITY-001 — Plan Phase Implementation Plan

> 레거시 Rhymix(PHP) admin의 회원 관련 화면과 rhymix-ts 현재 구현을 나란히 재설치·직접 비교하여
> 확인한 2개 기능 격차를 rhymix-ts 아키텍처에 맞게 이식한다. (1) 포인트 사이드바 링크 추가,
> (2) 회원 목록 sortable headers, 그룹 필터, multi-field 검색, bulk 삭제 구현.

## A. Context

### A.1 Work Location

- **Project Root**: `/mnt/d/project/rhymix-ts`
- **Current Branch**: `main` (commit SHA는 git status 참조)
- **SPEC Artifacts**: `.moai/specs/SPEC-MEMBER-PARITY-001/{spec.md, plan.md, acceptance.md}`
- **Tier Classification**: Tier M (Medium) — 3 artifacts (spec.md + plan.md + acceptance.md), LOC 예상 300~800줄, 파일 수 5~10개

### A.2 Existing Infrastructure

**PRESERVE Targets** (수정 금지 — 변경 시 영향도 분석 필요):
- `/admin/site/points` 페이지 구현 (SPEC-POINT-001 완료, 건드리지 않음)
- `MemberGroup`, `MemberGroupMember`, `User` Prisma 스키마 구조
- `admin.user.list` 기존 파라미터 (`q`, `status`, `filterAdmin`, `page`, `pageSize`)
- 기존 회원 목록 UI 컴포넌트 구조 (탭 필터, 검색창, 상태 드롭다운, 결과 테이블)

**EXTEND Targets** (확장 대상):
- `apps/web/components/admin/AdminSidebar.tsx` — "회원" 섹션에 포인트 링크 추가
- `apps/web/app/admin/members/page.tsx` — sortable headers, 그룹 필터, multi-field 검색 UI, 체크박스, bulk 삭제 버튼 추가
- `apps/web/server/api/routers/admin/user.ts` — `admin.user.list` 파라미터 확장 (sort, groupId, searchTarget), bulk 삭제 프로시저 추가

### A.3 Related Work

- **SPEC-MEMBER-ADMIN-001** (completed): 회원 설정 "기본 설정" 탭, 닉네임 변경 기록, 차단 관리, 이메일 호스트 관리, 회원 그룹 재배치/이미지 마크
- **SPEC-POINT-001** (completed): `/admin/site/points` 페이지 구현 완료, 링크만 없는 고립 상태

---

## B. Known Issues (Domain-Relevant Subset)

**B10. Untouched Paths PRESERVE** (Scope Discipline):
- Do NOT modify `.moai/specs/SPEC-MEMBER-ADMIN-001/` (completed SPEC artifact set)
- Do NOT modify `/admin/site/points` page content (SPEC-POINT-001 completed artifact)
- Do NOT modify Prisma schema (`MemberGroup`, `MemberGroupMember`, `User` models are stable)

**B11. AskUserQuestion Prohibited** (Subagent Boundary):
- Subagents (manager-develop) must not prompt the user directly
- On blocker, return structured blocker report with 4 options + change/impact/risk/ETA

**B9. Git Commit + Push Performed Directly** (Hybrid Trunk 1-person OSS):
- manager-develop는 본 SPEC 범위에서 commit + push 직접 수행 (Route A — Hybrid Trunk main-direct)
- Conventional Commits format: `feat(SPEC-MEMBER-PARITY-001): M{N} <subject>`
- `--no-verify` 사용 금지

**B12. Sync-phase CHANGELOG Emission Discipline** (manager-docs only):
- 본 plan-phase에서는 적용되지 않음 (sync-phase 규칙)

---

## C. Pre-flight Check List

```bash
# 1. Check current branch + baseline
git branch --show-current
git rev-parse HEAD

# 2. Verify target files exist
ls apps/web/components/admin/AdminSidebar.tsx
ls apps/web/app/admin/members/page.tsx
ls apps/web/server/api/routers/admin/user.ts

# 3. Check existing test coverage (baseline)
npm run test:unit -- apps/web/server/api/routers/admin/user.test.ts 2>&1 | tail -20

# 4. Check PRESERVE targets are unmodified
git diff apps/web/app/admin/site/points/
git diff packages/db/prisma/schema.prisma | grep -E "^\+.*MemberGroup|^\-.*MemberGroup" || echo "No MemberGroup schema changes (expected)"
```

---

## D. Constraints (DO NOT VIOLATE)

**PRESERVE** (변경 금지):
- `/admin/site/points` 페이지 구현 — SPEC-POINT-001 완료 상태, 링크만 추가
- `MemberGroup`, `MemberGroupMember`, `User` Prisma 스키마 — 구조 변경 금지
- `admin.user.list` 기존 파라미터 호환성 — 신규 파라미터는 optional로 추가
- 기존 회원 목록 UI의 탭 필터, 기존 검색창 동작 — 확장만 수행, 대체 금지

**Forbidden Commands**:
- `--no-verify` (pre-commit hook 우회 금지)
- `git commit --amend` (완료된 commit 수정 금지, history distort)
- force-push to main (remote main에 강제 푸시 금지)

**Required Commands**:
- Conventional Commits: `feat(SPEC-MEMBER-PARITY-001): M{N} <subject>`
- Commit trailer: `🗿 MoAI`

**Binary Constraints**:
- Subagent boundary: No `AskUserQuestion` in subagent-domain code (grep 0 matches required)

---

## E. Self-Verification Deliverables

> Each E-item is reported per the verification-claim-integrity 5-section format
> (Claim / Evidence / Baseline-attribution / Gaps / Residual-risk)

**E1. AC Binary PASS/FAIL Matrix**
| AC | Status | Verification Command | Actual Output |
|----|--------|---------------------|---------------|
| (run-phase에서 채워짐) | | | |

**E2. Cross-Platform Build result**
```
$ npm run build
→ exit 0
```

**E3. Coverage Measurement (≥85% threshold per modified package)**
```
$ npm run test:coverage -- apps/web/server/api/routers/admin/user.test.ts
→ coverage % reported
```

**E4. Subagent Boundary Grep (C-HRA-008 family)**
```
$ grep -rn 'AskUserQuestion' apps/web/app/admin/members apps/web/components/admin/AdminSidebar.tsx | grep -v "_test.go" | grep -v "// "
(no output expected)
```

**E5. Lint Status**
```
$ npm run lint
→ (project-specific lint command)
```

**E6. Branch HEAD + Push state**
- List of new commit SHAs (run-phase에서 채워짐)
- Result of `git push origin main` (run-phase에서 채워짐)

**E7. Blocker Report** (if any)
- (run-phase blocker 발생 시 채워짐)

---

## F. Milestones (Priority-Based, No Time Estimates)

### Milestone M1 — Gap A: 포인트 사이드바 링크 추가 (Priority: High)

**Scope**:
- `apps/web/components/admin/AdminSidebar.tsx` 단일 파일 수정
- "회원" 섹션에 `/admin/site/points` 링크 추가

**Deliverables**:
- [ ] AdminSidebar "회원" 섹션에 포인트 링크 추가 (REQ-MPAR-001)
- [ ] 링크 클릭 시 `/admin/site/points` 페이지 정상 접속 확인 (REQ-MPAR-002)
- [ ] 레거시 비교 시 IA 순서/아이콘 적합성 확인

**Validation**:
- Manual: 사이드바에서 포인트 링크 클릭 → 페이지 접속
- Lint: `npm run lint` — AdminSidebar.tsx 통과
- Type Check: `npm run type-check` — 타입 에러 없음

**Risk**: 낮음 — 단일 파일 수정, 기존 페이지가 이미 동작 중

---

### Milestone M2 — Gap B-1: Sortable Column Headers (Priority: High)

**Scope**:
- `apps/web/app/admin/members/page.tsx` UI 수정
- `apps/web/server/api/routers/admin/user.ts` 백엔드 확장

**Deliverables**:
- [ ] 최소 5개 컬럼(userId, email, nickName, createdAt, lastLoginAt) sortable 헤더 구현 (REQ-MPAR-003)
- [ ] 헤더 클릭 시 오름차순/내림차순 토글 동작 (REQ-MPAR-004)
- [ ] 현재 활성 정렬 컬럼/방향 시각적 표시 (REQ-MPAR-005)
- [ ] `admin.user.list`에 sort 파라미터 추가 (REQ-MPAR-006)
- [ ] 페이지네이션 상태 유지 (정렬 변경 시 현재 page 파라미터 유지, page=1 초기화 없음) (REQ-MPAR-007)

**Backend Design** (핵심 설계 결정 — 단일 진실 원천):
```
# admin.user.list 신규 파라미터 (예시, run-phase에서 확정)
input: z.object({
  // ... 기존 파라미터 (q, status, filterAdmin, page, pageSize)
  sortBy: z.enum(['userId', 'emailAddress', 'nickName', 'createdAt', 'lastLoginAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).optional()
```

**Validation**:
- Unit: `admin.user.list` 정렬 파라미터 테스트
- Integration: 헤더 클릭 → 쿼리 파라미터 변화 → 정렬 적용 확인
- Lint: `npm run lint`
- Type Check: `npm run type-check`

**Risk**: 중간 — UI + 백엔드 양쪽 수정, 페이지네이션 상태 관리 주의 필요

---

### Milestone M3 — Gap B-2: 회원 그룹 필터 (Priority: Medium)

**Scope**:
- `apps/web/app/admin/members/page.tsx` UI 수정
- `apps/web/server/api/routers/admin/user.ts` 백엔드 확장

**Deliverables**:
- [ ] 회원 그룹 필터 드롭다운 구현 (REQ-MPAR-008)
- [ ] "그룹전체" + 설정된 그룹 목록 표시 (REQ-MPAR-008)
- [ ] 그룹 선택 시 해당 그룹 회원만 필터링 (REQ-MPAR-009)
- [ ] 기존 상태 필터와 조합(AND 조건) 동작 확인 (REQ-MPAR-009)
- [ ] `admin.user.list`에 `groupId` 파라미터 추가 (REQ-MPAR-010)
- [ ] 그룹 없는 경우 "그룹전체"만 표시/정상 동작 (REQ-MPAR-011)

**Backend Design** (핵심 설계 결정 — 단일 진실 원천):
```typescript
// admin.user.list 신규 파라미터 (예시, run-phase에서 확정)
input: z.object({
  // ... 기존 파라미터
  groupId: z.number().optional(), // MemberGroup.id, undefined = "그룹전체"
}).optional()

// Prisma 쿼리 확장 (예시)
where: {
  // ... 기존 조건
  ...(groupId && { memberGroups: { some: { groupId } } }),
}
```

**Validation**:
- Unit: `admin.user.list` 그룹 필터 파라미터 테스트
- Integration: 그룹 선택 → 필터 적용 → 결과 확인
- Edge: `MemberGroup` 0개인 경우 드롭다운 "그룹전체"만 표시

**Risk**: 중간 — Prisma 쿼리 N:M 관계(`MemberGroupMember`) 조인 경로 최적화 필요

---

### Milestone M4 — Gap B-3: Multi-Field 검색 대상 선택 (Priority: Medium)

**Scope**:
- `apps/web/app/admin/members/page.tsx` UI 수정
- `apps/web/server/api/routers/admin/user.ts` 백엔드 확장

**Deliverables**:
- [ ] 검색 대상 선택 드롭다운 구현 (REQ-MPAR-012)
- [ ] 최소 6개 필드 포함: userId, emailAddress, nickName, phoneNumber, lastLoginAt, description (REQ-MPAR-012)
- [ ] 검색어 입력창과 대상 선택 조합 동작 (REQ-MPAR-013)
- [ ] 선택된 대상 필드에서만 검색어 매칭 (case-insensitive 부분 일치) (REQ-MPAR-013)
- [ ] `admin.user.list`에 검색 대상 필드 지정 파라미터 추가 (REQ-MPAR-014)
- [ ] 레거시 16옵션 중 포함/제외 명확화 (REQ-MPAR-015)

**Out-of-Scope 명확화** (REQ-MPAR-015 구현):
- **포함**: userId, emailAddress, nickName, phoneNumber, lastLoginAt, description
- **제외**: 가입일시 범위(이상/이하), 가입IP, 최근로그인IP, 생일, 사용자정의

**Backend Design** (핵심 설계 결정 — 단일 진실 원천):
```typescript
// admin.user.list 신규 파라미터 (예시, run-phase에서 확정)
input: z.object({
  // ... 기존 파라미터 (q 제거 또는 대체)
  searchTarget: z.enum(['userId', 'emailAddress', 'nickName', 'phoneNumber', 'lastLoginAt', 'description']).optional(),
  searchQuery: z.string().optional(),
}).optional()

// Prisma 쿼리 확장 (예시)
where: {
  // ... 기존 조건
  ...(searchQuery && searchTarget === 'userId' && { userId: { contains: searchQuery, mode: 'insensitive' } }),
  ...(searchQuery && searchTarget === 'emailAddress' && { emailAddress: { contains: searchQuery, mode: 'insensitive' } }),
  // ... 나머지 필드 유사하게 확장
}
```

**Validation**:
- Unit: 각 검색 대상 필드별 매칭 테스트
- Integration: 검색 대상 선택 + 검색어 입력 → 결과 확인
- Edge: 빈 검색어, 특수 문자 포함 검색어

**Risk**: 중간 — 기존 `q` 파라미터와의 호환성 유지 여부 결정 필요 (병행 또는 대체)

---

### Milestone M5 — Gap B-4: 체크박스 및 Bulk 삭제 (Priority: High)

**Scope**:
- `apps/web/app/admin/members/page.tsx` UI 수정
- `apps/web/server/api/routers/admin/user.ts` 백엔드 프로시저 추가

**Deliverables**:
- [ ] 테이블 각 행에 체크박스 추가 (REQ-MPAR-016)
- [ ] "Check All" 헤더 체크박스 구현 (REQ-MPAR-017)
- [ ] 체크박스 상태 관리 (current page only, 페이지네이션 간 유지 불필요) (REQ-MPAR-016)
- [ ] bulk 삭제 버튼 및 확인 다이얼로그 구현 (REQ-MPAR-018~019)
- [ ] bulk 삭제 백엔드 프로시저 구현 (REQ-MPAR-020)
- [ ] 트랜잭션 원자적 실행, AuditLog 기록 (REQ-MPAR-020)

**Backend Design** (핵심 설계 결정 — 단일 진실 원천):
```typescript
// 새 bulk 삭제 프로시저 (예시, run-phase에서 이름 확정)
router.mutation('bulkSoftDeleteUsers', protectedAdminProcedure
  .input(z.object({
    userIds: z.array(z.number()),
  }))
  .mutation(async ({ input, ctx }) => {
    // 트랜잭션 시작
    return await ctx.prisma.$transaction(async (tx) => {
      for (const userId of input.userIds) {
        // soft delete: status → DELETED
        // AuditLog 기록
      }
    })
  }))
```

**Soft vs Hard Delete 결정** (본 plan-phase에서 확정):
- **Soft delete 채택**: `status → DELETED`, AuditLog 보존, 복구 가능
- **이유**: data 보존, 감사 추적성, 실수 삭제 시 복구 가능
- Hard delete(실제 `DELETE FROM users`)는 out of scope

**Validation**:
- Unit: bulk 삭제 프로시저 테스트 (트랜잭션, AuditLog)
- Integration: 다중 회원 선택 → 삭제 → status 확인
- Edge: 0개 선택 시 버튼 disabled, 1개 선택 시 단건 삭제 경로

**Risk**: 높음 — 트랜잭션, AuditLog, 복구 불가능한 hard delete 경로

---

## G. Anti-Patterns

### AP-MP-001 — 기존 검색창 직접 수정 금지

기존 검색창(`placeholder="ID, 이메일, 닉네임 검색"`)을 multi-field 검색 대상 드롭다운으로
교체할 때, 기존 `q` 파라미터와의 호환성을 고려하지 않고 무조건 제거하면 기존 사용자 경험을
깬트린다. 병행 지원 또는 점진적 마이그레이션을 고려해야 한다.

### AP-MP-002 — 체크박스 상태 과도 복잡성

체크박스 상태를 페이지네이션 간에 유지하려면 localStorage/state management 복잡도가 급증한다.
REQ-MPAR-016은 current page only로 명시하고 있으므로, 페이지 이동 시 체크박스 해제는 의도된 동작이다.

### AP-MP-003 — 정렬 파라미터 설계 미숙고

`sort_index`/`sort_order` 파라미터를 레거시와 동일하게 설계할 때, 보안 관점에서 SQL injection 위험을
방지하기 위해 Prisma의 type-safe parameterized 쿼리를 활용해야 한다. 문자열 직접 interpolating은 금지.

### AP-MP-004 — 그룹 필터 조건 잘못된 조합

그룹 필터와 기존 상태 필터의 조합을 OR 조건으로 구현하면, "그룹 A에 속하거나 상태가 APPROVED인"
  회원"이라는 잘못된 결과가 나온다. AND 조건(그룹 A에 속하고 그 상태가 APPROVED인 회원)이
  올바른 해석이며, 이는 REQ-MPAR-009에 명시되어 있다.

---

## H. Cross-References

- `.moai/specs/SPEC-MEMBER-ADMIN-001/spec.md` — 회원 설정, 닉네임 변경 기록, 차단 관리, 이메일 호스트 관리
- `.moai/specs/SPEC-POINT-001/spec.md` — 포인트 시스템 전체 구현 (완료)
- `.moai/specs/SPEC-ADMIN-002/spec.md` — 관리자 설정, RBAC, 백엔드 라우터 패턴
- `.moai/specs/SPEC-AUTH-001/spec.md` — User, MemberGroup, MemberGroupMember 스키마
- `.claude/rules/moai/development/manager-develop-prompt-template.md` — Section A-E 5-section delegation template
- `.claude/rules/moai/core/moai-constitution.md` — TRUST 5 quality framework
- `.claude/rules/moai/workflow/spec-workflow.md` — Tier M/L delegation template applicability
