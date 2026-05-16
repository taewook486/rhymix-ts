# SPEC-AUTH-001 Slice E Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Split: 단일 진행 권장 — E1 (도메인 + 모델) / E2 (callback/Server 진입점 통합) 의 두 sub-slice 가 강한 데이터 결합을 가져 분리 시 RED 테스트 시점에 도메인 측 mock 을 두 번 작성해야 한다. 단일 PR 로 진행하되 *커밋 단위*로 D1/D2 처럼 (a) schema + migration, (b) 도메인 모듈 GREEN, (c) callback/middleware 통합, (d) REFACTOR 로 분리한다. 작업 도중 PR 크기가 +800 LoC 를 초과하면 그 시점에 E1/E2 로 분할 PR 을 발행한다.
Base: main = 29bdeca (Slice D1+D2 머지 완료 + EOD progress sync)

> **Note**: 이 문서는 Slice D plan (v2.0.0) 의 구조·톤을 그대로 따르며, REQ-AUTH-018/019/053 의 enforcement 구현을 위한 사전 계획이다. D1 의 `revokeAllSessions(userId, reason, ctx)` API 를 신규 reason `TOKEN_REUSE_DETECTED` 로 재사용해 토큰 도용 시 즉시 모든 세션을 무효화한다. 평문 `securityKey`/`previousKey` 컬럼은 HMAC-SHA256 해시화하여 DB 유출 시에도 토큰 평문 노출을 차단한다.

---

## Pre-Flight Findings (착수 직전 검증 필요)

D1 의 Pre-Flight 가 Q1(Adapter 호환성)으로 path 전체를 바꿔놓았던 전례를 고려해, 본 슬라이스도 다음 네 가지 가설을 *착수 직전* 에 검증한다. 각 항목의 결과는 `progress.md` 의 Slice E 섹션 첫 줄에 기록한다.

### Q1: `AutoLogin.securityKey`/`previousKey` 평문 저장의 호환성 — TBD

현재 schema (`packages/db/prisma/schema.prisma` L208-226) 는 두 컬럼을 `String @unique` 로 평문 저장한다. REQ-AUTH-053 (토큰 도용 탐지) 의 안전성을 의미 있게 만들려면 DB 유출 시에도 토큰 평문이 노출되어선 안 된다 → **HMAC 해시 도입 필요**. 다만 기존 dev DB 의 평문 행 처리 전략을 선택해야 한다.

| 후보 경로 | 요약 | 추천 |
|---|---|---|
| Path A | 모든 기존 AutoLogin 행 강제 expire (= deleteMany) — 사용자 재로그인 1회 | **권장** (단순, 안전, dev DB 한정 영향) |
| Path B | Lazy migration — verify 시점에 평문→해시 변환 | 거부 (이중 검증 로직, 도용 탐지 의미 약화) |
| Path C | dual-column 시기 (`tokenHash` 신규 추가 + 기존 컬럼 deprecate) | 거부 (Slice 범위 비대화, 다음 마이그레이션 부담) |

Slice E 는 **Path A 채택**을 권장 시작점으로 두되, 운영 데이터 존재 여부에 따라 Q1 결과로 최종 확정한다 (현재 운영 환경 없으므로 Path A 안전).

### Q2: HMAC vs SHA-256 vs bcrypt — TBD (HMAC-SHA256 권장)

토큰 검증 hot path 는 매 요청마다 발생 가능하므로 verify 비용이 작아야 한다. 또한 constant-time 비교 + DB 유출 방어가 모두 필요하다.

| 방식 | 비용 | DB 유출 방어 | 채택 적합도 |
|---|---|---|---|
| HMAC-SHA256(secret, token) | O(1) ns 단위 | 강함 (secret 없으면 평문 복원 불가) | **권장** |
| SHA-256(token) | O(1) ns 단위 | 약함 (rainbow table 가능) | 거부 |
| bcrypt(token) | O(50-100ms) | 강함 | 거부 (hot path 비용) |
| Argon2id(token) | O(100ms+) | 강함 | 거부 (hot path 비용 — 비밀번호 용도 한정) |

채택안: **HMAC-SHA256**. 토큰은 32B 랜덤 (`crypto.randomBytes(32)`) 으로 발급하고, DB 에는 `tokenHash = base64url(hmacSha256(secret, token))` 형태로 저장. secret 은 환경 변수 `AUTOLOGIN_HMAC_SECRET` (32B 이상) 로 주입한다. secret 미설정 시 **fail-closed** (issue/verify 모두 throw) 하여 silent downgrade 를 막는다.

### Q3: 쿠키 명세 — TBD

NextAuth 의 session cookie (`next-auth.session-token`) 와 충돌 없는 별도 쿠키로 발급한다.

| 항목 | 값 (제안) |
|---|---|
| 이름 | `rx_autologin` |
| Path | `/` |
| HttpOnly | true |
| Secure | true (production), false (dev with NODE_ENV !== 'production') |
| SameSite | `Lax` (이메일 링크 → 자동 로그인 가능, CSRF 방어는 NextAuth 가 별도 처리) |
| Max-Age | 365 days (1 year, REQ-AUTH-018 의 long-lived autologin) |
| 값 형식 | `<autoLoginId>.<token>` (id 는 verify 시점의 row 조회 최적화용, token 은 32B base64url) |

쿠키 값에 `autoLoginId` 를 포함시키는 이유: verify 시점에 모든 `tokenHash` 컬럼을 full scan 하지 않고 `findUnique({ id })` 로 단일 조회 후 HMAC 비교가 가능. id 노출은 보안 위험이 아니다 (token 없이는 인증 불가).

### Q4: middleware vs Server Component 진입점 — TBD (NextAuth callback 통합 권장)

Edge Runtime middleware 에서 Prisma 호출은 불가능 (Prisma Engine 은 Node.js runtime 필요). 따라서 verify/rotate 는 Node.js runtime 에서 동작하는 진입점이 필요하다.

| 후보 | 평가 |
|---|---|
| Edge middleware (`apps/web/middleware.ts`) | 거부 — Prisma 미호환 |
| NextAuth Credentials Provider `authorize` 내부 | 거부 — 수동 로그인 경로 한정, autologin 쿠키 검증 위치 부정확 |
| **NextAuth `jwt` callback (initial sign-in 분기)** | **권장** — D1 callback factory 와 동일 위치, jwt callback 은 Node.js runtime |
| 별도 API route (`/api/auth/autologin`) + client redirect | 거부 — UX 측면 추가 redirect 비용 |
| Server Component `auth()` 호출 직전 polyfill | 거부 — 모든 Server Component 에 boilerplate 필요 |

채택안: **NextAuth `jwt` callback 안에 autologin verify 단계 추가**. D1 의 `createJwtCallback` 이 이미 단일 정의 지점 (`@MX:ANCHOR`) 이므로 본 슬라이스는 그 factory 를 확장한다. user 인자가 없는 후속 요청 분기에서, `token.sub` 가 비어있고 `rx_autologin` 쿠키가 존재하면 verifyAutoLogin → rotateAutoLogin → token augmentation 순서로 처리.

단, **NextAuth callback 안에서 쿠키를 직접 set 하는 것은 next/headers 의존이며 RSC context 에서만 가능**. 따라서 회전된 신규 cookieValue 는 token 에 임시 보존한 뒤 별도 Server Action / Route Handler 가 `cookies().set(...)` 를 수행하는 패턴을 채택한다. 정확한 통합 지점은 착수 직후 next-auth v5 의 callback context 에서 `cookies()` 호출 가능 여부를 검증한 뒤 결정한다 (Open Question 으로 이관).

---

## Migration Strategy

D1 에서 `prisma migrate dev` 베이스라인이 이미 잡혀 있으므로 (init + session_revocation 두 migration 적용 완료), 본 슬라이스는 *추가 migration 1개* 만 발행한다.

- **migration name (제안)**: `add_autologin_token_hash`
- **변경 내용**:
  - `AutoLogin.securityKey String @unique` → `AutoLogin.tokenHash String @unique`
  - `AutoLogin.previousKey String? @unique` → `AutoLogin.previousTokenHash String? @unique`
  - (선택) `AutoLogin.rotatedAt DateTime? @db.Timestamptz` — 회전 grace window 채택 시. 권장은 채택 안 함 (Open Question 3).
- **데이터 처리**: Q1 결과 Path A 채택 시 migration SQL 안에 `DELETE FROM auto_logins;` 를 함께 발행하거나, migration 적용 직전 별도 명시적 step 으로 처리. dev DB 한정 안전. production 환경 등장 시 별도 운영 절차 문서화 필요.
- **SPEC-INSTALL-001 seed 호환성**: SAFE — INSTALL-001 seed 는 `AutoLogin` 행을 생성하지 않는다 (현재 schema 기준 grep 확인 필요, 착수 시 재검증).
- **command sequence**:
  - `pnpm --filter @rhymix-ts/db prisma migrate dev --name add_autologin_token_hash --create-only` → SQL 검토 (특히 DELETE 절 위치 확인) → apply.
  - dev DB drift 가 감지되면 `prisma migrate reset` (재생성 권장, 데이터 손실 허용).

---

## E — AutoLogin Rotation + Token Reuse Detection

### Goal
REQ-AUTH-018 (autologin issue), REQ-AUTH-019 (key rotation), REQ-AUTH-053 (token reuse detection) 를 완전 구현한다. 평문 secret 컬럼을 HMAC 해시 컬럼으로 마이그레이션하고, 도메인 모듈 (`packages/auth/src/autologin.ts`) 에 4개 핵심 함수 (`issueAutoLogin`, `verifyAutoLogin`, `rotateAutoLogin`, `detectTokenReuse`) 를 도입한다. 도용 감지 시 D1 의 `revokeAllSessions(userId, 'TOKEN_REUSE_DETECTED', tx)` 를 호출해 모든 세션을 즉시 무효화하고, 해당 사용자의 모든 autologin 행을 삭제한다. NextAuth `jwt` callback 안에 autologin 검증 단계를 추가해 returning visitor 가 쿠키만으로 세션을 복구할 수 있게 한다.

### Branch
`feature/auth-001-slice-e` (base: main = 29bdeca)

### REQ / AC scope
- **REQ-AUTH-018** — autologin record 생성 (fresh `tokenHash`, `previousTokenHash = null`, device fingerprint).
- **REQ-AUTH-019** — valid autologin cookie 제시 시 verify → rotate → 신규 token 발급 → 세션 수립. AC-AUTH-019 (spec.md L142-145) 의 Given-Then 시퀀스를 정밀화.
- **REQ-AUTH-053** — `securityKey`(=tokenHash) 도 `previousKey`(=previousTokenHash) 도 매칭되지 않는 쿠키 제시 시 autologin 행 전체 삭제 + 모든 세션 무효화. AC-AUTH-053 (spec.md L173-176) 의 "보안 알림 이메일" 부분은 SPEC-INFRA-001 의존으로 본 슬라이스 범위에서 제외하고, *알림 dispatcher hook 자리만 마련* 한다 (구현은 NoopMailDispatcher 호출).

신규 AC 없음. 기존 AC-AUTH-019 / AC-AUTH-053 의 *enforcement chain 정밀화* 만 수행 (spec.md 본문 수정 없음, 본 plan 의 enforcement chain 섹션이 정밀화 본문).

### Schema additions (`packages/db/prisma/schema.prisma`)

```prisma
// SPEC-AUTH-001 Slice E REQ-AUTH-018, REQ-AUTH-019, REQ-AUTH-053:
// rotating remember-me secret stored as HMAC-SHA256 hashes (cookie holds the plaintext token).
model AutoLogin {
  id                Int      @id @default(autoincrement())
  userId            Int
  tokenHash         String   @unique
  previousTokenHash String?  @unique
  ip                String
  userAgent         String   @db.Text
  deviceId          String?
  createdAt         DateTime @default(now()) @db.Timestamptz
  lastUsedAt        DateTime @default(now()) @db.Timestamptz
  expiresAt         DateTime @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("auto_logins")
}
```

- 컬럼 *이름 변경* (rename) 으로 처리 가능하나, prisma migrate 가 rename 을 자동 감지하지 못하면 drop+create 로 SQL 이 생성된다. Path A (모든 행 expire) 와 일치하므로 drop+create SQL 그대로 채택 권장.
- `tokenHash` 는 `base64url(hmacSha256(secret, plaintextToken))` 형태로 길이 43 chars (32B → base64url no-pad). `@db.VarChar(64)` 강제는 불필요 (PostgreSQL `String` = `text`).
- (Optional) `AutoLogin.rotatedAt DateTime? @db.Timestamptz` — grace window 채택 시. 현재 권장은 *채택 안 함* (도용 즉시 차단).

### Domain module signatures (`packages/auth/src/autologin.ts`)

```ts
/**
 * @MX:ANCHOR: autologin token 발급 — Server Action (login + remember-me 선택) 의 단일 진입점.
 * @MX:REASON: secret + token 생성 + HMAC + DB insert 가 한 함수에 모여야 우회로 발급이 불가능.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-018
 */
export async function issueAutoLogin(
  userId: number,
  ctx: { ip: string; userAgent: string; deviceId?: string; prisma: PrismaClient | Prisma.TransactionClient },
): Promise<{ cookieValue: string; expiresAt: Date; autoLoginId: number }>;

/**
 * @MX:ANCHOR: autologin token 검증 — jwt callback 의 hot path. 매칭 실패 + previous 매칭 시 도용 분기 발동.
 * @MX:REASON: tokenHash 와 previousTokenHash 양쪽 매칭을 한 함수가 책임져야 도용 탐지 우회가 불가.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-019, REQ-AUTH-053
 */
export async function verifyAutoLogin(
  cookieValue: string,
  ctx: { prisma: PrismaClient; now?: Date },
): Promise<
  | { kind: 'ok'; userId: number; autoLoginId: number }
  | { kind: 'reuse-detected'; userId: number; autoLoginId: number }
  | { kind: 'invalid' }
  | { kind: 'expired'; autoLoginId: number }
>;

/**
 * @MX:ANCHOR: 회전 트랜잭션 — 현재 tokenHash → previousTokenHash 이동, 신규 발급.
 * @MX:REASON: 이동/발급/lastUsedAt 갱신이 한 tx 에서 commit 되어야 다음 verify 시점에 일관성 보장.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-019
 */
export async function rotateAutoLogin(
  autoLoginId: number,
  ctx: { ip: string; userAgent: string; deviceId?: string; prisma: PrismaClient | Prisma.TransactionClient },
): Promise<{ cookieValue: string; expiresAt: Date }>;

/**
 * @MX:ANCHOR: 도용 대응 단일 진입점 — autologin 전체 삭제 + revokeAllSessions(TOKEN_REUSE_DETECTED).
 * @MX:REASON: 두 부수효과가 분리되면 한쪽만 적용된 상태에서 사용자가 새로 발급받을 위험.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-053
 */
export async function detectTokenReuse(
  userId: number,
  ctx: { prisma: PrismaClient; actorId?: number | null; mailDispatcher?: MailDispatcher },
): Promise<{ revokedAt: Date; deletedAutoLogins: number }>;
```

- `verifyAutoLogin` 의 반환 type 은 discriminated union 으로, jwt callback 이 `kind` 로 분기. `'reuse-detected'` 는 호출자가 즉시 `detectTokenReuse(userId, ctx)` 를 호출해야 함을 명시.
- `issueAutoLogin` 과 `rotateAutoLogin` 은 D1 패턴을 따라 `PrismaClient | Prisma.TransactionClient` 양쪽 수용 — login pipeline 의 메인 tx 안에서 호출 가능하도록 한다.
- HMAC secret 은 환경변수 lazy load (`process.env.AUTOLOGIN_HMAC_SECRET`). 미설정 시 throw `AutoLoginConfigError('AUTOLOGIN_HMAC_SECRET is required')`. 테스트는 `vi.stubEnv` 로 주입.

### File list (new + modified)

| File | Status | Purpose |
|---|---|---|
| `packages/db/prisma/schema.prisma` | edit | AutoLogin 컬럼 rename (securityKey→tokenHash, previousKey→previousTokenHash) |
| `packages/db/prisma/migrations/<ts>_add_autologin_token_hash/migration.sql` | new | 위 컬럼 변경 + 기존 행 expire (Path A) |
| `packages/auth/src/autologin.ts` | new | `issueAutoLogin`, `verifyAutoLogin`, `rotateAutoLogin`, `detectTokenReuse` 4개 함수 + HMAC 헬퍼 |
| `packages/auth/src/autologin.test.ts` | new | RED first — 12+ tests (아래 Test plan 참조) |
| `packages/auth/src/index.ts` | edit | re-exports (autologin 4종 + 관련 타입) |
| `apps/web/lib/auth/callbacks.ts` | edit | jwt callback 에 autologin verify 분기 추가 (`token.sub` 미존재 + 쿠키 존재 시) |
| `apps/web/lib/auth/callbacks.test.ts` | edit | autologin happy path + reuse-detected + invalid 분기 회귀 |
| `apps/web/lib/auth/autologin-cookie.ts` | new | cookie set/get 헬퍼 (next/headers `cookies()` wrapper, Server Action / Route Handler 에서 사용) |
| `apps/web/lib/auth/login-actions.ts` | edit | login Server Action 에서 `remember=true` 체크박스 시 `issueAutoLogin` 호출 후 `autologin-cookie.set(...)` |
| (선택) `apps/web/app/api/auth/autologin-refresh/route.ts` | new | rotate 후 신규 cookieValue 를 set 하는 dedicated Route Handler — Q4 결과로 결정 |
| `.moai/specs/SPEC-AUTH-001/progress.md` | append | Slice E 결과 섹션 |

### Test plan (RED first, 약 14+ tests)

`packages/auth/src/autologin.test.ts`:

1. **issueAutoLogin happy path** — userId, ip, userAgent 입력 시 `cookieValue` 가 `<id>.<43-char-base64url>` 형태로 반환, DB 에 `tokenHash` 행 1개 생성, `previousTokenHash = null`, `expiresAt = createdAt + 365d`.
2. **issueAutoLogin — HMAC secret 누락** — `AUTOLOGIN_HMAC_SECRET` 미설정 시 `AutoLoginConfigError` throw (fail-closed).
3. **issueAutoLogin — 외부 tx 모드** — `Prisma.TransactionClient` 전달 시 nested tx 열지 않고 외부에서 commit (D1 패턴 회귀 검증).
4. **verifyAutoLogin happy path** — issue 한 cookieValue 를 그대로 verify → `{ kind: 'ok', userId, autoLoginId }` 반환.
5. **verifyAutoLogin — 만료된 행** — `expiresAt < now` 인 행에 매칭되는 쿠키 → `{ kind: 'expired', autoLoginId }`.
6. **verifyAutoLogin — invalid format** — cookieValue 가 `<id>.<token>` 형태가 아니면 `{ kind: 'invalid' }`. DB 조회 발생 안 함.
7. **verifyAutoLogin — id 는 매칭되지만 hash 미일치 (조작 시도)** — `{ kind: 'invalid' }`. (도용은 previousTokenHash 매칭일 때만 발동, 조작은 단순 거부.)
8. **rotateAutoLogin happy path** — 회전 후 `tokenHash` 신규, `previousTokenHash = 이전 tokenHash`, `lastUsedAt` 갱신, 신규 cookieValue 반환.
9. **rotateAutoLogin — 두 번 회전** — 두 번째 회전 시 `previousTokenHash` 가 *직전* tokenHash 로 갱신 (older history 는 보존하지 않음).
10. **issue → rotate → verify(old token)** — 회전 후 이전 cookieValue 로 verify → `{ kind: 'reuse-detected', userId, autoLoginId }` (previousTokenHash 매칭).
11. **detectTokenReuse — 모든 autologin 삭제 + revokeAllSessions(TOKEN_REUSE_DETECTED)** — 호출 후 해당 user 의 autoLogin 행이 0개, `SessionRevocation` row 1개 with `reason='TOKEN_REUSE_DETECTED'`, AuditLog `TOKEN_REUSE_DETECTED` 1개. mailDispatcher 가 1회 호출됨 (보안 알림 hook).
12. **detectTokenReuse — 외부 tx 모드** — D1 패턴 회귀 검증 (`revokeAllSessions` 에 tx 전달).
13. **constantTimeEqual 사용 검증** — verifyAutoLogin 의 hash 비교가 `crypto.timingSafeEqual` (또는 `constantTimeEqual` from tokens.ts) 를 사용하는지 검증 (mock spy).
14. **tokenHash uniqueness — extremely unlikely collision** — 같은 secret + 같은 평문 token 으로 두 번 발급 시도 시 unique constraint 충돌 → issue 측에서 retry 1회 후 실패 (defensive). 32B 랜덤으로는 사실상 발생 불가하나 시뮬레이션.

`apps/web/lib/auth/callbacks.test.ts`:

15. **jwt callback — autologin happy path** — `token.sub` 없음 + `rx_autologin` 쿠키 존재 시 verifyAutoLogin → rotateAutoLogin → `token.sub`, `token.iat` 주입 후 token 반환.
16. **jwt callback — autologin reuse-detected** — verifyAutoLogin 이 `'reuse-detected'` 반환 시 `detectTokenReuse(userId)` 호출 후 `null` 반환 (토큰 거부, 사실상 로그아웃).
17. **jwt callback — autologin invalid** — `'invalid'` 또는 `'expired'` 반환 시 token 변형 없이 그대로 반환 (anonymous 흐름 유지, 쿠키 정리는 별도 Server Action 가 수행).
18. **jwt callback — D1 revocation 회귀** — autologin 분기가 D1 revocation 검사를 우회하지 않는지 검증 (autologin 으로 세션 복구된 token 도 다음 요청에서 `isSessionRevoked` 가 true 면 거부).

### Verification
- `pnpm --filter @rhymix-ts/db prisma migrate dev --name add_autologin_token_hash --create-only` → SQL 검토 (특히 데이터 expire 처리) → apply
- `pnpm --filter @rhymix-ts/db prisma validate`
- `pnpm --filter @rhymix-ts/auth typecheck && pnpm --filter @rhymix-ts/auth test`
- `pnpm --filter web typecheck && pnpm --filter web test`
- `pnpm test` (전 워크스페이스, 291 + 신규 14+ 테스트 모두 통과)
- 회귀: Slice A~D 의 기존 291 테스트 전부 통과 유지.

### Dependencies
- D1 의 `revokeAllSessions(userId, reason, ctx)` API — `'TOKEN_REUSE_DETECTED'` reason 추가 필요. `RevocationReason` union 에 *5번째 값으로 추가* (D1 spec 의 4종 union 을 5종으로 확장). `session-revocation.ts` 의 module-level comment 도 함께 갱신.
- D1 의 `createJwtCallback(deps)` factory — autologin 분기를 *내부 helper* 가 아닌 *주입 가능한 옵션* 으로 추가 (`deps.verifyAutoLogin` / `deps.detectTokenReuse` / `deps.rotateAutoLogin`) — 단위 테스트의 결정성 보장. 기본값은 production 구현.
- `packages/auth/src/tokens.ts` 의 `generateToken` / `constantTimeEqual` 재사용.
- `packages/auth/src/mail.ts` 의 `MailDispatcher` interface 재사용 (보안 알림 hook).
- 외부 신규 의존성 없음 (Node.js 내장 `crypto.createHmac`, `crypto.randomBytes`, `crypto.timingSafeEqual`).

---

## REQ-AUTH-053 enforcement chain (정밀화)

D1 의 status-change enforcement chain 과 동일한 형식으로 토큰 도용 시 end-to-end 시퀀스를 명시한다.

1. **공격자 또는 도난 디바이스가 `rx_autologin` 쿠키와 함께 요청 발생** (예: 회전 후 이전 cookieValue 로 재시도). cookieValue 형식 `<id>.<token>`.
2. **NextAuth jwt callback 진입** — `token.sub` 없음 + `rx_autologin` 쿠키 존재 → autologin 분기 진입.
3. **verifyAutoLogin 호출** — `findUnique({ id })` 로 row 조회 → HMAC 계산 → `tokenHash` 비교 (constant-time, 불일치) → `previousTokenHash` 비교 (constant-time, **일치**) → `{ kind: 'reuse-detected', userId, autoLoginId }` 반환.
4. **detectTokenReuse 발동** — 트랜잭션 안에서:
   - `prisma.autoLogin.deleteMany({ where: { userId } })` — 해당 사용자의 모든 autologin 행 삭제 (도난 토큰만이 아니라 *모든* 회전 chain 폐기).
   - `revokeAllSessions(userId, 'TOKEN_REUSE_DETECTED', { prisma: tx, actorId: null })` — D1 API 호출. 이 호출이 한 트랜잭션에서:
     - `SessionRevocation` row 1개 추가 (reason=`TOKEN_REUSE_DETECTED`).
     - `User.sessionsRevokedAt` 갱신 (fast-path).
     - `AuditLog` `SESSION_REVOKED` 1개 + `TOKEN_REUSE_DETECTED` 1개 기록.
   - `mailDispatcher.send(...)` 호출 — 보안 알림 이메일 hook. SPEC-INFRA-001 의존이므로 NoopMailDispatcher 가 기본값. AC-AUTH-053 의 "보안 알림 이메일" 요구는 *hook 호출* 까지만 본 슬라이스가 책임.
5. **jwt callback 이 null 반환** — NextAuth 가 토큰 거부, 세션 미발급.
6. **다음 요청에서 D1 enforcement 적용** — 만약 공격자가 별개 경로 (예: 도난한 JWT) 로 세션을 보유했더라도, `isSessionRevoked(userId, tokenIat)` 가 `sessionsRevokedAt > tokenIat` 로 true 반환 → 토큰 거부. D1 chain 재사용.
7. **정상 사용자의 다음 로그인** — 비밀번호로 정상 로그인 시 신규 autologin issue (모든 이전 행은 4번에서 삭제됨). 즉 도용 감지 = "모든 디바이스 강제 재로그인" 효과.

### 보안 불변식 (정밀화)
- **constant-time 비교**: `tokenHash` / `previousTokenHash` 비교는 반드시 `crypto.timingSafeEqual` (또는 `constantTimeEqual` from tokens.ts) 사용. `===` 사용 금지.
- **HMAC secret 노출 방지**: `AUTOLOGIN_HMAC_SECRET` 은 `.env*` 파일 한정. 로그/에러 메시지/AuditLog 어디에도 포함 금지. REQ-AUTH-055 (시크릿 로깅 금지) 회귀.
- **token plaintext 로깅 금지**: cookieValue / 평문 token 은 어떤 logger 도 받지 않는다 — autologin.ts 는 logger 의존성 자체를 import 하지 않는다 (D1 session-revocation.ts 와 동일 정책).
- **fail-closed**: HMAC secret 미설정, cookieValue 형식 오류, DB 오류 — 모든 예외 상황은 "인증 실패" 로 처리 (token 거부). 절대 통과시키지 않는다.

---

## Heads-up notes for Slice F

이 슬라이스 완료 후 Slice F 로 이월되는 항목 (Slice D plan 의 Deferred 섹션을 상속하고 본 슬라이스의 결과를 반영):

- **REQ-AUTH-016/017** password reset flow — 별도 슬라이스. password reset 완료 시 *현재 사용자의 모든 autologin 행 삭제* 가 본 슬라이스 결과물(`autoLogin.deleteMany`) 위에서 단순화됨.
- **REQ-AUTH-032** password force change after N days → Slice F 또는 후속.
- **REQ-AUTH-033** IP rate limiting reject 로직 → 별도 슬라이스 (LoginAttempt 활용).
- **REQ-AUTH-034 후속** admin role 토글 (현재는 `is_admin` 직접 변경 + group 멤버십, 추후 admin grant/revoke Server Action 분리).
- **RBAC 클레임 풍부화** (`session.user.isAdmin` + `groups` 클레임 jwt callback augmentation) — Slice D2 의 `resolveAdminPrivilege` 위에 callback 통합.
- **`SessionRevocation.reason` enum 승격** — 본 슬라이스 완료 시점에 reason 5종 (`STATUS_CHANGED`, `ADMIN_FORCE_LOGOUT`, `PASSWORD_CHANGED`, `USER_LOGOUT_ALL`, `TOKEN_REUSE_DETECTED`) 확보. 사용 패턴이 안정되었으므로 Slice F 에서 Prisma enum 화 검토.
- **retention/hard delete cron** (DELETED 회원 90일 후 hard delete) → 인프라 SPEC 의존.
- **보안 알림 메일 실 발송** — 본 슬라이스의 `mailDispatcher` hook 자리에 SPEC-INFRA-001 의 SMTP dispatcher 주입.
- **Redis 기반 autologin 캐시** — `findUnique` hot path 최적화, 운영 데이터 기반 필요성 평가.
- **multi-device autologin 분석** — `MemberDevice` 와 autologin row 의 연계 (현재는 `deviceId` 컬럼만 활용, trusted device 정책 미적용).

---

## Risks

| 리스크 | 영향 | 완화 |
|---|---|---|
| **HMAC secret rotation 정책** | 운영 환경에서 `AUTOLOGIN_HMAC_SECRET` 변경 시 모든 기존 autologin 무효화 | 운영 운영 시 secret rotation 절차 문서화. 본 슬라이스 범위에서는 단일 secret 고정. |
| **정상 사용자 동시 디바이스 회전 충돌** | 회전 직후 (수 ms 이내) 다른 디바이스가 이전 token 으로 요청 시 도용 오탐 | 표준 secure-cookie autologin 패턴은 grace window 없는 즉시 도용 처리 (Twitter, GitHub 동일). 본 슬라이스도 grace window *미채택* 권장. Open Question 3 으로 최종 확정. |
| **Migration Path A 부담** | 모든 활성 사용자 1회 재로그인 필요 | dev DB 한정 즉시 적용 가능. production 등장 시 별도 운영 윈도우 계획 필요. |
| **NextAuth callback 안 cookie set 제약** | next-auth v5 의 jwt callback 컨텍스트에서 `cookies().set(...)` 호출 가능 여부 불확실 | 착수 직후 검증 → 불가 시 별도 Route Handler 도입 (Q4 결과로 분기). |
| **HMAC 검증 비용 (hot path)** | 매 요청마다 HMAC 계산 + DB findUnique | HMAC-SHA256 은 ns 단위. findUnique 는 `id` PK 단일 조회로 sub-ms. 운영 데이터로 재평가. |
| **cookieValue 길이** | `<id>.<43>` ≈ 50 chars + cookie overhead. 브라우저 4KB 제한 무관 | 영향 없음 (참고용). |
| **HMAC secret 누락 silent fail** | 환경 변수 누락 시 모든 autologin 실패 | fail-closed throw 정책으로 즉시 가시화 (silent skip 금지). startup health check 추가 권장 (별도). |

---

## Open Questions — 확정 (2026-05-16)

| # | 항목 | 결정 |
|---|------|------|
| OQ-1 | HMAC secret throw 시점 | **첫 호출 시 lazy throw** (`AutoLoginConfigError`). import 시 아님. 테스트 격리 유지. |
| OQ-2 | 평문→해시 마이그레이션 | **Path A** — 기존 모든 autologin 행 강제 expire (`expiresAt = NOW()`). dev 환경, 운영 데이터 없음. |
| OQ-3 | Grace window | **미채택** — 회전 후 이전 토큰 즉시 도용 처리. 표준 패턴 (Twitter, GitHub 동일). |
| OQ-4 | 쿠키 set 통합 지점 | **Route Handler** `/api/auth/autologin-refresh` — jwt callback 에서 쿠키 set 불가(Edge 제약). 클라이언트가 페이지 진입 시 호출. |
| OQ-5 | mailDispatcher | **NoopMailDispatcher 기본값** — 실 발송은 SPEC-INFRA-001 에서. detectTokenReuse 시그니처에 dispatcher 인자 포함 (default = Noop). |
| OQ-6 | RevocationReason 확장 | **Slice E PR 에 포함** — `session-revocation.ts` union 에 `'TOKEN_REUSE_DETECTED'` 1-line 추가. D1 회귀 테스트 영향 없음 (union 확장, backward compatible). |
| OQ-7 | cookieValue 구분자 | **`.`** — `<id>.<token>` 형식. base64url charset (A-Za-z0-9-_) 과 충돌 없음. `split('.', 2)` 파싱. |

---

Version: 1.1.0
Created: 2026-05-16
Updated: 2026-05-16 (Open Questions 1~7 전체 확정)
Author: manager-spec via /moai plan SPEC-AUTH-001 Slice E
Base: main = 29bdeca (Slice D1+D2 머지 + EOD sync 완료)
Status: **ready** — 모든 Pre-Flight Findings + Open Questions 확정. `/moai run SPEC-AUTH-001 Slice E` 착수 가능.
