# SPEC-MEMBER-PARITY-001 — Acceptance Criteria

> 레거시 Rhymix(PHP) admin의 회원 관련 화면과 rhymix-ts 현재 구현을 나란히 재설치·직접 비교하여
> 확인한 2개 기능 격차를 rhymix-ts 아키텍처에 맞게 이식한다.

## D. AC Matrix

| AC ID | REQ Coverage | GEARS Acceptance Criterion | Severity | Traceability | Verification Method |
|-------|-------------|--------------------------|----------|---------------|---------------------|
| AC-MPAR-001 | REQ-MPAR-001~002 | **When** 관리자가 AdminSidebar의 "회원" 섹션에서 "포인트" 링크를 클릭하면, 시스템 **shall** `/admin/site/points` 페이지로 이동한다. | P0 | Composite (REQ) | Manual: 사이드바 확인 → 링크 클릭 → 페이지 접속 |
| AC-MPAR-002 | REQ-MPAR-003~007 | **When** 관리자가 회원 목록 페이지에 있고, **While** 테이블 헤더를 확인할 수 있는 상태이면, 시스템 **shall** 최소 5개 컬럼(userId, email, nickName, createdAt, lastLoginAt)에 대해 정렬 기능을 제공한다. **When** 사용자가 정렬 가능한 컬럼 헤더를 클릭하면, 시스템 **shall** 해당 컬럼을 기준으로 오름차순/내림차순으로 정렬 순서를 토글한다. 시스템 **shall** 현재 활성 정렬 컬럼과 방향을 시각적으로 표시한다. | P0 | Composite (REQ) | Unit: `admin.user.list` 정렬 파라미터 테스트 + Integration: 헤더 클릭 → 정렬 적용 확인 |
| AC-MPAR-003 | REQ-MPAR-008~011 | **When** 관리자가 회원 목록 페이지에 있고 **while** 그룹 필터 드롭다운을 확인할 수 있는 상태이면, 시스템 **shall** "그룹전체" 옵션과 설정된 그룹 목록을 드롭다운으로 표시한다. **When** 사용자가 특정 그룹을 선택하면, 시스템 **shall** 해당 그룹에 속한 회원만 목록에 표시한다. 시스템 **shall** 그룹 필터를 기존 상태 필터와 조합(AND)하여 동작한다. | P0 | Composite (REQ) | Unit: `admin.user.list` groupId 파라미터 테스트 + Integration: 그룹 선택 → 필터 적용 확인 |
| AC-MPAR-004 | REQ-MPAR-012~015 | **When** 관리자가 회원 목록 페이지에 있고 **while** 검색 대상 선택 드롭다운과 검색어 입력창을 확인할 수 있는 상태이면, 시스템 **shall** 최소 6개 필드(userId, email, nickName, phoneNumber, lastLoginAt, description)를 검색 대상으로 제공한다. **When** 사용자가 검색 대상 필드를 선택하고 검색어를 입력하면, 시스템 **shall** 선택한 대상 필드에서만 검색어 매칭(case-insensitive 부분 일치) 동작한다. 시스템 **shall** 가입일시 범위 검색, IP 주소 검색, 생일 검색, 사용자정의 검색을 제외한다. | P0 | Composite (REQ) | Unit: 각 검색 대상 필드별 매칭 테스트 + Integration: 검색 대상 선택 + 검색어 입력 → 결과 확인 |
| AC-MPAR-005 | REQ-MPAR-016~020 | **When** 관리자가 회원 목록 페이지에 있고 **while** 테이블을 확인할 수 있는 상태이면, 시스템 **shall** 각 행에 체크박스를 제공한다. **When** 사용자가 "Check All" 헤더 체크박스를 클릭하면, 시스템 **shall** 현재 페이지 전체를 선택하며, 다시 클릭 시 선택을 해제한다. **When** 사용자가 하나 이상의 회원을 선택하면, 시스템 **shall** "삭제" 버튼을 활성화한다. **When** 사용자가 "삭제" 버튼을 클릭하면, 시스템 **shall** 확인 다이얼로그를 표시한다. **When** 사용자가 확인 다이얼로그에서 승인하면, 시스템 **shall** 선택된 회원들을 일괄 soft delete(status → DELETED)한다. 시스템 **shall** 삭제 작업을 AuditLog에 기록한다. | P0 | Composite (REQ) | Unit: bulk 삭제 프로시저 테스트(트랜잭션, AuditLog) + Integration: 다중 회원 선택 → 삭제 → status/AuditLog 확인 |

---

## D.1 Severity Definitions

| Severity | Definition | Exit Code Impact |
|----------|------------|-------------------|
| P0 | Blocking — MUST pass before SPEC completion | Blocks completion, rollback required |
| P1 | High — Strongly recommended before completion | Warn-only, bypass requires explicit approval |
| P2 | Medium — Nice-to-have, deferrable | Logged, no blocking |
| P3 | Low | Optional, future consideration |

All ACs in this SPEC are **P0** (blocking) — none are deferrable.

---

## D.2 Traceability Column

- **Composite (REQ)**: 복수 REQ가 조합되어 AC를 완성 (이 SPEC의 모든 AC가 이 유형)
- **Direct (REQ)**: REQ 하나가 AC 하나를 완전히 커버 (단일 REQ로 충분한 AC)
- **Derived**: AC가 REQ로부터 유도되지 않고 독립적으로 정의됨 (이 SPEC의 AC에는 해당 없음)

**Note**: 이 SPEC의 AC는 2~5개 REQ를 그룹으로 묶는 Composite 형태입니다. Traceability은 "Composite (REQ)"로 라벨링합니다.

---

## D.3 Verification Method Definitions

| Method | When to Use | Example |
|---------|-------------|---------|
| Manual | UI/UX 동작, 시각적 확인, 사용자 경험 | 사이드바 링크 클릭, 정렬 아이콘 표시 |
| Unit | 단일 함수/프로시저 동작, 파라미터 검증 | `admin.user.list` 정렬 파라미터 테스트 |
| Integration | 여러 컴포넌트/레이어 간 상호작용 | 검색 대상 선택 + 검색어 입력 → 결과 확인 |
| E2E | 전체 사용자 시나리오, 브라우저 자동화 | Playwright: 로그인 → 회원 목록 → 정렬/필터/검색/삭제 |

---

## D.4 Closure Gates

Definition of Done (DoD) for SPEC-MEMBER-PARITY-001:

1. **All ACs PASS** — All 5 acceptance criteria (AC-MPAR-001~005) verified and passing
2. **TRUST 5 Compliance** — Tested, Readable, Unified, Secured, Trackable:
   - **Tested**: Unit + integration tests passing, coverage ≥85% for modified packages
   - **Readable**: Code comments(English/KO per `code_comments` setting), clear naming, consistent style
   - **Unified**: `npm run lint` clean, `npm run type-check` no errors
   - **Secured**: No SQL injection vectors, input validation (Zod schemas), RBAC respected
   - **Trackable**: Conventional Commits format, `🗿 MoAI` trailer, git history clean
3. **No Regression** — Existing member list functionality (tab filters, existing search, status dropdown) still working
4. **Documentation** — `@MX` tags added where applicable (NOTE/WARN/ANCHOR for exported functions)
5. **Manual Verification** — Side-by-side comparison with legacy Rhymix admin where feasible

---

## D.5 Forward-Looking Checks (Post-Release Monitoring)

Monitoring items to observe after deployment:
- Side-link utilization: How often users access `/admin/site/points` from sidebar (should be >0)
- Sort feature adoption: Which columns are most frequently sorted (usage analytics)
- Group filter usage: Distribution of group filter selections
- Search target distribution: Which search targets are most commonly used
- Bulk delete usage: Frequency and average batch size

These inform future optimizations or follow-up SPECs.

---

## D.6 Quality TRUST-5 Scoring Matrix

| Dimension | Weight | Criteria | Target |
|-----------|--------|----------|--------|
| Tested | 0.2 | Unit + Integration + E2E coverage | ≥85% coverage for `apps/web/server/api/routers/admin/user.ts` |
| Readable | 0.2 | Code clarity, naming, comments | ESLint 0 errors, `code_comments` language respected |
| Unified | 0.2 | Style consistency, type safety | `npm run type-check` 0 errors, `npm run lint` 0 warnings |
| Secured | 0.2 | Input validation, RBAC, SQL injection safety | Zod schemas on all inputs, protectedProcedure used, parameterized queries |
| Trackable | 0.2 | Commit messages, git history, @MX tags | Conventional Commits, `🗿 MoAI` trailer, @MX:NOTE/ANCHOR on exported functions |

Overall TRUST-5 score = (weighted sum of all 5 dimensions)
- **PASS threshold**: ≥0.80 (4.0/5.0)
- **EXCEPTIONAL**: ≥0.90 (4.5/5.0)
- **MINIMUM ACCEPTABLE**: ≥0.70 (3.5/5.0)

---

## D.7 Edge Cases and Error Handling

### Edge Case List

1. **Empty Group List**: `MemberGroup` 테이블이 비어있을 때 그룹 필터 드롭다운 동작
   - Expected: "그룹전체"만 표시, 정상 필터링 동작
   - Verification: `MemberGroup` 0개인 테스트 환경에서 드롭다운 렌더링 확인

2. **No Selection for Bulk Delete**: 0개 회원 선택 상태에서 "삭제" 버튼 동작
   - Expected: 버튼 disabled 또는 클릭 시 안내 메시지
   - Verification: 0개 선택 시 버튼 상태 확인

3. **Search Query Empty**: 검색어 입력 없이 검색 실행
   - Expected: 모든 회원 표시 (기존 `q` 파라미터와 동일한 동작)
   - Verification: 빈 검색어로 검색 → 전체 목록 확인

4. **Sort Column Not Sortable**: 정렬 불가능한 컬럼(예: 프로필, 관리자) 클릭
   - Expected: 정렬 동작하지 않음, 시각적 표시 없음
   - Verification: 비정렬 컬럼 클릭 → 아무 변화 없음 확인

5. **Group Filter + Status Filter Combination**: 그룹 A + 상태 APPROVED 조합
   - Expected: 그룹 A에 속하면서 상태가 APPROVED인 회원만 표시 (AND 조건)
   - Verification: 조합 필터 결과 쿼리 로그로 확인

### Error Handling Requirements

- **Invalid Sort Parameter**: 잘못된 `sortBy`/`sortOrder` 값 → 기본 정렬 무시 및 로그 경고
- **Invalid Group ID**: 존재하지 않는 `groupId` → 404 또는 빈 결과, 사용자 안내
- **Bulk Delete Partial Failure**: 일부 회원 삭제 성공, 일부 실패 → 트랜잭션 전체 rollback 및 사용자 에러 메시지
- **Search Target Not Found**: 선택한 검색 대상 필드가 DB에 없는 경우 → 빈 결과, 에러 아님

---

## D.8 Performance Considerations

- **Sortable Headers**: 정렬 시 페이지네이션 유지 (기존 page 파라미터 유지)
- **Group Filter JOIN**: `MemberGroupMember` 조인 경로 최적화 필요 (N:M 관계, 인덱스 확인)
- **Bulk Delete Transaction**: 대량 일괄 삭제 시 트랜잭션 타임아웃 방지 (한 번에 최대 1000건 권장, 초과 시 배치)
- **Search Target Index**: 검색 대상 필드별 인덱스 존재 확인 (userId, email, nickName 등 citext 인덱스)

---

## D.9 Accessibility (a11y)

- **Semantic HTML**: 드롭다운, 버튼, 체크박스에 WCAG 2.1 Level AA conformant label/aria attributes
- **Keyboard Navigation**: 정렬 헤더, 그룹 필터, 검색 대상 선택, bulk 삭제 버튼 모두 키보드 접근 가능
- **Visual Indicators**: 정렬 방향 아이콘, 체크박스 포커스, 필터 상태 시각적 표시
- **Screen Reader**: 필터 선택, 정렬 상태, 선택된 회원 수를 screen reader가 읽을 수 있어야 함

---

## D.10 Internationalization (i18n)

- 모든 UI 라벨(포인트 링크, 필터, 검색, 버튼)은 현재 한국어로 하드코딩
- 다국어 지원은 out of scope (레거시 Rhymix도 한국어 전용)
- 레거시와의 UI 비교 시 언어 차이는 기능 격차가 아님을 명시

---

## D.11 Security Considerations

### Input Validation

- **Zod Schemas**: 모든 tRPC 입력 파라미터는 Zod schema로 검증
- **SQL Injection**: Prisma parameterized queries 사용, 문자열 직접 interpolating 금지
- **RBAC**: `protectedAdminProcedure`를 통해 관리자 권한 검증 (SPEC-AUTH-001 REQ-AUTH-020)

### Bulk Delete Safety

- **Confirmation Dialog**: bulk 삭제 전 명시적 승인 요구 (REQ-MPAR-019)
- **Soft Delete 권장**: `status → DELETED`로 data 보존, AuditLog로 추적 가능 (plan.md §M5에서 확정)
- **Transaction Atomicity**: 모든 회원 삭제 성공 시만 커밋, 부분 실패 시 전체 rollback

### Data Privacy

- **검색 대상 제외**: IP 주소 검색 제외 (개인정보 보안 우려 — REQ-MPAR-015)
- **AuditLog**: 삭제 작업 AuditLog 기록 (누가/언제/무엇을)

---

## D.12 Compatibility Guarantees

### Backward Compatibility

- **기존 검색 `q` 파라미터**: multi-field 검색 도입 후에도 기존 `q` 파라미터를 지원하거나,
  점진적 마이그레이션 경로 제공 (run-phase에서 결정)
- **기존 정렬 없는 동작**: 정렬 파라미터 없이 호출될 때 기존과 동일하게 PK 순서로 동작
- **기존 필터 조합**: 탭 필터 + 상태 드롭다운 조합이 그룹 필터와 호환되어야 함

### Forward Compatibility

- **새로운 MemberGroup 추가**: 향후 그룹이 추가되어도 그룹 필터 드롭다운이 자동 갱신
- **정렬 컬럼 확장**: 향후 새로운 컬럼이 정렬 대상이 되어도 확장 가능한 구조

---

## D.13 Test Strategy

### Unit Tests

`apps/web/server/api/routers/admin/user.test.ts` 확장:

```typescript
describe('admin.user.list - Extended Parameters', () => {
  it('REQ-MPAR-006: sort parameters return sorted results', async () => {
    // sortBy=userId, sortOrder=asc → 오름차순 userId 정렬
  })

  it('REQ-MPAR-010: groupId parameter filters by group', async () => {
    // groupId=1 → 그룹 1에 속한 회원만
  })

  it('REQ-MPAR-014: searchTarget + searchQuery filter by target field', async () => {
    // searchTarget=nickName, searchQuery=테스트 → nickName에 '테스트' 포함된 회원
  })

  it('REQ-MPAR-020: bulkSoftDeleteUsers deletes multiple users atomically', async () => {
    // userIds=[1,2,3] → status=DELETED, AuditLog 기록, 트랜잭션 보장
  })
})
```

### Integration Tests

Playwright E2E 시나리오:

```typescript
test('AC-MPAR-003: Group filter + status filter combination', async ({ page }) => {
  // 로그인 → /admin/members
  // 그룹 "준회원" 선택
  // 상태 "APPROVED" 선택
  // 결과: 준회원 AND 승인된 회원만 표시
})

test('AC-MPAR-004: Multi-field search target selection', async ({ page }) => {
  // 검색 대상 "이메일" 선택
  // 검색어 "test@example.com" 입력
  // 결과: email이 'test@example.com'를 포함하는 회원만
})
```

### Coverage Threshold

- **Modified Packages**: `apps/web/server/api/routers/admin/` ≥85%
- **New Code Coverage**: bulk delete 프로시저, 검색 대상 필드별 매칭 로직 ≥90%

---

## D.14 Rollback Criteria

Rollback(재배포) 조건:

1. **Critical Bug**: AC-MPAR-005 bulk 삭제가 data corruption을 일으키는 경우
2. **Performance Regression**: 그룹 필터 JOIN 경로로 인해 회원 목록 로딩이 5초 이상 지연되는 경우
3. **Security Issue**: SQL injection 또는 RBAC 우회 경로 발견 시
4. **User Impact**: 기존 검색 기능이 완전히 작동하지 않는 경우

Rollback 절차:
1. `git revert <commit-sha>`로 해당 마일스톤 커밋 revert
2. `npm run build` + `npm run test`로 정상 동작 확인
3. 긴급 배포
4. 원인 분석 후 수정 안 재배포

---

## Version History

- 2026-08-08 (v0.1.0): 최초 작성
