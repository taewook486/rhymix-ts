# SPEC-FRONT-PARITY-001 — progress

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-08-12
- plan-audit: 2회 (1차 0.72 FAIL → 2차 0.83 PASS, v0.1.2)
- Implementation Kickoff Approval: 사용자 승인 완료(이전 세션) + 본 세션 재확인 예정

## §F Phase 4 Mode Selection

**입력 파라미터**
- tier: M
- scope: M1 기준 ~6개 파일 (themes/default/layouts/default.tsx, packages/board/src/routes/index-page.tsx,
  packages/board/src/routes/view-page.tsx, apps/web/components/layout/GlobalFooter.tsx,
  apps/web/components/layout/Footer.tsx, GlobalFooter.test.tsx + app/layout.test.tsx)
- domain count: 1 (frontend/apps-web 단일 도메인, 마크업 정리)
- 파일 언어 구성: 100% TypeScript/TSX
- concurrency benefit: LOW (수정 대상이 서로 의존하는 레이아웃/컴포넌트 트리 — coding-heavy)

**모드 평가**
| # | 모드 | 선택 여부 | 근거 |
|---|------|-----------|------|
| 1 | trivial | 미선택 | 다중 파일·의미 변경 있음 |
| 2 | background | 미선택 | Write 작업 포함 |
| 3 | agent-team | 미선택 | RETIRED |
| 4 | parallel | 미선택 | coding-heavy, 단일 도메인 — Anthropic coding-task 병렬성 주의사항 해당 |
| 5 | sub-agent | **선택** | 기본값. 레이아웃 트리 간 의존성이 있어 순차 진행이 안전 |
| 6 | workflow | 미선택 | 기계적 대량 변환 아님(파일 6개, 각기 다른 판단 필요) |

**Decision: sub-agent**

**근거**: M1은 푸터 소유권 통합(어느 컴포넌트가 살아남을지 근거 기반 판단 필요) + `<main>` 중첩 해소로,
파일 간 의존성이 있는 coding-heavy 작업이다. Anthropic의 "coding-task parallelism caveat"에 따라
Mode 5(순차 서브에이전트)가 기본값이며, 이 케이스에 적합하다.

## §E.2 Run-phase Evidence

(M1 착수 시 manager-develop이 기록)
