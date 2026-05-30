---
id: SPEC-THEME-POLISH-001
document-type: implementation-plan
created: 2026-05-30
language: ko
---

# SPEC-THEME-POLISH-001 — Implementation Plan

본 plan은 SPEC-THEME-POLISH-001의 implementation 가이드를 제공한다. SPEC-LAYOUT-001 (Slice A~D 완료) 및 SPEC-ADMIN-001 (admin shell + 인증 게이트 완료) 위에 빌드되는 Phase 4 P1 작업이다.

---

## 1. 진행 순서 및 우선순위

본 SPEC은 2개 slice로 분해되며, 각 slice는 독립적 reviewable + testable.

**우선순위**: Slice A (Admin Theme UI) — Slice B (Dark Mode).

**병행 가능성**:

- Slice A의 Server Action (assignment + saveTokens) 과 Slice B의 DarkModeToggle / FOIT script는 file boundary가 분리되어 있어 거의 완전 병행 가능.
- 단, Slice B의 TokenEditor "Dark mode tab" 통합은 Slice A의 TokenEditor 컴포넌트가 먼저 존재해야 함 → 이 부분만 Slice A 완료 후 진행.

**권고 진행 흐름**:

1. Slice A를 main work로 진행
2. Slice A가 60% 완료 (TokenEditor가 존재할 때)부터 Slice B를 병렬 시작
3. Slice B의 Dark mode tab 통합은 Slice A 완료 후 mergging

---

## 2. Slice별 File List

### Slice A: Admin Theme UI

#### 신규 파일

운영 코드:

- `apps/web/app/admin/site/design/page.tsx` — 3-pane editor entry (Server Component)
- `apps/web/app/admin/site/design/actions.ts` — Server Actions (`assignTheme`, `assignLayout`, `assignSkin`, `saveTokens`)
- `apps/web/components/admin/site-design/SelectorPane.tsx` — Left pane client component
- `apps/web/components/admin/site-design/PreviewPane.tsx` — Center pane (iframe)
- `apps/web/components/admin/site-design/TokenEditor.tsx` — Right pane (react-hook-form auto-form)
- `apps/web/components/admin/site-design/TokenField.tsx` — 개별 field renderer (color picker / text / number)
- `apps/web/components/admin/site-design/AssignScopeDialog.tsx` — Module/Domain/Site scope 선택 dialog
- `apps/web/components/admin/site-design/SaveBar.tsx` — Save/Discard 버튼 + staged 상태 표시
- `apps/web/lib/theme/admin-helpers.ts` — theme/layout/skin 조회 헬퍼 (Server)
- `apps/web/lib/theme/token-form-builder.ts` — Zod schema → form field descriptor 변환

테스트 코드:

- `apps/web/app/admin/site/design/actions.test.ts` — Server Actions (assignTheme/Layout/Skin/saveTokens)
- `apps/web/components/admin/site-design/TokenEditor.test.tsx` — auto-form 생성 + validation
- `apps/web/components/admin/site-design/AssignScopeDialog.test.tsx` — scope 선택 dialog
- `apps/web/components/admin/site-design/SelectorPane.test.tsx` — 선택 이벤트 동기화
- `apps/web/lib/theme/token-form-builder.test.ts` — Zod 타입 → field descriptor 변환
- `apps/web/lib/theme/admin-helpers.test.ts` — theme/layout/skin 조회 헬퍼
- `apps/web/e2e/admin-theme-editor.spec.ts` — Playwright e2e (admin → site/design → token 변경 → Save → 사용자 페이지 반영)

#### 수정 파일

- `apps/web/components/admin/AdminSidebar.tsx` — `/admin/site/design` 메뉴 항목 추가
- `apps/web/package.json` — `react-hook-form`, `@hookform/resolvers` 의존성 추가
- `apps/web/lib/theme/` (디렉토리 신규) — 본 SPEC에서 도입되는 admin theme 헬퍼들의 호스트
- `packages/core/src/theme/layout/pipeline.ts` (minor) — ThemeAssignment.tokensOverride 활용 격상 (REQ-LAYOUT-014의 active 격상)
- `packages/core/src/theme/layout/context.tsx` (minor) — `<style>` injection 헬퍼 추가 (필요 시)

### Slice B: Dark Mode

#### 신규 파일

운영 코드:

- `apps/web/components/theme/DarkModeToggle.tsx` — 다크모드 토글 client component
- `apps/web/components/theme/ColorSchemeProvider.tsx` — React Context provider (client component)
- `apps/web/lib/theme/color-scheme-script.ts` — FOIT prevention inline script (정적 문자열 export)
- `apps/web/lib/theme/use-color-scheme.ts` — useColorScheme React hook

테스트 코드:

- `apps/web/components/theme/DarkModeToggle.test.tsx` — toggle 클릭 + localStorage + disabled 검증
- `apps/web/components/theme/ColorSchemeProvider.test.tsx` — Context 초기값 + sync
- `apps/web/lib/theme/color-scheme-script.test.ts` — script 문자열 정확성 검증
- `apps/web/e2e/dark-mode.spec.ts` — Playwright e2e (toggle → navigation → 유지 → localStorage.clear → prefers-color-scheme)

#### 수정 파일

- `apps/web/app/layout.tsx` — `<head>`에 inline `<script>` 주입 + `<body>`에 `<ColorSchemeProvider>` 래핑
- `apps/web/components/layout/GlobalHeader.tsx` — DarkModeToggle 마운트 (우측, 사용자 메뉴 옆)
- `themes/default/theme.json` — `supportsDarkMode: true`, `tokensSchema.dark.colors` 정의 추가
- `themes/default/install.ts` — dark token seed 추가

---

## 3. Test 추정 분배

본 SPEC의 전체 test 추정은 MASTER-PLAN-002 Section 5.11의 **+28** 기준.

| Slice | 단위/컴포넌트 | e2e | 합계 |
|---|---|---|---|
| Slice A (Admin UI) | 18 | 1 | 19 |
| Slice B (Dark Mode) | 7 | 1 | 8 |
| **합계** | **25** | **2** | **27** |

(MASTER-PLAN-002 추정 28과 ±1 오차 범위 내. Slice A의 TokenField component-level test가 추가로 1개 늘어날 수 있음.)

세부 테스트 항목:

**Slice A (19 tests)**:

- Server Actions (`actions.test.ts`): 6 tests (assignTheme, assignLayout, assignSkin, saveTokens 정상 흐름 + 무권한 + invalid Zod)
- `TokenEditor.test.tsx`: 4 tests (Zod schema → form field 자동 생성, color picker 렌더, invalid hex 에러, Save 클릭 흐름)
- `AssignScopeDialog.test.tsx`: 2 tests (module/domain/site scope 선택, cancel)
- `SelectorPane.test.tsx`: 2 tests (theme 클릭 → 이벤트, layout 클릭 → 이벤트)
- `token-form-builder.test.ts`: 3 tests (z.string → text/color 변환, z.number → number 변환, z.object → fieldset)
- `admin-helpers.test.ts`: 1 test (theme/layout/skin 조회)
- e2e (`admin-theme-editor.spec.ts`): 1 test (full flow)

**Slice B (8 tests)**:

- `DarkModeToggle.test.tsx`: 3 tests (toggle → html.dark 변경 + localStorage, disabled when supportsDarkMode=false, initial state from localStorage)
- `ColorSchemeProvider.test.tsx`: 2 tests (초기 state, useColorScheme hook 결과)
- `color-scheme-script.test.ts`: 2 tests (script 문자열 정확성, IIFE 형태 검증)
- e2e (`dark-mode.spec.ts`): 1 test (toggle → navigation → 유지 → localStorage.clear → prefers-color-scheme follow)

---

## 4. EARS 요구사항 ↔ Slice 매핑

| Slice | EARS REQ Coverage |
|---|---|
| Slice A | REQ-THEME-POLISH-001~029 (Admin UI 진입점 + Assignment + Token Editor), REQ-THEME-POLISH-050~053 (Hot-reload mechanism), REQ-THEME-POLISH-060/062/063/065/066 (Quality) |
| Slice B | REQ-THEME-POLISH-030~039 (Dark mode), REQ-THEME-POLISH-061/064/065/066/067 (Quality), REQ-THEME-POLISH-028 (Slice A와 통합되는 dark mode tab) |

---

## 5. 검증 단계

각 Slice 완료 시점에 다음을 모두 확인:

### Slice A 완료 게이트

- [ ] `pnpm tsc --noEmit` 0 type error (apps/web, packages/core, themes/default 모두)
- [ ] `pnpm test apps/web` 모든 신규 unit/component 테스트 통과
- [ ] Playwright e2e `admin-theme-editor.spec.ts` 통과
- [ ] `/admin/site/design` 진입 (admin 권한 + 2FA 통과 후) → 3-pane editor 표시
- [ ] Token 변경 → Save → 사용자 페이지에서 새 token 반영 (rebuild 없음)
- [ ] Invalid hex 입력 시 인라인 에러 + Save 버튼 disabled
- [ ] 무권한 사용자가 `/admin/site/design` 직접 접근 시 `/login`으로 redirect
- [ ] Server Action이 admin log를 기록 (action="theme.tokens.save" 등)
- [ ] SPEC-LAYOUT-001 REQ-LAYOUT-014의 `tokensOverride` 활용이 실제로 일어남을 확인 (테스트 또는 수동 검증)

### Slice B 완료 게이트

- [ ] `pnpm tsc --noEmit` 0 type error
- [ ] `pnpm test apps/web` 모든 신규 unit/component 테스트 통과
- [ ] Playwright e2e `dark-mode.spec.ts` 통과
- [ ] `/`에서 DarkModeToggle 클릭 → `<html class="dark">` 적용 + localStorage 저장
- [ ] 새 페이지 navigation 후 dark mode 유지 (FOIT 없음)
- [ ] `localStorage.clear()` + 새 세션 → `prefers-color-scheme` follow
- [ ] `supportsDarkMode: false` 테마에서는 toggle disabled
- [ ] 페이지 source view (수동) → `<head>` 안에 inline script 존재 확인

### 전체 SPEC 완료 게이트

- [ ] 모든 EARS REQ가 Slice A 또는 Slice B에 의해 커버됨
- [ ] 모든 Acceptance Criteria (AC-THEME-POLISH-A1~A3, B1~B3)가 통과
- [ ] TRUST 5 quality gates 통과 (manager-quality 검토)
- [ ] 새 admin UI가 SPEC-ADMIN-001 admin shell과 시각적으로 일관됨 (디자인 검토)
- [ ] SPEC 변경사항이 (1) MASTER-PLAN-002 Section 5.11, (2) SPEC-LAYOUT-001 Exclusion 절(다크모드 + admin UI deferred 항목) 모두와 일치함

---

## 6. Technical Approach 요약

본 plan의 implementation 디테일은 `spec.md`의 Section 5 (Technical Approach)에 정의되어 있다. 핵심 요점:

- **3-pane editor**: CSS Grid 또는 Tailwind flex. 1280px 미만에서 vertical stack fallback.
- **Token editor**: react-hook-form + zodResolver + token-form-builder 유틸 (Zod schema → field descriptor).
- **Hot-reload**: ThemeAssignment.tokensOverride (DB) → LayoutProvider가 `<style>` 태그로 CSS variables inject. rebuild 없음.
- **Dark mode FOIT 방지**: `<head>`에 inline IIFE script. `try-catch`로 silent fail.
- **권한 모델**: SPEC-ADMIN-001의 `isAdminSession` + 2FA 게이트 그대로 재사용.
- **Multi-tenant 격리**: x-site-id header routing (SPEC-ADMIN-001 패턴). Theme assignment는 siteId scope.

---

## 7. Dependencies & Risks

### Upstream Dependencies (모두 완료 상태)

- SPEC-LAYOUT-001 Slice A (Domain Model + Prisma migration `layout-id-string`) ✅
- SPEC-LAYOUT-001 Slice B (Render Pipeline + LayoutContext) ✅
- SPEC-LAYOUT-001 Slice C (themes/default + apps/web integration) ✅
- SPEC-ADMIN-001 Admin Shell (layout + sidebar + topbar + 인증/2FA 게이트) ✅
- `packages/core/src/theme/dark-mode.ts` (existing, REQ-THEME-040~043 호환) ✅
- `packages/core/src/theme/token-css.ts` (existing, REQ-THEME-030~033 호환) ✅
- `packages/core/src/theme/types.ts` (existing `themeTokensSchema`) ✅

### Downstream Dependencies

본 SPEC을 직접 의존하는 후속 SPEC은 없음. Phase 4 leaf SPEC.

### Risks (spec.md Section 6 참조)

가장 critical한 위험:

1. **react-hook-form + Zod resolver의 nested object handling** — 명시적 테스트로 cover
2. **`<style>` 태그 inject의 CSP 충돌** — nonce 메커니즘 활용 또는 CSP 검토
3. **Preview iframe의 데이터 격리** — `preview-tokens` query parameter로 분리, security review 권고
4. **다국적 token 값에서의 race condition** — Server-side `safeParse` 재실행으로 보호

---

## 8. Open Questions Resolution Plan

`spec.md` Section 7의 5개 Open Question 모두 구현 detail. Slice A 또는 B 진행 중 expert가 자체 결정:

| Question | 결정 시점 | 책임 agent |
|---|---|---|
| 1. Theme 업로드 형식 | 본 SPEC에서 "CLI only" 결정 | (해결됨) |
| 2. 다크모드 DB persistence | 본 SPEC에서 "localStorage only" 결정 | (해결됨) |
| 3. Custom theme 생성 flow | 본 SPEC에서 "file-based only" 결정 | (해결됨) |
| 4. Preview iframe 보안 격리 | Slice A 작업 시 | expert-frontend + expert-security 리뷰 |
| 5. react-hook-form 외 대안 | Slice A 시작 시 | expert-frontend (권고: react-hook-form 채택) |

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Total Estimated Tests: ~27 (Slice A: ~19, Slice B: ~8)
Total New Files: ~22 (Slice A: ~16, Slice B: ~6)
Total Modified Files: ~6 (Slice A: ~4 incl. pipeline minor patch, Slice B: ~3)
