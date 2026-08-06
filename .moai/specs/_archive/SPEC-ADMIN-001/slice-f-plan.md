# SPEC-ADMIN-001 Slice F Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Scope: System Health Dashboard (REQ-ADMIN-080/081) + Cache Management (REQ-ADMIN-060~063)
Base: main = 11c99b1 (Slice E 완료 — TRPCProvider + reorder + CSV export + Site설정 + 회원관리)
Depends on: Slice A~E 완료

---

## Pre-Flight Findings

### Q1: System Health — DB ping 방법
`prisma.$queryRaw\`SELECT 1\`` 으로 응답 지연 측정. 실패 시 `connected: false`.
Node.js 버전은 `process.version`. 플랫폼은 `process.platform`.

### Q2: Env var 마스킹 규칙 (REQ-ADMIN-081)
키 이름(대소문자 무시)에 `SECRET`, `KEY`, `PASSWORD`, `TOKEN` 중 하나라도 포함 시 값을 `"***"` 로 교체.
`NODE_ENV`, `PORT` 같은 비민감 키는 원본 노출.

### Q3: CacheAdapter 추상화 수준
`interface CacheAdapter { revalidate(tag: string): Promise<void> }`
기본 구현: `NextJsCacheAdapter` — `revalidateTag(tag)` 래핑.
테스트 환경에서는 mock 주입 가능하도록 의존성 주입 패턴 사용.

### Q4: 캐시 태그 네임스페이스
기존 `lib/admin/cache-keys.ts` 에 `menuCacheKey()` 존재. 동일 파일에 cache 태그 상수 추가:
- `CACHE_TAGS.module(id: string)` → `module:${id}`
- `CACHE_TAGS.menu(id: string)` → `menu:${id}`
- `CACHE_TAGS.widget(name: string)` → `widget:${name}`
- `CACHE_TAGS.domain(id: string)` → `domain:${id}`
- `CACHE_TAGS.ALL` → 배열 `['module', 'menu', 'widget', 'domain']` (글로벌 prefix)

### Q5: admin.cache.purge scope='all' 구현
`all` → `revalidateTag('module')`, `revalidateTag('menu')`, `revalidateTag('widget')`, `revalidateTag('domain')` 4개 호출 (prefix wildcard — Next.js 14+ revalidateTag는 prefix 지원).
AdminLog: `action="cache.purge.all"`, `target="cache:all"`.

### Q6: 사이드바 추가 위치
`AdminSidebar.tsx` "시스템" 섹션에 추가:
- `{ href: '/admin/system', label: '시스템 헬스', icon: Activity }`
- `{ href: '/admin/system/cache', label: '캐시 관리', icon: Trash2 }`

---

## Task Decomposition

### Task F-1: admin.system.health tRPC + System Health 페이지 (REQ-ADMIN-080/081)

**Files (new)**:
- `apps/web/server/api/routers/admin/system.ts`
- `apps/web/server/api/routers/admin/system.test.ts`
- `apps/web/app/admin/system/page.tsx`
- `apps/web/app/admin/system/page.test.tsx`

**Files (modify)**:
- `apps/web/server/api/routers/admin/index.ts` (system 라우터 추가)
- `apps/web/components/admin/AdminSidebar.tsx` (시스템 헬스 링크 추가)

**tRPC procedure**:
```ts
admin.system.health() → {
  node: { version: string; platform: string };
  db: { connected: boolean; latencyMs: number };
  env: Array<{ key: string; value: string }>;  // 민감 키는 "***"
}
```

**Tests (RED first)**:
- health() → node.version 포함 (process.version 반환)
- DB 연결 성공 → connected:true, latencyMs >= 0
- DB 연결 실패 (mock throw) → connected:false, latencyMs: -1
- 환경 변수 민감 키(DB_PASSWORD, JWT_SECRET, API_KEY, AUTH_TOKEN) → "***" 마스킹
- 비민감 키(NODE_ENV, PORT) → 원본 값 노출
- 비관리자 → UNAUTHORIZED

### Task F-2: CacheAdapter + lib/cache + admin.cache.purge tRPC (REQ-ADMIN-060~063)

**Files (new)**:
- `apps/web/lib/cache/adapter.ts`
- `apps/web/lib/cache/adapter.test.ts`
- `apps/web/server/api/routers/admin/cache.ts`
- `apps/web/server/api/routers/admin/cache.test.ts`
- `apps/web/app/admin/system/cache/page.tsx`
- `apps/web/app/admin/system/cache/page.test.tsx`

**Files (modify)**:
- `apps/web/server/api/routers/admin/index.ts` (cache 라우터 추가)
- `apps/web/lib/admin/cache-keys.ts` (CACHE_TAGS 상수 추가)
- `apps/web/components/admin/AdminSidebar.tsx` (캐시 관리 링크 추가)

**CacheAdapter interface** (`lib/cache/adapter.ts`):
```ts
export interface CacheAdapter {
  revalidate(tag: string): Promise<void>;
}

export class NextJsCacheAdapter implements CacheAdapter {
  async revalidate(tag: string) {
    revalidateTag(tag);  // next/cache
  }
}

// 싱글턴 — Next.js serverless 환경에서 안전
export const cacheAdapter: CacheAdapter = new NextJsCacheAdapter();
```

**CACHE_TAGS additions** (`lib/admin/cache-keys.ts`):
```ts
export const CACHE_TAGS = {
  module: (id: string | number) => `module:${id}`,
  menu:   (id: string | number) => `menu:${id}`,
  widget: (name: string)         => `widget:${name}`,
  domain: (id: string | number)  => `domain:${id}`,
  ALL_PREFIXES: ['module', 'menu', 'widget', 'domain'] as const,
}
```

**tRPC procedure**:
```ts
admin.cache.purge({
  scope: z.enum(['all', 'module', 'menu', 'widget', 'domain']),
  id: z.string().optional(),   // scope='module'이면 moduleId
}) → { invalidated: string[] }  // 무효화된 태그 목록
```

**auditLogger** — protectedAdminProcedure 체인으로 자동 기록:
- `action="cache.purge.all"` / `action="cache.purge.module"` 등
- `target="cache:all"` / `target="cache:module:X"` 등

**Tests (RED first)**:
- CacheAdapter.revalidate → revalidateTag 호출 확인
- purge({ scope: 'all' }) → 4개 prefix 태그 모두 무효화
- purge({ scope: 'module', id: 'X' }) → 'module:X' 태그만 무효화
- purge({ scope: 'menu', id: '1' }) → 'menu:1' 태그만 무효화
- purge() AdminLog → action="cache.purge.all", target="cache:all"
- 비관리자 purge → UNAUTHORIZED

---

## File Modification Summary

| 파일 | 상태 | 태스크 |
|------|------|--------|
| `apps/web/server/api/routers/admin/system.ts` | new | F-1 |
| `apps/web/server/api/routers/admin/system.test.ts` | new | F-1 |
| `apps/web/app/admin/system/page.tsx` | new | F-1 |
| `apps/web/app/admin/system/page.test.tsx` | new | F-1 |
| `apps/web/lib/cache/adapter.ts` | new | F-2 |
| `apps/web/lib/cache/adapter.test.ts` | new | F-2 |
| `apps/web/server/api/routers/admin/cache.ts` | new | F-2 |
| `apps/web/server/api/routers/admin/cache.test.ts` | new | F-2 |
| `apps/web/app/admin/system/cache/page.tsx` | new | F-2 |
| `apps/web/app/admin/system/cache/page.test.tsx` | new | F-2 |
| `apps/web/server/api/routers/admin/index.ts` | edit (+system, +cache) | F-1, F-2 |
| `apps/web/lib/admin/cache-keys.ts` | edit (+CACHE_TAGS) | F-2 |
| `apps/web/components/admin/AdminSidebar.tsx` | edit (+2 링크) | F-1, F-2 |

---

## Acceptance Criteria (Slice F)

- **AC-F-1-1**: `admin.system.health()` → `{ node.version, db.connected, db.latencyMs, env[] }` 반환
- **AC-F-1-2**: DB 연결 실패 시 `{ db.connected: false, db.latencyMs: -1 }` 반환
- **AC-F-1-3**: 민감 env 키(`*SECRET*`, `*KEY*`, `*PASSWORD*`, `*TOKEN*`) → 값 `"***"` 마스킹
- **AC-F-2-1**: `admin.cache.purge({ scope: 'all' })` → 4개 prefix 태그 무효화 + AdminLog 기록
- **AC-F-2-2**: `admin.cache.purge({ scope: 'module', id: 'X' })` → `module:X` 태그만 무효화
- **AC-F-2-3**: 비관리자 `system.*`, `cache.*` 호출 → UNAUTHORIZED

---

## Deferred to Slice G+

- REQ-ADMIN-031 cross-level DnD (parent 변경 드래그)
- REQ-ADMIN-040~042 Widget system
- REQ-ADMIN-090~093 Import/export
- REQ-ADMIN-100~101 Admin favorites
- REQ-ADMIN-023 2FA 강제

---

Version: 1.0.0
Created: 2026-05-16
