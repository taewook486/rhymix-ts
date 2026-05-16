# Rhymix-TS SPEC Index

> Rhymix CMS의 TypeScript + Next.js 16 풀스택 재설계 SPEC 모음

## 기술 스택 (확정)

| 영역 | 선택 | 비고 |
|---|---|---|
| Framework | Next.js 16 (App Router) | RSC + Server Actions |
| Language | TypeScript 5.9+ | strict mode |
| Database | PostgreSQL 16+ | JSONB, GIN, citext, tsvector |
| ORM | Prisma | greenfield schema |
| Auth | Auth.js v5 (NextAuth) | Credentials Provider 우선 |
| API | tRPC + Server Actions 혼합 | end-to-end 타입 안전 |
| UI | Tailwind CSS 4 + shadcn/ui | CSS variables 기반 테마 |
| 상태 관리 | Zustand | 클라이언트 UI 상태 (모달, 사이드바 등) — RSC 불가 영역 |
| Testing | Vitest + Playwright | TDD 기반 |

## SPEC 목록

| ID | 제목 | 우선순위 | 상태 | 라인 |
|---|---|---|---|---|
| [SPEC-INSTALL-001](./SPEC-INSTALL-001/spec.md) | Initial Installation Wizard | P0 | draft | ~330 |
| [SPEC-ADMIN-001](./SPEC-ADMIN-001/spec.md) | Admin Dashboard & Module System | P0 | in-progress (Slice A-D 완료, 447 tests) | 976 |
| [SPEC-AUTH-001](./SPEC-AUTH-001/spec.md) | Authentication & Member System | P0 | completed (Slice A-H 완료, 447 tests) | 633 |
| [SPEC-CONTENT-001](./SPEC-CONTENT-001/spec.md) | Content & Board System | P0 | draft | 751 |
| [SPEC-THEME-001](./SPEC-THEME-001/spec.md) | Theme, Layout & Skin System | P1 | draft | 656 |

**총 5개 SPEC** (EARS 형식, Prisma 스키마, tRPC API, 설치 플로우 포함)

## 의존성 그래프

```
SPEC-ADMIN-001 (Foundation)
    ├──► 모듈 인스턴스 시스템 (mid)
    ├──► 멀티 도메인 라우팅
    └──► 관리자 셸
         │
         ├─► SPEC-AUTH-001 (인증/회원)
         │       └─► 권한 매트릭스 제공
         │
         ├─► SPEC-CONTENT-001 (게시판/문서)
         │       └─► AUTH(권한) + ADMIN(모듈 인스턴스) 의존
         │
         └─► SPEC-THEME-001 (테마/레이아웃)
                 └─► ADMIN(레이아웃 할당) + CONTENT(렌더링 타겟) 의존
```

**구현 권장 순서**: ADMIN-001(Foundation) → INSTALL-001(부트스트랩) → AUTH-001 → CONTENT-001 → THEME-001

> INSTALL-001은 ADMIN-001/AUTH-001/THEME-001의 도메인 모델을 시드(seed)하는 역할이라 의존성상 늦게 보이지만, **사용자 경험 순서**로는 가장 먼저 동작해야 한다.

## 도메인 매핑 (Rhymix → Rhymix-TS)

| Rhymix 개념 | Rhymix-TS 매핑 | SPEC |
|---|---|---|
| `mid` (모듈 인스턴스) | Next.js dynamic `[mid]` 라우트 + `ModuleInstance` 테이블 | ADMIN-001 |
| `domains` (멀티사이트) | `middleware.ts` 호스트 해상도 + `Domain`/`Site` 테이블 | ADMIN-001 |
| `member.extra_vars` (PHP serialized) | Postgres JSONB + Zod 스키마 | AUTH-001 |
| `member_autologin` | 보안 토큰 회전 + 디바이스 추적 | AUTH-001 |
| `documents` + `document_extra_vars` | Document + JSONB extra_vars + extra_keys 메타 | CONTENT-001 |
| `comments` (parent_srl 트리) | 인접 리스트 + ltree 옵션 | CONTENT-001 |
| `layouts` (P/M 분리) | React Layout 컴포넌트 + ThemeAssignment | THEME-001 |
| `skins/{module}/` | 모듈 타입별 React 컴포넌트 레지스트리 | THEME-001 |
| `widgets/` (XML) | RSC 위젯 레지스트리 | ADMIN-001 + THEME-001 |

## 다음 단계

1. **이해관계자 리뷰**: SPEC 4개 검토 및 Open Questions 결의
2. **부트스트랩**: `pnpm` 모노레포 + Next.js 16 + Prisma 초기화
3. **`/moai run SPEC-ADMIN-001`**: Foundation 구현 시작 (DDD 모드 권장)
4. **순차 구현**: AUTH → CONTENT → THEME

## 참고

- 원본 Rhymix 코드베이스: `D:\project\rhymix` (PHP, Docker `localhost:8080`)
- 도메인 분석 출처: `modules/member`, `modules/board`, `modules/document`, `modules/comment`, `modules/admin`, `modules/module`, `modules/layout`, `modules/menu`, `modules/widget`
- 작성일: 2026-05-10
- 작성 모드: MoAI-ADK plan phase (병렬 manager-spec)
