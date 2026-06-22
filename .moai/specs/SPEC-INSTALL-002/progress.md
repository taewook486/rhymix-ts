# SPEC-INSTALL-002 — Progress

**날짜**: 2026-06-22 (plan 단계 작성, 구현 미착수)
**방법론**: 미정 (`/moai run` 시 quality.yaml `development_mode`에 따름 — TDD 권장)
**베이스라인**: SPEC-INSTALL-001 완료 시점 (859/868 tests passing)
**선행 SPEC**: SPEC-INSTALL-001 (REQ-INSTALL-001~018 구현 완료)
**근거 보고서**: `.moai/reports/install-gap-comparison/REPORT-2026-06-22.md` (3건 확정 버그)

---

## 상태 개요

| 그룹 | 버그 | REQ | 우선순위 | 상태 |
|------|------|-----|----------|------|
| 1 | 공개 헤더 세션 미반영 | REQ-INSTALL2-001~005 | Critical | 미착수 |
| 2 | 설치 완료 후 자동 로그인 누락 | REQ-INSTALL2-010~013 | Major | 미착수 |
| 3 | `/install/complete` 안내 문구 불일치 | REQ-INSTALL2-020~022 | Major | 미착수 |

---

## REQ 매핑 (구현 추적용)

| REQ | 설명 | 대상 파일(예상) | 상태 |
|-----|------|------------------|------|
| REQ-INSTALL2-001 | 인증 시 헤더에 닉네임 노출 | `apps/web/components/layout/GlobalHeader.tsx` | 미착수 |
| REQ-INSTALL2-002 | 미인증 시 "로그인" 링크 유지 | `apps/web/components/layout/GlobalHeader.tsx` | 미착수 |
| REQ-INSTALL2-003 | 헤더 로그아웃 affordance → signOut | `GlobalHeader.tsx` + 로그아웃 action | 미착수 |
| REQ-INSTALL2-004 | public/admin 헤더 인증 상태 일관성 | `GlobalHeader.tsx`, `app/admin/layout.tsx` | 미착수 |
| REQ-INSTALL2-005 | 미인증 경로 세션 필드 미노출 | `GlobalHeader.tsx` | 미착수 |
| REQ-INSTALL2-010 | 설치 성공 후 admin 세션 발급 | `apps/web/app/install/actions.ts` (`performInstall`) | 미착수 |
| REQ-INSTALL2-011 | 재입력 없이 인증 상태로 완료 화면 진입 | `actions.ts`, `install/complete/page.tsx` | 미착수 |
| REQ-INSTALL2-012 | 비밀번호 평문 미노출 + lock 정합 유지 | `actions.ts` | 미착수 |
| REQ-INSTALL2-013 | 세션 발급 실패 시 graceful (install 유지) | `actions.ts` | 미착수 |
| REQ-INSTALL2-020 | 완료 문구가 시드 상태 정확 반영 | `apps/web/app/install/complete/page.tsx` | 미착수 |
| REQ-INSTALL2-021 | 커스터마이징 방향 안내 | `install/complete/page.tsx` | 미착수 |
| REQ-INSTALL2-022 | "첫 모듈 생성" 문구 제거 | `install/complete/page.tsx` | 미착수 |

---

## 수락 기준 추적

| AC | REQ | 상태 |
|----|-----|------|
| AC-INSTALL2-001 | 001, 004 | 대기 |
| AC-INSTALL2-002 | 002, 005 | 대기 |
| AC-INSTALL2-003 | 004 | 대기 |
| AC-INSTALL2-004 | 003 | 대기 |
| AC-INSTALL2-005 | 010, 011 | 대기 |
| AC-INSTALL2-006 | 013 | 대기 |
| AC-INSTALL2-007 | 012 | 대기 |
| AC-INSTALL2-008 | 020, 021, 022 | 대기 |

---

## ANALYZE Phase

(미착수 — `/moai run` 시 기록)

### Baseline

(미측정)

### 발견된 주요 누락 사항

(plan 단계 사전 조사는 spec.md "Background — 근본 원인 사전 분석" 참조)

---

## PRESERVE Phase

(미착수)

- 회귀 방지 대상: 기존 install / auth / notification 테스트 (SPEC-INSTALL-001, SPEC-AUTH-001, SPEC-NOTIFICATION-001)
- `GlobalHeader`의 `NotificationBell` 동작 보존 검증 필요

---

## IMPROVE Phase

### 완료된 작업

(추적 중 — 미착수)

### 진행 중인 작업

(추적 중 — 미착수)

---

## 테스트 결과

(미착수 — 구현 완료 후 기록)

---

## 재계획 게이트 추적

| 반복 | 충족 AC 수 | 에러 delta | 비고 |
|------|-----------|-----------|------|
| (초기) | 0 / 8 | — | plan 단계 |
