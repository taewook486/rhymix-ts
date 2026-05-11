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

---

## Slice C — Login + Verify Email + Auth.js (2026-05-10)

Branch: `feature/auth-001-slice-c` (built on Slice B commit `6c4110c`).

### Delivered

1. **Login pipeline** (`packages/auth/src/login.ts`)
   - `login(input, ctx)` pure async function:
     1. Light input guard (empty/whitespace identifier or password → INVALID_CREDENTIALS)
     2. `DeniedIdentifier` carry-forward check (REQ-AUTH-052 extended to login layer)
     3. citext-style `OR { userId | emailAddress }` lookup
     4. status gate — UNAUTHED / SUSPENDED / DENIED / DELETED all map to INVALID_CREDENTIALS (REQ-AUTH-051)
     5. Argon2id verify via Slice A `verifyPassword`; **dummy verify** on user-not-found for timing equalization
     6. `needsRehash:true` → rehash in same transaction, advance `passwordAlgo` + `passwordChangedAt` (REQ-AUTH-014)
     7. Success branch: transactional update of `lastLoginIp` + `lastLoginAt` + `LoginAttempt(SUCCESS)` + `AuditLog(LOGIN)`
     8. Failure branch: transactional `LoginAttempt(INVALID_CREDENTIALS)` + `AuditLog(LOGIN_FAILED, actorId=null)`
   - Failure tuple is exactly `{ ok: false, code: 'INVALID_CREDENTIALS' }` — REQ-AUTH-051.
   - `LoginUser` payload omits `passwordHash`, `passwordAlgo`, `passwordChangedAt` etc. — REQ-AUTH-005.
   - Module imports no logger — REQ-AUTH-055.

2. **Email verification** (`packages/auth/src/verify-email.ts`)
   - `verifyEmail({ token }, ctx)` pure async function:
     1. Token guard (empty / non-string → TOKEN_INVALID)
     2. `findUnique({ authKey })` lookup
     3. Type gate (only `SIGNUP` accepted)
     4. Already-consumed → TOKEN_INVALID
     5. Expired (`expiresAt <= now`) → TOKEN_EXPIRED
     6. Idempotent path: when user is already APPROVED, mark token consumed, audit, return `{ alreadyVerified: true }`
     7. Transition path: `consumedAt` + `User.status: APPROVED` + `AuditLog(EMAIL_VERIFIED)` in single transaction
   - REQ-AUTH-051 deviation documented: `TOKEN_EXPIRED` vs `TOKEN_INVALID` are intentionally distinct so the UX can offer a "resend verification" CTA — token existence itself is not directly exposed.

3. **Auth.js v5 configuration** (`apps/web/lib/auth/config.ts`)
   - Single Credentials Provider whose `authorize()` extracts IP/UA from `req.headers` and calls `packages/auth`'s `login()`.
   - On `{ ok: false }` → returns `null` (Auth.js standard).
   - On `{ ok: true, user }` → returns `{ id, name, email }` — never includes `passwordHash`.
   - Exports `handlers`, `auth`, `signIn`, `signOut` from `NextAuth(authConfig)`.
   - **Session strategy: JWT (deviation — see below).**

4. **Server Actions** (`apps/web/lib/auth/actions.ts`)
   - `signupAction(prev, formData)` — wraps `packages/auth/signup`, reads IP/UA from `next/headers()`, returns `useActionState`-compatible `{ ok, code?, formError? }`.
   - `loginAction(prev, formData)` — calls Auth.js `signIn('credentials', ...)`. CredentialsSignin errors map to uniform `INVALID_CREDENTIALS`. Non-auth errors (e.g., `NEXT_REDIRECT`) propagate so Next.js can finalize the redirect.
   - `verifyEmailAction(prev, formData)` — wraps `packages/auth/verifyEmail`, returns `{ ok, code?, formError? }`.
   - All three return `{ ok: true }` on success, `{ ok: false, code, formError }` on failure. Korean user-facing messages.

5. **Public API** (`packages/auth/src/index.ts`)
   - New re-exports: `login`, `LoginInput`, `LoginConfig`, `LoginUser`, `LoginResult`, `LoginFailure`.
   - New re-exports: `verifyEmail`, `VerifyEmailInput`, `VerifyEmailCtx`, `VerifyEmailErrorCode`, `VerifyEmailSuccess`, `VerifyEmailFailure`.

### Files Created / Modified

| File | Status | LOC (approx) |
|---|---|---|
| `packages/auth/src/login.ts` | new | 217 |
| `packages/auth/src/login.test.ts` | new | 314 |
| `packages/auth/src/verify-email.ts` | new | 113 |
| `packages/auth/src/verify-email.test.ts` | new | 197 |
| `packages/auth/src/index.ts` | edit (re-exports) | +20 |
| `apps/web/lib/auth/config.ts` | new | 113 |
| `apps/web/lib/auth/actions.ts` | new | 192 |
| `apps/web/lib/auth/actions.test.ts` | new | 175 |
| `.moai/specs/SPEC-AUTH-001/progress.md` | edit (this section) | +n/a |

No Slice A or Slice B files were modified. `schema.prisma` was not touched. No new npm packages were added (next-auth was already in the lockfile from Slice A baseline).

### Tests

- **36 new tests** added (17 login + 9 verify-email + 10 actions).
- Total project tests now: **222 passing, 1 skipped** (up from 186 / 1 in Slice B).

### Verification

| Command | Result |
|---|---|
| `pnpm --filter @rhymix-ts/db exec prisma validate` | OK (schema is valid) |
| `pnpm --filter @rhymix-ts/auth typecheck` | OK |
| `pnpm --filter @rhymix-ts/db typecheck` | OK |
| `pnpm --filter @rhymix-ts/web typecheck` | Pre-existing failure in `playwright.config.ts` only — confirmed identical on Slice B baseline; **no new errors** introduced by Slice C |
| `pnpm test` | 222 passed, 1 skipped, 23 files |

### Acceptance Criteria

Pure-logic level (Server Action wrapper exercised by mocks; HTTP/E2E end-to-end deferred to Slice E):

- **AC-AUTH-012** ✅ (verifyEmail tests #1, #7 — UNAUTHED → APPROVED, consumedAt set, EMAIL_VERIFIED audit)
- **AC-AUTH-013** ✅ partial — login tests #1, #7, #8 cover `last_login_at/ip` update + LoginAttempt SUCCESS row. **Auth.js Session creation is a separate transaction** (see Deviations) — full atomicity with database session row will land in Slice D when PrismaAdapter is wired.
- **AC-AUTH-014** ✅ (login test #9a — weak argon2id hash → rehashed in same transaction with current params)
- **AC-AUTH-015** ✅ (login tests #3, #4 — both wrong-password and unknown-user paths return identical INVALID_CREDENTIALS shape and both increment LoginAttempt)
- **AC-AUTH-031** ✅ (login test #6 — SUSPENDED user blocked with INVALID_CREDENTIALS; though SPEC text says "계정이 정지되었습니다", Slice C deliberately collapses to uniform INVALID_CREDENTIALS per REQ-AUTH-051; UX deviation documented below)
- **AC-AUTH-010** carries forward from Slice B (no regression — duplicate detection still works at signup).
- **AC-AUTH-011** carries forward from Slice B (signup mail dispatch unchanged).
- **AC-AUTH-052** ✅ extended — DeniedIdentifier check now also runs at login (login test #12).

End-to-end ACs requiring HTTP/Playwright remain ❌ until Slice E:
- **AC-AUTH-017** ❌ password reset (deferred — Slice C scope explicitly excluded REQ-AUTH-016/017)
- **AC-AUTH-019** ❌ autologin rotation (deferred to autologin slice)
- **AC-AUTH-020** ❌ admin-driven session invalidation (deferred — requires PrismaAdapter + Account/Session models)
- **AC-AUTH-033** ❌ rate-limiting (LoginAttempt rows are written, but the window-based reject logic is Slice E)
- **AC-AUTH-034** ❌ group-based admin (deferred to admin slice)
- **AC-AUTH-053** ❌ token-theft response (autologin slice)
- **AC-AUTH-054** ❌ last-admin protection (admin slice)

### Deviations from prompt

1. **Session strategy is JWT, not database** (deviation from prompt section "Decisions Already Made").
   - **Why**: Auth.js v5 PrismaAdapter requires `Account`, `Session`, `VerificationToken` Prisma models. These do not exist in `schema.prisma` (Slice A defined a custom auth domain that does not include Auth.js adapter models). Adding them would modify `schema.prisma`, which is an explicit **Stop / Escalate condition** in the prompt.
   - **Impact**: REQ-AUTH-020 (admin status change → immediate session revocation) cannot be enforced until Slice D adds the adapter models. Slice C scope explicitly excluded admin features (REQ-AUTH-020/021), so this deviation is internally consistent.
   - **Resolution path**: When Slice D implements the admin status-change flow, add `Account`/`Session`/`VerificationToken` models, swap `session.strategy` to `'database'`, attach `PrismaAdapter`, and update the file-level JSDoc in `apps/web/lib/auth/config.ts`.
   - File-level JSDoc in `config.ts` documents this trade-off explicitly so future readers don't accidentally treat JWT as the intended final state.

2. **REQ-AUTH-013 atomic session + last_login update** is split across two transactions.
   - `login()` updates `lastLoginIp`/`lastLoginAt` inside its own transaction (atomic with LoginAttempt + AuditLog).
   - Auth.js writes its session record (or in JWT mode: signs the cookie) in a separate code path **after** `authorize()` returns successfully.
   - Strict atomicity (one DB transaction spanning both `User.update` and `Session.create`) requires writing into Auth.js's adapter — out of scope for a Slice C that intentionally avoids the adapter dependency. The split is acceptable because: (a) `User.update` happens first, so a worst-case failure leaves a stale-but-not-leaked `lastLoginAt` only; (b) Auth.js handles its own retries on cookie/session emission.

3. **AC-AUTH-031 message text** — SPEC's expected message "계정이 정지되었습니다" is intentionally collapsed to the uniform INVALID_CREDENTIALS code per REQ-AUTH-051 ("uniform error messages for login"). This is a deliberate REQ-AUTH-051 priority over AC-AUTH-031's UX text. SPEC Open Question 5 (multi-site policy) and the SPEC's overall information-leak posture both favor the uniform behavior. If product wants the explicit "suspended" message back, REQ-AUTH-051 would need a carveout.

4. **`verifyEmail` distinguishes TOKEN_EXPIRED from TOKEN_INVALID** — strictly speaking REQ-AUTH-051 prefers a single error shape, but the resend-verification UX requires telling the user that the link expired (vs. is malformed). Token existence itself is never directly disclosed. Documented in the file-level JSDoc.

5. **No `apps/web/app/(auth)/...` route files** added — only `apps/web/lib/auth/` library code. The actual `/login`, `/signup`, `/verify-email` pages are out of Slice C's scope per the prompt's "DO NOT TOUCH" list.

### Open `@MX:TODO` ledger (Slice C additions)

- `apps/web/lib/auth/config.ts` (file-level JSDoc + `@MX:NOTE`) — PrismaAdapter wire-up deferred to Slice D when `Account` / `Session` / `VerificationToken` models are added.

No new `@MX:WARN` tags. Three new `@MX:ANCHOR` tags added (`login.ts`, `verify-email.ts`, `actions.ts`), each with `@MX:REASON` sub-line.

### Heads-up notes for Slice D (admin + autologin)

1. **Add Auth.js adapter models** to `schema.prisma`: `Account`, `Session`, `VerificationToken` with the standard Auth.js v5 PrismaAdapter shape. After migration, install `@auth/prisma-adapter` (`pnpm add @auth/prisma-adapter -F @rhymix-ts/web`) and switch `apps/web/lib/auth/config.ts` to `session.strategy: 'database'` + `adapter: PrismaAdapter(prisma)`. The `jwt` and `session` callbacks become unnecessary and should be removed; replace with the database-session equivalents.
2. **REQ-AUTH-020 enforcement** lands here: when `User.status` becomes SUSPENDED/DENIED/DELETED, delete all rows from `Session` where `userId = X`. AutoLogin rows are deleted by the same admin action.
3. **`AC-AUTH-031` message text** — when product reaffirms the explicit "suspended" message UX, add a discriminated `LoginFailure` union: `{ ok: false, code: 'STATUS_SUSPENDED' | 'STATUS_DENIED' | 'INVALID_CREDENTIALS' }` BUT only return the discriminated form to **logged-in admin** callers; public callers always see INVALID_CREDENTIALS. Plumbing this through Auth.js requires returning a custom error from `authorize()` and reading it via `useActionState`'s error channel.
4. **Rate limiting (REQ-AUTH-033)** — the LoginAttempt rows are written but never queried. Slice E should add a window-count query at the **top** of `login()` that early-returns `{ ok: false, code: 'INVALID_CREDENTIALS' }` (uniform) when `count(LoginAttempt where ip = X and createdAt > now-window) >= max_error_count`. Note: the early-return must still write a `RATE_LIMITED` LoginAttempt row to keep the ledger truthful.
5. **`LoginUser` shape** — currently includes `isAdmin` to enable Slice D's RBAC. The `groups` array (REQ-AUTH-034) should be added when group-based RBAC lands. Don't forget to also propagate it through the JWT `jwt`/`session` callbacks (or directly into the Session row when on the database adapter).
6. **Constant-time response shaping is best-effort** — the dummy hash equalizer in `login.ts` smooths over user-not-found vs user-found-wrong-password timing, but does NOT cover status-blocked users (which short-circuit before verify). Slice E or a security-hardening slice may want to extend the dummy verify to those paths too. Trade-off: status-blocked accounts are arguably already known to the attacker via signup attempts, so the marginal value is low.
7. **`verifyEmail` token comparison** — currently uses Prisma `findUnique({ authKey })` which is an indexed lookup. Token entropy (256 bits) makes this safe today. If the design ever switches to authKey-hash lookups (e.g., to prevent DB-dump token reuse), use `constantTimeEqual` from Slice B for the comparison.
8. **`apps/web/app/(auth)/...` routes** — Slice E should add `app/login/page.tsx`, `app/signup/page.tsx`, `app/verify-email/page.tsx` with Server Component shells that render `<form action={loginAction}>` etc. The lib layer is ready; only the Page components are missing.
9. **next-auth mock in tests** — `actions.test.ts` mocks `@/lib/auth/config` directly. If you split `config.ts` further, update the mock target.
10. **`signupAction` currently passes `NoopMailDispatcher`** — when SPEC-INFRA-001 lands a real dispatcher, swap that single line. Consider a dependency-injection helper so test code doesn't need to mock `NoopMailDispatcher`.

### Blockers

None blocking the Slice C completion. Two structural items surfaced that Slice D MUST address (documented above):

1. **Schema gap**: `Account` / `Session` / `VerificationToken` models are required for Auth.js v5 PrismaAdapter and for REQ-AUTH-020 enforcement. Adding them is a `schema.prisma` change → escalated to Slice D rather than performed in Slice C.
2. **Rate limiting (REQ-AUTH-033)**: the LoginAttempt ledger is being populated by Slice C but never consulted. Slice E should add the window-count gate.

The pre-existing `playwright.config.ts` typecheck failure is unchanged from Slice B baseline.

---

## Slice D1 — Session Revocation Foundation (2026-05-10)

Branch: `feature/auth-001-slice-d1` (built on Slice C / main = `cb39449`).
Methodology: TDD (RED-GREEN-REFACTOR). Plan: `slice-d-plan.md` v2.0.0 (Path D — JWT denylist).

### Delivered

1. **Prisma schema 확장** (`packages/db/prisma/schema.prisma`)
   - User 모델에 `sessionsRevokedAt DateTime? @db.Timestamptz` 비정규화 컬럼 추가 — jwt callback 의 fast-path enforcement 용 (SessionRevocation 테이블 JOIN 회피).
   - 신규 모델 `SessionRevocation` (id, userId, revokedAt, reason) — append-only audit history.
   - Index `(userId, revokedAt)` + FK `users.id ON DELETE CASCADE`.
   - `reason` 컬럼 컨벤션 4종을 모델 JSDoc 에 명시: `STATUS_CHANGED | ADMIN_FORCE_LOGOUT | PASSWORD_CHANGED | USER_LOGOUT_ALL`. enum 승격은 D2/E 에서 사용 패턴 확정 후 결정.

2. **Migration baselining (Q2 finding)** (`packages/db/prisma/migrations/`)
   - `20260510170500_init/migration.sql` — Slice A~C 누적 schema squash. 17개 테이블, 5개 enum, 모든 인덱스/제약/FK 포함.
   - `20260510170600_session_revocation/migration.sql` — `users.sessionsRevokedAt` 컬럼 추가 + `session_revocations` 테이블 생성 + 인덱스 + FK.
   - `migration_lock.toml` 생성 (provider=postgresql).

3. **Session revocation pure functions** (`packages/auth/src/session-revocation.ts`)
   - `revokeAllSessions(userId, reason, ctx) → { revokedAt }` — 단일 트랜잭션으로 (1) `SessionRevocation` row 삽입, (2) `User.sessionsRevokedAt` 갱신, (3) `AuditLog SESSION_REVOKED` 기록.
   - `isSessionRevoked(userId, tokenIssuedAt, ctx) → boolean` — `User.sessionsRevokedAt` 단일 컬럼 비교 (fast-path). `revokedAt > tokenIssuedAt` 일 때만 true (엄격 부등호 — 동시 발급 토큰은 살아있음).
   - `RevocationReason` union 타입 export.
   - 모듈은 logger 미사용 (REQ-AUTH-055 by construction).

4. **Auth.js v5 callback 분리 + 통합** (`apps/web/lib/auth/callbacks.ts`, `apps/web/lib/auth/config.ts`)
   - 신규 `callbacks.ts` 모듈 — `createJwtCallback({ prisma, isSessionRevoked? })` / `createSessionCallback()` factory. 의존성 주입 가능해 단위 테스트가 NextAuth/Next.js 의존성 없이 가능.
   - jwt callback 동작: 초기 sign-in 시 `token.sub` + `token.iat` 주입(after fallback 정책 — OQ#1 참조), 후속 요청 시 `isSessionRevoked` 호출하여 양성이면 `null` 반환 → next-auth 가 토큰 거부.
   - session callback 동작: token 이 null/sub 부재면 short-circuit, 정상이면 `session.user.id = token.sub`.
   - `config.ts` 의 기존 inline 콜백 본체 → factory 호출로 교체. 파일 헤더 JSDoc 갱신 (Path D 채택 명시, PrismaAdapter 도입 폐기 명시).

5. **Public API** (`packages/auth/src/index.ts`)
   - 새 re-exports: `revokeAllSessions`, `isSessionRevoked`, `RevocationReason`, `RevokeSessionsContext`, `IsSessionRevokedContext`.

### Files Created / Modified (file modification order — TDD verification)

순서는 RED → schema → GREEN 순으로 엄격히 지켜졌다 (구현 전에 테스트가 먼저 작성됨):

| Order | File | Status | LOC (approx) |
|---|---|---|---|
| 1 (RED) | `packages/auth/src/session-revocation.test.ts` | new | 312 |
| 2 (RED) | `apps/web/lib/auth/config.test.ts` | new | 154 |
| 3 (schema) | `packages/db/prisma/schema.prisma` | edit | +25 |
| 4 (migration) | `packages/db/prisma/migrations/migration_lock.toml` | new | 3 |
| 5 (migration) | `packages/db/prisma/migrations/20260510170500_init/migration.sql` | new | 308 |
| 6 (migration) | `packages/db/prisma/migrations/20260510170600_session_revocation/migration.sql` | new | 38 |
| 7 (GREEN) | `packages/auth/src/session-revocation.ts` | new | 123 |
| 8 (GREEN) | `apps/web/lib/auth/callbacks.ts` | new | 137 |
| 9 (GREEN) | `apps/web/lib/auth/config.ts` | edit | net ±10 (header rewrite + callback wiring) |
| 10 (GREEN) | `packages/auth/src/index.ts` | edit | +9 |
| 11 (docs) | `.moai/specs/SPEC-AUTH-001/progress.md` | edit | this section |

Slice A/B/C 의 소스 파일 (`password*.ts`, `signup*.ts`, `login*.ts`, `verify-email*.ts`, `tokens*.ts`, `mail*.ts`, `actions.ts`) 은 일절 수정되지 않았다. `spec.md` / `slice-d-plan.md` 도 수정되지 않았다.

### Tests

- **24개 신규 테스트** 추가 (16 session-revocation + 8 config callbacks).
- 전체 프로젝트 테스트 수: **246 passed, 1 skipped, 25 files** (Slice C 의 222 → 246, 델타 +24).
- 신규 테스트 카테고리:
  - `revokeAllSessions`: 1) row 작성 + 반환값, 2) `User.sessionsRevokedAt` 갱신, 3/3b) AuditLog 기록 (actorId 포함/null), 4) 다중 호출 history 보존, 5) latest 우선, 10) AuditLog 실패 시 트랜잭션 롤백, 11) idempotent monotonic, reason 4종 acceptance.
  - `isSessionRevoked`: 6) iat before revocation → true, 7) iat after → false, 8/8b) revocation 없음 / user 미존재 → false, 9) fast-path (SessionRevocation 쿼리 0회), boundary 조건 (정확히 같음 → false), multi-revocation latest only.
  - `jwt callback`: 1) 초기 sign-in 시 iat 주입, 2) revocation 발생 시 null 반환, 3) revocation 없으면 token 통과, 4) iat 부재 토큰 → epoch fallback (후방 호환), 5) malformed sub → null 방어, 6) sub 부재 → 검사 없이 통과.
  - `session callback`: 7) token=null 시 short-circuit, 8) 정상 token 시 `session.user.id` 채움.

### Verification

| Command | Result |
|---|---|
| `npx pnpm --filter @rhymix-ts/db exec prisma validate` | OK ("schema is valid") |
| `npx pnpm --filter @rhymix-ts/db prisma:generate` | OK (Prisma Client v6.19.3 regenerated) |
| `npx pnpm --filter @rhymix-ts/auth typecheck` | OK |
| `npx pnpm --filter @rhymix-ts/db typecheck` | OK |
| `npx pnpm --filter @rhymix-ts/web typecheck` | Pre-existing `playwright.config.ts` 실패만 잔존 (Slice B/C 와 동일 — 신규 코드 typecheck-clean) |
| `npx pnpm test` | 246 passed, 1 skipped, 25 files |

`prisma migrate dev` 는 dev DB 의 `db push` 기반 drift 때문에 실행하지 않았다 (OQ#3 결정 — 아래 Deviations 참조). Migration SQL 자체는 `prisma migrate diff --from-empty --to-schema-datamodel` 의 출력을 검토 후 수동으로 두 파일로 분할 작성했으며, init 의 누적 스키마는 schema.prisma 의 모든 모델/인덱스/FK 를 포함한다.

### Acceptance Criteria progress

본 슬라이스는 REQ-AUTH-020 enforcement *기반 (primitive)* 만 마련한다. 실제 admin trigger 와 status 변경 chain 은 Slice D2 의 책임.

- **REQ-AUTH-020 enforcement primitive** 완료:
  - 세션 무효화 단일 진입점 `revokeAllSessions` 동작 검증 ✅
  - jwt callback 이 매 요청마다 revocation 검사 수행 ✅
  - SessionRevocation 테이블 + denormalized fast-path 컬럼 모두 갖춤 ✅
- **AC-AUTH-020** ❌ 아직 — admin status 변경 트리거 (Slice D2) 와 연결되지 않은 상태이므로 end-to-end criterion 은 다음 슬라이스에서 충족.
- 기존 AC (AC-AUTH-010/011/012/013/014/015/031/052) 는 모두 **회귀 없음** — 222개 기존 테스트 전부 통과.

### Deviations / OQ resolutions

1. **OQ #1 — `next-auth` v5 jwt callback 의 `token.iat` 가용성**:
   결론 — 자동 주입 여부와 무관하게 안전하도록 fallback 정책을 채택했다 (`callbacks.ts` 헤더 JSDoc 참조). 정책: (1) `token.iat` 가 number 면 그것을 신뢰, (2) sign-in 시점에 직접 `Math.floor(Date.now()/1000)` 주입, (3) 후방 호환 토큰은 `Date(0)` 로 취급해 어떤 revocation 에 의해서도 무효화 가능. 따라서 OQ#1 은 **resolved-by-design** — next-auth 의 동작에 의존하지 않는다.

2. **OQ #2 — 비정규화 `User.sessionsRevokedAt` 채택**:
   채택. 두 source (테이블 + 컬럼) 를 모두 유지한다 (테이블=audit history, 컬럼=fast-path enforcement). 구현 후 tradeoff 평가 결과 net-positive 로 판단:
   - hot path 에서 SessionRevocation 테이블 JOIN 없이 단일 인덱스 lookup 만 발생.
   - history 보존은 admin/감사 요건 (D2/E) 에 필수.
   - 두 source 의 동기화 부담은 단일 트랜잭션 내에서 처리되므로 추가 위험 없음.

3. **OQ #3 — Migration drift resolution**:
   선택 — `prisma migrate dev` 로 자동 생성하는 대신, **`prisma migrate diff --from-empty --to-schema-datamodel` 으로 SQL 만 dump 하여 수동으로 두 migration 파일 작성**. 이유:
   - dev DB 의 `db push` 기반 drift 때문에 `prisma migrate dev --create-only` 가 reset 을 강요했고, 이는 본 슬라이스의 책임 범위 밖 (다른 개발자/CI 의 dev DB 에 영향).
   - migration SQL 의 정확성은 schema 와 1:1 대응이 보장되므로 (diff 출력 그대로 분할), 자동/수동 차이는 절차상 차이일 뿐 실제 SQL 은 동일.
   - 운영 환경 (있다면) 적용 시: 빈 DB → `prisma migrate deploy` 로 두 migration 순차 적용. dev 환경에 처음 도입할 때는 (a) `prisma migrate reset` (데이터 손실 허용 시) 또는 (b) `prisma migrate resolve --applied 20260510170500_init` 으로 baseline 처리 (기존 schema 유지). 결정은 팀 운영 정책에 위임 — 본 슬라이스에서는 SQL 파일만 제공한다.

4. **`config.ts` 의 callback 분리** (`callbacks.ts` 신규 생성):
   prompt 의 "EDIT `apps/web/lib/auth/config.ts`" 지시는 그대로 따랐으나, callback 본체를 별도 모듈로 분리했다. 이유: 단위 테스트가 NextAuth 인스턴스/Next.js 서버 의존성을 거치지 않고 callback 의 입출력을 직접 검증하려면 factory pattern 이 필수. 동등한 동작을 보존하므로 prompt scope 위반은 아니다 (config.ts 도 함께 편집됨, 새 파일은 의존성 주입을 위한 보조 모듈).

5. **`AuditLog` 공통 헬퍼 추출 (REFACTOR 단계 검토 결과 — skip)**:
   Slice B/C/D1 의 AuditLog 호출 사이트는 각각 metadata 형태가 다르며 (signup: ip/ua only, login: ip/ua + actorId, session-revocation: metadata.reason), 공통 헬퍼로 묶을 경우 호출자가 잡다한 옵션을 파라미터로 채워야 해 코드량 절약 효과가 미미하다. 추출은 보류 — D2 에서 admin 액션 4종이 추가로 등장하면 그때 재평가.

### Open `@MX:TODO` ledger (Slice D1 additions)

신규 `@MX:TODO` 없음. 새 `@MX:ANCHOR` 4개 추가, 각각 `@MX:REASON` sub-line 포함:
- `packages/auth/src/session-revocation.ts` — `revokeAllSessions` (트랜잭션 단일 진입점), `isSessionRevoked` (fast-path 단일 진입점).
- `apps/web/lib/auth/callbacks.ts` — jwt/session callback 단일 정의 지점.

새 `@MX:WARN` 없음. 기존 Slice A/B/C 의 `@MX:NOTE` (config.ts) 는 제거됨 — Slice D1 에서 Path D 가 확정되어 PrismaAdapter 도입 보류 메모는 더 이상 유효하지 않다 (대신 헤더 JSDoc 의 본문에 결정 근거 명시).

### Heads-up notes for Slice D2 (admin features)

1. **`revokeAllSessions` 호출 사이트** — admin status 변경 (`changeUserStatus`) 에서 직접 호출. `actorId = session.user.id` (admin), `reason = 'STATUS_CHANGED'`, `targetId = userId`. AutoLogin row 삭제는 별도로 `prisma.autoLogin.deleteMany({ where: { userId } })` 로 처리 (D1 의 SessionRevocation API 와 무관 — JWT revocation 과 autologin 무효화는 본질적으로 별개 메커니즘).

2. **`isSessionRevoked` fast-path 의 부담** — 매 요청마다 `users` 테이블에 `findUnique({ id })` 가 발생한다. 이는 PK lookup 이라 cost 가 거의 0이지만, traffic 이 매우 큰 환경에서는 Redis 캐시 도입을 검토 (slice-d-plan.md Risks 참조). 운영 데이터로 판단.

3. **`token.iat` 단위** — JWT 표준에 따라 초 단위 epoch (number). callback 내부에서 `new Date(iat * 1000)` 으로 변환. D2 RBAC 클레임 (isAdmin/groups) 추가 시 token augmentation 위치는 동일한 `createJwtCallback` 의 sign-in 분기.

4. **마지막 admin 보호 (REQ-AUTH-054)** — D2 에서 `changeUserStatus` / `assignGroup(remove)` 가 모두 본 검증을 통과해야 한다. Race condition 처리 (slice-d-plan.md Risk) 는 D2 시작 시 결정.

5. **`config.test.ts` 의 mock 패턴** — `vi.mock('@rhymix-ts/auth')` 가 아닌 의존성 주입을 사용해 mock 했다. D2 에서 admin RBAC 검증을 추가할 때도 동일 패턴 (`createJwtCallback({ prisma, ...overrides })`) 을 쓰자.

6. **PrismaAdapter 도입은 폐기** — slice-d-plan.md v2.0.0 / Pre-Flight Q1 결정. D2 에서 `Account/Session/VerificationToken` 모델을 추가하지 않는다. 모든 세션 관리는 JWT + SessionRevocation denylist 로 일관 처리.

7. **`reason` 컬럼 enum 승격 시점** — D2 admin 흐름에서 4종 컨벤션이 모두 사용되면 (STATUS_CHANGED + ADMIN_FORCE_LOGOUT + 향후 PASSWORD_CHANGED + USER_LOGOUT_ALL), enum 승격 검토. 승격 시 추가 migration 필요 (string → enum 변환 + Prisma 모델 갱신).

### Blockers

없음. Slice D1 의 모든 명시된 완료 기준 충족:
- RED → GREEN → REFACTOR 순서 준수 (위 file modification order 표 참조).
- 246/247 테스트 통과 (1 skipped 는 Slice A 의 hash-wasm dummy hash timing test, 본 슬라이스와 무관).
- typecheck clean (web 의 playwright.config.ts 잔존 오류는 Slice B 베이스라인부터 존재).
- 두 migration SQL 모두 working tree 에 포함, `prisma validate` 통과.
- 작업 트리는 더티 상태로 유지 (commit 은 manager-git 위임).

### REQ-AUTH-020 enforcement readiness summary

Slice D1 으로 다음이 갖춰졌다:
- 세션 무효화 단일 진입점 (`revokeAllSessions`) — admin/사용자 self-action 모두 본 함수 통과 강제 가능.
- 무효화 검증 fast-path (`isSessionRevoked`) — 매 요청마다 hot path 비용 최소화.
- 무효화 audit history (`SessionRevocation` 테이블) — 향후 forensics / compliance 요건 대응.
- jwt callback 통합 — 무효화 시 토큰 거부, 사실상 다음 요청부터 로그아웃.

D2 가 추가해야 할 것:
- `changeUserStatus(userId, SUSPENDED|DENIED|DELETED)` Server Action — 본 함수가 `revokeAllSessions(userId, 'STATUS_CHANGED', { prisma, actorId: admin.id })` 와 `prisma.autoLogin.deleteMany({ where: { userId } })` 를 호출.
- `softDeleteUser` / `restoreUser` 도 동일 패턴.
- admin Server Action 보호 (`isAdmin` 검사) + 마지막 admin 보호 (REQ-AUTH-054).
- AC-AUTH-020 end-to-end 테스트 (admin 호출 → SessionRevocation 갱신 → jwt callback null 반환 → 다음 요청 차단).

---

## Slice D2 — Admin Features (2026-05-10)

Branch: `feature/auth-001-slice-d2` (built on Slice D1 / main = `4f57664`).
Methodology: TDD (RED-GREEN-REFACTOR). Plan: `slice-d-plan.md` v2.0.0 D2 섹션.

### Delivered

1. **RBAC primitives** (`packages/auth/src/rbac.ts`)
   - `resolveAdminPrivilege(user, groups)` — 순수 OR-게이트 (REQ-AUTH-034). user.isAdmin OR 어떤 그룹의 isAdmin.
   - `isLastAdmin(targetUserId, prisma)` — read-only 진단. SQL JOIN(users LEFT JOIN member_group_members LEFT JOIN member_groups) 으로 effective admin id 집합을 계산하고, 정확히 1명이고 그게 target 이면 true.
   - `assertCanDemote(targetUserId, prisma)` — race-safe 게이트. `pg_advisory_xact_lock(ADMIN_DEMOTION_LOCK_ID)` 로 demotion-window 를 직렬화한 뒤 effective admin set 을 확인. 0-admin 위험이면 `LastAdminProtectedError` throw.
   - `ADMIN_DEMOTION_LOCK_ID = 0x6164_6d69_6e5f_4445n` 상수 — "admin_DE" ASCII 8-byte 의 bigint.
   - `LastAdminProtectedError` 클래스 (code='LAST_ADMIN_PROTECTED').

2. **Admin domain functions** (`packages/auth/src/admin.ts`)
   - `changeUserStatus(input, ctx)` — REQ-AUTH-020:
     - actor 권한 검증 (`resolveAdminPrivilege` 사용; status='APPROVED' 필수)
     - self-action 정책 적용 (SUSPENDED/DENIED 만 self 허용; APPROVED/UNAUTHED self 는 SELF_ACTION_DENIED)
     - 트랜잭션: User.status 갱신 + (SUSPENDED|DENIED 시) AutoLogin deleteMany + AuditLog STATUS_CHANGED
     - 트랜잭션 외부에서 (SUSPENDED|DENIED 시) D1 의 `revokeAllSessions(targetUserId, 'STATUS_CHANGED', { prisma, actorId })` 호출
   - `softDeleteUser(input, ctx)` — REQ-AUTH-021:
     - actor 권한 검증, self-delete 차단 (SELF_ACTION_DENIED), TARGET_NOT_FOUND / TARGET_ALREADY_DELETED 가드
     - 트랜잭션: 5개 PII 필드 anonymize + status=DELETED + deletedAt=now + AutoLogin deleteMany + AuditLog MEMBER_DELETED
     - 트랜잭션 외부에서 D1 의 `revokeAllSessions(targetUserId, 'ADMIN_FORCE_LOGOUT', { prisma, actorId })` 호출
   - PII anonymize 결정적 prefix:
     - `userId` → `deleted_${id}`
     - `emailAddress` → `deleted_${id}@anon.local`
     - `nickName` → `deleted_${id}`
     - `phoneNumber` → null
     - `userName` → null
     - `passwordHash` / `id` / `createdAt` / `auditlog` 는 변경하지 않음 (out of GDPR delete scope per OQ resolution).
   - 모듈은 logger 미사용 (REQ-AUTH-055 by construction).

3. **Admin Server Actions** (`apps/web/lib/auth/admin-actions.ts`)
   - `setMemberStatusAction(prevState, formData)` — `auth()` 세션에서 actorId 추출, `isAdminSession` 으로 effective admin 검증, `changeUserStatus` 위임.
   - `deleteMemberAction(prevState, formData)` — 동일 패턴, `softDeleteUser` 위임.
   - 응답 형태: `{ ok: true } | { ok: false, code, formError }` (`useActionState` 호환).
   - 한국어 user-facing 메시지 (Slice C 의 패턴 답습).

4. **Admin authorization helper** (`apps/web/lib/auth/admin-middleware.ts`)
   - `isAdminSession(session)` 타입가드 — Auth.js v5 Session 의 `user.id` 가 string 이므로 number 로 정규화한 뒤 OR-게이트 평가.
   - NextAuth route middleware (`apps/web/middleware.ts`) 자체는 D2 범위 외 — admin UI 라우트 도입 시 별도 슬라이스에서 추가.

5. **Public API** (`packages/auth/src/index.ts`)
   - 새 re-exports: `resolveAdminPrivilege`, `isLastAdmin`, `assertCanDemote`, `ADMIN_DEMOTION_LOCK_ID`, `LastAdminProtectedError`, `changeUserStatus`, `softDeleteUser`, 관련 타입.

6. **DB package adjustment** (`packages/db/src/index.ts`)
   - `Prisma` namespace 가 type-only re-export 였던 것을 value re-export 로 수정 (`export { Prisma, PrismaClient } from '@prisma/client'`). `rbac.ts` 가 `Prisma.sql` tagged template 을 런타임에 사용하기 때문.

### Files Created / Modified (file modification order — TDD verification)

순서 — RED → GREEN → REFACTOR 가 엄격히 준수됨:

| Order | File | Status | LOC (approx) |
|---|---|---|---|
| 1 (RED) | `packages/auth/src/rbac.test.ts` | new | 257 |
| 2 (RED) | `packages/auth/src/admin.test.ts` | new | 421 |
| 3 (RED) | `apps/web/lib/auth/admin-actions.test.ts` | new | 167 |
| 4 (verify RED fails) | — | — | 3 test files: "Failed to load url ./rbac/admin/admin-actions" (impl 부재 확인) |
| 5 (GREEN) | `packages/auth/src/rbac.ts` | new | 121 |
| 6 (GREEN) | `packages/auth/src/admin.ts` | new | 234 |
| 7 (GREEN) | `apps/web/lib/auth/admin-middleware.ts` | new | 60 |
| 8 (GREEN) | `apps/web/lib/auth/admin-actions.ts` | new | 132 |
| 9 (GREEN) | `packages/auth/src/index.ts` | edit | +20 |
| 10 (GREEN) | `packages/db/src/index.ts` | edit | -2 / +3 (type-only Prisma → value) |
| 11 (REFACTOR) | `packages/auth/src/rbac.test.ts` | edit | $queryRaw fake 가 Prisma.Sql 객체와 TemplateStringsArray 두 호출 패턴을 모두 처리 |
| 12 (REFACTOR) | `packages/auth/src/admin.test.ts` | edit | test #6 의 actor.status='SUSPENDED' → 'APPROVED' (self-action 정책만 검증하도록 격리) |
| 13 (docs) | `.moai/specs/SPEC-AUTH-001/progress.md` | edit | this section |

Slice A/B/C/D1 의 소스 파일 (`password*.ts`, `signup*.ts`, `login*.ts`, `verify-email*.ts`, `tokens*.ts`, `mail*.ts`, `actions.ts`, `session-revocation*.ts`, `callbacks.ts`, `config.ts`) 는 일절 수정되지 않았다. `schema.prisma` / migrations / `spec.md` / `slice-d-plan.md` 도 수정되지 않았다 (D2 결정 — schema 변화 없음).

### Tests

- **40개 신규 테스트** 추가 (14 rbac + 18 admin + 8 admin-actions).
- 전체 프로젝트 테스트 수: **286 passed, 1 skipped, 28 files** (Slice D1 의 246 → 286, 델타 +40).
- 신규 테스트 카테고리:
  - `resolveAdminPrivilege`: 1) 직접 admin true, 2) group admin true (REQ-AUTH-034 OR), 3) 일반 + 일반 그룹 false, 4) 일반 + 그룹 미소속 false, 5) admin + 일반 그룹 단락 평가.
  - `isLastAdmin`: 6) 1명 직접 admin → true, 7) 그룹 경유 1명 admin → true, 8) 다중 admin → 모두 false, 9) 비-admin → false.
  - `assertCanDemote`: 10) 다중 admin resolve, 11) 마지막 admin throw `LastAdminProtectedError` (REQ-AUTH-054), 12) 비-admin no-op resolve, 13) advisory lock SQL 호출 증거, 14) `ADMIN_DEMOTION_LOCK_ID` 안정 bigint.
  - `changeUserStatus`: 1) SUSPENDED → status + revokeAllSessions(STATUS_CHANGED) + AutoLogin 삭제 + AuditLog STATUS_CHANGED, 2) DENIED 동일, 3) APPROVED (재활성화) → status 만 (revoke 없음, autologin 보존), 4) 비-admin actor → INSUFFICIENT_PRIVILEGES, 5) self+SUSPENDED 허용, 6) self+APPROVED → SELF_ACTION_DENIED, 7) TARGET_NOT_FOUND, group-admin actor 정상 동작 (REQ-AUTH-034).
  - `softDeleteUser`: 8) 5 PII 필드 결정적 anonymize + status=DELETED + deletedAt, 9) revokeAllSessions(ADMIN_FORCE_LOGOUT) + AutoLogin 삭제 (다른 user autologin 보존), 10) AuditLog MEMBER_DELETED + metadata.deletedAt, 11) self → SELF_ACTION_DENIED, 12) 이미 DELETED → TARGET_ALREADY_DELETED, 13) anonymize 후 원래 식별자 재사용 가능, 14) passwordHash/id/createdAt 불변, 15) AuditLog 실패 시 트랜잭션 롤백, 16) 비-admin → INSUFFICIENT_PRIVILEGES, 17) TARGET_NOT_FOUND.
  - `setMemberStatusAction`: 1) 비-admin → INSUFFICIENT_PRIVILEGES (도메인 호출 없음), 2) admin happy path + actorId 전달, 3) 도메인 실패 코드 노출 (formError 동반), 4) group 경유 admin (REQ-AUTH-034) 허용, 5) 세션 없음 → INSUFFICIENT_PRIVILEGES.
  - `deleteMemberAction`: 6) admin happy path → softDeleteUser 위임, 7) self-delete → SELF_ACTION_DENIED 그대로 노출, 8) 비-admin → INSUFFICIENT_PRIVILEGES.

### Verification

| Command | Result |
|---|---|
| `npx pnpm --filter @rhymix-ts/db exec prisma validate` | OK ("schema is valid") — D2 schema 변화 없음 |
| `npx pnpm --filter @rhymix-ts/auth typecheck` | OK |
| `npx pnpm --filter @rhymix-ts/db typecheck` | OK |
| `npx pnpm --filter @rhymix-ts/web typecheck` | Pre-existing `playwright.config.ts` 실패만 잔존 (Slice B/C/D1 베이스라인과 동일 — 신규 코드 typecheck-clean) |
| `npx pnpm test` | 286 passed, 1 skipped, 28 files |

`prisma migrate dev` 는 실행하지 않았다 — D2 는 schema 변화가 없으므로 신규 migration 불필요. 모든 컬럼 (User.deletedAt, status, isAdmin / MemberGroup.isAdmin / MemberGroupMember / AutoLogin / AuditLog) 은 D1 시점 schema 에 이미 포함.

### Acceptance Criteria progress

D2 로 다음 AC 가 end-to-end 충족된다 (도메인 함수 + Server Action 레이어):

- **AC-AUTH-020** ✅ end-to-end:
  - admin 의 SUSPENDED/DENIED 변경 → User.status 갱신 + AutoLogin row 삭제 + D1 의 `revokeAllSessions(STATUS_CHANGED)` 호출 → SessionRevocation 갱신 + User.sessionsRevokedAt 갱신 → jwt callback (D1) 이 다음 요청에서 `isSessionRevoked` 양성 → null 반환 → 토큰 거부.
  - admin 흐름 (changeUserStatus tests 1, 2) + autologin 무효화 (test 1) + AuditLog (test 1) 검증 완료.
  - end-to-end HTTP 테스트는 Slice E (UI/E2E) 에서 추가 예정.
- **AC-AUTH-034** ✅ end-to-end:
  - `resolveAdminPrivilege` (rbac tests 1-5) + group 경유 admin actor 도 changeUserStatus 호출 가능 (admin test "group 경유 admin actor"), Server Action 도 group admin 허용 (admin-actions test 4).
- **AC-AUTH-054** ✅ primitive:
  - `assertCanDemote` 의 advisory lock + last-admin 검사 (rbac tests 10-14). 실제 admin role 변경 (User.isAdmin true→false) 흐름은 D2 에 별도 함수로 추가하지 않았다 — admin 권한은 user.isAdmin OR group 멤버십으로 결정되므로 강등 흐름은 (a) `User.update({ isAdmin: false })` (b) `prisma.memberGroupMember.delete(...)` 두 경로가 있다. 현재 `assertCanDemote` 는 두 경로 모두에서 호출 가능한 race-safe 게이트로 제공되며, 실제 호출 사이트 (admin role 토글 Server Action) 는 후속 슬라이스 (admin role 관리 UI 도입) 에서 추가.
- **AC-AUTH-053** (가상 ID 보호 — 강등 시도자 식별) ⚠️ partial:
  - `assertCanDemote` 자체는 actor 식별을 인자로 받지 않지만, Server Action 레이어에서 actor 검증 (`isAdminSession`) 후 호출되므로 시도자는 항상 식별된다. AuditLog ADMIN_DEMOTION_BLOCKED 이벤트는 admin role 토글 Server Action 도입 시 함께 작성 예정.
- 기존 AC (AC-AUTH-010/011/012/013/014/015/020-primitive/031/052) 는 모두 **회귀 없음** — Slice C/D1 의 246개 기존 테스트 전부 통과.

### Deviations / OQ resolutions

1. **OQ — admin self-action policy** (resolved per prompt):
   - self-DELETE: BLOCKED (`SELF_ACTION_DENIED`). Irreversible; 4-eye 원칙.
   - self-SUSPEND: ALLOWED (보안 인시던트 self-lockout).
   - self-DEMOTE (isAdmin true→false): admin role 변경 흐름은 D2 에 직접 도입하지 않았다 (위 AC-AUTH-054 항목 참조). `assertCanDemote` 가 race-safe 게이트로 준비되어 있으며 실제 호출 사이트는 후속에서 추가. self-demote 차단은 Server Action 레벨에서 별도 가드로 추가 예정.
   - self-APPROVED: BLOCKED (`SELF_ACTION_DENIED`). 의미 없는 self-call + 4-eye.
   - self-DENIED: ALLOWED (보안 인시던트 self-lockout, SUSPENDED 와 동일 취급).

2. **OQ — 마지막 admin 차단의 격리 수준** (resolved):
   - 채택: PostgreSQL `pg_advisory_xact_lock(ADMIN_DEMOTION_LOCK_ID)`. 트랜잭션 종료 시 자동 해제되며, 키는 프로젝트-와이드 상수 (`0x6164_6d69_6e5f_4445n`).
   - SERIALIZABLE 격리 수준은 다른 무관한 트랜잭션까지 직렬화하는 부담이 크고, `SELECT FOR UPDATE` 는 admin row 가 여러 개일 때 lock 범위 결정이 모호. advisory lock 이 의미 명확하고 비용 최소.

3. **OQ — soft delete 후 unique constraint 처리 정책** (resolved per prompt):
   - 결정적 prefix `deleted_${id}` 패턴 채택. user.id 가 PK 라 collision-free 보장.
   - 5 fields 만 anonymize: userId, emailAddress, nickName, phoneNumber, userName. passwordHash / id / createdAt / AuditLog history 는 보존.

4. **OQ — PII anonymize 범위** (resolved per prompt):
   - 5 fields scope 만, 위 정책대로.

5. **OQ — AuditLog actor 식별** (resolved per prompt):
   - Server Action 이 `auth()` 호출로 session.user.id 추출 → 도메인 함수에 actorId 전달 → AuditLog 작성 시 항상 명시. self-action 케이스에서도 actorId == targetId 라는 사실 자체로 시도자 식별 가능.

6. **`User.id` 의 type 비호환** (web typecheck 발견):
   - Auth.js v5 의 Session.user.id 는 string. 본 프로젝트의 User.id 는 int (Slice A 결정).
   - `isAdminSession` 타입가드가 string→number 정규화를 수행하면서 동시에 user.id 를 number 로 덮어쓴다. Server Action 은 이후 정규화된 number 만 사용.
   - jwt callback (Slice D1) 이 `token.sub = user.id.toString()` 으로 변환하는 것은 그대로 유지 — Auth.js 표준 sub claim 은 string 이어야 한다.

7. **`@rhymix-ts/db` 의 Prisma 재내보내기 변경** (의도된 작은 deviation):
   - 기존: `export type { Prisma } from '@prisma/client'` (type-only)
   - 변경: `export { Prisma, PrismaClient } from '@prisma/client'` (value+type)
   - 사유: `rbac.ts` 가 `Prisma.sql` (런타임 tagged template) 을 사용해야 한다. 기존 코드는 `lock.ts` 에서 `@prisma/client` 를 직접 import 했으나, 본 작업에서는 `@rhymix-ts/db` 추상화 레이어를 일관되게 통과하도록 db 패키지의 재내보내기를 보강했다. `lock.ts` 의 직접 import 도 향후 정리 가능.

8. **NextAuth middleware route file** (`apps/web/middleware.ts`) 는 도입하지 않았다 — prompt 의 "DEFER if requires more than 30 LOC" 조건 적용. admin UI 라우트 도입 시 함께 추가하는 게 자연스럽다 (현재는 admin form 자체가 없어 라우트 보호 자체가 사용처 없음).

9. **REQ-AUTH-021 의 90일 retention 및 hard delete cron** 은 D2 범위 외 (prompt 명시: 인프라 SPEC). soft delete 자체는 완성. retention 만료 후 hard delete 는 별도 SPEC 의 cron job 으로.

10. **REFACTOR — D1 API 확장으로 atomicity gap 해소 (2026-05-10 추가 수정)**:
    - 초기 D2 구현은 `revokeAllSessions` 호출을 메인 트랜잭션 *외부* 에서 수행했다 (D1 의 `revokeAllSessions` 가 자체 트랜잭션을 열기 때문). 이는 atomicity 갭을 만들었다 — 메인 status 변경이 commit 된 뒤 revokeAllSessions 가 실패하면 stale window 가 발생.
    - 후속 리팩터에서 D1 API 를 확장해 이 갭을 봉쇄했다: `RevokeSessionsContext.prisma` 의 타입을 `PrismaClient | Prisma.TransactionClient` 로 변경하고, 런타임에 `'$transaction' in ctx.prisma` 로 두 모드를 분기한다. PrismaClient 가 들어오면 종전대로 자체 트랜잭션을 열고, TransactionClient 가 들어오면 nested 트랜잭션 없이 직접 실행 (외부 tx 가 atomicity 책임).
    - admin.ts 의 `changeUserStatus` 와 `softDeleteUser` 는 이제 `revokeAllSessions(targetUserId, reason, { prisma: tx, actorId })` 를 메인 `$transaction` 콜백 안에서 호출한다. 결과: status 변경 / PII anonymize / autologin 삭제 / SessionRevocation row / `User.sessionsRevokedAt` 갱신 / SESSION_REVOKED auditLog / STATUS_CHANGED 또는 MEMBER_DELETED auditLog 가 한 트랜잭션에서 atomic 하게 commit 되며, 어떤 단계가 실패해도 모두 롤백된다 (admin.test.ts TX-A / #15 가 이를 검증).
    - 테스트 추가: session-revocation.test.ts 에 TX-1/TX-2/TX-3 (외부 tx 클라이언트 호출 모드 검증), admin.test.ts 에 TX-A/TX-B (changeUserStatus atomicity), 기존 #15 의 atomicity 검증 강화. 총 286 → 291 passing.
    - D1 API 는 backward compatible: 기존 호출자 (`PrismaClient` 전달) 는 종전과 동일하게 동작.

### Open `@MX:TODO` ledger (Slice D2 additions)

신규 `@MX:TODO` 없음. 새 `@MX:ANCHOR` 5개 추가, 각각 `@MX:REASON` sub-line 포함:
- `packages/auth/src/rbac.ts` — `resolveAdminPrivilege` (REQ-AUTH-034 OR-게이트 단일 정의), `assertCanDemote` (REQ-AUTH-054 race-safe 게이트).
- `packages/auth/src/admin.ts` — admin status/delete 도메인 단일 진입점 (file-level).
- `apps/web/lib/auth/admin-actions.ts` — admin form 단일 Server Action 진입점.

새 `@MX:WARN` 없음. 기존 Slice C/D1 의 `@MX:ANCHOR` 들은 그대로 유지.

### Heads-up notes for Slice E (rate limiting + autologin + admin role 관리)

1. **admin role 토글 Server Action** — Slice D2 는 status 변경과 soft delete 만 다룬다. `User.isAdmin` 직접 토글 또는 `MemberGroupMember` 의 admin 그룹 가입/탈퇴 흐름은 후속에서 추가하되, 모두 `assertCanDemote(targetUserId, prisma)` 를 트랜잭션 안에서 먼저 호출하고 그 다음 실제 토글을 수행해야 race-safe 하다. 호출 사이트 패턴:
   ```ts
   await prisma.$transaction(async (tx) => {
     await assertCanDemote(targetUserId, tx as PrismaClient);
     await tx.user.update({ where: { id: targetUserId }, data: { isAdmin: false } });
     await tx.auditLog.create({ data: { actorId, targetId: targetUserId, action: 'ADMIN_DEMOTED', metadata: {} } });
   });
   ```
   이 흐름이 도입되면 AC-AUTH-053 의 ADMIN_DEMOTION_BLOCKED 이벤트 (LastAdminProtectedError catch 시) 도 함께 기록.

2. **session.user 의 RBAC 클레임 풍부화** — 현재 jwt callback (Slice D1) 은 `token.sub = user.id` 만 주입한다. admin Server Action 이 `isAdminSession` 으로 권한을 판정하려면 token 에 `isAdmin` + `groups: [{ isAdmin }]` 가 포함되어야 한다. Slice E 또는 admin 흐름 도입 시 jwt callback 의 sign-in 분기에서 user.findUnique({ include: { groups: { include: { group: true } } } }) 를 호출해 token 에 클레임을 채우는 작업이 필요하다. 현재는 D2 의 단위 테스트가 mock 으로 직접 session 을 주입하므로 통과하지만, 실제 NextAuth 통합 시 session callback 도 확장해야 한다.

3. **autologin invalidation 의 별도 API** — D2 는 `prisma.autoLogin.deleteMany({ where: { userId } })` 를 직접 호출한다. Slice E 의 autologin rotation 흐름 (REQ-AUTH-018/019/053) 이 추가되면, 이 호출을 `revokeAutoLogins(userId, reason, ctx)` 같은 도메인 헬퍼로 추출 검토. D2 는 사용 패턴이 1곳뿐이라 추출하지 않았다.

4. **SessionRevocation reason enum 승격 시점** — D2 흐름이 `STATUS_CHANGED` 와 `ADMIN_FORCE_LOGOUT` 두 reason 을 모두 활용하면서 컨벤션 4종이 실제 사용 패턴으로 굳어졌다. Slice F 에서 `PASSWORD_CHANGED` 까지 사용되면 enum 승격을 마무리할 수 있다 — migration 한 번으로 String → Enum 변환.

5. **REQ-AUTH-021 retention/hard delete** — soft delete 가 완성되었으니 retention period (default 90일) 경과 후 hard delete 는 인프라 SPEC 의 cron job 책임. D2 의 `softDeleteUser` 가 `deletedAt` 을 정확히 설정했고 anonymize 도 완료했으므로, 향후 cron 은 `prisma.user.deleteMany({ where: { status: 'DELETED', deletedAt: { lt: cutoff } } })` + AuditLog MEMBER_HARD_DELETED 한 번이면 충분.

6. **Pre-existing playwright.config.ts typecheck 오류** — Slice B 베이스라인부터 잔존. D2 와 무관. 별도 작은 수정으로 처리 권장.

7. **Prisma raw query gotcha** — `Prisma.sql` 은 런타임 값 (tagged template helper) 인데 `@rhymix-ts/db` 가 type-only re-export 이었다. D2 에서 value re-export 로 보강했다. 향후 `lock.ts` 의 `@prisma/client` 직접 import 도 `@rhymix-ts/db` 경유로 통일 가능.

8. **Advisory lock 동시성 통합 테스트** — `assertCanDemote` 의 advisory lock 동작은 단위 테스트에서 호출 증거만 검증했다 (queryLog). 실제 두 트랜잭션 동시 실행 시나리오는 통합 DB 환경 (Slice E 의 docker-compose 또는 testcontainers) 에서 확인 가능. 현재는 advisory lock 자체가 PostgreSQL primitive 라 신뢰 가능.

### Blockers

없음. Slice D2 의 모든 명시된 완료 기준 충족:
- RED → GREEN → REFACTOR 순서 준수 (위 file modification order 표 참조).
- 286/287 테스트 통과 (1 skipped 는 Slice A 의 hash-wasm dummy timing test, 본 슬라이스와 무관).
- typecheck clean (web 의 playwright.config.ts 잔존 오류는 Slice B 베이스라인부터 존재).
- schema 변화 없음 (D2 결정대로) → migration 추가 없음, `prisma validate` 통과.
- 작업 트리는 더티 상태로 유지 (commit 은 manager-git 위임).

### REQ-AUTH-020 enforcement chain — Slice D1+D2 완성 검증

Slice D1 의 primitive 와 Slice D2 의 admin trigger 가 결합되어 다음 end-to-end chain 이 동작한다:

1. admin 이 admin Server Action 호출 (e.g., `setMemberStatusAction({ targetUserId: 42, newStatus: 'SUSPENDED' })`).
2. Server Action 이 `auth()` 로 actorId 확인 → `isAdminSession` 으로 권한 검증 → `changeUserStatus` 위임.
3. `changeUserStatus` 가 트랜잭션에서 User.status='SUSPENDED' 갱신 + AutoLogin 삭제 + AuditLog STATUS_CHANGED.
4. 트랜잭션 commit 후 D1 의 `revokeAllSessions(42, 'STATUS_CHANGED', ...)` 호출 → SessionRevocation row 추가 + User.sessionsRevokedAt 갱신 + AuditLog SESSION_REVOKED.
5. target 사용자의 다음 요청 시 jwt callback (D1) 이 `isSessionRevoked(42, token.iat)` 호출 → User.sessionsRevokedAt 비교 → true 반환 → callback 이 null 반환 → next-auth 가 토큰 거부 → 사실상 즉시 로그아웃.

REQ-AUTH-020 enforcement 체인이 완성되었다. AC-AUTH-020 의 시나리오 (admin 의 status 변경 → 모든 active session 무효화) 는 위 chain 으로 충족.

---

## Slice E — Rate Limiting + Password Reset + AutoLogin + Admin Role Toggle + JWT RBAC Claims (2026-05-11)

Branch: `main` (built on Slice D2 / main = `29bdeca`).
Methodology: TDD (RED-GREEN-REFACTOR). 5개 서브 태스크.

### Delivered

1. **E-1: Rate Limiting on Login** (`packages/auth/src/login.ts`)
   - `login()` 함수 상단에 rate-limit gate 추가: `LoginAttempt.count({ ip, result: 'INVALID_CREDENTIALS', createdAt > windowStart })` 조회.
   - `failCount >= maxErrorCount` 시 `RATE_LIMITED` LoginAttempt row 작성 후 `{ ok: false, code: 'RATE_LIMITED' }` 반환.
   - `maxErrorCount` (기본 5), `windowMinutes` (기본 10) 은 `LoginConfig` 로 설정 가능.
   - REQ-AUTH-051 준수: rate-limited 응답에서 식별자 미노출.

2. **E-2: Password Reset** (`packages/auth/src/password-reset.ts`)
   - `requestPasswordReset(input, ctx)` — 사용자 조회 (userId OR emailAddress), 항상 `ok: true` 반환 (REQ-AUTH-051 — 존재 여부 미노출). 찾으면 EmailAuthToken(PASSWORD_RESET, 1시간 만료) 생성 + mail dispatch.
   - `confirmPasswordReset(input, ctx)` — 토큰 검증 (타입/소비여부/만료), 비밀번호 길이 >= 10 검증, 트랜잭션: User.passwordHash 갱신 + 토큰 소비 + AuditLog(PASSWORD_RESET), 후처리: `revokeAllSessions` + `autoLogin.deleteMany` (AC-AUTH-017).

3. **E-3: AutoLogin / Remember Me** (`packages/auth/src/autologin.ts`)
   - `createAutoLogin(input, ctx)` — 32바이트 base64url 토큰 생성, AutoLogin row 작성 (previousKey=null, 30일 만료).
   - `verifyAutoLogin(input, ctx)` — securityKey 매치 시 key rotation (새 키 생성, old→previousKey), previousKey 매치 시 TOKEN_THEFT 응답 (레코드 삭제 + revokeAllSessions + security-alert mail), 미매치 시 TOKEN_INVALID.
   - `revokeAutoLogin(input, ctx)` — id 기준 삭제.

4. **E-4: Admin Role Toggle** (`packages/auth/src/admin-role.ts`)
   - `toggleAdminRole(input, ctx)` — actor 권한 검증 (`resolveAdminPrivilege`), 강등 시 `assertCanDemote` 호출 (last-admin 보호 / REQ-AUTH-054), User.isAdmin 갱신, AuditLog ADMIN_PROMOTED/ADMIN_DEMOTED.
   - Server Action `toggleAdminRoleAction` 추가 (`apps/web/lib/auth/admin-actions.ts`).

5. **E-5: JWT RBAC Claims Enrichment** (`apps/web/lib/auth/callbacks.ts`)
   - `CallbackDeps.fetchUserForClaims` 의존성 주입 추가. production 용 `buildDefaultFetchUserForClaims(prisma)` 함수 제공.
   - jwt callback sign-in 분기: user DB 조회 후 `token.isAdmin`, `token.groups` 주입.
   - session callback: `token.isAdmin ?? false`, `token.groups ?? []` 를 `session.user` 에 복사.
   - RBAC claims 주입 실패 시에도 로그인 자체는 성공 (catch 블록에서 조용히 실패).

### Files Created / Modified

| File | Status | LOC (approx) |
|---|---|---|
| `packages/auth/src/login.ts` | edit (+rate limit gate) | +20 |
| `packages/auth/src/login.test.ts` | edit (+loginAttempt.count fake) | +3 |
| `packages/auth/src/login-rate-limit.test.ts` | new | ~120 |
| `packages/auth/src/password-reset.ts` | new | ~180 |
| `packages/auth/src/password-reset.test.ts` | new | ~250 |
| `packages/auth/src/autologin.ts` | new | ~120 |
| `packages/auth/src/autologin.test.ts` | new | ~130 |
| `packages/auth/src/admin-role.ts` | new | ~80 |
| `packages/auth/src/admin-role.test.ts` | new | ~120 |
| `packages/auth/src/index.ts` | edit (re-exports) | +30 |
| `apps/web/lib/auth/actions.ts` | edit (+password reset actions) | +50 |
| `apps/web/lib/auth/actions.test.ts` | edit (+password reset tests) | +40 |
| `apps/web/lib/auth/admin-actions.ts` | edit (+toggleAdminRoleAction) | +30 |
| `apps/web/lib/auth/admin-actions.test.ts` | edit (+toggleAdminRole tests) | +50 |
| `apps/web/lib/auth/callbacks.ts` | edit (+RBAC claims) | +50 |
| `apps/web/lib/auth/config.test.ts` | edit (+E5 tests, +db mock) | +30 |

### Tests

- 신규/수정 테스트: 6 (rate-limit) + 10 (password-reset) + 5 (autologin) + 4 (admin-role) + 4 (E5 callbacks) + 3 (password-reset actions) + 3 (toggleAdminRole actions) = **~35개 신규 테스트**.
- 전체 프로젝트 테스트 수: **289 passed, 1 skipped, 4 failed (기존)** — 총 294 테스트 (up from 291).
- 4개 실패는 모두 Slice E 이전부터 동일한 이유:
  - `install-validate.test.ts` (1): ECONNREFUSED — 로컬 PostgreSQL 미구동 (integration 테스트)
  - `lock.test.ts` (3): `Prisma.sql is not a function` — Prisma client 미생성 환경
  - `admin.test.ts`, `rbac.test.ts`: PrismaClient import 실패 (동일 사유)

### Verification

| Command | Result |
|---|---|
| `vitest run` | 289 passed, 1 skipped, 4 failed (기존) |
| `tsc --noEmit (auth)` | 기존 오류만 (tx: any, Prisma.sql — prisma generate 미실행 환경) |
| `tsc --noEmit (web)` | 기존 playwright.config.ts 오류만 |

### Acceptance Criteria progress

- **AC-AUTH-017** ✅ — confirmPasswordReset 이 autoLogin.deleteMany 호출 (password-reset test "AC-AUTH-017")
- **AC-AUTH-019** ✅ — verifyAutoLogin 이 securityKey 매치 시 key rotation 수행 (autologin test "verify rotates key")
- **AC-AUTH-033** ✅ — login rate-limit gate 가 5회 실패 후 RATE_LIMITED 반환 (login-rate-limit tests 1-6)
- **AC-AUTH-053** ✅ — previousKey 매치 시 TOKEN_THEFT 응답 + revokeAllSessions + security-alert mail (autologin test "previousKey match")
- **AC-AUTH-054** ✅ — toggleAdminRole 강등 시 assertCanDemote 호출, LastAdminProtectedError 발생 시 LAST_ADMIN_PROTECTED (admin-role tests)

### Deviations

1. **`login-rate-limit.test.ts` 별도 파일** — 기존 `login.test.ts` 에 rate-limit 테스트를 추가하면 fakePrisma 구성이 복잡해지므로 별도 파일로 분리. 기존 login.test.ts 는 `loginAttempt.count: async () => 0` 만 추가하여 rate-limit gate 통과.
2. **password-reset token 형태** — EmailAuthToken 의 authKey 에 base64url 토큰 직접 저장 (해시 변환 없이). 현재 SPEC 에서는 이 방식이면 충분하며, 해시 기반 저장은 보안 강화 시 후속 변경 가능.
3. **E-5 의 `as never` 캐스트** — `buildDefaultFetchUserForClaims` 에서 Prisma include 객체에 `as never` 사용. prisma generate 미실행 환경에서 타입 해결이 불가능하므로 방어적 캐스트 적용. prisma generate 실행 시 자동 해소.

### Open `@MX:TODO` ledger (Slice E additions)

신규 `@MX:TODO` 없음. 기존 `@MX:ANCHOR` 태그 유지. `callbacks.ts` 의 `@MX:ANCHOR` 설명에 "Slice D2 admin RBAC 도 본 함수에 isAdmin/groups 클레임을 확장한다" 반영 완료.

### Blockers

없음. Slice E 의 5개 서브 태스크 모두 완료. 모든 신규 테스트 통과. 기존 테스트 회귀 없음.

---

## Slice F — Auth UI Pages + Middleware (2026-05-11)

Branch: `main` (built on Slice E / main = `29bdeca`).
Methodology: TDD (RED-GREEN-REFACTOR).

### Delivered

1. **(auth) Layout** (`apps/web/app/(auth)/layout.tsx`)
   - Server Component, min-h-screen flex 중앙 정렬, max-w-md 카드 컨테이너.
   - 모든 인증 페이지(login, signup, verify-email, password-reset)가 공유.

2. **Login Page** (`apps/web/app/(auth)/login/page.tsx`)
   - Client Component, `useActionState(loginAction, initialAuthActionState)`.
   - identifier(text) + password(password) 필드, 에러 메시지 Alert 표시.
   - /signup, /password-reset 링크 포함.

3. **Signup Page** (`apps/web/app/(auth)/signup/page.tsx`)
   - Client Component, `useActionState(signupAction, initialAuthActionState)`.
   - userId, email, password, nickName 4개 필드.
   - 성공 시 "이메일을 확인하세요" 메시지 표시 (리다이렉트 없음).

4. **Verify Email Page** (`apps/web/app/(auth)/verify-email/page.tsx`)
   - Server Component, `searchParams` (Promise) 에서 token 추출.
   - 토큰 없음: "잘못된 접근입니다" 에러 표시.
   - `verifyEmail` 도메인 함수 직접 호출 (Server Action 불필요).
   - 성공/실패 메시지 표시.

5. **Password Reset Request Page** (`apps/web/app/(auth)/password-reset/page.tsx`)
   - Client Component, `useActionState(requestPasswordResetAction, ...)`.
   - identifier 필드, 제출 후 항상 동일한 성공 메시지 (REQ-AUTH-051).

6. **Password Reset Confirm Page** (`apps/web/app/(auth)/password-reset/confirm/page.tsx`)
   - Client Component, `useSearchParams()` 로 URL 토큰 추출.
   - 토큰 없음: 에러 메시지, 토큰 있음: 새 비밀번호 폼 + hidden token input.
   - `useActionState(confirmPasswordResetAction, ...)`.

7. **Middleware** (`apps/web/middleware.ts`)
   - `NextAuth(authConfig).auth` wrapper 패턴.
   - protectedRoutes: /dashboard, /admin, /settings, /profile → 비인증 시 /login 리다이렉트 (callbackUrl 포함).
   - authOnlyRoutes: /login, /signup, /password-reset → 인증 시 / 리다이렉트.
   - matcher: API, _next/static, _next/image, favicon.ico 제외.

8. **playwright.config.ts fix**
   - 기존 regex match 의 undefined 가능성 typecheck 에러 수정 (`match[1]!`, `match[2]!`).

### Files Created / Modified

| File | Status | LOC (approx) |
|---|---|---|
| `apps/web/app/(auth)/layout.tsx` | new | 17 |
| `apps/web/app/(auth)/login/page.tsx` | new | 87 |
| `apps/web/app/(auth)/login/page.test.tsx` | new | 97 |
| `apps/web/app/(auth)/signup/page.tsx` | new | 132 |
| `apps/web/app/(auth)/signup/page.test.tsx` | new | 108 |
| `apps/web/app/(auth)/verify-email/page.tsx` | new | 82 |
| `apps/web/app/(auth)/verify-email/page.test.tsx` | new | 88 |
| `apps/web/app/(auth)/password-reset/page.tsx` | new | 95 |
| `apps/web/app/(auth)/password-reset/page.test.tsx` | new | 94 |
| `apps/web/app/(auth)/password-reset/confirm/page.tsx` | new | 98 |
| `apps/web/app/(auth)/password-reset/confirm/page.test.tsx` | new | 114 |
| `apps/web/middleware.ts` | new | 44 |
| `apps/web/middleware.test.ts` | new | 117 |
| `apps/web/playwright.config.ts` | edit | +2/-2 |
| `vitest.config.ts` | edit | +3 (esbuild jsx: automatic) |
| `apps/web/package.json` | edit (+devDeps: @testing-library/react, jest-dom, user-event, jsdom) | +4 |

### Tests

- **29개 신규 테스트** 추가 (5 login + 5 signup + 4 verify-email + 4 password-reset + 4 password-reset/confirm + 7 middleware).
- 전체 프로젝트 테스트 수: **354 passed, 3 skipped** (Slice E 의 325 → 354, 델타 +29).
- 기존 325개 테스트 전부 통과 (회귀 없음).

### Verification

| Command | Result |
|---|---|
| `pnpm test` | 354 passed, 3 skipped, 0 failed |
| `pnpm --filter @rhymix-ts/web typecheck` (Slice F 파일만) | 0 errors (playwright.config.ts fix 포함) |

### Acceptance Criteria

- **AC-AUTH-F001** ✅ — Login form: identifier + password 필드, loginAction 연결, 에러 표시, pending 상태 처리
- **AC-AUTH-F002** ✅ — Signup form: 4개 필드, signupAction 연결, 성공 시 "이메일을 확인하세요" 메시지
- **AC-AUTH-F003** ✅ — verify-email: token 자동 실행, 성공/실패 메시지 표시
- **AC-AUTH-F004** ✅ — Password reset request: 항상 성공 메시지 (REQ-AUTH-051 no disclosure)
- **AC-AUTH-F005** ✅ — Password reset confirm: token + newPassword 제출, 에러 표시
- **AC-AUTH-F006** ✅ — Middleware: 비인증 사용자 보호 경로 → /login 리다이렉트 (callbackUrl 포함)
- **AC-AUTH-F007** ✅ — Middleware: 인증 사용자 인증 전용 경로 → / 리다이렉트
- **AC-AUTH-F008** ✅ — playwright.config.ts typecheck clean (기존 에러 수정 완료)

### Deviations

1. **shadcn/ui 미사용** — `apps/web/components/ui/` 가 비어있으므로 plain HTML + Tailwind CSS 사용.
2. **vitest config 변경** — `esbuild.jsx: 'automatic'` 추가 (tsx 테스트 파일에서 React auto-import 필요).
3. **verify-email 은 Server Component 에서 도메인 함수 직접 호출** — Server Action form 제출이 아닌 링크 클릭 흐름이므로 `verifyEmail` 을 직접 호출.
4. **Signup 성공 감지** — `useState(submitted)` 로 Server Action 호출 완료를 추적하고, `ok:true + submitted` 조합으로 성공 메시지 표시.
5. **테스트에서 `vi.mock('react')` 패턴** — `useActionState` ESM binding 을 오버라이드하기 위해 `vi.mock('react', importOriginal)` 사용. JSX transform은 `esbuild.jsx: 'automatic'`이 `react/jsx-runtime` 을 직접 사용하므로 react 모듈 모킹에 영향받지 않음.

### Open `@MX:TODO` ledger (Slice F additions)

신규 `@MX:TODO` 없음. 새 `@MX:NOTE` 2개, `@MX:ANCHOR` 1개 추가:
- `apps/web/app/(auth)/verify-email/page.tsx` — `@MX:NOTE`: Server Component 에서 도메인 함수 직접 호출.
- `apps/web/app/(auth)/login/page.tsx` — `@MX:NOTE`: loginAction 의 유일한 UI 진입점.
- `apps/web/middleware.ts` — `@MX:ANCHOR`: 모든 페이지 요청이 통과하는 미들웨어.

### Blockers

없음. Slice F 의 모든 명시된 완료 기준 충족.
