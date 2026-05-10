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
