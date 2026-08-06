# SPEC-ADMIN-001 Slice B Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Scope: 라우팅 레이어 (Host 미들웨어 + `[mid]` 동적 라우팅 + tRPC `admin.module.*` CRUD)
Base: main = 5f9605f (Slice A 완료 — module-instance-service 커버리지 100%, 전체 405 tests green)
Depends on: Slice A

> **Note**: 본 슬라이스는 SPEC-ADMIN-001 의 **라우팅 계층** 을 다룬다. Slice A 가 만든 Foundation Schema 와 도메인 서비스 (`createModuleInstance` / `deleteModuleInstance` / `getModuleInstanceByMid`, `validateMid`, `getModule`) 위에 (a) Host → Domain 해석 미들웨어, (b) `app/[mid]/page.tsx` 동적 라우팅, (c) 도메인 인덱스 모듈 리다이렉트, (d) tRPC `admin.module.{create,list,get,delete}` 엔드포인트와 `protectedAdminProcedure` 게이트를 얹는다. Admin Shell UI (사이드바·헤더), Menu/MenuItem CRUD, AdminLog 기록 미들웨어, 실제 board 모듈 구현은 Slice C 이후로 분리한다.

---

## Pre-Flight Findings (2026-05-16)

Slice B 착수 전, 다음 네 가지 항목을 점검해 결정을 확정한다.

### Q1: Edge Runtime vs Node Runtime — Node Runtime 로 일원화

`apps/web/middleware.ts` 는 현재 NextAuth 5 의 `auth()` 래퍼를 import 하여 보호 라우트 리다이렉트만 수행하며, `runtime` 을 명시하지 않아 Next.js 기본값인 Edge Runtime 으로 실행된다 (apps/web/middleware.ts:1-44). 본 슬라이스는 Host 헤더로 `prisma.domain.findFirst({ where: { hostname } })` 를 호출해야 한다. Prisma 6 의 PostgreSQL driver 는 Edge Runtime 비지원이므로 두 가지 경로가 있다.

| 후보                                                                          | 장점                                                | 단점                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Path A**: `export const runtime = 'nodejs'` (채택)                          | 가장 단순. Prisma 직접 호출. dev/single-node 충분.  | Edge 최적화 포기. Cold start 영향 (single-node 운영에서는 무시 가능).               |
| Path B: Edge 미들웨어 + 별도 `/api/domain-resolve` Node 라우트                | Edge 성능 유지                                       | 한 요청당 두 라운드트립. 구현 복잡도 증가. dev 환경에서 의미 없는 오버헤드.         |
| Path C: Edge KV (Upstash) + 주기적 동기화 / LISTEN-NOTIFY                     | 운영 환경에서 도메인 해석을 ~1ms 로                  | Slice B 범위 초과 (Open Question #6: 멀티노드 운영). 인프라 의존성 신규 도입.       |

→ **채택 경로**: Path A. middleware.ts 에 `export const runtime = 'nodejs'` 를 추가하고 Prisma 를 직접 호출한다. dev/single-node MVP 시나리오에서는 충분하며, spec.md 의 리스크 표 line 1089 ("Edge runtime에서 Prisma 미지원") 가 명시한 대응책 중 가장 단순하다. 멀티노드 운영 시점에 Path C 로 마이그레이션은 미들웨어 함수 본문만 교체하면 되므로 후방 호환 가능.

### Q2: tRPC 인프라 — `@trpc/server` 11 / `@trpc/client` 11 / `@trpc/react-query` 11 이미 설치됨, 신규 설치 불필요

`apps/web/package.json` 확인 결과 다음이 이미 설치되어 있다 (line 23-26):

```json
"@trpc/client":      "^11.0.0",
"@trpc/next":        "^11.0.0",
"@trpc/react-query": "^11.0.0",
"@trpc/server":      "^11.0.0",
"@tanstack/react-query": "^5.62.0",
"superjson":         "^2.2.2",
"zod":               "^3.24.0"
```

→ **결론**: 신규 npm 의존성 없음. Slice B 는 server/api/ 디렉토리와 app/api/trpc/[trpc]/route.ts 파일만 신규 작성하면 된다. tRPC v11 의 `initTRPC.context<Context>().create({ transformer: superjson })` 패턴을 사용한다.

### Q3: `protectedAdminProcedure` — `isAdminSession` 헬퍼 재사용 + tRPC v11 미들웨어 래핑

Slice A 에서 도입한 `apps/web/lib/auth/admin-middleware.ts` 의 `isAdminSession(session)` 은 Auth.js v5 세션 객체에서 effective admin 권한 (REQ-AUTH-034) 을 OR 게이트로 평가하고, `session.user.id` 를 string/number 모두에서 number 로 정규화한다 (lib/auth/admin-middleware.ts:31-63). 본 슬라이스의 `protectedAdminProcedure` 는 이 함수를 그대로 재사용한다.

```ts
// server/api/trpc.ts (예시)
const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!isAdminSession(ctx.session)) throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx: { ...ctx, session: ctx.session as AdminSession } });
});
export const protectedAdminProcedure = publicProcedure.use(requireAdmin);
```

`auditLogger` 미들웨어 (spec.md line 685) 는 Slice C 의 AdminLog 기록 슬라이스로 미룬다. 본 슬라이스의 `protectedAdminProcedure` 는 `requireSession` (NextAuth `auth()` 의 결과를 context 에 주입) + `requireAdmin` 두 단계만으로 구성한다. `requireAdmin2FAIfEnabled` 는 spec.md REQ-ADMIN-023 의 사이트 설정에 의존하므로 Slice C 의 site settings 슬라이스에서 도입한다 (TODO 명시).

### Q4: `ModuleDefinition.routes` — Slice A 의 `unknown` 시그니처를 그대로 사용 + placeholder 렌더러

`packages/core/src/modules/types.ts:31-38` 에서 `ModuleRouteMap.index` / `catchAll` 은 `unknown` 으로 선언되어 있고 Slice A 에서는 빈 객체를 허용한다. spec.md (line 740-754) 의 정식 `RouteHandler` 시그니처는 본 슬라이스에서 구체화해야 한다. 두 가지 경로가 있다.

| 후보                                                                          | 장점                                                | 단점                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Path A**: Slice B 에서 `RouteHandler` 정식 시그니처 도입 + board 모듈 등록 | spec.md 와 정확히 정렬                              | board 모듈 구현이 본 슬라이스에 끼어들어 범위 초과. 실제 board 도메인 (글/댓글) 도입. |
| **Path B (채택)**: Slice B 는 placeholder 렌더러만, `RouteHandler` 시그니처는 Slice C 의 board 모듈 슬라이스에서 도입 | 본 슬라이스가 라우팅/미들웨어/tRPC 에만 집중. board 도메인은 SPEC-CONTENT-001 에 위임 | spec.md 와의 정렬은 한 단계 늦어짐 — 명시적 TODO 로 추적.                            |

→ **채택 경로**: Path B. `app/[mid]/page.tsx` 는 `getModuleInstanceByMid` 로 인스턴스를 조회한 후, `instance.moduleCode` 와 `instance.mid` 를 표시하는 placeholder JSX 만 렌더링한다 (`<main><h1>{instance.name}</h1><p>module={instance.moduleCode} mid={instance.mid}</p></main>`). spec.md 의 `def.routes.index(...)` 위임은 Slice C 에서 도입한다. 본 슬라이스의 목적은 "라우팅이 동작한다" 이며, "각 모듈이 자기 컴포넌트를 렌더한다" 는 다음 슬라이스의 책임이다.

추가로 `instance.config` 의 placeholder 표시도 본 슬라이스에서는 다루지 않는다 (Slice A 의 `ModuleConfig` 1:1 FK 가 이미 준비됨; 본 슬라이스의 list 엔드포인트는 `include: { config: true }` 옵션만 노출).

---

## Slice B — Routing Layer (Middleware + `[mid]` + tRPC `admin.module.*`)

### Goal

Slice A 가 만든 Foundation 위에 라우팅 계층을 얹는다. (a) Host 헤더 → `Domain` 레코드 해석 미들웨어, (b) `forceHttps` 강제 리다이렉트, (c) `app/[mid]/page.tsx` 동적 라우팅, (d) 루트 `/` 의 도메인 인덱스 모듈 리다이렉트, (e) `protectedAdminProcedure` 게이트, (f) tRPC `admin.module.{create,list,get,delete}` CRUD 엔드포인트. 이 여섯 가지가 완성되면 관리자는 (브라우저 UI 없이) tRPC 클라이언트나 curl 로 모듈 인스턴스를 만들고, 사용자는 `/{mid}` URL 로 인스턴스 placeholder 페이지에 접근할 수 있게 된다.

### Branch

`feature/admin-001-slice-b` (base: main = 5f9605f, Slice A 머지 후 새로 생성)

### REQ / AC scope

Slice B 에서 완전 구현:

- **REQ-ADMIN-010** (미들웨어가 Host → Domain 으로 컨텍스트 주입) — `apps/web/middleware.ts` 가 `prisma.domain.findFirst({ hostname })` 후 `x-site-id`, `x-domain-id`, `x-language` 헤더 주입
- **REQ-ADMIN-011** (호스트 매칭 실패 시 default domain 폴백 또는 404) — `isDefault=true` 도메인 조회, 없으면 `NextResponse.next()` 로 통과 (설치 미완 시나리오)
- **REQ-ADMIN-012** (`/{mid}` 동적 세그먼트가 해당 인스턴스 활성화) — `app/[mid]/page.tsx` 가 헤더의 `x-site-id` + URL `mid` 로 인스턴스 조회 후 placeholder 렌더링
- **REQ-ADMIN-013** (루트 `/` 가 도메인 인덱스 모듈 렌더링) — `app/page.tsx` 가 `Domain.indexModuleInstanceId` 조회 → `redirect('/' + instance.mid)` 또는 설치 페이지
- **REQ-ADMIN-014** (`forceHttps=true` 시 HTTP → HTTPS 301 리다이렉트) — 미들웨어가 `req.nextUrl.protocol === 'http:'` 검사 후 301
- **REQ-ADMIN-020** (`/admin` 라우트 + `admin.*` 프로시저의 isAdmin 검증) — `protectedAdminProcedure` 가 `isAdminSession` 호출 + 실패 시 `FORBIDDEN`
- **REQ-ADMIN-021** (비관리자에게 관리자 데이터 비노출) — tRPC 레벨에서 `FORBIDDEN`, UI 레벨은 Slice C
- **REQ-ADMIN-022** (관리자 섹션 권한 그룹 제한) — `protectedAdminProcedure` 는 isAdmin OR 검사만; 세부 그룹 ACL 은 Slice C
- **REQ-ADMIN-020 (admin.module CRUD 본체)**: tRPC 엔드포인트 4개 (`create` / `list` / `get` / `delete`) 가 Slice A 의 서비스 함수를 호출

Slice B 에서 schema/스캐폴딩만 (실제 enforcement 는 Slice C+):

- **REQ-ADMIN-023** (2FA 강제) — `requireAdmin2FAIfEnabled` 자리만 마련 (no-op middleware + TODO 주석). 실제 동작은 site settings 슬라이스에서.
- AdminLog 기록 — `auditLogger` 미들웨어 자리만 마련 (현재는 비활성). Slice C 에서 활성화.

명시적으로 Slice B 범위 밖:

- REQ-ADMIN-030 ~ 034 (Menu / MenuItem CRUD, 메뉴 캐시) → Slice C
- REQ-ADMIN-040 ~ 043 (Widget Registry) → 별도 슬라이스
- REQ-ADMIN-050 ~ 063 (사이트 설정, 캐시 액션) → Slice C
- REQ-ADMIN-070 ~ 072 (AdminLog 기록 로직) → Slice C
- REQ-ADMIN-080 ~ 101 (헬스 대시보드, 가져오기/내보내기, 즐겨찾기) → 후속 슬라이스
- Admin Shell UI (사이드바, 헤더 레이아웃) → Slice C
- 실제 board 모듈 (`ModuleDefinition.routes.index`) 구현 → SPEC-CONTENT-001

### Files (new + modified)

| File                                                                  | Status | Purpose                                                                              |
| --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `apps/web/middleware.ts`                                              | edit   | `runtime = 'nodejs'` 추가 + Host 해석 + forceHttps 리다이렉트 + 기존 auth 보호 유지 |
| `apps/web/middleware.test.ts`                                         | new    | RED first — B-1 ~ B-4                                                                |
| `apps/web/server/api/trpc.ts`                                         | new    | `initTRPC.context<Context>().create()`, `publicProcedure`, `protectedAdminProcedure` |
| `apps/web/server/api/context.ts`                                      | new    | `createContext({ req, res })` — NextAuth session + req headers + prisma 주입         |
| `apps/web/server/api/routers/admin/module.ts`                         | new    | `adminModuleRouter` — `create` / `list` / `get` / `delete` 4개 procedure             |
| `apps/web/server/api/routers/admin/module.test.ts`                    | new    | RED first — B-7 ~ B-12                                                               |
| `apps/web/server/api/routers/admin/index.ts`                          | new    | `adminRouter = router({ module: adminModuleRouter })` (Slice C 의 menu/log/system 추가 예정) |
| `apps/web/server/api/root.ts`                                         | new    | `appRouter = router({ admin: adminRouter })`, `export type AppRouter`                |
| `apps/web/app/api/trpc/[trpc]/route.ts`                               | new    | `fetchRequestHandler` Next.js Route Handler 어댑터                                   |
| `apps/web/app/[mid]/page.tsx`                                         | new    | 헤더 `x-site-id` 읽기 + `getModuleInstanceByMid` + placeholder JSX                  |
| `apps/web/app/[mid]/page.test.tsx`                                    | new    | RED first — B-5 / B-6                                                                |
| `apps/web/app/page.tsx`                                               | edit   | 헤더 `x-domain-id` 읽기 + `indexModuleInstanceId` 조회 + redirect                   |
| `apps/web/lib/db/prisma.ts`                                           | check  | 이미 존재하면 재사용; 없으면 신규 (PrismaClient singleton)                          |
| `.moai/specs/SPEC-ADMIN-001/progress.md`                              | edit   | Slice B 결과 섹션 추가                                                               |

미들웨어와 server/api 디렉터리는 신규 영역이므로 파일 충돌 위험은 낮다. 단, `apps/web/middleware.ts` 는 AUTH-001 Slice F 의 인증 보호 라우팅이 이미 존재하므로 (line 1-44), 본 슬라이스는 기존 로직을 보존하면서 그 앞에 Host 해석 단계를 끼워 넣는다.

### 핵심 구현 스케치

#### 1. `apps/web/middleware.ts` 확장

기존 `auth((req) => { ... })` 콜백 안에서 첫 단계로 Host 해석을 수행한다. 인증 검사는 그 다음에 실행된다 (실패 시 Host 해석 결과는 폐기되어도 무방하지만, `forceHttps` 리다이렉트는 인증보다 먼저 작동해야 한다).

```ts
// apps/web/middleware.ts (의사 코드)
import { PrismaClient } from '@prisma/client';
const prisma = global.__prisma ?? (global.__prisma = new PrismaClient());
export const runtime = 'nodejs';

export default auth(async (req) => {
  const host = req.headers.get('host') ?? '';
  // 단계 1: Domain 해석 (REQ-ADMIN-010)
  const domain = await prisma.domain.findFirst({
    where: { hostname: host },
    select: { id: true, siteId: true, forceHttps: true, defaultLanguage: true,
              indexModuleInstanceId: true, site: { select: { defaultLanguage: true } } },
  });
  // 단계 2: forceHttps (REQ-ADMIN-014) — 인증보다 먼저
  if (domain?.forceHttps && req.nextUrl.protocol === 'http:') {
    const url = req.nextUrl.clone(); url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }
  // 단계 3: 도메인 헤더 주입 (REQ-ADMIN-010) — 매칭 실패 시에도 통과 (REQ-ADMIN-011 의 폴백은 default-domain 조회)
  const res = NextResponse.next();
  if (domain) {
    res.headers.set('x-site-id', String(domain.siteId));
    res.headers.set('x-domain-id', String(domain.id));
    res.headers.set('x-language', domain.defaultLanguage ?? domain.site.defaultLanguage);
  } else {
    // REQ-ADMIN-011: default domain 폴백
    const defaultDomain = await prisma.domain.findFirst({ where: { isDefault: true }, select: { ... } });
    if (defaultDomain) { /* 동일 헤더 주입 */ }
    // 둘 다 없으면 헤더 미주입 — 라우트가 자체 fallback 처리 (설치 페이지 등)
  }
  // 단계 4: 기존 auth 보호 (AUTH-001 Slice F 유지)
  // ... protectedRoutes / authOnlyRoutes 분기 ...
});
```

PrismaClient 의 module-level singleton 패턴은 Next.js dev HMR 환경에서 connection 누수를 방지하기 위해 `global.__prisma` 캐시를 사용한다. `apps/web/lib/db/prisma.ts` 가 이미 있다면 그 export 를 재사용한다.

#### 2. `apps/web/app/[mid]/page.tsx` — 동적 라우팅

```tsx
// apps/web/app/[mid]/page.tsx (의사 코드)
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { prisma } from '@/lib/db/prisma';

export default async function MidPage({ params }: { params: Promise<{ mid: string }> }) {
  const { mid } = await params;
  const h = await headers();
  const siteId = Number(h.get('x-site-id'));
  if (!Number.isFinite(siteId)) notFound();
  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) notFound();
  // Slice B 는 placeholder. Slice C 에서 def.routes.index(...) 위임.
  return (
    <main>
      <h1>{instance.name}</h1>
      <p>module={instance.moduleCode} mid={instance.mid}</p>
    </main>
  );
}
```

#### 3. `apps/web/app/page.tsx` — 도메인 인덱스 모듈 리다이렉트

```tsx
// apps/web/app/page.tsx (의사 코드)
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';

export default async function RootPage() {
  const h = await headers();
  const domainId = Number(h.get('x-domain-id'));
  if (!Number.isFinite(domainId)) {
    // 설치 미완 또는 호스트 매칭 실패. 설치 페이지 또는 환영 페이지로.
    return <main><h1>Welcome to Rhymix-TS</h1><p>Site is not configured.</p></main>;
  }
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { indexModuleInstanceId: true, indexModuleInstance: { select: { mid: true } } },
  });
  if (domain?.indexModuleInstance) redirect(`/${domain.indexModuleInstance.mid}`);
  return <main><h1>Site index module not configured</h1></main>;
}
```

기존 `apps/web/app/page.tsx` 가 다른 placeholder 를 렌더하고 있다면 본 슬라이스의 동작으로 교체한다.

#### 4. `apps/web/server/api/trpc.ts` — tRPC 초기화

```ts
// apps/web/server/api/trpc.ts (의사 코드)
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({ transformer: superjson });
export const router = t.router;
export const publicProcedure = t.procedure;

const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!isAdminSession(ctx.session)) throw new TRPCError({ code: 'FORBIDDEN' });
  // ctx.session 의 user.id 가 isAdminSession 안에서 number 로 정규화됨 (admin-middleware.ts:56)
  return next({ ctx: { ...ctx, session: ctx.session } });
});

// TODO (Slice C site-settings): requireAdmin2FAIfEnabled
// TODO (Slice C admin-log): auditLogger
export const protectedAdminProcedure = publicProcedure.use(requireAdmin);
```

#### 5. `apps/web/server/api/routers/admin/module.ts` — CRUD 라우터

```ts
// apps/web/server/api/routers/admin/module.ts (의사 코드)
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  createModuleInstance, deleteModuleInstance, getModuleInstanceByMid,
  MidConflictError, MidReservedError, MidInvalidError, MidLengthError,
  IndexModuleProtectedError, ModuleNotRegisteredError,
} from '@rhymix-ts/core/modules';

export const adminModuleRouter = router({
  create: protectedAdminProcedure
    .input(z.object({
      siteId: z.number().int().positive(),
      moduleCode: z.string().min(1),
      mid: z.string().min(1).max(80),
      name: z.string().min(1),
      config: z.unknown().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const actor = { memberId: ctx.session.user.id, ip: ctx.ip, userAgent: ctx.userAgent };
      try {
        return await createModuleInstance({ ...input, actor }, { prisma: ctx.prisma });
      } catch (err) {
        if (err instanceof MidConflictError)         throw new TRPCError({ code: 'CONFLICT', message: err.message });
        if (err instanceof MidReservedError)         throw new TRPCError({ code: 'UNPROCESSABLE_CONTENT', message: err.message });
        if (err instanceof MidInvalidError || err instanceof MidLengthError)
                                                     throw new TRPCError({ code: 'UNPROCESSABLE_CONTENT', message: err.message });
        if (err instanceof ModuleNotRegisteredError) throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
        throw err;
      }
    }),

  list: protectedAdminProcedure
    .input(z.object({ siteId: z.number().int().positive(), moduleCode: z.string().optional(), q: z.string().optional() }))
    .query(async ({ ctx, input }) =>
      ctx.prisma.moduleInstance.findMany({
        where: { siteId: input.siteId, ...(input.moduleCode && { moduleCode: input.moduleCode }),
                 ...(input.q && { OR: [{ mid: { contains: input.q, mode: 'insensitive' } },
                                       { name: { contains: input.q, mode: 'insensitive' } }] }) },
        orderBy: { createdAt: 'desc' },
      })),

  get: protectedAdminProcedure
    .input(z.object({ siteId: z.number().int().positive(), mid: z.string() }))
    .query(({ ctx, input }) => getModuleInstanceByMid(input.siteId, input.mid, { prisma: ctx.prisma })),

  delete: protectedAdminProcedure
    .input(z.object({ instanceId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const actor = { memberId: ctx.session.user.id, ip: ctx.ip, userAgent: ctx.userAgent };
      try {
        return await deleteModuleInstance(input.instanceId, actor, { prisma: ctx.prisma });
      } catch (err) {
        if (err instanceof IndexModuleProtectedError) throw new TRPCError({ code: 'CONFLICT', message: err.message });
        throw err;
      }
    }),
});
```

#### 6. `apps/web/app/api/trpc/[trpc]/route.ts` — HTTP 어댑터

```ts
// apps/web/app/api/trpc/[trpc]/route.ts (의사 코드)
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/api/root';
import { createContext } from '@/server/api/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc', req, router: appRouter,
    createContext: () => createContext({ req }),
  });

export { handler as GET, handler as POST };
```

### Test plan (RED first, 12 tests)

본 슬라이스는 TDD 모드를 따른다. 각 테스트는 RED 부터 시작해 GREEN 으로 진행한다. test runner 는 `vitest`; React 컴포넌트 테스트는 `@testing-library/react` + `jsdom` (apps/web/package.json 에 이미 설치됨).

#### `apps/web/middleware.test.ts` — 4 tests

테스트 픽스처: prisma 모킹 (`vi.mock('@/lib/db/prisma')`). Domain 1: `{ id: 1, siteId: 1, hostname: 'example.com', forceHttps: true, isDefault: true, defaultLanguage: 'ko', site: { defaultLanguage: 'en' } }`.

- **B-1**: `req` Host 헤더 = `'example.com'`, scheme = `https` → middleware 통과 후 응답 헤더에 `x-site-id=1`, `x-domain-id=1`, `x-language=ko` 가 포함됨. (REQ-ADMIN-010)
- **B-2**: `req` Host 헤더 = `'unknown.com'`, default domain 존재 → response 헤더가 default domain (id=1) 의 값으로 주입됨. (REQ-ADMIN-011 폴백)
- **B-3**: `req` Host 헤더 = `'example.com'`, scheme = `http` → 301 redirect, Location 헤더 = `https://example.com{path}`. (REQ-ADMIN-014)
- **B-4**: `req` Host 헤더 = `'example.com'`, scheme = `https` → 응답 status ≠ 301 (리다이렉트 없음). (REQ-ADMIN-014 negative)

#### `apps/web/app/[mid]/page.test.tsx` — 2 tests

테스트 픽스처: `next/headers` 의 `headers()` 모킹, `@rhymix-ts/core/modules` 의 `getModuleInstanceByMid` 모킹.

- **B-5**: `headers().get('x-site-id')` = `'1'`, `getModuleInstanceByMid(1, 'notice', ...)` 가 `{ id: 1, siteId: 1, moduleCode: 'board', mid: 'notice', name: 'Notice', config: null }` 반환 → 렌더 결과에 `"Notice"`, `"module=board"`, `"mid=notice"` 텍스트 포함. (REQ-ADMIN-012)
- **B-6**: `headers().get('x-site-id')` = `'1'`, `getModuleInstanceByMid(1, 'missing', ...)` 가 `null` 반환 → `notFound()` 호출됨 (Next.js `NEXT_NOT_FOUND` symbol throw 또는 spy 검증).

#### `apps/web/server/api/routers/admin/module.test.ts` — 6 tests

테스트 픽스처: `createCaller` 패턴으로 직접 router 호출. `ctx.prisma` 는 mock; `ctx.session` 은 admin / non-admin 두 가지 픽스처.

- **B-7**: admin 세션 + `module.create({ siteId: 1, moduleCode: 'board', mid: 'notice', name: 'Notice' })` → `createModuleInstance` 가 호출되고 결과가 반환됨. (REQ-ADMIN-020)
- **B-8**: 비관리자 세션 + `module.create(...)` → `TRPCError` code `FORBIDDEN` 발생. (REQ-ADMIN-021)
- **B-9**: admin 세션 + `module.create` 호출이 내부적으로 `MidConflictError` throw → `TRPCError` code `CONFLICT` 로 변환됨.
- **B-10**: admin 세션 + `module.list({ siteId: 1 })` → mock prisma 가 반환한 row 배열이 그대로 반환됨.
- **B-11**: admin 세션 + `module.delete({ instanceId: X })` 호출이 내부적으로 `IndexModuleProtectedError` throw → `TRPCError` code `CONFLICT` 로 변환됨. (REQ-ADMIN-006 의 라우터 표면)
- **B-12**: admin 세션 + `module.delete({ instanceId: X })` 정상 → `deleteModuleInstance` 가 호출되고 `{ ok: true, deletedId: X }` 반환됨.

→ 총 12 개 테스트 (B-1 ~ B-12).

### Domain layer contract (간단 시그니처)

```ts
// apps/web/server/api/context.ts
export interface Context {
  session: AdminSession | null;       // NextAuth `auth()` 결과 (null 가능)
  prisma: PrismaClient;
  ip?: string;
  userAgent?: string;
}
export async function createContext(opts: { req: Request }): Promise<Context>;

// apps/web/server/api/trpc.ts
export const publicProcedure: ProcedureBuilder<...>;
export const protectedAdminProcedure: ProcedureBuilder<...>;  // requireAdmin 미들웨어 포함
export const router: typeof t.router;

// apps/web/server/api/routers/admin/module.ts
export const adminModuleRouter: Router<{
  create: Mutation<{ siteId; moduleCode; mid; name; config? }, ModuleInstance & { config }>;
  list:   Query<{ siteId; moduleCode?; q? }, ModuleInstance[]>;
  get:    Query<{ siteId; mid }, (ModuleInstance & { config }) | null>;
  delete: Mutation<{ instanceId }, { ok: true; deletedId: number }>;
}>;

// apps/web/server/api/root.ts
export const appRouter: Router<{ admin: { module: typeof adminModuleRouter } }>;
export type AppRouter = typeof appRouter;
```

### REQ → Enforcement chain

| REQ            | 코드 / 파일                                                | 테스트                  |
| -------------- | --------------------------------------------------------- | ----------------------- |
| REQ-ADMIN-010  | `middleware.ts` 의 `prisma.domain.findFirst` + 헤더 주입   | B-1                     |
| REQ-ADMIN-011  | `middleware.ts` 의 default domain 폴백                     | B-2                     |
| REQ-ADMIN-012  | `app/[mid]/page.tsx` + `getModuleInstanceByMid`            | B-5, B-6                |
| REQ-ADMIN-013  | `app/page.tsx` 의 `indexModuleInstanceId` 조회 + redirect  | (시각 검증; 단위 테스트 생략, Slice C 의 e2e 에서 커버) |
| REQ-ADMIN-014  | `middleware.ts` 의 `forceHttps` 검사 + 301 redirect        | B-3, B-4                |
| REQ-ADMIN-020  | `protectedAdminProcedure` 의 `requireAdmin` 미들웨어       | B-7, B-8                |
| REQ-ADMIN-021  | tRPC 레벨 `FORBIDDEN` (UI 레벨 차단은 Slice C)             | B-8                     |
| REQ-ADMIN-022  | `protectedAdminProcedure` (그룹 ACL 은 Slice C TODO)        | B-8                     |
| (REQ-ADMIN-006 라우터 표면) | `module.delete` 의 `IndexModuleProtectedError` 변환 | B-11                    |

REQ-ADMIN-013 의 직접 단위 테스트는 생략한다 — `headers()` + `prisma.domain.findUnique` + `redirect()` 의 결합은 Next.js 내부 동작이 큰 비중을 차지해 mock 가치가 낮다. 대신 Slice C 의 Admin Shell e2e 에서 실제 브라우저 동작으로 검증한다. 본 슬라이스에서는 코드 작성만 완료한다.

### @MX 태그 후보

@MX 태그는 본 슬라이스의 GREEN 단계에서 추가한다. 우선순위는 다음과 같다 (`code_comments=ko` 기준).

- `apps/web/middleware.ts` 의 Domain 해석 블록 — **@MX:ANCHOR** (REQ-ADMIN-010/011 의 모든 요청 진입점. 본 미들웨어가 시작 line 부터 Host → Domain → 헤더 주입 → forceHttps 까지 단일 함수에서 처리하며, 라우트 / Server Component / tRPC / API 모두가 이 헤더를 trust 한다.) @MX:REASON: "라우팅 컨텍스트의 단일 origin. 헤더 스푸핑은 Node Runtime + Same-origin 가정 위에 성립."
- `apps/web/middleware.ts` 의 `forceHttps` 분기 — **@MX:NOTE** (REQ-ADMIN-014. 인증보다 먼저 실행되어야 함을 코드 위치로 강제.)
- `protectedAdminProcedure` — **@MX:ANCHOR** (모든 `admin.*` 프로시저의 권한 게이트. fan_in 이 즉시 4 이상이 되며 Slice C 에서 menu / log / system / site 라우터가 추가되면 더 증가.) @MX:REASON: "권한 우회 경로 차단 — 어떤 admin.* 프로시저도 이 procedure builder 를 사용하지 않으면 isAdmin 검사를 생략한 채 노출됨."
- `app/[mid]/page.tsx` — **@MX:NOTE** (모든 모듈 인스턴스 페이지의 진입점. Slice C 에서 `def.routes.index(...)` 위임으로 교체될 예정 — @MX:TODO 함께 부착.)
- `server/api/context.ts` 의 `createContext` 의 `req.headers.get('x-site-id')` 신뢰 — **@MX:WARN** @MX:REASON: "헤더는 미들웨어에서만 주입되어야 함. dev 환경에서 외부 클라이언트가 직접 `x-site-id` 를 헤더에 박아 보내면 spoofing 가능. 완화는 (a) middleware matcher 가 `/api/trpc` 를 포함해 매번 재계산하거나 (b) createContext 가 헤더 대신 hostname 으로 재해석. 본 슬라이스는 (a) 채택; matcher 점검은 verification 에서 수행."

### Dependencies

- 외부 신규 npm 의존성 없음. tRPC v11 / react-query v5 / superjson / zod 모두 `apps/web/package.json` 에 이미 존재.
- 내부 의존:
  - `@rhymix-ts/core/modules` (Slice A 산출물 — `createModuleInstance`, `deleteModuleInstance`, `getModuleInstanceByMid`, 에러 타입 5종)
  - `@/lib/auth/admin-middleware` (`isAdminSession` — AUTH-001 Slice D2 + Slice A 에서 안정화)
  - `@/lib/auth/config` (`authConfig` — AUTH-001 Slice F)
  - `@prisma/client` PrismaClient (apps/web 의 직접 의존)
- 기존 라우트 (`app/login`, `app/admin/page.tsx` placeholder 등) 와의 충돌 없음 — 본 슬라이스는 `app/[mid]/` 만 신규로 추가하며 `app/admin/*` 는 Slice C 에서 본격 구현.

### Verification

- `pnpm --filter @rhymix-ts/web typecheck` → 0 errors
- `pnpm --filter @rhymix-ts/web test` → B-1 ~ B-12 모두 GREEN + 기존 web 테스트 회귀 없음
- `pnpm test` (전체 워크스페이스) → 405 + 12 = 417+ GREEN, AUTH-001 + Slice A 회귀 없음
- `pnpm --filter @rhymix-ts/web build` → Next.js build 통과 (middleware Node Runtime 경고는 무시 가능)
- middleware matcher 점검: `/api/trpc/*` 가 matcher 에 포함되는지 확인 (현재 matcher = `/((?!api|_next/static|_next/image|favicon.ico).*)` 는 `/api/*` 를 제외함). → Q5 (아래) 의 결정에 따라 matcher 수정 또는 createContext 가 헤더 대신 hostname 재해석.
- `git diff --stat main` → 변경 파일 수 확인 (목표: ~11 개 + 미들웨어 수정 1)

### Risks

| 리스크                                                                                       | 영향                                                       | 완화                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| middleware Node Runtime 전환 시 Cold start 증가                                              | 첫 요청 200ms+ 지연 가능                                   | dev/single-node 시나리오에서는 영향 미미. 운영 환경 멀티노드 시 Path C (Edge KV) 로 마이그레이션. spec.md line 1089 의 권장 경로 따름.                                                                                                                          |
| middleware matcher 가 `/api/*` 를 제외하면 tRPC context 의 `x-site-id` 헤더가 미주입         | tRPC 호출 시 siteId 없음 → 400 BAD_REQUEST                  | (a) matcher 를 `/api/trpc` 포함으로 수정. (b) `createContext` 가 헤더 대신 `req.headers.host` → `prisma.domain.findFirst` 로 재해석. **본 슬라이스 채택**: (b) 가 더 안전 (헤더 스푸핑 차단). matcher 는 페이지 라우트용으로 유지.                                |
| 헤더 스푸핑 (`x-site-id` 를 외부 클라이언트가 직접 주입)                                     | 잘못된 사이트 컨텍스트로 데이터 접근                       | (a) tRPC 의 `createContext` 가 헤더 대신 hostname 으로 재해석 (위 항목과 동일 완화). (b) `app/[mid]/page.tsx` 의 server-side 코드는 Same-origin 이므로 middleware 가 set 한 헤더만 신뢰. @MX:WARN 으로 명시.                                              |
| `app/page.tsx` 가 기존 placeholder 와 충돌                                                   | 기존 홈페이지 화면 깨짐                                    | 본 슬라이스 시작 전에 `apps/web/app/page.tsx` 현재 상태 확인 (Read). placeholder 또는 빈 페이지면 교체. AUTH-001 의 사용자 페이지가 있다면 우회 (e.g., 해당 컴포넌트를 fallback 분기 안에 포함).                                                                |
| Prisma client module-level singleton 의 dev HMR 누수                                         | `Too many connections` 에러                                | `global.__prisma` 캐시 패턴 (의사코드 line 1-3 의 `global.__prisma ?? new PrismaClient()`) 사용. AUTH-001 Slice D2 의 prisma helper 가 이미 동일 패턴을 따르므로 재사용.                                                                                       |
| `isAdminSession` 이 NextAuth v5 의 session 타입과 strict 일치하지 않을 가능성                | tRPC context 에서 ctx.session.user 접근 시 TS 에러         | Slice A 가 도입한 `isAdminSession` 의 type predicate (`session is AdminSession`) 가 narrow type 을 보장함 (lib/auth/admin-middleware.ts:33). `requireAdmin` 미들웨어 안에서 `next({ ctx: { session: ctx.session as AdminSession } })` 로 좁힌 타입을 다음 단계로 전달. |
| Test mock 의 `next/headers` / `next/navigation` 가 vitest 환경에서 동작하지 않을 가능성     | B-5, B-6 RED 단계에서 진행 불가                            | `vi.mock('next/headers', () => ({ headers: vi.fn() }))` + `vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }) }))` 패턴. AUTH-001 Slice H 의 SessionProvider 테스트가 동일 패턴을 사용하면 참고. 없으면 본 슬라이스에서 도입. |
| `auditLogger` 부재로 인한 REQ-ADMIN-070 ~ 072 미충족                                          | spec.md 의 감사 로그 요구가 본 슬라이스에서 충족되지 않음 | 본 슬라이스는 명시적으로 범위 밖 (위 "Slice B 범위 밖" 섹션). Slice C 의 admin-log 슬라이스에서 도입. `protectedAdminProcedure` 안에 TODO 주석으로 위치만 마련.                                                                                                |

### Heads-up for Slice C

본 슬라이스가 완료되면 Slice C 는 다음을 이어받는다.

- **Admin Shell UI**: spec.md line 904 ~ 926 의 sidebar IA 기반 레이아웃. `app/admin/layout.tsx` 의 사이드바 / 헤더 / 즐겨찾기 영역. AUTH-001 Slice H 의 `apps/web/app/admin/page.tsx` placeholder 를 본격 구현.
- **Module 관리 페이지 UI**: `app/admin/modules/page.tsx` (목록) + `[code]/[instanceId]/page.tsx` (개별 설정). 본 슬라이스의 `admin.module.list` / `get` / `create` / `delete` 를 호출.
- **Menu / MenuItem CRUD tRPC**: `admin.menu.*` 라우터. 본 슬라이스의 `protectedAdminProcedure` 재사용. Menu / MenuItem 모델은 Slice A 에서 이미 schema 준비됨.
- **AdminLog `auditLogger` tRPC 미들웨어**: 모든 mutation 의 before/after diff 를 자동으로 `AdminLog` 에 기록. 본 슬라이스의 `protectedAdminProcedure` 정의 안에 자리만 마련.
- **`requireAdmin2FAIfEnabled` 활성화**: 사이트 설정 슬라이스가 도입한 `SiteSetting.requireAdminTwoFactor` 를 본 슬라이스의 `protectedAdminProcedure` 가 호출.
- **`ModuleDefinition.routes.index` 위임**: `app/[mid]/page.tsx` 의 placeholder JSX 를 `getModule(instance.moduleCode).routes.index(...)` 호출로 교체. 이때 `RouteHandler` 정식 시그니처 (`(ctx: { instance, params, searchParams, locale }) => Promise<JSX.Element>`) 도 함께 도입.
- **실제 board 모듈 등록**: SPEC-CONTENT-001 의 시작점. `registerModule({ code: 'board', configSchema, defaultConfig, onInstall, onUninstall, routes: { index, catchAll }, adminPages })` 호출.

---

## Open Questions (Slice B 종료 시점 재검토 예정)

1. **tRPC context 의 siteId 출처 — 헤더 vs hostname 재해석** — Risks 표에서 Path (b) (hostname 재해석) 를 채택했다. middleware matcher 와의 일관성을 위해 (a) 미들웨어 matcher 를 `/api/trpc` 포함으로 확장 + 헤더 신뢰, 또는 (b) createContext 가 hostname 으로 별도 조회. 본 슬라이스는 (b) 로 시작; 운영 성능 측정 후 (a) 로 전환 가능.
2. **PrismaClient 위치 표준화** — `apps/web/lib/db/prisma.ts` 의 존재 여부와 export 형태를 슬라이스 시작 시점에 확인. 없으면 신규 생성, 있으면 재사용. AUTH-001 의 prisma helper 와 동일 모듈을 재사용해야 connection pooling 이 일관적.
3. **Edge → Node Runtime 전환의 운영 영향** — 운영 환경에서 first-byte latency 가 얼마나 증가하는지는 본 슬라이스에서 측정하지 않는다. SPEC-INSTALL-001 의 운영 가이드 또는 별도 SPEC-PERF-XXX 에서 추적.
4. **`app/page.tsx` 와 기존 사용자 페이지의 관계** — AUTH-001 Slice H 가 어떤 형태의 홈페이지를 가지고 있는지 본 슬라이스 시작 시 확인. 충돌 시 fallback 분기 추가.
5. **`ModuleNotRegisteredError` 의 사용자 표면** — 관리자가 `admin.module.create({ moduleCode: 'unknown' })` 를 호출하면 본 슬라이스는 `BAD_REQUEST` 로 반환한다. 그러나 dev HMR 환경에서 registry 가 비어 있는 일시적 상태도 같은 에러로 나오므로, Slice C 에서 등록된 모듈 목록을 tRPC 로 노출 (`admin.module.listAvailableTypes`) 하여 UI 가 dropdown 으로 제한할 필요가 있다.

---

Version: 1.0.0
Created: 2026-05-16
Author: manager-spec via /moai plan SPEC-ADMIN-001 Slice B
