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

(run 완료 시 기록 — manager-develop 소관)

## §E.4 Sync-phase Audit-Ready Signal

(sync 커밋 시 기록 — manager-docs 소관)
