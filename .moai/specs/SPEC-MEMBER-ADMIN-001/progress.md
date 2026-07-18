---
id: SPEC-MEMBER-ADMIN-001
status: in-progress
created: 2026-07-18
updated: 2026-07-18
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

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
