# SPEC-LEGACY-PARITY-001 — progress

> Tier L · 5 artifacts (spec / plan / acceptance / design / research). 진행 기록.
> 섹션 구조는 spec-frontmatter-schema.md § progress.md Section Map (V3R6)를 따른다.

## §E.1 Plan-phase Audit-Ready Signal

- plan_complete_at: 2026-08-16
- plan_status: audit-ready
- plan-audit verdict: **PASS 0.94** (iteration 2, Tier L 임계값 0.85 초과) — "계획은
  확정됐으므로 재결정하지 말고 구현하라"
- M1(가설 실측)은 계획 수정 중 사전 실행 완료 — 관찰 기록은 `research.md` §3.0·§1.2가
  보관한다(plan.md §A.1 특수 사례 조항).
- Implementation Kickoff Approval: 획득 (run-phase 위임 시점, 2026-08-16)

## §E.2 Run-phase Evidence

Base SHA (run kickoff — plan.md §A.6 / 감사 D4 앵커, AC-SITE-007/008의
`git diff <base>..HEAD` 검증 기준점):

```
a9e637a47b58e2480fab810549e7e3c5294b7bfd
```

- 기록 시점: 2026-08-16, M2 착수 직전 (`git rev-parse HEAD` 실측).
- 이 시점 작업 트리: SPEC 디렉터리 clean (dirty 505경로는 전부 `.claude/**`·`.moai/**`
  harness 템플릿 갱신 노이즈 — run 스코프 밖, 스테이징에서 제외).

### M2 — 승계 3동작 특성화 (완료 — 2026-08-16)

실행 환경: HEAD `a9e637a` (= base SHA), Docker 3컨테이너 기동, dev 서버 사전 예열 후
`CI_E2E=1 pnpm test:e2e --grep "SPEC-LEGACY-PARITY-001"` (apps/web). 특성화 3종은
**첫 실행부터 전건 GREEN** — 제품 코드는 한 줄도 건드리지 않았다 (M2는 test-only).
산출물: `apps/web/e2e/menu-parity.spec.ts`(신규) +
`apps/web/e2e/support/seed-menu-parity-fixtures.ts`(신규 — 픽스처 시더).

**AC 행렬 (전건 PASS):**

| AC | 상태 | 검증 | 결과 |
|----|------|------|------|
| AC-SITE-004 (groupIds ACL) | **PASS** | e2e `menu-parity.spec.ts:76` — 비로그인/미소속 숨김 + 소속 표시 4방향 왕복 | ✓ 20.0s |
| AC-SITE-005 (3단계 트리 전 깊이) | **PASS** | e2e `menu-parity.spec.ts:124` — 구조적 로케이터로 3단계 사슬 고정 (비로그인·로그인) | ✓ 9.5s |
| AC-SITE-006 (3슬롯 동시 배정) | **PASS** | e2e `menu-parity.spec.ts:146` — `listAssignedSlots` 3종 + 헤더/푸터/유틸리티 3곳 렌더 | ✓ 3.7s |

**스위트 실행 증적:** `.moai/state/verify/m2/full-suite.txt` — `3 passed (1.2m)`, exit 0.

**C.2 고의 결함 주입 (공허 통과 방지 — 3건 전부 기대 실패 확인 후 원복):**
제품 코드는 수정 불가(§D)이므로 시더(테스트 지원 파일)에서 특성화 관찰값을
변조해 주입했다 — 테스트가 주장하는 관찰 채널(DOM·슬롯 조회)과 동일한 경로다.

| 주입 | 변조 내용 | 결과 |
|------|-----------|------|
| A — ACL 누출 | 제한 항목 `groupIds` `[staffGroupId]`→`[]` | **FAIL** — 비로그인에게 `M2-제한` `toHaveCount(0)` Expected 0 / Received 1 (`inject-a-acl.txt`) |
| B — 트리 단절 | 트리하 부모를 트리중→트리상으로 재배속 | **FAIL** — 3단계 구조 로케이터 `element(s) not found` (`inject-b-tree.txt`) |
| C — 슬롯 누락 | UTILITY 배정 1행 제거 | **FAIL** — `toEqual` Expected 3종 / Received 2종 (`inject-c-slot.txt`) |

세 주입 모두 해당 AC의 핵심 단언에서 정확히 실패했다 — 특성화 테스트가 지켜야 할
관찰 가능 행동(비로그인 비가시·깊이 보존·슬롯 3종)이 각 단언에 하중을 실고 있음을
증명한다. 주입 후 시더는 원본과 바이트 동일하게 원복했다 (`grep '주입'` 0건).

**C.4 M1 시드 잔여 카운트 (전/후):** menu_items `M1-%` 0→0, menus `M1-%` 0→0,
slot assignments `M1-%` 0→(철거된 menus 조인 0). M1 픽스처는 run 착수 전 이미
청소돼 있었다 — 잔여 없음, 재철거 불필요.

**DB 종료 상태 (B-3 계약):** `sites.installedAt NOT NULL` 1건, domains 1, 사용자는
재시드된 `admin`(isAdmin) 1명뿐 — M2 픽스처·계정(m2*) 전부 철거, 앱은 설치 마법사로
리다이렉트되지 않는 정상 설치 상태 (admin@example.com / Rhymix!2026).

**실패 분류 로그:** 테스트/시드 결함 0건, 제품 동작 불일치 0건. 유일한 실패는 첫 실행의
`config.webServer` 90초 부트 타임아웃(Turbopack 첫 컴파일이 WSL2에서 창을 넘김) —
환경 등급이며 dev 서버 사전 예열로 해결했다. 특이사항: 타임아웃 시 Playwright가
webServer 자식 트리를 완전히 죽이지 않아 next-server 고아(pid 23412→23413→23538)가
port 3000 + `.next/dev/lock`을 붙잡은 적이 있음 — 트리 킬·잠금 해제 후 재기동.
이후 webServer는 재사용(`reuseExistingServer`)으로 정상 동작했다.

**typecheck:** `pnpm --filter @rhymix-ts/web typecheck` — 착수 전·후 모두 exit 0,
신규 오류 0건 (e2e 파일 전부 `**/*.ts` include 범위 안).

### M3 — 버튼 이미지 전체 범위 (완료 — 2026-08-16)

실행 환경: HEAD `c3037dd`(M2 커밋), Docker 3컨테이너, dev 서버 재기동 후 실측.
산출물: 편집기 파일 업로드 UI + 액션 업로드/제거 해석 + `MenuRenderer` 상태별 렌더 +
`packages/admin` 번들 스키마 정합화. 신규 `apps/web/lib/menu/button-image.ts`.

**RED→GREEN 전이:** 구현 착수 전 t1~t5 + e2e에서 21건 이상 실패 기록
(`.moai/state/verify/m3/`). 구현 후 단위 29건·e2e 2건 전건 GREEN.

**AC 행렬:**

| AC | 상태 | 검증 | 결과 |
|----|------|------|------|
| AC-SITE-002 (3종 업로드 저장·재진입) | **PASS** | e2e `menu-button-image.spec.ts:136` — 3종 업로드→DB가 `{"image":...}` 참조형 보유→재진입 시 미리보기 3종 + `src`가 `/api/files/by-key/` | ✓ 1.6m |
| AC-SITE-003 (상태별 제거 격리) | **PASS** | 동 테스트 — `removeNormalBtn`만 체크 시 `normalBtn IS NULL` ∧ hover/active 참조 유지 | ✓ (동 실행) |
| AC-SITE-010 (normal 기본 + hover/active 전환) | **PASS** | e2e `menu-button-image.spec.ts:212` — `naturalWidth>0`, 라벨 텍스트 대체, hover/active opacity 실측 | ✓ 4.2s |
| AC-SITE-011 (형태 닫힌 집합) | **PASS** | 단위 `menu-item.test.ts` M3-1~3 + `packages/admin` `menu-button-image.test.ts` 5건 | ✓ |
| M2 특성화 (AC-SITE-004/005/006) 무회귀 | **PASS** | `menu-parity.spec.ts` 3건 재실행 — 렌더러 변경 후에도 전건 통과 | ✓ 1.0m |

**증적:** `.moai/state/verify/m3-fix/{d1-m3-e2e,d2-m2-regression,d3-web-units,d5-typecheck-web,d5-typecheck-admin}.txt`
— e2e `2 passed (2.2m)` exit 0, M2 `3 passed (1.0m)` exit 0, 단위 `29 passed` exit 0.

**인수 검증에서 드러난 결함 2건 (단위 테스트가 못 잡은 것):**

| # | 결함 | 근본 원인 | 수정 |
|---|------|-----------|------|
| 1 | hover 시 normal 레이어가 안 꺼져 두 이미지가 겹침 | 상태 레이어에 `group-hover:opacity-100`만 주고 normal 을 끄는 짝을 안 걸었다 | `MenuRenderer.tsx` — 대체 레이어가 있을 때만 normal 에 `group-hover:opacity-0`/`group-active:opacity-0` (없는 상태에서 걸면 호버 시 빈 링크가 된다) |
| 2 | 상태별 제거가 DB에 반영되지 않음 | `Json?` 컬럼에 평범한 `null` 을 넘기면 Prisma 가 SQL NULL 이 아니라 **JSON null**(`'null'::jsonb`)을 기록 — `IS NULL` 이 false 로 남는다 | `menu-item.ts` — 버튼 3종의 `null` 을 `Prisma.DbNull` 로 변환 (`undefined`=변경 없음은 보존) |

결함 2는 Prisma mock 기반 단위 테스트가 "전달된 값"만 보기 때문에 구조적으로 볼 수 없었다.
실측(`prisma.$queryRaw`)으로 `plain null → is_sql_null=false`, `Prisma.DbNull → is_sql_null=true`
를 확인한 뒤 수정했고, 단위 테스트 M3-2 도 저장 계층 도달값(`Prisma.DbNull`)을 단언하도록
고쳤다 — mock 이 실제 형태를 가리던 구멍을 함께 막았다.

**환경 등급 이슈 2건 (제품 결함 아님):**

- WSL2 `/mnt/d`(drvfs)에서 inotify 가 안 떠 Turbopack 이 소스 변경을 감지하지 못했다.
  Tailwind(PostCSS 별도 프로세스)는 디스크를 다시 읽어 CSS 만 갱신돼, "클래스는 CSS 에
  있는데 DOM 에는 안 붙는" 상태로 오진하기 쉬웠다 — 수정 검증마다 dev 서버 재기동 필요.
- `input[name="normalBtnFile"]`이 항목 수만큼 존재(항목마다 독립 `<form>` — 정상 마크업)해
  strict mode 위반. 테스트에서 폼을 `input[name="id"][value=...]`로 이 항목에 고정해 해결.
  초기 진단은 "콜드 컴파일 타임아웃"이었으나 실제 원인은 로케이터 모호성이었다.

**typecheck:** `pnpm --filter @rhymix-ts/web typecheck` exit 0 / **오류 0건**.
M3 구현이 남긴 20건(액션 `unknown` 타입 ↔ tRPC 입력 불일치 1건 + 테스트 파일 strict 위반
19건)을 이번에 전부 해소했다 — HEAD 는 0건이었으므로 그대로 커밋하면 게이트 회귀였다.
`pnpm --filter @rhymix-ts/admin typecheck` exit 0 / 0건.

**PRESERVE 확인:** `AdminSidebar.tsx` · `/admin/site/design/` · `Utility.tsx` ·
`FooterMenuSlot.tsx` · `GlobalFooter.tsx` — base SHA 대비 diff 0, 작업 트리 변경 0.
`apps/web/e2e/menu-parity.spec.ts`(M2 특성화) 미수정 확인.

**D2/packages/file 재사용:** 신규 업로드 엔드포인트·저장 추상 0건 —
`apps/web/app/api/` 변경 없음, `packages/file/` 작업 트리 clean. 액션과
`lib/menu/button-image.ts` 가 기존 `@rhymix-ts/file`(`getStorage`/`getScanner`/
`assertMimeAllowed`/`assertSizeAllowed`/`isImageMimeType`)만 사용한다.

**DB 종료 상태:** sites 1 / domains 1 / users 1(`admin`, isAdmin) / menus 0 /
menu_items 0 — M3 픽스처 전량 철거, `uploads/e2e/` 제거됨. 설치 완료 상태 유지
(admin@example.com / Rhymix!2026), 레거시 `localhost:8080` 대조 가능.

#### M3 마감 — 인계 기록 모순 해소 (2026-08-17)

인계 노트(`docs/NEXT_SESSION.md`, 커밋 09e22c9)는 AC-SITE-002/003 e2e 를 "실패 — 미해결"
로 남겼는데, 같은 세션의 증적 `.moai/state/verify/m3-fix/d1-m3-e2e.txt` 는 동일 2건 전부
통과를 담고 있었다. 증적 기록(23:56)이 인계 노트 작성(01:07)보다 1시간 앞서므로 두 기록이
정면 충돌한다 — 재실행으로 판정했다.

| 실행 | 대상 | 결과 |
|------|------|------|
| 1 | AC-SITE-002/003 단독 | 1 passed (3.4m) |
| 2 | M3 2건 (002/003 + 010) | 2 passed (1.3m) |
| 3 | M2 회귀 가드 3건 | 3 passed (1.7m) |
| 4 | **고의 결함 주입** 상태 002/003 | **1 failed** — 보고된 실패 재현 |
| 5 | 원복 후 M3 2건 | 2 passed (3.7m), exit 0 |
| 6 | 단위 5스위트 | 37 passed (web 32 + admin 5) |

**주입 결함**: `menu-item.ts` `toButtonPatch()` 의 `null → Prisma.DbNull` 변환 무력화.
결과가 인계 노트의 증상과 **동일 라인·동일 형태**로 재현됐다 — `menu-button-image.spec.ts:192`
poll `Expected true / Received false`, 30초 초과. 두 가지가 동시에 확정된다:

1. AC-SITE-003 e2e 단언은 **살아 있다** — DbNull 회귀를 실제로 잡는다. 공허 통과 아님.
2. 인계 노트가 기록한 실패는 **dev 서버가 DbNull 수정 이전 번들을 들고 있던 상태**에서만
   재현된다. HEAD 소스에는 변환이 들어 있으므로 미해결 제품 결함은 없다. 같은 세션이
   이미 기록해 둔 "WSL2 inotify 미작동 → 재기동 필수" 함정에 그 세션 자신이 걸린 것이다.

**증적:** `.moai/state/verify/m3-close/{e0-injection-liveness.md,e1-m3-e2e-after-revert.txt,e2-units.txt}`

**절차 함정 2건 (이번 세션 실측, 재발 방지):**

- `pkill -f 'next dev'` 는 Bash 도구 자신의 커맨드라인에 그 문자열이 들어가 **자기 자신을
  죽인다**(exit 144). 브래킷 회피(`'next[ ]dev'`)가 필요하다.
- 기존 서버가 안 죽은 채로 새 `next dev` 를 띄우면 3000 을 못 잡고 3001 로 밀린 뒤
  `.next/dev/lock` 획득 실패로 종료된다. 이때 테스트는 **낡은 번들 서버를 상대로 측정**되고
  10분 넘게 헛돌았다. 재기동 후 로그에서 `Local: http://localhost:3000` 을 반드시 확인할 것.

**M3 판정: 전 AC PASS, 미해결 항목 0건.**

### M4 — 메뉴 항목 복제 + 수명주기 마감 (2026-08-17, TDD)

**실행 환경:** 구현 커밋 `37b5817`(feat) → e2e 로케이터 수리 `7450ba3`(test).
Route A — main 직저 커밋(브리프 지시; plan.md §A.6의 Tier-L PR 플로우 주석은
브리프로 대체됨). PRESERVE 앵커 base `a9e637a`.

**산출물 (base 대비 6파일 +1190/−32):**

- `apps/web/server/api/routers/admin/menu-item.ts`(+132) — `duplicate` 프로시저:
  단일 `$transaction` 재귀 서브트리 복사 + 삽입점 이후 형제 listOrder 시프트.
  `@MX:ANCHOR`(REASON+SPEC 포함)로 단일 진입점 계약 표시.
- `apps/web/app/admin/menu/actions.ts`(+180) — `duplicateMenuItemAction`:
  tRPC 위임 + `/admin/menu/<menuId>` revalidate + TRPCError 변환(`@MX:NOTE`).
- `apps/web/components/admin/MenuItemDnDTree.tsx`(+69) — 행별 [복제]
  버튼(aria-label), 낙관적 로컬 삽입 → `router.refresh()` 서버 확정 + 토스트.
- 테스트 3파일(+841): `menu-item.test.ts` · `actions.test.ts` ·
  `MenuItemDnDTree.test.tsx`(착수 전 특성화 2건 — lazy load·reorder payload — 포함).
- e2e: `apps/web/e2e/menu-duplicate.spec.ts`(신규). 시드는 psql(E4 증거와 동일
  픽스처)를 스펙 밖에서 주입 — UI 왕복만 단언.

**RED → GREEN (verbatim, `.moai/state/verify/m4/red-units.txt` 116,823B):**

| 실행 | 명령 대상 | 결과 |
|------|-----------|------|
| RED-1 | actions + menu-item | `Test Files 2 failed (2)` / `Tests 3 failed \| 22 passed (25)` |
| RED-2 | MenuItemDnDTree | `Test Files 1 failed (1)` / `Tests 3 failed (3)` |
| RED-3(정제) | MenuItemDnDTree | `1 failed \| 2 passed (3)` — 특성화 2건 green, M4 버튼 테스트만 RED |
| GREEN | actions + menu-item | `2 passed (2)` / `25 passed (25)` |
| GREEN | MenuItemDnDTree | `1 passed (1)` / `3 passed (3)` |
| GREEN(재유도 후) | 상동 2스위트 | `25 passed (25)` 38.95s / `3 passed (3)` 276.16s — 되돌림 사고 후 재검증 |

**사고·절차 함정 3건 (재발 방지 기록):**

1. **공유 체크아웃 되돌림 사고** — GREEN 달성 직후 e2e 준비 중 구현 3파일이
   작업 트리에서 HEAD 로 되돌려졌다(동시 세션 추정). 살아남은 테스트 3파일을
   규격으로 삼아 구현을 재유도하고, 재검증(green-*-restore.txt) 후 즉시 보호
   커밋 `37b5817`을 적립했다. 교훈: GREEN 직후 커밋 — 커밋 전 작업 트리는
   공유 자원이다.
2. **next-server 자식 생존 + pkill 자기매치** — `pkill -f 'next[ ]dev'` 후에도
   리네임된 `next-server (v16.0.0)` 자식이 3000 포트를 계속 점유했다. 또한
   `pkill -f 'next-server'`는 패턴 문자열 자체가 Bash 도구의 커맨드라인에
   들어가 **자기 자신을 죽인다**(exit 1, 후속 명령 미실행). 종료 세트
   확장 + 검증은 별도 호출·브래킷 회피(`[n]ext-server`)로 수행한다.
3. **e2e 로케이터 결함(run5→run6)** — `ul > li` 행 카운트가 관리자 사이드바
   chrome까지 세서 `Expected 3 / Received 28`. [복제] 버튼 role 계약으로 행을
   세는 방식으로 수리(테스트 결함, 제품 무관). run6 통과.

**AC 행렬 (M4 범위):**

| AC | 판정 | 근거 |
|----|------|------|
| AC-SITE-001 | PASS | 단위 28건(25+3) green + e2e run6(`1 passed (1.8m)`) + psql 6검증(서브트리 8행 전체 복사, listOrder 충돌 0건, `btn_is_sql_null=t` 전 사본 행, top 순서 원본(1)/사본(2)/형제1(3)/형제2(4)) |
| AC-SITE-007 | PASS | M2 특성화 3종 green 유지 + DnD reorder 특성화 green + design/ anchored diff 0(아래) |
| AC-SITE-008 | PASS | `AdminSidebar.tsx` anchored diff `a9e637a..HEAD` → 출력 0행 |
| AC-SITE-009 | 준비 완료 | 근거 기록 `ac009-basis.txt`(아카이브 SPEC-MENU-001 `status: completed`, 전환 커밋 0건, `superseded_by:` 스키마 외 필드 — 미작성 확인). `* → superseded` 전환 자체는 manager-spec/sync 단계 소관으로 이관 |

**PRESERVE (E7 — 앵커 diff + 경로 존재 검증 후 판정):** 존재하지 않는 경로의
`git diff`는 0행을 내는 **거짓 PASS**(감사 D4)다. 1차 패스에서
`components/{Utility,FooterMenuSlot,GlobalFooter,MenuRenderer}.tsx` 가 존재하지
않는 경로였음이 발견되어 `git ls-files` 로 실경로(`components/layout/`)를 확정한
뒤 재판정했다. 최종: design/ 전체·`AdminSidebar.tsx`·`layout/Utility.tsx`·
`layout/FooterMenuSlot.tsx`·`layout/GlobalFooter.tsx`·`legacy-admin-map/`·
`.claude/settings.json`·타 SPEC 디렉터리 — 전부 diff 0. `layout/MenuRenderer.tsx`
217행 = M3 in-SPEC EXTEND(plan.md §A.4 명시 해제), `menu-parity.spec.ts` =
M2 신규 생성(`c3037dd` 이후 diff 0).

**typecheck (E6):** `pnpm --filter @rhymix-ts/web typecheck` exit 0 / 오류 0건.
`pnpm --filter @rhymix-ts/admin typecheck` exit 0 / 0건.

**전체 단위 스위트 (E3):** `pnpm vitest run apps/web`(루트 실행, B5) —
`Test Files 1 failed | 150 passed (151)`, `Tests 1 failed | 1049 passed |
5 skipped (1055)`, Duration 3437.48s. 유일 실패 `registry.test.ts > B-101`
(파일 내장 180s 예산 초과)는 3단계로 분류했다: (a) 단독 재실행도 동일
타임아웃 → 단순 병렬 경합 배제 불가, (b) 파일 변경 이력이 전부 M4 이전
(90f368b/29869a2)이고 M4 수정 파일이 import 그래프에 부재, (c) 900s 예산
재실행 → **159.8s 통과**. 6코어 load 12~20·drvfs I/O 포화(동시 ~5세션) 환경
등급의 느림-완료(slow-but-completes) — 제품 회귀 아님, M4 무관.
참고: 브리프 pre-flight "41 files/318 tests"는 실측 151/1055와 스코프가 달라
원 스코프 재구성 불가 — 이번 실행 verbatim 을 E3 증거로 계상한다.

**DB 종료 상태 (E9):** cleanup.sql → `DELETE 10 / DELETE 1 / COMMIT`,
`menus_left=0, items_left=0` — 설치 기준선 복원. `uploads/` 0파일,
`/tmp/m4-jar.txt`·`test-results/` 제거, M2 세션 유물 `.reseed-baseline-tmp.mts`
삭제(외부 `apps/web/.claude/` 는 보존). dev 서버 종료 + 3000/3001 free 확인.

**증적:** `.moai/state/verify/m4/` — red-units.txt, green-units.txt,
green-units-restore.txt, green-tree.txt, green-tree-restore.txt, seed.sql,
psql-seed.txt, verify.sql, psql-verify.txt, ac009-basis.txt, e2e-run5.txt,
e2e-run6.txt, cleanup.sql, psql-cleanup.txt, full-units.txt,
registry-isolated-rerun.txt, registry-b101-bigbudget.txt, typecheck-web.txt,
typecheck-admin.txt

**M4 판정: 전 AC PASS(AC-SITE-009 는 전환 준비 완료 — sync 이관), 미해결 제품 결함 0건.**

## §F Phase 4 Mode Selection

입력 파라미터:

- tier: L · 범위(M2): 2파일(e2e 스펙 1 + 시더 1, 둘 다 이미 작성됨·미커밋)
- 도메인 수: 1 (프론트 e2e 테스트) · 언어 구성: 100% TypeScript
- 병렬 이득: LOW — 단일 마일스톤의 순차 검증·수정 작업

모드 평가:

| 모드 | 선택 | 사유 |
|------|------|------|
| 1 trivial | 미선택 | 의미 변경 있음(테스트 적립 + 실패 시 수정) |
| 2 background | 미선택 | 읽기 전용 아님 — 커밋까지 수행 |
| 3 agent-team | 미선택 | 은퇴(tombstone) |
| 4 parallel | 미선택 | 단일 도메인 · 코딩 중심 — Anthropic 코딩 병렬화 유보 조항 |
| 5 sub-agent | **선택** | 코딩 중심 단일 마일스톤의 기본 경로 |
| 6 workflow | 미선택 | 파일 수 2개 — 기계적 대량 변환 아님 |

Decision: sub-agent

근거: M2는 단일 도메인(e2e 테스트) 코딩 작업이며 대상 파일이 2개다. 병렬 팬아웃의 조정
비용이 이득을 넘어서고, Anthropic의 코딩 과제 병렬화 유보 조항이 순차 sub-agent를 기본으로
지목한다. Tier L이므로 Section A-E 위임 템플릿을 적용한다.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: complete
run_complete_at: 2026-08-17T22:58:22+09:00
run_commit_sha: 7450ba3
ac_pass_count: 10
ac_fail_count: 0
preserve_list_post_run_count: 8
total_run_phase_files: 7
m1_to_mN_commit_strategy: per-milestone commits on main (Route A, no PR)
new_warnings_or_lints_introduced: 0
```

- `ac_pass_count: 10` — AC-SITE-001~008, 010, 011 전건 PASS. AC-SITE-009 는
  FAIL 아님: 실행 준비 완료 상태로 manager-spec/sync 단계에 인계(전환 소유
  분리 — plan.md M4 명시). 최종 판정은 sync 마감 시 확정.
- `preserve_list_post_run_count: 8` — 경로 기반 PRESERVE 8건 전부 앵커 diff
  `a9e637a..HEAD` 0행(§E.2 M4 PRESERVE 항).
- `total_run_phase_files: 7` — 구현 3 + 테스트 3 + e2e 1.
- 프론트메모: `status: draft → in-progress` 전환은 M1 커밋 시점 소관이나
  M1~M3 세션이 누락했다(run 종료 시점 발견). 본 run 최종 docs 커밋에
  지연 복원한다(소유 전환 — manager-develop).

## §E.4 Sync-phase Audit-Ready Signal

(sync 커밋 시 기록 — manager-docs 소관)
