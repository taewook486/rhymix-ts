# SPEC-AUTH-001 Slice D Plan

Status: planning (revised 2026-05-10)
Methodology: TDD (RED-GREEN-REFACTOR)
Split: D1 (Session Revocation Foundation) + D2 (Admin Features)
Base: main = 3d43f3e (Slice A/B/C 완료 + Slice D plan v1.0.0)

> **Note**: 이 문서는 v2.0.0 개정판이다. v1.0.0의 Auth.js PrismaAdapter 도입 경로는 pre-flight Q1 결과로 폐기되었으며, JWT 유지 + 세션 denylist (Path D) 경로로 전면 재설계되었다. 자세한 사유는 아래 "Pre-Flight Findings" 섹션 참조.

---

## Pre-Flight Findings (2026-05-10)

Slice D 착수 직전 수행한 사전 검증에서 다음 세 가지 항목을 점검했다.

### Q1: Auth.js v5 PrismaAdapter와 `User.id Int` 호환성 — INCOMPATIBLE

`@auth/core@0.41.2`는 `AdapterUser.id`, `AdapterAccount.userId`, `AdapterSession.userId` 및 모든 Adapter 메소드 파라미터를 `string`으로 strict하게 타입 정의한다. 본 프로젝트는 SPEC-INSTALL-001 호환성 유지를 위해 Slice A에서 의도적으로 `User.id Int @default(autoincrement())`를 채택했다. 따라서 `@auth/prisma-adapter`는 다음 두 경로 중 하나 없이는 사용 불가:

- 경로 1: `User.id`를 `String`으로 마이그레이션 — **거부** (Slice A 결정 번복, INSTALL-001 seed 영향)
- 경로 2: 자체 어댑터 작성 (string ↔ int 변환 wrapper) — **거부** (Auth.js 내부 타입 호환성 부담, 유지보수 비용)

**채택 경로 — Path D: JWT 유지 + 세션 denylist.**

| 후보 경로 | 요약 | 채택 여부 |
|---|---|---|
| Path A | User.id를 String으로 마이그레이션 후 PrismaAdapter 적용 | 거부 (Slice A 번복, seed 영향) |
| Path B | 자체 어댑터 작성 (Int ↔ string 변환 wrapper) | 거부 (Auth.js 내부 타입 호환성, 유지비용) |
| Path C | Auth.js 포기, 직접 세션 관리 구현 | 거부 (이미 Slice C에서 Auth.js v5 통합 완료, 회귀 비용 큼) |
| Path D | **JWT 전략 유지 + 세션 denylist 테이블로 무효화** | **채택** |
| Path E | Redis 기반 세션 저장소 + Auth.js 외부 어댑터 | 거부 (인프라 추가, 본 프로젝트 범위 초과) |

Path D 채택 사유: (1) Slice A~C에서 검증된 JWT 전략을 그대로 유지해 회귀 위험 최소화, (2) `SessionRevocation` 테이블 + jwt callback의 timestamp 비교만으로 REQ-AUTH-020 enforcement 충족, (3) 추가 인프라 없이 Postgres만으로 구현 가능, (4) `@auth/prisma-adapter` 의존성 제거로 npm 의존성 단순화.

### Q2: Migration baselining — NEEDS_BASELINING

Slice A~C는 `prisma db push`로 schema 동기화만 수행했고 `packages/db/prisma/migrations/` 디렉터리는 비어 있다. Slice D1에서 `prisma migrate dev`를 도입하면서 첫 migration이 누적 schema 전체를 squash해야 한다. → **D1에서 init migration으로 처리.**

### Q3: SPEC-INSTALL-001 seed 호환성 — SAFE

INSTALL-001의 시드 스크립트는 `User.id`를 Int autoincrement로 가정하며, 본 Slice D는 `User.id` 타입을 변경하지 않는다 (Path D 선택의 직접적 결과). `SessionRevocation` 신규 테이블 추가는 seed에 영향 없음. → **추가 작업 불필요.**

---

## Migration Strategy

Slice A부터 Slice C까지는 `prisma db push`로 schema 동기화만 수행해 왔으며, 정식 migration 디렉터리(`packages/db/prisma/migrations/`)는 존재하지 않는다. Slice D1에서 `prisma migrate dev`를 도입하면서 다음 정책을 따른다.

- **첫 migration (init)**: Slice A~C 시점의 누적 스키마(User, EmailAuthToken, AutoLogin, MemberDevice, LoginAttempt, AuditLog 등 기존 모델)를 squash하여 단일 init migration으로 발행한다. 이전 dev DB는 재생성을 권장한다 (drift 가능성).
- **이후 변경**: 모든 schema 변경은 별도 migration 파일로 발행 (`prisma migrate dev --name ...`). dev에서는 `--create-only`로 SQL을 검토한 후 적용한다.
- **D1의 두 번째 migration**: `SessionRevocation` 모델 + (선택적) `User.sessionsRevokedAt` 컬럼 추가.
- **SPEC-INSTALL-001 seed와의 호환성**: Q3에서 SAFE 확인 완료. `User.id` 타입 불변, 신규 테이블만 추가되므로 seed 영향 없음.
- **production migration**: D1 머지 이후 운영 환경 (있다면)에서는 `prisma migrate deploy`로 일관 적용. dev/prod schema drift는 CI에서 `prisma migrate diff`로 감지.

---

## D1 — Session Revocation Foundation

### Goal
JWT 전략을 유지한 채로 REQ-AUTH-020 enforcement *기반*을 마련한다. 세션 무효화는 `SessionRevocation` denylist 테이블에 row를 기록하고, jwt/session callback이 매 요청마다 이 테이블을 조회해 토큰 발급 시각(`token.iat`)이 최신 revocation 시각보다 이전이면 토큰을 거부하는 방식으로 구현한다. 실제 admin trigger는 D2에서 구현하지만, denylist 자체와 callback 통합은 D1에서 완료한다. 또한 Q2 결과에 따라 migration baselining(누적 squash → init migration)을 D1에서 도입한다.

### Branch
`feature/auth-001-slice-d1` (base: main = 3d43f3e)

### REQ / AC scope
- REQ-AUTH-020 enforcement *메커니즘* (admin trigger는 D2이나 denylist 자체와 callback 통합은 D1에서 완료)
- Migration baselining (Q2 finding) — 첫 `prisma migrate dev` migration이 Slice A 이후 모든 schema state를 squash
- 새 AC 없음. 기존 AC와의 회귀 검사만 수행 (Slice C jwt/session callback 동작 보존).

### Schema additions (`packages/db/prisma/schema.prisma`)

```prisma
model SessionRevocation {
  id        Int      @id @default(autoincrement())
  userId    Int
  revokedAt DateTime @default(now()) @db.Timestamptz
  reason    String   // STATUS_CHANGED | ADMIN_FORCE_LOGOUT | PASSWORD_CHANGED | USER_LOGOUT_ALL

  @@index([userId, revokedAt])
}
```

- `reason` 컬럼은 처음에는 `String` (문자열 컨벤션)으로 시작하고, D2/E에서 사용 패턴이 안정되면 enum으로 승격을 검토한다. 컨벤션 4종: `STATUS_CHANGED`, `ADMIN_FORCE_LOGOUT`, `PASSWORD_CHANGED`, `USER_LOGOUT_ALL`.
- (Optional, 성능) `User.sessionsRevokedAt DateTime? @db.Timestamptz` 비정규화 컬럼 — Open Question에서 채택 여부 결정. 채택 시 매 요청마다 `SessionRevocation` 테이블 JOIN 대신 `User` row 한 번 읽기로 처리 가능.

### File list (new + modified)

| File | Status | Purpose |
|---|---|---|
| `packages/db/prisma/schema.prisma` | edit | + SessionRevocation 모델 |
| `packages/db/prisma/migrations/<ts>_init/migration.sql` | new | Q2 baseline migration (Slice A~C 누적 schema squash) |
| `packages/db/prisma/migrations/<ts>_session_revocation/migration.sql` | new | SessionRevocation 모델 (+ 선택적 User.sessionsRevokedAt) |
| `packages/auth/src/session-revocation.ts` | new | pure functions: `revokeAllSessions(userId, reason, ctx)`, `isSessionRevoked(userId, tokenIat, ctx)` |
| `packages/auth/src/session-revocation.test.ts` | new | RED first |
| `apps/web/lib/auth/config.ts` | edit | jwt callback에서 revocation 검사 → token.iat 와 latest revocation 비교; session callback도 short-circuit |
| `apps/web/lib/auth/config.test.ts` | new (또는 edit) | jwt/session callback 회귀 테스트 |
| `packages/auth/src/index.ts` | edit | re-exports (`revokeAllSessions`, `isSessionRevoked`) |
| `.moai/specs/SPEC-AUTH-001/progress.md` | append | Slice D1 결과 섹션 |

### Test plan (RED first, 약 12+ tests)

1. `revokeAllSessions(userId, reason, ctx)` — `SessionRevocation` row를 1개 작성하고, 작성된 row를 반환한다.
2. 다중 revocation은 누적된다 — 같은 userId에 대해 두 번 호출 시 row 2개가 생성되고 history가 보존된다 (latest가 enforcement에 사용됨).
3. `isSessionRevoked(userId, tokenIat, ctx)` — 최신 `SessionRevocation.revokedAt > tokenIat`이면 `true` 반환.
4. `isSessionRevoked` — revocation이 전혀 없는 user는 `false` 반환.
5. `isSessionRevoked` — token이 최신 revocation 이후에 발급된 경우 `false` 반환 (시간 비교 정합성: `tokenIat >= latestRevokedAt`이면 미차단).
6. jwt callback — revocation 검사가 양성이면 `null`을 반환해 토큰 거부.
7. session callback — revocation 검사가 양성이면 `null`을 반환 (다음 요청부터 사실상 로그아웃 효과).
8. AuditLog — `revokeAllSessions` 호출 시 `SESSION_REVOKED` 이벤트가 기록됨 (actorId/targetId/reason 포함).
9. Idempotency — `revokeAllSessions`를 짧은 간격으로 두 번 호출해도 row는 2개가 생기되 enforcement 결과는 동일 (가장 최신 row가 기준).
10. Performance — `(userId, revokedAt)` 인덱스 존재 검증 (prisma raw query introspection: `pg_indexes` 조회).
11. Migration `init` — `prisma migrate dev --name init --create-only`로 생성된 SQL이 Slice A~C 누적 schema를 빠짐없이 적용 (User, EmailAuthToken, AutoLogin, MemberDevice, LoginAttempt, AuditLog 등 모든 모델 + 인덱스/제약).
12. Migration `session_revocation` — `init` 위에 클린하게 적용되고 `SessionRevocation` 테이블 + 인덱스가 생성됨.

(추가 — 채택 시) 13. `User.sessionsRevokedAt` 비정규화 — `revokeAllSessions` 호출 시 `User.sessionsRevokedAt`도 동시 갱신, jwt callback이 JOIN 없이 단일 컬럼 비교로 동작.

### Dependencies
외부 신규 의존성 없음. 순수 DB schema 추가 + 함수 추가. `@auth/prisma-adapter` 도입 계획은 폐기 (Q1 결과).

### Verification
- `pnpm --filter @rhymix-ts/db prisma migrate dev --name init --create-only` → SQL 검토 → apply
- `pnpm --filter @rhymix-ts/db prisma migrate dev --name session_revocation --create-only` → SQL 검토 → apply
- `pnpm --filter @rhymix-ts/db prisma validate`
- `pnpm --filter @rhymix-ts/auth typecheck`, `pnpm --filter @rhymix-ts/db typecheck`, `pnpm --filter web typecheck`
- `pnpm test` (전 워크스페이스, 222 + 신규 테스트 모두 통과)

### Risks
- **성능 — 매 요청마다 SessionRevocation 조회**: 인덱스 `(userId, revokedAt)`가 있어도 API 요청 hot path에 DB 호출이 추가됨. 완화책: (a) `(userId, revokedAt DESC)` 인덱스로 latest row 단일 lookup, (b) 비정규화 `User.sessionsRevokedAt` 채택, (c) 후속 SPEC에서 Redis 캐시 도입.
- **`token.iat` 가용성 — next-auth v5 jwt callback**: next-auth v5의 jwt callback이 token에 `iat` 필드를 자동 포함하는지 검증 필요. 만약 미포함 시 (a) jwt callback에서 직접 `token.iat = Math.floor(Date.now()/1000)` 설정, (b) 또는 비정규화 `User.sessionsRevokedAt` 비교 방식으로 fallback. → D1 시작 즉시 `next-auth` 소스 또는 실제 토큰 dump로 확인.
- **Existing dev DB drift**: `db push` 기반으로 만들어진 dev DB는 migration history가 없음. 첫 `prisma migrate dev --create-only`가 drift를 감지할 수 있음. 해결 옵션: (a) `prisma migrate reset` (dev DB 재생성, 데이터 손실 허용), (b) `prisma migrate resolve --applied <init-migration-name>` (baseline 처리). → 팀 dev 환경 영향 고려 후 선택, 결정사항을 `progress.md`에 기록.

---

## D2 — Admin Features (revised)

### Goal
관리자 권한 흐름 + 회원 status 변경 시 즉시 세션 무효화 + soft delete + RBAC 구현. D1에서 마련한 `SessionRevocation` denylist 위에 status 변경 → `revokeAllSessions(userId, 'STATUS_CHANGED')` → 다음 요청 차단의 enforcement chain을 완성한다. AutoLogin row 삭제는 JWT revocation과 별개로 D2에서 함께 처리한다.

### Branch
`feature/auth-001-slice-d2` (base: D1 머지 후 main)

### REQ / AC scope
- REQ-AUTH-020 (status 변경 시 세션 + autologin 즉시 무효화) — 완전 구현. 세션 무효화는 D1의 `revokeAllSessions` API 호출로, autologin 무효화는 `AutoLogin` row 삭제로 처리.
- REQ-AUTH-021 (soft delete + PII anonymize + 90일 retention)
- REQ-AUTH-034 (group 기반 admin 권한 — group.is_admin OR user.is_admin)
- REQ-AUTH-054 (마지막 admin 강등 차단)
- AC-AUTH-020, AC-AUTH-034, AC-AUTH-053(가상 ID 보호 — 강등 시도자 식별), AC-AUTH-054 충족.

### File list

| File | Status | Purpose |
|---|---|---|
| `packages/auth/src/admin.ts` | new | `changeUserStatus`, `softDeleteUser`, `restoreUser`, `demoteCheck`, `isAdmin` (group resolution 포함) |
| `packages/auth/src/admin.test.ts` | new | RED first |
| `packages/auth/src/rbac.ts` | new | `resolveAdminPrivilege(user, groups)`, `isLastAdmin(prisma)` |
| `packages/auth/src/rbac.test.ts` | new | RED first |
| `packages/auth/src/index.ts` | edit | re-exports |
| `apps/web/lib/auth/admin-actions.ts` | new | Server Actions: `setMemberStatus`, `deleteMember`, `restoreMember`, `assignGroup`, `removeGroup` |
| `apps/web/lib/auth/admin-actions.test.ts` | new | 통합 테스트 |
| `apps/web/lib/auth/middleware.ts` | new | Auth.js 미들웨어로 admin route (`/admin/*`) 보호, `isAdmin` 검사 |
| `.moai/specs/SPEC-AUTH-001/progress.md` | append | Slice D2 결과 섹션 |
| (선택) `packages/db/prisma/migrations/<ts>_soft_delete/migration.sql` | new | retention/anonymization 컬럼 (`deletedAt` 등) 필요 시 |

### Test plan (RED first, 약 20+ tests)

- `changeUserStatus(SUSPENDED)`:
  - User.status 갱신
  - `revokeAllSessions(userId, 'STATUS_CHANGED')` 호출 (D1 API 사용) — JWT revocation은 denylist 갱신으로 enforcement
  - 해당 user의 모든 AutoLogin row 삭제 (직접 prisma 호출)
  - AuditLog 기록 (action=STATUS_CHANGED, actorId, targetId)
- `changeUserStatus(DELETED)`:
  - soft delete (PII 필드 anonymize: email/userName/nickName/phoneNumber → `deleted_<id>` 또는 null)
  - status=DELETED, deletedAt set
  - `revokeAllSessions(userId, 'STATUS_CHANGED')` 호출
  - 모든 AutoLogin 삭제
  - AuditLog 기록 (action=MEMBER_DELETED)
- `restoreUser(userId)`:
  - DELETED 상태에서 복구는 retention 기간 내에만 허용
  - PII 복원 불가 (이미 anonymize됨) → 에러 또는 부분 복구
  - AuditLog (action=MEMBER_RESTORED)
- 마지막 admin 강등 시도:
  - REQ-AUTH-054 차단, 에러 코드 `LAST_ADMIN_PROTECTED`
  - AuditLog 기록 (action=ADMIN_DEMOTION_BLOCKED)
- `isAdmin(userId, prisma)`:
  - user.isAdmin=true → admin
  - user.isAdmin=false 이지만 is_admin=true 그룹 멤버 → admin (REQ-AUTH-034)
  - user.isAdmin=false 이고 admin 그룹 미소속 → not admin
- 비-admin이 admin Server Action 호출 시 차단 (`UNAUTHORIZED`)
- 90일 경과한 DELETED 회원의 hard delete 함수 (manual 호출 가능, 실제 cron은 별도 SPEC):
  - retention 통과한 row만 삭제
  - AuditLog 기록 (action=MEMBER_HARD_DELETED)
- AuditLog 이벤트 전체: STATUS_CHANGED, MEMBER_DELETED, MEMBER_RESTORED, ADMIN_DEMOTION_BLOCKED, GROUP_ASSIGNED, GROUP_REMOVED, MEMBER_HARD_DELETED, SESSION_REVOKED (D1에서 도입, D2 admin 흐름에서도 actor 컨텍스트로 기록).

### Dependencies
- D1 완료 — `revokeAllSessions`/`isSessionRevoked` API + jwt/session callback 통합. D2의 status 변경은 반드시 D1의 `revokeAllSessions`를 통해서만 세션을 무효화한다 (직접 token 조작 금지).
- AutoLogin 무효화는 D2 자체에서 prisma `deleteMany` 호출로 처리 (별도 API 추출은 사용 패턴 확인 후 결정).

### Verification
- `prisma validate`, `pnpm typecheck`, `pnpm test`
- 기존 회귀 없음 (Slice A/B/C 222 + D1 신규 테스트 모두 통과)

### Risks
- **마지막 admin 판단의 race condition**: 동시에 두 개 트랜잭션이 마지막 admin 강등을 시도하면 둘 다 통과할 수 있음. → SERIALIZABLE 격리 수준 또는 advisory lock (`SELECT pg_advisory_xact_lock(...)`) 또는 `SELECT FOR UPDATE` + COUNT 트릭 필요. D2 시작 시 결정.
- **soft delete 후 unique constraint 충돌**: `userId`/`emailAddress`가 citext + unique이므로 anonymize 후에도 고유성 유지 필요. 재가입 가능하도록 anonymize 시점에 `userId → "deleted_<timestamp>_<id>"`, `email → "deleted_<id>@deleted.invalid"` 같은 접두 패턴 사용. D2 시작 시 정책 확정.
- **AuditLog actor 식별**: admin Server Action 호출자의 `session.user.id`를 `actorId`로 기록. JWT 환경에서 `auth()` 호출이 callback chain을 거쳐 정확한 user.id를 반환하는지 D1 결과로 사전 검증됨.
- **PII anonymize 범위**: 게시물/댓글 등 외래키 보존을 위해 user row 자체는 유지하되, 어떤 필드까지 anonymize할지 결정 필요 (regdate, lastLoginIp 등). D2 시작 시 결정.

---

## Deferred (out of Slice D scope)

- REQ-AUTH-016/017 password reset flow → 별도 슬라이스 (가칭 Slice F)
- REQ-AUTH-018/019 AutoLogin rotation 로직 → Slice E
- REQ-AUTH-032 password force change after N days → Slice E 또는 후속
- REQ-AUTH-033 IP rate limiting reject 로직 → Slice E
- Admin UI (`apps/web/admin/*` pages) → Slice F 또는 별도 SPEC
- Hard delete cron 작업 → 인프라 SPEC
- Redis 기반 SessionRevocation 캐시 (성능 최적화) → 후속 SPEC, 필요성은 운영 데이터로 판단

## Open Questions

1. **next-auth v5 jwt callback의 `token.iat` 자동 포함 여부** — D1 시작 즉시 검증. 미포함 시 (a) jwt callback에서 직접 iat 주입, (b) 비정규화 `User.sessionsRevokedAt` fallback 중 택1.
2. **비정규화 `User.sessionsRevokedAt` 채택 여부 vs `SessionRevocation` JOIN trade-off** — 매 요청마다의 read 비용과 history 보존(`SessionRevocation` 테이블) trade-off. D1 시작 시 결정. 권장: 둘 다 유지 (테이블에 history 기록 + User에 latest 비정규화).
3. **Migration drift resolution 전략** — `db push` 기반 dev DB와의 drift 처리. `prisma migrate reset` (재생성) vs `prisma migrate resolve --applied` (baseline) 중 선택. D1 시작 시 결정, 결정사항을 `progress.md`에 기록.
4. **마지막 admin 차단의 격리 수준** — SERIALIZABLE vs advisory lock vs SELECT FOR UPDATE. D2 시작 시 결정.
5. **soft delete 후 unique constraint 처리 정책** — anonymize 시 unique 충돌 회피 패턴 (접두 vs 다른 컬럼 도입). D2 시작 시 결정.

---

Version: 2.0.0
Created: 2026-05-10 (v1.0.0)
Revised: 2026-05-10 (v2.0.0 — Adapter path abandoned; Path D (JWT denylist) adopted after pre-flight Q1 finding)
Author: manager-spec via /moai plan SPEC-AUTH-001 Slice D

Status (2026-05-10 EOD): D1 ✅ merged (PR #2 / 4f57664), D2 ✅ merged (PR #3 / 61aaaa4). 다음 슬라이스 (E) 계획은 별도 plan 단계에서 갱신.
