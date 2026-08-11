# SPEC-ADMIN-MENU-PARITY-001 — progress

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-08-11
- artifacts: spec.md / plan.md / acceptance.md / research.md (tier M — research.md is additive,
  produced during the DB-reset + Playwright investigation that preceded SPEC authoring)
- open_clarifications: 0
- plan_audit: iteration 1 FAIL (~0.75) → 8 defects (D1-D8) fixed → iteration 2 PASS (~0.94),
  see `.moai/reports/plan-audit/SPEC-ADMIN-MENU-PARITY-001-review-{1,2}.md`
- kickoff_approval: Implementation Kickoff Approval 사용자 승인됨 (2026-08-11) — 단, 2차 감사로
  REQ 범위가 변경(위젯 재배치 REQ 삭제, REQ 9건→8건)되어 재확인 필요(§E.1 하단 참고)

## §F Phase 4 Mode Selection

- 입력: tier M, scope 2개 파일(AdminSidebar.tsx 구조 변경 + seed.ts 추가), 도메인 1(admin UI),
  언어 TS 단일, 코딩 중심(concurrency benefit LOW)
- 모드 평가: trivial(아님), background(아님 — 쓰기), agent-team(RETIRED), parallel(아님 — 코딩
  중심), workflow(아님 — 소규모), sub-agent(선택)
- Decision: sub-agent (Mode 5)
- Justification: 파일 수 적고(2개) 상호 의존 낮아 순차 위임으로 충분.

## §E.2 Run-phase Evidence

| AC | REQ | Status | Actual Output |
|----|-----|--------|----------------|
| AC-AMP-001 | REQ-AMP-001 | PASS | RTL: h3 텍스트 필터링 결과가 `['사이트 제작/편집','회원','콘텐츠','설정','고급']`과 `toEqual` 일치 |
| AC-AMP-002 | REQ-AMP-002 | PASS | RTL: "사이트 제작/편집" `<ul>` href 집합 = `{'/admin/menu','/admin/site/design'}` |
| AC-AMP-003 | REQ-AMP-003 | PASS | RTL: "고급" `<ul>` href 집합 = 5개 지정 세트 일치 + `/admin/widgets` 미포함 확인 |
| AC-AMP-004 | REQ-AMP-004 | PASS | RTL 2건: (a) favorites 1건 mock → 즐겨찾기 h3 인덱스가 콘텐츠<즐겨찾기<설정. (b) favorites 0건 → `container.textContent`에 "즐겨찾기" 미포함 |
| AC-AMP-005 | REQ-AMP-005 | PASS | RTL: "설정" `<ul>` href 집합 = `{'/admin/settings/site','/admin/settings/notification','/admin/settings/security'}` |
| AC-AMP-006 | REQ-AMP-006 | PASS-WITH-DEBT | `seed.test.ts` 2건: adminFavoriteCreateArgs 정확히 2건, label/listOrder 정확 일치, href `/admin/`-프리픽스 일치. **DEBT**: 레거시 "알림 센터"(dispNcenterliteAdminConfig) 1:1 대응 화면이 rhymix-ts에 없음(research.md §3 + 실측 재확인 — apps/web/app/admin 하위 notification-center 라우트 부재 확인) → 두 즐겨찾기 모두 `/admin/settings/notification`을 가리키도록 구현, label로만 구분. acceptance.md가 이 완화를 명시적으로 허용(href 정확값 대신 프리픽스 검증) |
| AC-AMP-007 | REQ-AMP-007 | PASS | `AddToFavoritesButton.tsx`, DnD(`SortableFavoriteItem`/`handleDragEnd`), `admin.favorite.{list,add,remove,reorder}` 라우터 — 이번 SPEC에서 전혀 수정하지 않음(git diff 범위 밖 확인). 전용 테스트 파일(`AddToFavoritesButton.test.tsx`) 없음 — 코드 미변경으로 회귀 없음을 대체 증거로 확인 |
| AC-AMP-008 | REQ-AMP-008 | PASS | RTL: 재배치 후 전체 href 집합(22개)이 재배치 전 원본 22개 href와 `Set` 동등성 일치(`toEqual`) — 위젯 시스템 포함 확인 |

Invariants preserved (per plan.md §2 PRESERVE list): `AdminFavorite` Prisma 모델 무변경, `admin.favorite.*` tRPC 라우터 무변경, `AddToFavoritesButton.tsx` 무변경, `SortableFavoriteItem`/DnD 로직 무변경, `favorites.length > 0` 조건부 렌더 가드 무변경(위치만 이동) — 전부 git diff로 확인.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: 2026-08-11
run_commit_sha: pending-backfill-post-M2-push
run_status: implemented
ac_pass_count: 7
ac_fail_count: 0
ac_pass_with_debt_count: 1
preserve_list_post_run_count: 5
new_warnings_or_lints_introduced: 0
cross_platform_build:
  applicable: false
  reason: "TypeScript/Next.js project — no GOOS/GOARCH cross-compile axis"
total_run_phase_files: 4
m1_to_mN_commit_strategy: per-milestone (M1 sidebar 재배치, M2 install seed 시딩 — 별도 커밋)
```
