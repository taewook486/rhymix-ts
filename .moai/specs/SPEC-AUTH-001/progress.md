# SPEC-AUTH-001 Implementation Progress

Methodology: TDD (RED-GREEN-REFACTOR), slice-by-slice.

## Slice A — Foundations (2026-05-10)

Branch: `feature/auth-001-slice-a`

### Delivered

1. **Prisma schema expansion** (`packages/db/prisma/schema.prisma`)
   - Added `previewFeatures = ["postgresqlExtensions"]` and `extensions = [citext, pgcrypto]`.
   - User model expanded: citext on `userId`/`emailAddress`/`nickName`; added `passwordAlgo`, `passwordChangedAt`; new relations to AutoLogin/EmailAuthToken/MemberDevice/MemberAgreement.
   - All new auth-domain timestamp columns now use `@db.Timestamptz`.
   - New models: `AutoLogin`, `EmailAuthToken`, `MemberDevice`, `JoinFormField`, `MemberAgreement`, `LoginAttempt`, `DeniedIdentifier`, `AuditLog`.
   - New enums: `EmailAuthTokenType`, `DeniedIdentifierKind`, `LoginAttemptResult`, `PasswordPolicyLevel`.
   - `prisma validate` and `prisma generate` succeed.

2. **Argon2id password module** (`packages/auth/src/password.ts`, `password-config.ts`)
   - `hashPassword(plain, opts?)` — PHC-encoded argon2id via `hash-wasm` (Edge-runtime safe).
   - `verifyPassword(plain, encoded)` — now returns `{ valid, needsRehash }` (was `boolean`); REQ-AUTH-014 primitive.
   - `isLegacyHash(encoded)` — true for non-argon2id encoded strings.
   - `needsUpgrade(encoded)` — retained as alias of the param-comparison logic.
   - Constants centralized in `password-config.ts` (`ARGON2ID_PARAMS`, `PASSWORD_VERSION_TAG`, `PASSWORD_ALGO`).
   - Module imports no logger (REQ-AUTH-050, REQ-AUTH-055 compliance by construction).

3. **Tests** (`packages/auth/src/password.test.ts`)
   - 25 specification tests covering all 10 cases requested in the slice prompt + defensive edges.
   - Total project test count: 156 passing (1 pre-existing skip), up from 148.

### Verification

| Command | Result |
|---|---|
| `pnpm --filter @rhymix-ts/db exec prisma validate` | OK ("schema is valid") |
| `pnpm --filter @rhymix-ts/db prisma:generate` | OK (Prisma Client v6.19.3 regenerated) |
| `pnpm --filter @rhymix-ts/auth typecheck` | OK |
| `pnpm --filter @rhymix-ts/db typecheck` | OK |
| `pnpm test` | 156 passed, 1 skipped, 17 files |

### Acceptance Criteria

None of the SPEC-AUTH-001 acceptance criteria are testable end-to-end yet — Slice A is foundational (schema + crypto primitive). AC validation begins with Slice B (signup) and Slice C (login).

### Deviations from spec.md

- **User.id type**: Stayed as `Int @id @default(autoincrement())`. The SPEC sketch used `String @id @default(cuid())`. Switching now would require coordinated changes across SPEC-INSTALL-001 seed code and existing tests (all using `Int`). All FK `userId` fields in this slice are typed `Int` to match. Documented inline in `schema.prisma`.
- **passwordHash column name**: Kept as `passwordHash` (the SPEC sketch column name `password` is a PHP-Rhymix legacy term). The PHC-encoded argon2id value lives there; `passwordAlgo` column tracks algorithm metadata.
- **JoinFormField.order field**: Renamed to `fieldOrder` (Prisma reserves `order` keyword in some contexts; safer to namespace).
- **LoginAttempt.identifier** is `String?` (not hashed) — hashing is a Slice C concern; for now the column is nullable for forward compatibility.

### Open TODOs (`@MX:TODO` ledger)

Slice A introduced no `@MX:TODO` markers. The 6 SPEC Open Questions are still deferred to later slices. Two `@MX:ANCHOR` tags were added (`password.ts`, `password-config.ts`).

### Deferred (out of Slice A scope)

- tRPC procedures (signup/login/verify) — Slice B and Slice C.
- Auth.js Credentials Provider integration — Slice C.
- Server Actions (`signupAction`, `loginAction`) — Slice C.
- Admin UI (status change, group management) — Slice D.
- Email sending integration — Slice B (pending email infra SPEC).
- Migration SQL generation — coordinated with database push strategy decision.
- AutoLogin rotation logic, LoginAttempt rate limiting, AuditLog writers — Slice E and beyond.

### Next Slice

Slice B: signup pipeline (Zod schema, uniqueness checks, EmailAuthToken issuance, REQ-AUTH-010..012, AC-AUTH-010, AC-AUTH-011, AC-AUTH-012, AC-AUTH-052).

---

## Slice B — Signup Pipeline (2026-05-10)

Branch: `feature/auth-001-slice-a` (continued — Slice B builds directly on top of Slice A commit `1d445f2`).

### Delivered

1. **Token utility** (`packages/auth/src/tokens.ts`)
   - `generateToken(spec?)` — base64url, no padding, 32-byte default (43 chars).
   - `constantTimeEqual(a, b)` — timing-safe string compare; length-mismatch fast path is safe because token lengths in this SPEC are public.
   - Pure Web Crypto + Buffer fallback; Edge-runtime safe.

2. **Mail dispatcher** (`packages/auth/src/mail.ts`)
   - `MailDispatcher` interface + `MailMessage` type with `signup-verify | password-reset | email-change | security-alert` template enum.
   - `NoopMailDispatcher` — default (silent) implementation.
   - `InMemoryMailDispatcher` — test double with `sent[]` and `reset()`. Uses defensive copies on dispatch.
   - No real SMTP / Resend integration; that lives in SPEC-INFRA-001.

3. **Signup pipeline** (`packages/auth/src/signup.ts`)
   - `signup(rawInput, ctx)` pure async function:
     1. Zod validation → `VALIDATION_FAILED`
     2. NORMAL-tier password policy (length + 3-entry common-list) → `WEAK_PASSWORD`
     3. `DeniedIdentifier` check (USER_ID + NICK_NAME) → `IDENTIFIER_DENIED`
     4. Pre-check uniqueness on (userId, email, phone) → `IDENTIFIER_TAKEN`
     5. Argon2id hash via Slice A `hashPassword`
     6. `prisma.$transaction` creating User + (conditionally) EmailAuthToken + AuditLog; P2002 race → `IDENTIFIER_TAKEN`
     7. Post-commit mail dispatch (fire-and-forget — failure does NOT roll back signup)
   - Failure tuple is exactly `{ ok: false, code }` — REQ-AUTH-051 information-disclosure firewall.
   - Module imports no logger — REQ-AUTH-055.

4. **Public API** (`packages/auth/src/index.ts`)
   - Re-exports: `generateToken`, `constantTimeEqual`, `TokenSpec`, `InMemoryMailDispatcher`, `NoopMailDispatcher`, `MailDispatcher`, `MailMessage`, `MailTemplate`, `signup`, `SignupInput`, `SignupConfig`, `SignupErrorCode`, `SignupFailure`, `SignupResult`.

### Files Created / Modified

| File | Status |
|---|---|
| `packages/auth/src/tokens.ts` | new |
| `packages/auth/src/tokens.test.ts` | new |
| `packages/auth/src/mail.ts` | new |
| `packages/auth/src/mail.test.ts` | new |
| `packages/auth/src/signup.ts` | new |
| `packages/auth/src/signup.test.ts` | new |
| `packages/auth/src/index.ts` | edit (re-exports) |
| `.moai/specs/SPEC-AUTH-001/progress.md` | edit (this section) |

No Slice A files were modified. No `apps/web` files were touched. No new npm packages were added.

### Tests

- 30 new tests added (8 tokens + 5 mail + 17 signup).
- Total project tests now: **186 passing, 1 skipped** (up from 156 / 1 in Slice A).

### Verification

| Command | Result |
|---|---|
| `pnpm --filter @rhymix-ts/db exec prisma validate` | OK (schema is valid) |
| `pnpm --filter @rhymix-ts/auth typecheck` | OK |
| `pnpm --filter @rhymix-ts/db typecheck` | OK |
| `pnpm --filter @rhymix-ts/web typecheck` | Pre-existing failure in `playwright.config.ts` only — confirmed identical on Slice A baseline (`git stash` test), unrelated to Slice B |
| `pnpm test` | 186 passed, 1 skipped, 20 files |

### Acceptance Criteria

Pure-logic level (Server Action wrapper still pending → Slice C):

- **AC-AUTH-010** ✅ (citext-style case-insensitive duplicate detection — signup test #8)
- **AC-AUTH-011** ✅ (UNAUTHED + EmailAuthToken type=SIGNUP, expiresAt ≈ now+24h, mail dispatched — signup tests #2 + #14)
- **AC-AUTH-052** ✅ (DeniedIdentifier blocks both USER_ID and NICK_NAME — signup tests #6 + #7)
- **AC-AUTH-012** ❌ NOT yet — verification-link click handler is a separate function, planned as part of Slice C / D.

End-to-end ACs require Server Action / route handler layer. None of the ACs are wired through HTTP yet.

### Deviations from prompt

- **Test #4 (zod runs before policy check)** — kept as one-shot (validation rejects short passwords before policy ever runs). Behavior matches the prompt spec.
- **Test #11 plaintext-not-stored assertion** — implemented as both inequality AND `^\$argon2id\$` regex match for stronger evidence (was just inequality in prompt).
- **`fake: any` in signup.test.ts** — necessary because the `$transaction` callback receives the same fake recursively, which TypeScript cannot resolve in a literal type without an explicit annotation. Cast localized to the test file only; production `signup.ts` uses real `PrismaClient` types via `@rhymix-ts/db`.
- **PrismaClient import path** — used `@rhymix-ts/db` (workspace re-export) rather than `@prisma/client` directly. The auth package does not declare `@prisma/client` as a direct dependency; the db package does. Matches Slice A pattern in `packages/db/src/install/seed.ts`.

### Open `@MX:TODO` ledger (Slice B additions)

- `packages/auth/src/signup.ts` (line ~95) — `@MX:TODO`: STRONG / VERY_STRONG password policy not implemented in Slice B. **Reason**: SPEC REQ-AUTH-041 explicitly defers to a later slice; Slice B targets only the NORMAL tier. Resolution: future password-policy slice.

No `@MX:WARN` tags introduced. Existing `@MX:ANCHOR` tags from Slice A are preserved; two new `@MX:ANCHOR` tags added (`tokens.ts` for the single-issuance-point invariant, `signup.ts` for the single-entry-point invariant), each with a `@MX:REASON` sub-line.

### Heads-up notes for Slice C (login + Auth.js)

1. **`signup` returns `requiresEmailVerification`** — Server Action / route should redirect to a "check your inbox" page when this is true.
2. **Token verification handler does NOT exist yet** — Slice C/D needs a `verifyEmail(token)` function that finds an unconsumed SIGNUP token, checks expiry, transitions User from UNAUTHED → APPROVED, sets `consumedAt`. Use `constantTimeEqual` for the lookup if the design ever switches to authKey-hash lookups.
3. **`MailDispatcher` is decoupled** — Slice C's password-reset flow can reuse the same interface; just construct the right `MailMessage` with `template: 'password-reset'`.
4. **`verifyUrl` placeholder** — `signup.ts` emits `PLACEHOLDER:<token>` in the dispatched mail's `vars.verifyUrl`. The Server Action / API-route layer must build the real URL from the request `origin` before invoking `signup` is **NOT** the right place; instead, expose a small post-processing hook OR (cleaner) move `verifyUrl` construction into the dispatcher adapter implementation in SPEC-INFRA-001. Decision deferred.
5. **REQ-AUTH-013 / REQ-AUTH-015 (login)** — When you build login, the failure shape MUST mirror Slice B's: `{ ok: false, code: 'INVALID_CREDENTIALS' }` only, no field-name leakage, with constant-time response shaping where feasible.
6. **AuditLog `actorId: null` for signup** — Slice C login should write `LOGIN` events with `actorId = userId, targetId = userId`. The `targetId = newUser.id` convention used in Slice B reflects "anonymous actor → newly created target".
7. **`@rhymix-ts/db` does not yet expose a transaction-scoped client type alias** — when the codebase grows, consider exporting `Prisma.TransactionClient` from `packages/db/src/index.ts` so consumers can type the `tx` parameter without `unknown` casts.

### Blockers

None. All tests pass. The web typecheck failure is pre-existing (verified by `git stash` against Slice A baseline) and unrelated to Slice B.
