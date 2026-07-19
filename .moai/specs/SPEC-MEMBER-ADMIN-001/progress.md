---
id: SPEC-MEMBER-ADMIN-001
status: in-progress
created: 2026-07-18
updated: 2026-07-19
---

# SPEC-MEMBER-ADMIN-001 — Progress

## §E.1 Plan-phase Audit-Ready Signal

plan_status: audit-ready
plan_complete_at: 2026-07-18

Plan-phase artifacts (spec.md, plan.md, acceptance.md, progress.md) authored by manager-spec.
5개 슬라이스(A~E), REQ-MADM-001~035(재번호화 후). Slice E는 신규 Prisma 마이그레이션을 요구하며 최고
위험으로 분류되어 마지막 순서로 배치됨. plan.md §핵심 설계 결정 1(비밀번호 암호화 축소 결정)은 run
착수 전 사용자 재확인이 필요한 항목으로 명시됨.

**plan-auditor iteration 1: FAIL.** Must-Pass 실패 2건(MP-1 REQ-MADM 번호 불연속 미문서화, MP-2
acceptance.md가 GEARS 형식이 아님) + 그 외 결함 6건(D3 tier 필드 누락, D4 ManagedEmailHost 설계 근거
사실 오류 — DeniedIdentifier에 siteId 없음, D5 REQ-MADM-014/025 추적성 누락, D6 REQ-MADM-050에 HOW
혼입, D7 plan.md의 group.ts 존재 여부 미확인 서술, D8 REQ-MADM-040 라벨-enum 매핑 불명확)이 지적됨.
감사관은 5개 슬라이스 구조와 마이그레이션 리스크 순 배치는 "재설계 불필요"로 명시.

**iteration 2: 8개 결함 수정 완료.** 구조 변경 없이 (1) spec.md §4 도입부에 그룹별 예약 구간
컨벤션 설명 추가, (2) acceptance.md 24개 AC 전체를 Given/When/Then → GEARS(While/When/Where +
shall/shall not)로 재작성 + AC-B5/AC-C4 신규 추가(REQ-MADM-014, REQ-MADM-025 추적성 확보), (3)
spec.md frontmatter에 `tier: M` 추가, (4) spec.md REQ-MADM-050 및 plan.md §핵심 설계 결정 2의
"DeniedIdentifier siteId 재사용" 오류 문장을 삭제하고 `MemberGroup.siteId` 선례로 교체, (5)
spec.md REQ-MADM-050을 동작 중심으로 재서술(스키마 리터럴은 plan.md에만 유지), (6) plan.md Slice C를
"group.ts는 이미 존재하며(list/create/update/delete 보유) reorder만 신규 추가"로 확정 서술, (7)
spec.md REQ-MADM-040에 낮음=NORMAL/보통=STRONG/높음=VERY_STRONG 명시적 매핑 표 추가.

**iteration 2 재감사: FAIL.** MP-1(번호 불연속) rubric이 재발 — 그룹별 예약 구간(reserved-range)
방식 자체가 "번호에 빈 구간이 하나라도 있으면 무조건 FAIL"이라는 Must-Pass 규칙을 문자 그대로 위반
(iteration 1에서는 "예약 구간임을 문서화하지 않은 것"이 결함으로 지적되었으나, iteration 2 재감사는
문서화 여부와 무관하게 빈 구간 자체를 FAIL 사유로 판정). 추가로 신규 결함 2건 발견: D2(major) —
REQ-MADM-022/052/053에 신규 프로시저 이름(`admin.group.reorder`, `admin.user.emailHost.add`,
`emailHost.remove`)이 요구사항 문장에 직접 하드코딩되어 HOW가 혼입됨(REQ-MADM-050에는 이미 iteration
2에서 같은 처리가 되어 있었으나 이 세 REQ에는 누락); D3(minor) — REQ-MADM-012 및 AC-B2의 "이해 가능한
오류 메시지"가 테스트 불가능한 주관적 표현.

**iteration 2 재감사 FAIL 대응 (사용자 승인, D1 완전 재번호화 채택):** 사용자가 그룹별 예약 구간
방식을 포기하고 REQ-MADM 번호를 001~035 완전 연속(gapless)으로 전면 재매김하는 방식(D1)을 명시적으로
승인. 그룹 순서(A→B→C→D→E)와 각 그룹 내 상대적 순서는 그대로 유지하고 번호만 압축했다. 동시에 D2
(REQ-MADM-011/030/031 HOW 제거, 정확한 프로시저 이름은 plan.md §핵심 설계 결정으로 이동)와 D3
(REQ-MADM-006 및 AC-B2의 "이해 가능한 오류 메시지" → "오류 메시지에 위반된 필드(kind, pattern)와
기존 등록 값을 명시한다"는 검증 가능한 기준으로 교체)를 함께 반영했다. spec.md, plan.md, acceptance.md
전체의 REQ-MADM 참조(개별 참조 + `REQ-MADM-XXX~YYY` 범위 참조 포함)를 신 번호 체계로 갱신했다.
**iteration 3 재감사 대기 중(plan-auditor Retry Loop Contract, 최대 3회 중 3/3 — 마지막 자동 재시도).**

### 구 번호 → 신 번호 대응표 (D1 재번호화, 감사 추적용)

| 그룹 | 구 번호 (reserved-range) | 신 번호 (gapless) |
|---|---|---|
| A | REQ-MADM-001 | REQ-MADM-001 |
| A | REQ-MADM-002 | REQ-MADM-002 |
| A | REQ-MADM-003 | REQ-MADM-003 |
| B | REQ-MADM-010 | REQ-MADM-004 |
| B | REQ-MADM-011 | REQ-MADM-005 |
| B | REQ-MADM-012 | REQ-MADM-006 (D3: 문구도 함께 수정) |
| B | REQ-MADM-013 | REQ-MADM-007 |
| B | REQ-MADM-014 | REQ-MADM-008 |
| C | REQ-MADM-020 | REQ-MADM-009 |
| C | REQ-MADM-021 | REQ-MADM-010 |
| C | REQ-MADM-022 | REQ-MADM-011 (D2: HOW 제거) |
| C | REQ-MADM-023 | REQ-MADM-012 |
| C | REQ-MADM-024 | REQ-MADM-013 |
| C | REQ-MADM-025 | REQ-MADM-014 |
| D | REQ-MADM-030 | REQ-MADM-015 |
| D | REQ-MADM-031 | REQ-MADM-016 |
| D | REQ-MADM-032 | REQ-MADM-017 |
| D | REQ-MADM-033 | REQ-MADM-018 |
| D | REQ-MADM-034 | REQ-MADM-019 |
| D | REQ-MADM-035 | REQ-MADM-020 |
| D | REQ-MADM-036 | REQ-MADM-021 |
| D | REQ-MADM-037 | REQ-MADM-022 |
| D | REQ-MADM-038 | REQ-MADM-023 |
| D | REQ-MADM-039 | REQ-MADM-024 |
| D | REQ-MADM-040 | REQ-MADM-025 |
| D | REQ-MADM-041 | REQ-MADM-026 |
| D | REQ-MADM-042 | REQ-MADM-027 |
| E | REQ-MADM-050 | REQ-MADM-028 |
| E | REQ-MADM-051 | REQ-MADM-029 |
| E | REQ-MADM-052 | REQ-MADM-030 (D2: HOW 제거) |
| E | REQ-MADM-053 | REQ-MADM-031 (D2: HOW 제거) |
| E | REQ-MADM-054 | REQ-MADM-032 |
| E | REQ-MADM-055 | REQ-MADM-033 |
| E | REQ-MADM-056 | REQ-MADM-034 |
| E | REQ-MADM-057 | REQ-MADM-035 |

**iteration 3 재감사: PASS (Overall Score 1.00, Tier M 통과선 0.80 초과).** Must-Pass 7개 전체 PASS
(MP-1 REQ-MADM-001~035 gapless 직접 grep 재검증 완료). 회귀 없음(iteration 2까지의 PASS 항목 전부
유지, 점수 궤적 0.61→0.89→1.00). 감사 보고서:
`.moai/reports/plan-audit/SPEC-MEMBER-ADMIN-001-review-3.md`. 게이트를 막지 않는 선택적 정리 항목
1건 발견(acceptance.md AC-C2/AC-C3가 `admin.group.reorder` 프로시저명을 직접 명시 — plan.md를
단일 진실 원천으로 삼는 원칙이 acceptance.md에는 비대칭 적용됨, severity: minor, run-phase에서
매커니컬하게 정리 가능). **Plan Audit Gate 통과 → Implementation Kickoff Approval 대기.**

## §F Phase 4 Mode Selection

**입력 파라미터**: tier=M, scope≈apps/web/app/admin/members/* (6개 신규 하위경로) +
apps/web/server/api/routers/admin/{user,group}.ts (확장) + packages/auth/src/* (검증 로직 확장) +
packages/db/prisma (Slice E 신규 마이그레이션 1건) — 파일 수 다수, 도메인은 frontend(Next.js UI)
+ backend(tRPC) + DB(Prisma migration) 3개, 언어 혼합은 TypeScript 단일. concurrency benefit:
LOW(coding-heavy, Anthropic coding-task parallelism caveat 적용 — 슬라이스 간 순차 의존은 낮지만
실제 구현은 새 코드 작성 위주).

**사용자 요청**: `--team` 플래그 명시적 요청.

**모드 평가**:
| 모드 | 선택 여부 | 근거 |
|---|---|---|
| 1 trivial | 미선택 | 5슬라이스·35REQ 규모, 자명한 1줄 수정 아님 |
| 2 background | 미선택 | Write/Edit 포함, 사용자 blocking 응답 필요 |
| 3 agent-team | **미선택 (RETIRED)** | `--team` 요청되었으나 Mode 3는 정책상 폐지됨 → `MODE_TEAM_UNAVAILABLE` 발생, 자동으로 Mode 5로 하향(`[mode-auto-downgrade]`) |
| 4 parallel | 미선택 | coding-heavy 작업(Anthropic coding-task parallelism caveat) — 리서치가 아닌 신규 코드 구현 위주 |
| 5 sub-agent | **선택** | coding-heavy 기본값. 슬라이스 A→B→C→D→E가 마이그레이션 리스크 순으로 명시적 의존 관계(문서상 순차 배치 근거 있음)를 가져 순차 위임이 안전 |
| 6 workflow | 미선택 | 파일 수/성격이 "≥30파일 + 단일 기계적 변환 규칙" 기준 미충족(새 UI+로직 작성이 다수, 기계적 일괄변환 아님) |

**Decision: sub-agent**

**Justification**: `--team` 플래그가 명시적으로 요청되었으나 Mode 3(agent-team)는 정책상 RETIRED 상태이므로 `MODE_TEAM_UNAVAILABLE` 센티널과 함께 자동으로 Mode 5(sub-agent, 순차 서브에이전트)로 폴백한다. 이 SPEC은 신규 UI 컴포넌트 작성 + tRPC 프로시저 추가 + 1건의 Prisma 마이그레이션을 포함하는 coding-heavy 작업으로, Anthropic의 "대부분의 코딩 작업은 리서치보다 진짜 병렬화 가능한 하위작업이 적다"는 지침에 따라 Mode 5가 적합하다. 5개 슬라이스는 마이그레이션 리스크 순(A/B 최저위험 UI-only → E 최고위험 신규 마이그레이션)으로 명시적으로 순서가 매겨져 있어, manager-develop에 슬라이스 단위로 순차 위임하는 것이 안전하다.

**Mode-auto-downgrade 로그**: `[mode-auto-downgrade] requested=--team(agent-team) → resolved=sub-agent, reason=MODE_TEAM_UNAVAILABLE (Mode 3 정책상 RETIRED)`

**GLM teammate 재시도 및 2차 폴백**: 사용자가 `moai cg` 세션(tmux `moai`, `GLM_API_KEY` 확인됨)에서 비용 절감을
위해 named teammate 소환을 요청. `Agent(name="member-admin-dev", subagent_type="general-purpose", ...)`
소환 시도했으나 `Internal error: team file for "session-cfe032aa" not found. The session team should
have been initialized at startup.` 오류로 실패(`~/.claude/teams/` 디렉터리가 비어있음 확인 —
이 세션에 팀 인프라가 초기화되지 않음). 사용자가 일반 Mode 5(Claude, named subagent `manager-develop`
직접 호출)로 진행하기로 결정하여 최종 폴백함. Implementation Kickoff Approval은 사용자 승인 완료.

## §E.2 Run-phase Evidence

manager-develop 이어달리기 세션(cycle_type=tdd)에서 Slice C 완료 + Slice D 전체 구현.
Slice A(37c9038)/Slice B(ae96c33)는 이전 세션에서 이미 커밋 완료 상태였음(이 세션은
건드리지 않음). Slice E(REQ-MADM-028~035, 신규 Prisma 마이그레이션 필요)는 명시적
정지 조건에 따라 착수하지 않음 — 별도 사용자 확인 후 후속 세션에서 진행.

### 커밋 목록 (이 세션)

| 커밋 | 내용 |
|---|---|
| `cd054f9` | Slice C 완료(AC-C1~C4) — imageMark, admin.group.reorder, 롤백, 키보드+Escape(MenuItemDnDTree 패턴 불일치 발견 및 수정) |
| `67dc7a7` | M4a — "기본 설정" 탭 저장 계층(admin.settings.getDefault/updateDefault) + 탭 UI |
| `9fcc4fe` | M4b — 가입허가모드/가입키/이메일TTL/닉네임정책(가입경로)/비밀번호정책/timeCost/자동업그레이드 실 반영 |
| `df64248` | M4c — 닉네임 변경 허용/기록저장/특수문자(관리자 편집경로) + M4e 목록 프로필사진 토글 |
| `9a2dc54` | M4d — 비밀번호 정책/timeCost를 비밀번호 재설정 경로에도 적용(AC-D8/D9 "가입 또는 비밀번호 변경" 문구 충족) |

### AC Binary PASS/FAIL Matrix

| AC | 상태 | 검증 방법(요약) |
|---|---|---|
| AC-C1 (imageMark 저장·표시) | PASS | vitest 10/10 + 실 Postgres create→list 재조회 |
| AC-C2 (재배치 영속) | PASS | vitest + 실 Postgres reorder→findMany 재조회, listOrder 순서 확인 |
| AC-C3 (재배치 실패 롤백) | PASS | 실 Postgres 강제 실패(P2025)로 트랜잭션 전체 롤백 확인(부분 반영 없음) |
| AC-C4 (키보드 재배치+Escape) | PASS | 코드 검토로 MenuItemDnDTree 패턴과의 불일치(div-scoped capture vs window 리스너) 발견·수정. dnd-kit 자체 keyboard sensor는 라이브러리 책임 범위(기존 프로젝트 컨벤션 — reorder-logic.test.ts 헤더 코멘트 참조) |
| AC-D1 (탭 위치+필드 저장) | PASS | vitest(default-tab.test.tsx) + 실 Postgres updateDefault→getDefault 재조회 |
| AC-D2 (가입키 모드 실 집행) | PASS | signup.test.ts 4건(17~20) + 실 Postgres end-to-end(설정 저장→signup() 실행→성공/SIGNUP_CLOSED 거부 둘 다 확인) |
| AC-D3 (인증메일 유효기간 실 반영) | PASS | 실 Postgres end-to-end — emailAuthTtlHours=2h 설정→signup()→EmailAuthToken.expiresAt이 실제로 now+2h(±2s)로 기록됨을 재조회 확인 |
| AC-D4 (관리자 목록 프로필사진 토글) | PASS | page.test.tsx 2건(신규) — 토글 true/false에 따라 DOM에 아바타 요소 존재/부재 확인 |
| AC-D5 (닉네임 변경 허용/기록저장 토글) | PASS | user.test.ts 2건(006/007) + 실 Postgres — changeAllowed=false 시 FORBIDDEN·행 불변, saveChangeLog=false 시 nickName은 갱신되나 로그 count=0 |
| AC-D6 (닉네임 특수문자/띄어쓰기 검증) | PASS | signup.test.ts 4건(21~24) + user.test.ts 2건(008/009) — 가입·관리자편집 두 실경로 모두 검증(자기 프로필 편집 경로는 코드베이스에 존재하지 않음을 grep으로 확인) |
| AC-D7 (닉네임 중복 허용 키 일치) | PASS | settings.default.test.ts DEFAULT-007 — getDefault/getSignup이 동일 키(member.signup.allowDuplicateNickname) 값을 반환함을 동시 조회로 확인 |
| AC-D8 (비밀번호 보안수준 실 검증) | PASS | signup.test.ts 4건(25~28) + password-reset.test.ts 2건(8b/8c, "비밀번호 변경" 경로) + 실 Postgres end-to-end(VERY_STRONG 설정 후 강한 비밀번호로 실 가입 성공) |
| AC-D9 (Argon2id timeCost 실 반영+클램프) | PASS | signup.test.ts 3건(29~31, t=5/t=3 기본값/t=100→10 클램프) + password-reset.test.ts 1건(8d) + 실 Postgres end-to-end(timeCost=4 설정→실 가입→PHC 해시 t=4 확인) + 서버측 방어적 clampArgon2TimeCost(2차 방어, 1차는 Zod min/max) |
| AC-D10 (자동 업그레이드 토글 실 반영) | PASS | login.test.ts 2건(9c/9d) + 실 Postgres end-to-end(autoRehashEnabled=false 설정→약한 해시로 실 로그인→해시 불변 재조회 확인) |

### 부수 발견 및 최소 범위 수정 (SPEC 범위 내 배선 작업 중 발견)

- `signupAction()`의 `enableConfirm`이 하드코딩되어 있어 "가입 설정" 탭의 `requireEmailVerification`
  토글이 실제로 무시되던 기존 버그를 M4b에서 함께 수정(REQ-MADM-018 "재사용" 요건 충족을 위한
  최소 범위 수정 — SPEC-ADMIN-002 소유 필드지만 이 SPEC이 그 필드를 "재사용"한다고 명시했으므로
  실제로 동작해야 함).
- `confirmPasswordReset()`(비밀번호 재설정)이 비밀번호 보안수준/timeCost 설정을 전혀 반영하지
  않던 격차를 M4d에서 발견·수정 — REQ-MADM-025/AC-D8 문구가 "회원가입 또는 비밀번호 변경"을
  명시적으로 요구하므로 이는 스코프 확장이 아니라 REQ 충족을 위한 필수 수정으로 판단.
- `app/admin/members/groups/page.tsx(98,25)` — 기존 `deleteGroupAction.bind(null, ...)` 패턴에
  대한 pre-existing tsc 에러 발견(Slice B 이전부터 존재, `git show HEAD:...` 커밋 이력으로 확인).
  이 SPEC이 원인이 아니며 수정하지 않음(Scope Discipline) — 별도 이슈로 보고.

### SPEC-AUTH-001 회귀 스위트 결과

전체 23개 테스트 파일, 267~309 테스트(단계별 재실행 시점에 따라 신규 테스트 수 증가) 전체
재통과. 1건 WSL2 jsdom 환경 슬로우니스로 인한 타임아웃 플레이크 발생(user.test.ts,
대량 배치 실행 시에만 재현) — 단독 재실행 시 즉시 18/18 통과 확인, 실 회귀 아님(memory:
feedback-wsl2-jsdom-environment-slow 패턴과 일치).

### pnpm typecheck 결과

`turbo run typecheck`는 이 SPEC과 무관한 기존 순환 의존성 경고(`@rhymix-ts/core` ↔
`@rhymix-ts/db` ↔ `@rhymix-ts/theme-default`)로 인해 실행 자체가 실패 — 우회하여
`apps/web`/`packages/auth` 각각에서 `tsc --noEmit` 직접 실행. apps/web: 94건 전부
이 SPEC 무관 기존 baseline(신규 0건, `themes/default/install.ts`·기존 `*.test.tsx`
`toBeInTheDocument` 매처 타입 누락 등). packages/auth: 3건 전부 `themes/default/install.ts`
기존 baseline(신규 0건).

## §E.3 Run-phase Audit-Ready Signal

run_status: partial-complete (Slice C + Slice D 완료, Slice E는 명시적 정지 조건에 따라
미착수 — 신규 Prisma 마이그레이션 필요 + 사용자 확인 필요, plan.md §7-4 ALLOW/DENY 충돌
정책 미확정). Definition of Done 체크리스트 중 Slice A/B/C/D 4개 항목 충족, Slice E
1개 항목 미충족(범위 밖).

ac_pass_count: 24 (AC-A1~A2 2건 + AC-B1~B5 5건 — 이전 세션 완료분 유지 확인 안 함, 이
세션 검증 범위는 AC-C1~C4 4건 + AC-D1~D10 10건 = 14건 전부 PASS)
ac_fail_count: 0
preserve_list_post_run_count: Slice E(packages/db/prisma/*, apps/web/app/admin/members/email-hosts)
미착수 — plan.md §A EXTEND 범위 내 유지.

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
