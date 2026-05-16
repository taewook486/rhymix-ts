# SPEC-ADMIN-001 Slice A — 진행 현황

## 상태: COMPLETE

## 완료 날짜: 2026-05-17

---

## 구현 범위

### 스키마 변경 (packages/db/prisma/schema.prisma)

- **Domain**: `hostname @db.Citext`, `forceHttps`, `defaultLanguage`, `defaultTimezone`, `indexModuleInstanceId`, `settings`, `createdAt`, `updatedAt` 추가
- **ModuleInstance**: `module` → `moduleCode` 리네임, `@@unique([siteId, mid])` 복합 유니크로 교체, `name` 필드 추가
- **ModuleConfig** (신규): 1:1 split from ModuleInstance, `config Json`, `updatedAt`
- **Menu** (신규): `siteId`, `title`, `isAdminMenu`, `listOrder`
- **MenuItem** (신규): 자기 참조 트리 ("MenuItemTree"), `menuId`, `parentId`, 레이아웃 필드 일체
- **AdminLog** (신규): BigInt PK, `actorId`, `action`, `target`, `diff Json`, `ip`, `userAgent`, `createdAt @db.Timestamptz`
- **AdminFavorite** (신규): `memberId` FK(User), `label`, `href`, `icon`, `listOrder`

### Migration

- `20260516120000_autologin_token_hash`: 플레이스홀더(no-op) — DB 이력 정합성용
- `20260517000000_add_admin_foundation_models`: 수동 작성 및 Node.js pg client로 직접 적용

### 도메인 레이어 (packages/core/src/modules/)

| 파일 | 설명 |
|------|------|
| `errors.ts` | 7종 에러 클래스 (MidInvalidError, MidLengthError, MidReservedError, MidConflictError, IndexModuleProtectedError, ModuleNotRegisteredError, DuplicateModuleError) |
| `types.ts` | ModuleDefinition 플러그인 인터페이스, ModuleLifecycleContext, PrismaTransactionClient |
| `mid-validator.ts` | validateMid — 4단계 검증 (길이→패턴→예약어→DB), RESERVED_MIDS 12종 |
| `registry.ts` | registerModule, getModule, listModules, resetRegistry |
| `module-instance-service.ts` | createModuleInstance, deleteModuleInstance, getModuleInstanceByMid |
| `index.ts` | barrel exports |

### 테스트 (23개 통과 / 6개 SKIP_DB_TESTS)

| 파일 | 테스트 수 | 커버 REQ |
|------|-----------|----------|
| `mid-validator.test.ts` | 10 | REQ-ADMIN-001~003 |
| `registry.test.ts` | 5 | 레지스트리 등록/조회/중복 |
| `module-instance-service.test.ts` | 8 단위 (6 DB skip) | REQ-ADMIN-004~007 |

---

## 결정 사항 (Pre-Flight)

| 항목 | 결정 |
|------|------|
| AdminLog vs AuditLog | AdminLog = 별도 테이블 (BigInt PK, target: String, diff: Json) |
| ModuleInstance.mid unique | 글로벌 `@unique` 제거 → `@@unique([siteId, mid])` 복합 유니크 |
| 도메인 코드 위치 | `packages/core/src/modules/` |

---

## 타입체크 결과

```
pnpm --filter @rhymix-ts/core exec tsc --noEmit  → 0 errors
pnpm --filter @rhymix-ts/db exec tsc --noEmit    → 0 errors
```

## 전체 테스트 결과

```
Test Files: 45 passed
Tests:      405 passed | 9 skipped (414)
```

---

## 다음 단계: Slice B

- Next.js App Router 연동 (tRPC endpoint)
- 관리자 UI (모듈 인스턴스 목록/생성/삭제 페이지)
- onInstall/onUninstall 훅을 구현하는 실제 board 모듈
- ModuleRegistry 부트스트랩 (HMR-safe Next.js 서버 시작 시 1회 등록)
