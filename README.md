# Rhymix-TS

TypeScript + Next.js 16 redesign of the [Rhymix](https://github.com/rhymix/rhymix) CMS.

> Status: **SPEC-INSTALL-001 완료 (148 unit + 7 E2E) · SPEC-AUTH-001 Slice A/B/C 완료 (222 unit) · Slice D 진행 예정**.
> Reference instance running at `http://localhost:8080` (PHP, Docker).

## Architecture (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9+ |
| Database | PostgreSQL 16+ (citext, pg_trgm, JSONB, GIN, tsvector) |
| ORM | Prisma 6 |
| Auth | Auth.js v5 (Credentials) + Argon2id |
| API | tRPC 11 + Server Actions |
| UI | Tailwind CSS 4 + shadcn/ui |
| Testing | Vitest + Playwright |
| Monorepo | pnpm workspaces + Turborepo |

## Repository Layout

```
rhymix-ts/
├── apps/
│   └── web/                 Next.js 16 application (UI + API + middleware)
├── packages/
│   ├── db/                  Prisma schema + client
│   ├── auth/                Auth.js v5 configuration
│   ├── core/                Shared domain types + Zod schemas
│   └── ui/                  Shared UI primitives (cn helper today, more later)
├── .moai/specs/             SPEC documents (EARS format) — see INDEX.md
├── package.json             Root workspace
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## SPECs

The plan phase produced 5 SPEC documents — read these before implementing.

| SPEC | Priority | Subject |
|---|---|---|
| [SPEC-INSTALL-001](.moai/specs/SPEC-INSTALL-001/spec.md) | P0 | Initial 4-step install wizard, SiteLock, i18n |
| [SPEC-ADMIN-001](.moai/specs/SPEC-ADMIN-001/spec.md) | P0 | Admin dashboard, module instance system (mid), multi-domain |
| [SPEC-AUTH-001](.moai/specs/SPEC-AUTH-001/spec.md) | P0 | Auth, members, groups, 16 member tables in Postgres |
| [SPEC-CONTENT-001](.moai/specs/SPEC-CONTENT-001/spec.md) | P0 | Boards, documents, comments, attachments, FTS |
| [SPEC-THEME-001](.moai/specs/SPEC-THEME-001/spec.md) | P1 | Theme/layout/skin registry, dark mode |

Index: [.moai/specs/INDEX.md](.moai/specs/INDEX.md).

## Bootstrap

```bash
# 1. Enable pnpm via corepack (one-time)
corepack enable
corepack prepare pnpm@9.15.0 --activate

# 2. Install workspace deps
pnpm install

# 3. Configure environment
cp .env.example .env.local
# edit .env.local — set DATABASE_URL and NEXTAUTH_SECRET (`openssl rand -base64 32`)

# 4. Start a Postgres 16 instance (Docker example)
docker run --name rhymix-ts-db -p 5432:5432 \
  -e POSTGRES_USER=rhymix -e POSTGRES_PASSWORD=rhymix \
  -e POSTGRES_DB=rhymix_ts -d postgres:16

# 5. Generate Prisma client and apply schema
pnpm db:generate
pnpm db:push

# 6. Run the dev server
pnpm dev
# → http://localhost:3000 (will redirect to /install)
```

## Workspace Scripts

```bash
pnpm dev          # all packages in dev mode (parallel)
pnpm build        # production build via turbo
pnpm typecheck    # tsc --noEmit across all packages
pnpm lint         # next lint + per-package linters
pnpm test         # vitest suites (when added)
pnpm test:e2e     # playwright E2E (install wizard) — see "E2E 테스트 실행"
pnpm format       # prettier write
pnpm db:studio    # open Prisma Studio
```

### E2E 테스트 실행

설치 위저드 happy path / 재설치 차단 / SiteLock 503 시나리오를 Playwright로 검증합니다.

```bash
# 1회: 크로미움 브라우저 바이너리 다운로드 (~120MB)
pnpm exec playwright install chromium

# Postgres 컨테이너 가동 (이미 떠있으면 생략)
docker start rhymix-ts-db

# E2E 실행 — webServer가 pnpm dev를 자동 기동합니다.
pnpm test:e2e
```

매 테스트는 `apps/web/e2e/support/db-reset.ts`로 install 관련 테이블을 TRUNCATE 후 시작합니다 — 운영 DB로 절대 가리키지 마세요.

## Implementation Progress

| SPEC | 상태 | 테스트 | 비고 |
|---|---|---|---|
| SPEC-INSTALL-001 | 완료 | 148 unit + 7 E2E | 4단계 설치 위저드, SiteLock |
| SPEC-AUTH-001 | 진행 중 (Slice C/5) | 222 unit | 비밀번호·회원가입·로그인·이메일 인증 |
| SPEC-ADMIN-001 | 미착수 | — | foundation |
| SPEC-CONTENT-001 | 미착수 | — | 게시판/문서/댓글 |
| SPEC-THEME-001 | 미착수 | — | 테마/레이아웃/스킨 |

### SPEC-AUTH-001 Slice 현황

| Slice | 내용 | 상태 |
|---|---|---|
| A | Argon2id 비밀번호 모듈 + Prisma 스키마 확장 | 완료 |
| B | 회원가입 파이프라인 + 메일 디스패처 + 토큰 유틸 | 완료 |
| C | 로그인 + 이메일 인증 + Auth.js v5 Credentials Provider + Server Actions | 완료 |
| D | PrismaAdapter 마이그레이션 + 관리자 상태 변경 + 자동 로그인 | 예정 |
| E | 레이트 리미팅 + HTTP/E2E 통합 + `/login`, `/signup`, `/verify-email` 페이지 | 예정 |

## Next Step

Slice D 구현 — Auth.js PrismaAdapter 마이그레이션 및 관리자 세션 제어:

```bash
/moai run SPEC-AUTH-001
```

Slice D 주요 작업:
- `schema.prisma`에 `Account` / `Session` / `VerificationToken` 모델 추가
- `@auth/prisma-adapter` 설치 및 `session.strategy: 'database'` 전환
- REQ-AUTH-020: 관리자 상태 변경 → 즉시 세션 무효화

이후 구현 순서:

1. SPEC-AUTH-001 Slice D/E (auth 완결)
2. SPEC-ADMIN-001 (foundation: site, domain, module instance system)
3. SPEC-CONTENT-001 (boards, documents, comments)
4. SPEC-THEME-001 (theme/layout/skin)

## License

GPL-2.0-or-later (matching upstream Rhymix).
