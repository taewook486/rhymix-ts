# Rhymix-TS

TypeScript + Next.js 16 redesign of the [Rhymix](https://github.com/rhymix/rhymix) CMS.

> Status: **plan complete · scaffold ready · install pending**.
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
pnpm format       # prettier write
pnpm db:studio    # open Prisma Studio
```

## Next Step

Run the install-wizard implementation cycle:

```bash
/moai run SPEC-INSTALL-001
```

This delegates to `manager-ddd` (configured in `quality.yaml`) to drive the
RED → GREEN → REFACTOR / ANALYZE → PRESERVE → IMPROVE cycle for the wizard.

After install ships, follow the implementation order:

1. SPEC-ADMIN-001 (foundation: site, domain, module instance system)
2. SPEC-AUTH-001  (members, groups, sessions)
3. SPEC-CONTENT-001 (boards, documents, comments)
4. SPEC-THEME-001 (theme/layout/skin)

## License

GPL-2.0-or-later (matching upstream Rhymix).
