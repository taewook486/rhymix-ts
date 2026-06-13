# Rhymix-TS 제품 문서

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | Rhymix-TS |
| 라이선스 | GPL-2.0-or-later |
| 설명 | PHP 기반 Rhymix CMS를 TypeScript + Next.js 16 풀스택으로 재설계한 프로젝트 |
| 목적 | PHP Rhymix CMS → TypeScript/Next.js 16 마이그레이션 (엔드투엔드 타입 안전성 확보) |
| 대상 사용자 | CMS 관리자 및 일반 사용자 (블로그, 포럼, 문서 관리) |

## 핵심 가치 제안

1. **타입 안전 CMS** — tRPC를 통한 엔드투엔드 TypeScript 적용으로 런타임 API 오류 제거
2. **모던 스택** — Next.js 16 App Router + React 19 Server Components 기반의 현대적 아키텍처
3. **확장성** — 명확한 도메인 경계를 갖는 모듈형 패키지 아키텍처
4. **멀티 도메인 지원** — 다중 사이트/도메인 운영 기능 기본 내장
5. **콘텐츠 중심** — 게시판·문서·댓글 전체 CRUD 운영 지원

## 구현된 기능

### Phase 1 — 가시적 UI 기반

| SPEC | 기능 | 테스트 |
|------|------|--------|
| SPEC-INSTALL-001 | 4단계 설치 마법사 | 164 단위 + 7 E2E |
| SPEC-LAYOUT-001 | 레이아웃 시스템 + 기본 테마 레지스트리 | — |
| SPEC-PAGE-001 | 페이지 모듈 (ModuleInstance + 위젯 토큰) | — |
| SPEC-WIDGET-001 | 위젯 시스템 (토큰 파서 + 내장 위젯 2종 + 관리자 UI) | — |

### Phase 2 — 콘텐츠 도메인

| SPEC | 기능 | 테스트 |
|------|------|--------|
| SPEC-DOCUMENT-001 | @rhymix-ts/document 패키지 | 201 |
| SPEC-COMMENT-001 | @rhymix-ts/comment (독립 엔티티 시스템) | — |
| SPEC-BOARD-CRUD-001 | 게시판 래퍼 (document + comment) 전체 CRUD UI | — |

### Phase 3 — 회원 에코시스템

| SPEC | 기능 | 테스트 |
|------|------|--------|
| SPEC-AUTH-001 | Auth.js v5 + 회원가입/로그인/이메일 인증 + RBAC + Rate Limiting | 508 |
| SPEC-ADMIN-001 | 관리자 대시보드 + 모듈 인스턴스 + 멀티 도메인 | 533 |
| SPEC-FILE-001 | S3 + Sharp + ClamAV + 연쇄 삭제 | 96 |
| SPEC-POINT-001 | @rhymix-ts/point 독립 패키지 | 24 |
| SPEC-THEME-001 | 테마/레이아웃/스킨 레지스트리 + 다크 모드 + 디자인 토큰 | 946 |

## 계획된 기능

| SPEC | 기능 |
|------|------|
| SPEC-ADDON-001 | 선언형 훅 시스템 |
| SPEC-THEME-POLISH-001 | 관리자 3분할 에디터 |
| SPEC-ADMIN-EXTRAS-001 | 내보내기/가져오기, 2FA, IP 필터링, 일괄 처리 |
| SPEC-MAIL-001 | SmtpMailDispatcher (템플릿 + 재시도 기능) |

## 품질 지표

| 지표 | 현황 |
|------|------|
| 단위 테스트 | 2,651개 |
| E2E 테스트 | 7개 |
| 커버리지 목표 | 85% |
| 개발 방법론 | TDD (테스트 주도 개발) |
| 품질 프레임워크 | TRUST-5 (Tested / Readable / Unified / Secured / Trackable) |
