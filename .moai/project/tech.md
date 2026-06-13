# Rhymix-TS 기술 스택

## 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.0.0 | App Router, RSC, Server Actions |
| React | 19.0.0 | Server Components |
| TypeScript | 5.9.3+ | strict 모드 전체 적용 |
| Tailwind CSS | 4.0.0 | 유틸리티 기반 스타일링 |
| shadcn/ui | — | Radix UI 프리미티브 기반 컴포넌트 |
| tRPC | 11.0.0 | 타입 안전 RPC |
| TanStack Query | 5.62.0 | 서버 상태 관리 |
| Tiptap | 3.23.6 | 리치 텍스트 에디터 |
| next-intl | 3.26.0 | 국제화(i18n) |
| next-themes | 0.4.4 | 다크 모드 지원 |

## 백엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 22.0.0+ | 런타임 환경 |
| Prisma | 6+ | ORM, PostgreSQL 스키마 관리 |
| PostgreSQL | 16+ | 기본 데이터베이스 (citext, pgcrypto 확장) |
| Auth.js | v5 beta.25 | 인증 (Credentials provider) |
| hash-wasm | 4.12.0 | Argon2id 비밀번호 해싱 |
| AWS S3 SDK | 3.700.0 | 파일 스토리지 |
| sharp | 0.33.5 | 이미지 처리/리사이징 |
| iron-session | 8.0.4 | 암호화 쿠키 세션 |
| Zod | 3.24.0 | 런타임 스키마 검증 |
| jose | 5.9.6 | JWT 처리 |
| clamscan | 2.4.0 | 파일 안티바이러스 (ClamAV 연동) |
| nodemailer | — | 이메일 발송 (SPEC-MAIL-001 예정) |

## 빌드 및 테스트

| 기술 | 버전 | 용도 |
|------|------|------|
| pnpm | 9.15.0+ | 모노레포 패키지 매니저 |
| Turborepo | 2.3.0 | 캐시 인식 빌드 오케스트레이션 |
| Vitest | 2.1.9 | 단위/통합 테스트 |
| @vitest/coverage-v8 | — | V8 기반 커버리지 측정 |
| Playwright | 1.49.0 | E2E 테스트 |

## 핵심 아키텍처 결정 사항

### 1. TypeScript 전면 도입

**결정:** 프론트엔드·백엔드·DB 레이어 모두 TypeScript strict 모드 적용

**근거:** 컴파일 타임에 타입 오류를 포착하여 런타임 타입 오류를 제거한다. PHP 기반 Rhymix의 동적 타입 문제를 근본적으로 해결한다.

---

### 2. tRPC 채택

**결정:** REST API 대신 tRPC 11을 API 레이어로 사용

**근거:** 클라이언트↔서버 간 자동 타입 추론이 가능하여 별도 API 계약 파일(OpenAPI 등)이 불필요하다. 타입 불일치로 인한 런타임 오류를 컴파일 단계에서 차단한다.

---

### 3. Prisma 6 그린필드 설계

**결정:** 기존 Rhymix DB 구조를 그대로 이식하지 않고 PostgreSQL 우선 신규 설계

**근거:** 레거시 MySQL 스키마의 제약을 해소하고 JSONB, tsvector FTS, 트랜잭션 무결성 등 PostgreSQL 고급 기능을 적극 활용한다. Prisma 타입 안전 클라이언트로 쿼리 오류를 컴파일 타임에 포착한다.

---

### 4. Server Components + Actions

**결정:** React 19 Server Components와 Server Actions을 기본 렌더링/폼 처리 방식으로 채택

**근거:** 클라이언트 JavaScript 번들 크기를 줄이고, Server Actions의 CSRF 보호를 기본으로 제공받는다. 데이터 패칭 로직을 서버에 유지하여 보안 경계를 명확히 한다.

---

### 5. 모듈형 도메인 패키지

**결정:** `document`, `comment`, `board`, `file`, `point` 등 각 도메인을 독립된 pnpm 패키지로 분리

**근거:** 패키지별 독립 테스트가 가능하고 도메인 경계가 명확해진다. 특정 도메인의 변경이 다른 도메인에 미치는 영향을 의존성 그래프로 추적할 수 있다.

---

### 6. PostgreSQL 기능 활용

**결정:** JSONB, tsvector 전문 검색, 트랜잭션 무결성을 적극 활용

**근거:** 유연한 메타데이터 저장(JSONB), 별도 검색 엔진 없이 기본 제공되는 전문 검색(FTS), 복잡한 도메인 로직의 원자적 처리(트랜잭션)를 단일 데이터베이스로 처리한다.

---

### 7. pnpm + Turborepo

**결정:** npm/yarn 대신 pnpm 9를 사용하고 Turborepo로 빌드를 오케스트레이션

**근거:** pnpm의 링크 기반 node_modules로 디스크 사용량과 설치 시간을 절감한다. Turborepo의 원격 캐시로 변경되지 않은 패키지의 빌드/테스트를 재사용하여 CI 시간을 단축한다.

---

## 개발 방법론

| 항목 | 내용 |
|------|------|
| 개발 방법론 | TDD (테스트 주도 개발) — 구현 전 실패 테스트 먼저 작성 |
| 품질 프레임워크 | TRUST-5 (Tested / Readable / Unified / Secured / Trackable) |
| 커버리지 목표 | 85% 이상 |
| SPEC 방식 | EARS 형식 요구사항 → DDD 구현 → 문서화 동기화 |
