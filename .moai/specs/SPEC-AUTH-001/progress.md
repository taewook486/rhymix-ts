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
