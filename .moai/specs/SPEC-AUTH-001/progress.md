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
