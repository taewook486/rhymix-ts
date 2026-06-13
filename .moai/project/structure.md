# Rhymix-TS 프로젝트 구조

## 모노레포 개요

pnpm 워크스페이스 + Turborepo 조합의 모노레포 구성으로, 캐시 인식 빌드 오케스트레이션을 제공한다.

## 디렉터리 레이아웃

```
rhymix-ts/
├── apps/
│   └── web/                  Next.js 16 애플리케이션 (SSR + API 레이어)
│       ├── app/              App Router 라우트 트리
│       ├── server/           tRPC 라우터 및 서버 로직
│       └── public/           정적 자산
├── packages/
│   ├── db/                   Prisma 6 스키마 + PostgreSQL 16 클라이언트
│   ├── auth/                 Auth.js v5 설정 + 회원 도메인 로직
│   ├── core/                 공유 타입, Zod 스키마, 설치 유틸리티
│   ├── ui/                   shadcn/ui 컴포넌트 + Tailwind CSS 4
│   ├── document/             문서 도메인 패키지
│   ├── comment/              댓글 도메인 패키지
│   ├── board/                게시판 래퍼 (document + comment 통합)
│   ├── file/                 파일 업로드 + 스토리지 추상화
│   ├── point/                포인트 시스템 도메인
│   └── page/                 위젯 지원 포함 페이지 모듈
└── themes/
    └── default/              기본 테마
```

## 패키지 의존성 그래프

```
@rhymix-ts/web
  ├── @rhymix-ts/auth
  │     └── @rhymix-ts/db
  ├── @rhymix-ts/board
  │     ├── @rhymix-ts/document ── @rhymix-ts/db
  │     │                      ├── @rhymix-ts/auth
  │     │                      ├── @rhymix-ts/core
  │     │                      └── @rhymix-ts/point ── @rhymix-ts/db
  │     ├── @rhymix-ts/comment ── @rhymix-ts/document
  │     │                     └── @rhymix-ts/auth
  │     ├── @rhymix-ts/file ── @rhymix-ts/db
  │     │                  └── @rhymix-ts/auth
  │     └── @rhymix-ts/core
  ├── @rhymix-ts/ui
  ├── @rhymix-ts/page
  └── @rhymix-ts/core
```

## 아키텍처 패턴

### DDD (도메인 주도 설계)

각 콘텐츠 도메인은 독립된 패키지로 분리된다. `document`, `comment`, `board`, `file`, `point` 패키지가 각각 고유한 도메인 경계를 가진다.

### tRPC 하이브리드

- 타입 안전 RPC로 클라이언트↔서버 자동 타입 추론
- 폼 처리는 Server Actions 사용 (CSRF 보호 내장)
- `api/trpc/[trpc]` 핸들러를 통해 HTTP 레이어 처리

### 서버 컴포넌트 + 액션

React 19 Server Components를 적극 활용하여 클라이언트 JavaScript를 최소화한다.

## 데이터 레이어 아키텍처

| 구성 요소 | 기술 | 역할 |
|-----------|------|------|
| ORM | Prisma 6 | 타입 안전 DB 클라이언트 생성 |
| 데이터베이스 | PostgreSQL 16 | JSONB, tsvector FTS, 트랜잭션 무결성 |
| 확장 | citext, pgcrypto | 대소문자 무관 텍스트, 암호화 지원 |
| 스키마 | `packages/db` | 단일 소스 Prisma 스키마 관리 |

## App Router 라우트 구조

```
app/
├── install/                  설치 마법사 (SPEC-INSTALL-001)
├── (auth)/                   로그인, 회원가입, 비밀번호 재설정
├── (member)/                 회원 프로필
├── [mid]/                    동적 모듈 인스턴스
├── admin/                    관리자 대시보드
├── api/
│   ├── trpc/[trpc]           tRPC 핸들러
│   ├── auth/[...nextauth]    Auth.js 라우트
│   └── files/                파일 업로드/다운로드
```

## 빌드 및 테스트 인프라

| 도구 | 역할 |
|------|------|
| pnpm 9.15.0+ | 모노레포 패키지 매니저 (빠른 설치, 링크 기반) |
| Turborepo 2.3.0 | 캐시 인식 빌드 오케스트레이션 |
| Vitest 2.1.9 | 단위/통합 테스트 러너 |
| @vitest/coverage-v8 | V8 기반 커버리지 리포팅 |
| Playwright 1.49.0 | E2E 테스트 |
| TypeScript strict mode | 컴파일 타임 타입 검증 |

## 주요 진입점 및 사용자 흐름

| 흐름 | 진입점 | 관련 패키지 |
|------|--------|------------|
| 신규 설치 | `/install` | core, db |
| 로그인/회원가입 | `/(auth)` | auth, db |
| 게시판 열람/작성 | `/[mid]` | board, document, comment, file |
| 파일 업로드 | `/api/files` | file (S3/Sharp/ClamAV) |
| 관리자 설정 | `/admin` | auth(RBAC), theme, page |
