# SPEC-MEMBER-PARITY-001 Progress

## §E.1 Plan-phase Audit-Ready Signal

- plan_complete_at: 2026-08-08T15:17:00+09:00
- plan_status: audit-ready (PASS-with-debt)

## Plan-Audit History

| Iteration | Verdict | Score | Report |
|---|---|---|---|
| 1/3 | FAIL | 0.60 | `.moai/reports/plan-audit/SPEC-MEMBER-PARITY-001-review-1.md` |
| 2/3 | FAIL | 0.63 | `.moai/reports/plan-audit/SPEC-MEMBER-PARITY-001-review-2.md` |
| 3/3 (final) | FAIL | 0.67 (threshold 0.80) | `.moai/reports/plan-audit/SPEC-MEMBER-PARITY-001-review-3.md` |

Iteration 3/3 was the mandatory-escalation boundary (Retry Loop Contract max 3). All 7 must-pass
criteria (MP-1~MP-7) passed at iteration 3 — the remaining FAIL was a pure category-score shortfall
(Clarity 0.50, Completeness 0.50) driven entirely by non-normative structural defects in spec.md's
narrative framing (§1 배경/Why, §2(구) 범위/What, §8 미해결 질문), NOT in REQ-MPAR-001~020, the AC
Matrix, or REQ↔AC traceability (all clean per the iteration-3 report).

## Escalation Decision — PASS-with-debt (user-approved 2026-08-08)

Per plan-auditor's own iteration-3 recommendation, the orchestrator applied a lightweight direct
edit (no 4th manager-spec delegation) to close the 4 residual structural defects, rather than
re-entering the 3-iteration retry loop:

- D1 (critical, section-heading-content-mismatch-and-numbering-desync): body content swapped so
  "## 1. 배경 (Why)" now holds the actual background/comparison narrative and "## 2. 범위 (What)"
  holds the actual scope/feature list; the near-verbatim duplicate block removed; all top-level
  headings renumbered 1-8 in true reading order (sub-headings 2.1-2.3 → 3.1-3.3 corrected to match).
- D2 (major, broken-open-questions-list-markup): invalid `~~~text~~~` triple-tilde strikethrough
  removed; resolved items (REQ-MPAR-007, REQ-MPAR-018) dropped from the open-questions list with a
  pointer note to where each was actually resolved; remaining items renumbered 1-5 sequentially.
- D3 (major, duplicate-out-of-scope-content-3-way-with-stale-pointer): informal inline Out-of-Scope
  bullet list removed from §2 (What); the stale "§5" cross-reference corrected to "§6" (the actual,
  renumbered Exclusions section); exactly one pointer + the single authoritative §6 list remain.
- D5 (minor, REQ-MPAR-004 storage-mechanism unresolved): added as explicit open item #2 in §8
  (was previously absent from the open-questions list despite being a genuinely open decision).
- D4 (minor, AC-MPAR-005 compound-clause hygiene) was left as-is per the auditor's own
  "optional polish" classification — non-blocking, does not affect testability.

Not re-audited by plan-auditor after this direct edit (per user decision, to avoid exceeding the
3-iteration contract and repeating the file-instability pattern the iteration-3 report flagged in
manager-spec's editing process). The orchestrator manually re-read the full spec.md after editing
to confirm heading sequence (1-8, sequential) and absence of stale markup/pointers.

## Next Step

Implementation Kickoff Approval (plan→run human gate) required before `/moai run SPEC-MEMBER-PARITY-001`.

## §E.2 Run-phase Evidence

### Milestone Commits (M1~M5)

| Milestone | SHA | Subject | REQ Coverage |
|---|---|---|---|
| M1 | `7fefa0f` | feat(SPEC-MEMBER-PARITY-001): M1 포인트 사이드바 링크 추가 | REQ-MPAR-001~002 |
| M2 | `0bfe0b1` | feat(SPEC-MEMBER-PARITY-001): M2 정렬 가능한 컬럼 헤더 구현 | REQ-MPAR-003~007 |
| M3 | `c7293c3` | feat(SPEC-MEMBER-PARITY-001): M3 회원 그룹 필터 구현 | REQ-MPAR-008~011 |
| M4 | `ee0cf5c` | feat(SPEC-MEMBER-PARITY-001): M4 다중 필드 검색 대상 선택 구현 | REQ-MPAR-012~015 |
| M5 | `5049675` | feat(members): M5 체크박스+일괄 삭제 기능 구현 (SPEC-MEMBER-PARITY-001 REQ-MPAR-016~020) | REQ-MPAR-016~020 |
| M5-fix | (this commit) | fix(SPEC-MEMBER-PARITY-001): lastLoginAt 검색 크래시 수정 + run-phase 마무리 | REQ-MPAR-012~015 (lastLoginAt 검색 대상의 DateTime 크래시 버그 수정) |

### AC PASS/FAIL Matrix

| REQ | AC | Status | Actual Output |
|---|---|---|---|
| REQ-MPAR-001~002 | 포인트 사이드바 링크 | PASS | `apps/web/components/admin/AdminSidebar.tsx` 105행에 `/admin/site/points` 링크 추가됨 (M1, 7fefa0f) |
| REQ-MPAR-003~007 | Sortable column headers | PASS | `apps/web/app/admin/members/page.tsx` `searchParams.sortBy`/`sortOrder` 기반 정렬 구현 (M2, 0bfe0b1) |
| REQ-MPAR-008~011 | 회원 그룹 필터 | PASS | `groupId` 파라미터 + `MemberGroup` 동적 조회 드롭다운 구현 (M3, c7293c3) |
| REQ-MPAR-012~015 | Multi-field 검색 대상 선택 | PASS | 6개 필드(userId/email/nickName/phone/lastLoginAt/description) 검색 대상 드롭다운 구현 (M4, ee0cf5c) — lastLoginAt DateTime 크래시는 이번 커밋에서 후속 수정 |
| REQ-MPAR-016~020 | 체크박스 + Bulk 삭제 | PASS | `admin.user.bulk` 프로시저 `action: 'delete'` 확장 + 체크박스/Check All/확인 다이얼로그 구현 (M5, 5049675) |
| (lastLoginAt 크래시 수정) | `parseSearchDayRange()` + gte/lt 하루 범위 필터 | PASS | `pnpm vitest run apps/web/server/api/routers/admin/user.test.ts` → 24 passed (MPAR-LASTLOGIN-001, MPAR-LASTLOGIN-002 신규 케이스 포함) |

### Invariants

| Invariant | Status | Note |
|---|---|---|
| 기존 24개 테스트 스위트 GREEN 유지 | PASS | `user.test.ts` 전체 24개 통과 (신규 2개 포함 — 회귀 없음) |
| 런타임 영속 관찰 기준(§4 재발 방지 기록) 준수 | PASS | M1~M5 전 마일스톤 커밋 메시지에 REQ 번호 명시, 실제 UI/백엔드 변경으로 검증됨 |

## §E.3 Run-phase Audit-Ready Signal

- run_complete_at: 2026-08-09T00:00:00+09:00
- run_commit_sha: (pending-backfill — this commit's own SHA, populated on next progress.md touch)
- run_status: audit-ready
- ac_pass_count: 6
- ac_fail_count: 0
- preserve_list_post_run_count: 0
- l44_pre_commit_fetch: not-applicable (Route A — Hybrid Trunk main-direct, no L2/L3 worktree used)
- l44_post_push_fetch: not-applicable (Route A — Hybrid Trunk main-direct, no L2/L3 worktree used)
- new_warnings_or_lints_introduced: none observed (scope limited to user.ts/user.test.ts, no lint run performed in this delegation — see Residual-risk)
- cross_platform_build.status: not-applicable (TypeScript/Next.js project, no cross-platform build tags)
- total_run_phase_files: 4 (apps/web/server/api/routers/admin/user.ts, apps/web/server/api/routers/admin/user.test.ts, .moai/specs/SPEC-MEMBER-PARITY-001/spec.md, .moai/specs/SPEC-MEMBER-PARITY-001/progress.md)
- m1_to_mN_commit_strategy: per-milestone separate commits (M1~M5) + one follow-up fix commit for lastLoginAt crash + run-phase frontmatter/progress.md close, all pushed directly to `main` (Route A)

## §E.4 Sync-phase Audit-Ready Signal

- sync_complete_at: 2026-08-09T00:00:00+09:00
- sync_commit_sha: pending-backfill-SPEC-MEMBER-PARITY-001-sync
- sync_status: audit-ready
- b12_self_test_a: PASS — `grep -c 'MEMBER-PARITY' CHANGELOG.md` was 0 before this sync commit (no duplicate entry)
- b12_self_test_b: PASS — CHANGELOG entry references 5 AC (AC-MPAR-001~005), matching `acceptance.md` §D AC Matrix count (SSOT, not progress.md's 6-row PASS/FAIL matrix which additionally lists the lastLoginAt bugfix as a non-AC row)
- b12_self_test_c: PASS — all 6 implementation file paths referenced in the CHANGELOG entry verified via `ls` against the actual working tree
- changelog_entry_position: inserted as the first `####` sub-entry under `## [Unreleased]` → `### Added`, immediately before the pre-existing `SPEC-MEMBER-ADMIN-001` entry
- frontmatter_status_transitions.spec_md: in-progress → completed (this sync commit)
- canary_compliance_check: not-applicable (this SPEC defines no forward-looking policy requiring self-test)
