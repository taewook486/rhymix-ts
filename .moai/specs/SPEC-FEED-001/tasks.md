## Task Decomposition
SPEC: SPEC-FEED-001

F1 결정 (승인됨): `feedConfig.itemCount`는 라우트 레이어에서 `Math.min(itemCount, 100)`으로 clamp. `listDocuments`의 `limit.max(100)`은 변경하지 않음.

| Task ID | Description | Requirement | Dependencies | Planned Files | Status |
|---------|-------------|-------------|--------------|---------------|--------|
| T-001 | `Board.feedConfig Json @default("{}")` 추가 컬럼 + 마이그레이션 (additive only) | REQ-FEED-050 | - | `packages/db/prisma/schema.prisma`, new migration | done |
| T-002 | `boardFeedConfigSchema` Zod (enabled/itemCount 1..1000/fullContent/excerptLength/description/imageUrl/copyright) + types | REQ-FEED-050 | T-001 | `packages/board/src/feed/config.ts` | done |
| T-003 | XML 안전 헬퍼: entity escape + CDATA `]]>` 방어 | REQ-FEED-017, 063 | - | `packages/board/src/feed/xml.ts`, `__tests__/xml.test.ts` | done |
| T-004 | 공유 feed-builder (RSS2.0+Atom1.0 매핑, 날짜포맷, full/excerpt, category/tags, comment link, channel meta) | REQ-FEED-006,010-018,021 | T-002, T-003 | `packages/board/src/feed/build-feed.ts`, `__tests__/build-feed.test.ts` | done |
| T-005 | RSS route handler (인스턴스 resolve, enabled/guest/PUBLIC 게이트, itemCount clamp(F1), builder 호출) | REQ-FEED-001,002,004,005,020,022,030-034 | T-004 | `apps/web/app/[mid]/rss/route.ts` | done |
| T-006 | Atom route handler (builder format:'atom' 위임) | REQ-FEED-003 | T-005 | `apps/web/app/[mid]/atom/route.ts` | done |
| T-007 | 가시성/보안 테스트 (SECRET/TEMP 부재, disabled/guest→404, 민감필드 없음) | REQ-FEED-030-034,062 | T-005, T-006 | `packages/board/src/feed/__tests__/visibility.test.ts` | done |
| T-008 | 라우트 캐싱 (`revalidate=300` + `Cache-Control` SWR) | REQ-FEED-040,041 | T-006 | (T-005/T-006 route files) | done |
| T-009 | 캐시 태그 `feed:{instanceId}` + `emitDocumentCreated/Updated/Deleted` 구독 → `revalidateTag` | REQ-FEED-042,043 | T-008 | `packages/document/src/events.ts` wiring, feed cache module | done |
| T-010 | autodiscovery `<link rel="alternate">` (feed enabled 시) | REQ-FEED-007,033 | T-002 | `app/[mid]/page.tsx`, `app/[mid]/[id]/page.tsx`, `packages/board/src/feed/autodiscovery.ts` | done |
| T-011 | admin feed 설정 패널 (board admin shell, transactional save + cache bust) | REQ-FEED-051-054 | T-002 | `apps/web/app/admin/boards/[mid]/feed/page.tsx` + nav, `__tests__` | done |
| T-012 | e2e: enabled board(3 PUBLIC+1 SECRET) → GET rss → 200+mime+3 items+secret 부재; tsc 0-error | REQ-FEED-064,066 | T-009, T-010, T-011 | e2e spec | done |

Slice mapping: Slice A = T-001..T-007 (코어 라우트+빌더+보안) / Slice B = T-008..T-010, T-012 (캐싱+autodiscovery+e2e) / Slice C = T-011 (admin 설정, B와 병행 가능).

Methodology: TDD (RED-GREEN-REFACTOR), per `.moai/config/sections/quality.yaml` development_mode.

## Sync 시점 상태 갱신 (2026-06-20)

전체 12/12 태스크 done. T-008(캐싱 헤더)·T-011(admin 설정 패널)은 run phase 착수 시 코드 확인 결과 이미 구현되어 있었음(작성 당시 stale 상태) — 상태를 `done`으로 정정. 상세 구현 로그는 `progress.md` 참조.
