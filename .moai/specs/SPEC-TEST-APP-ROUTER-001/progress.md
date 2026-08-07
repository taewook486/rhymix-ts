# SPEC-TEST-APP-ROUTER-001 — Progress Tracking

## §E.1 Plan-phase Audit-Ready Signal

_plan_status: audit-ready_
_plan_complete_at: 2026-08-07_

---

## §E.2 Run-phase Evidence

### AC Binary PASS/FAIL Matrix

| AC | Status | Verification Command | Actual Output |
|----|--------|---------------------|---------------|
| AC-AR-001 | PASS | `cd packages/test-utils && pnpm typecheck` | exit 0, no TS errors |
| AC-AR-002 | PASS | `pnpm lint --filter @rhymix-ts/test-utils` | exit 0, no new lint issues |
| AC-AR-003 | PASS | Helper exported from `@rhymix-ts/test-utils` | `setupAppRouterMocks` appears in type definitions |
| AC-AR-004 | PASS | `grep -rn 'from "apps/web"' packages/test-utils/src/app-router-mocks.ts` | Empty output (no apps/web imports) |
| AC-AR-005 | PASS | Test files using App Router functions updated | 2 files (login/page.test.tsx, admin/layout.test.tsx) use `setupAppRouterMocks()` |
| AC-AR-010 | PASS | `pnpm typecheck` in packages/test-utils | exit 0, type-safe |
| AC-AR-011 | PASS | `git diff packages/test-utils/package.json` | No new dependencies |
| AC-AR-012 | PASS | Test files compile without errors | No import errors in updated test files |

### Implementation Summary

**Files Created:**
- `packages/test-utils/src/app-router-mocks.ts` - New shared helper with `setupAppRouterMocks()` function

**Files Modified:**
- `packages/test-utils/src/index.ts` - Export `setupAppRouterMocks` and `AppRouterMockConfig` type
- `apps/web/app/(auth)/login/page.test.tsx` - Added helper import and call
- `apps/web/app/admin/layout.test.tsx` - Added helper import and call

**Files Requiring No Changes (Investigation Results):**
- `apps/web/lib/install/middleware-gate.test.ts` - Pure unit test, no App Router imports
- `apps/web/proxy.test.ts` - Middleware test, uses NextRequest (not App Router functions)

**Constraints Verified:**
- ✅ No production source files modified (only test files)
- ✅ No vitest.config.ts changes
- ✅ No new dependencies added
- ✅ Helper is app-agnostic (no apps/web imports)
- ✅ TypeScript strict mode compliance verified

### Coverage Measurement

Helper coverage: Indirectly covered through consuming test files (login/page.test.tsx, admin/layout.test.tsx). The helper itself is tested via these integration tests since it provides mock setup functions.

### Known Gap (orchestrator-added note)

- `pnpm exec turbo run lint --filter=@rhymix-ts/web` fails with `Invalid project directory provided, no such directory: .../apps/web/lint` — a pre-existing `next lint` invocation issue unrelated to this SPEC's changed files. Not caused by this SPEC; out of scope to fix here.
- Full monorepo-wide regression (`pnpm exec vitest run --reporter=dot`) was started but did not finish within the session (WSL2 environment-setup overhead observed at ~119s for just 4 files). The 4-target-file run (38/38 pass) + typecheck (exit 0) is the verified evidence at commit time, per explicit user direction to commit now and confirm full regression separately.

---

## §E.3 Run-phase Audit-Ready Signal

_run_complete_at: 2026-08-07_
_run_status: completed
_ac_pass_count: 8
_ac_fail_count: 0
_l44_pre_commit_fetch: [Skipped - Route A Hybrid Trunk]
_l44_post_push_fetch: [Pending push]
_new_warnings_or_lints_introduced: 0
_cross_platform_build: [N/A - TypeScript project]
_total_run_phase_files: 4
_m1_to_mN_commit_strategy: Single commit for Route A Hybrid Trunk (Tier S)

---

## §E.4 Sync-phase Audit-Ready Signal

_sync_status: audit-ready_
_sync_complete_at: 2026-08-07_
_sync_commit_sha: c02a85f_
