---
id: SPEC-ADMIN-002
title: 관리자 패널 미구현 기능 완성 — Implementation Plan
version: 1.1.0
status: planned
created: 2026-06-14
updated: 2026-06-18
author: MoAI manager-spec
language: ko
---

# SPEC-ADMIN-002 — Implementation Plan

## 1. 기술 접근 (Technical Approach)

### 1.1 공통 패턴

모든 신규 admin 화면은 SPEC-ADMIN-001이 확립한 기존 패턴을 따른다. 새로운 인프라를 발명하지 않는다.

- **인증/인가**: 모든 라우트는 기존 `requireAdmin` 가드를 통과하며 AdminLog 미들웨어로 변경 행위를 기록한다.
- **데이터 접근**: tRPC 라우터 + Server Action 혼합. 읽기 위주 목록은 RSC에서 직접 Prisma 조회, 변경은 tRPC mutation 또는 Server Action.
- **설정 저장소**: 사이트 단위 설정은 기존 사이트 설정 저장 메커니즘(SPEC-ADMIN-001의 Site/Config 모델)을 재사용한다. 신규 설정 키만 추가하며 새 테이블은 꼭 필요한 경우(닉네임 로그, 설문, 스팸필터 규칙)에만 도입한다.
- **UI**: shadcn/ui + Tailwind 4. 설정 화면은 탭 레이아웃, 목록 화면은 필터 바 + 일괄선택 테이블 패턴을 표준화한다.
- **차트**: 대시보드/통계는 경량 차트 컴포넌트(클라이언트)로 렌더링하고 데이터는 서버 집계 결과만 전달한다.

### 1.2 도메인별 재사용 매핑

| 섹션 | 재사용할 기존 SPEC 자산 |
|---|---|
| 대시보드 | SPEC-DOCUMENT-001 / SPEC-COMMENT-001 조회, Counter 신규 집계 |
| 레이아웃/페이지 | SPEC-LAYOUT-001 ThemeAssignment, SPEC-PAGE-001 mcontent 에디터, SPEC-WIDGET-001 token parser |
| 회원 설정 | SPEC-AUTH-001 hasher / extra_vars / group 모델 |
| 문서/댓글 관리 | SPEC-DOCUMENT-001 / SPEC-COMMENT-001 서비스, cascade 규칙 |
| 파일 관리 | SPEC-FILE-001 cascade-delete + 참조 추적 |
| 알림 설정 | SPEC-MAIL-001 SmtpMailDispatcher |
| 보안 IP / 스팸 IP | SPEC-ADMIN-EXTRAS-001 IP/CIDR matcher |
| 포인트(다운로드 차감) | SPEC-POINT-001 트랜잭션 통합 |

### 1.3 신규 데이터 모델(최소화)

새 테이블 도입은 다음으로 제한한다.

- `NicknameChangeLog` — REQ-ADMIN2-056/057
- `Poll` / `PollOption` / `PollVote` — REQ-ADMIN2-083~086
- `SpamDeniedWord` / `SpamRule` (IP 규칙은 기존 IP 필터 자산 재사용 검토) — REQ-ADMIN2-120~123
- `VisitCounter` (일별 집계 테이블) — REQ-ADMIN2-140~142
- 약관 버전 — REQ-ADMIN2-050/051 (설정 키 + 버전 메타)

그 외 설정(가입/로그인/기능/SEO/고급/알림/보안)은 사이트 설정 JSON 키 확장으로 처리한다.

v1.1.0 신규 REQ-ADMIN2-150~156은 신규 테이블을 도입하지 않는다.

- REQ-ADMIN2-150(관리자 메뉴 초기화)/151(세션 정리): 기존 캐시 무효화 경로와 Session 저장소 대상 정리 작업 — 신규 모델 없음. AdminLog 기록.
- REQ-ADMIN2-152(회원 목록 상태 필터): 기존 Member 상태 컬럼 기반 쿼리 필터 — 모델 변경 없음.
- REQ-ADMIN2-153(문서 "임시" 필터): SPEC-DOCUMENT-001 `document.status` 기반 필터 — 모델 변경 없음.
- REQ-ADMIN2-154(비동기 작업): 기존 메일 큐/백그라운드 작업 저장소 상태 조회 — `REQ-ADMIN2-112`(이메일 큐)와 동일 인프라 재사용.
- REQ-ADMIN2-155(사이트 잠금 런타임 UI): SPEC-ADMIN-EXTRAS-001 Sitelock 자산의 설정 키를 런타임 토글로 노출 — 신규 모델 없음.
- REQ-ADMIN2-156(태그 구분 방법): 태그 설정 JSON 키 확장 — 신규 모델 없음.

## 2. 마일스톤 (우선순위 기반, 시간 추정 없음)

- **M1 (Phase 1 / P1)**: Slice 1A~1F — 대시보드 위젯, 페이지 편집, 회원 그룹·직접등록, 회원 설정 핵심 탭, 전체 문서/댓글 관리, 알림·보안 설정.
- **M2 (Phase 2 / P2)**: Slice 2A~2H — 레이아웃 관리, 파일 관리, 신고 관리 + 회원 디자인 설정(053) + 회원 목록 상태 필터(152) + 문서 "임시" 필터(153), SEO·고급·큐 + 비동기 작업(154) + 사이트 잠금 런타임 UI(155), 스팸필터, 통계·도메인·모듈상세, IP 제어·테스트 메일, admin 전역 유틸리티(150 메뉴 초기화·151 세션 정리).
- **M3 (Phase 3 / P3)**: Slice 3A~3F — 설문, 태그·별칭·닉네임 이력, 회원 부가 설정, 레이아웃 미리보기/복사, 디버그/캡챠/기타, 쪽지·서버환경·모듈 카테고리·코어정리.

진입 조건: M2는 M1의 P1 acceptance 통과 후, M3는 M2의 P2 acceptance 통과 후 시작.

## 3. 구현 방법론

quality.yaml의 `development_mode`에 따른다. 기존 도메인(문서/댓글/파일/포인트/메일/레이아웃)에 의존하는 brownfield 작업이므로 각 Slice는 SPEC 의존 자산의 기존 동작을 보존하며 확장한다.

## 4. 위험 (Risks)

| 위험 | 영향 | 완화 |
|---|---|---|
| 통계 카운팅이 페이지 렌더를 지연 | 사용자 체감 성능 저하 | 비차단 집계 경로(REQ-ADMIN2-141), expert-performance 검토 |
| 일괄 삭제(문서/댓글/파일)의 cascade 누락 | 고아 데이터/깨진 참조 | SPEC-DOCUMENT/COMMENT/FILE cascade 규칙 재사용, 트랜잭션 |
| 보안 설정 오입력으로 인증 우회 | 보안 사고 | REQ-ADMIN2-114 범위 검증, expert-security 검토 |
| PII/시크릿 노출(통계 IP, 서버환경) | 개인정보·보안 위반 | 해시/마스킹(REQ-ADMIN2-142/145) |
| SPEC 규모 과대 → 단일 PR 비대 | 리뷰/회귀 위험 | Slice 단위 PR 분리, "준비중" 제거를 완료 신호로 |
| 약관 버전 변경 시 기존 동의 처리 | 법적 모호성 | Open Question Q2로 분리, 정책 확정 후 구현 |
| 세션 정리(151)가 현재 관리자 세션을 종료 | 운영자 강제 로그아웃 | REQ-ADMIN2-151 — 만료 세션만 대상, 현재 활성 세션 보존, 배치 경계 처리 |
| 사이트 잠금 런타임 토글(155)로 운영자 자기 자신 차단 | 관리 화면 접근 불가 | 잠금 활성화 시 현재 관리자 IP를 허용 목록에 자동 포함 또는 경고 |

## 5. @MX 태그 대상

- 일괄 처리 트랜잭션(문서/댓글/파일 삭제·이동) → `@MX:ANCHOR` (cascade 계약, 다수 호출)
- 비차단 통계 카운팅 경로 → `@MX:WARN` (+ `@MX:REASON`: 페이지 렌더 비차단 필수)
- 보안 설정 검증 → `@MX:ANCHOR` (인증 우회 방지 invariant)
- 시크릿 마스킹(서버환경/통계 IP) → `@MX:WARN`
