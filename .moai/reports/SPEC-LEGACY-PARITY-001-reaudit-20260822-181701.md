# SPEC-LEGACY-PARITY-001 — Re-audit Verdict (post-remediation)

- **Auditor**: sync-auditor (independent re-adjudication)
- **Date**: 2026-08-22 18:17 KST
- **Tree**: branch `main`, HEAD `7988302` (docs-only on top of audited code state `d170bf3` — verified below that the intervening commits touch no source)
- **Prior verdict under re-examination**: FAIL 61.2/100 (Security must-pass failed: 1 High + 3 Medium)
- **Scope of this audit**: the six repairs (D1 `baa571d`, D4 `308c986`, D2 `79e3797`, D5 `e5179e7`, D6 `f07b8ac`, D3 `a5c79b3`) + two contested adjudications. `7476235` (harness hook) excluded as instructed.

## Evaluation Report

**SPEC**: SPEC-LEGACY-PARITY-001
**Overall Verdict: PASS**
**Score: 84.6/100 (harmonic mean — auditor stance); flat-weighted equivalent 85.8/100**

### Dimension Scores

| Dimension | Weight | Score | Verdict | Evidence (verbatim mechanical output) |
|---|---|---|---|---|
| Functionality | 40% | 88 | **PASS** (must-pass) | `node_modules/.bin/vitest run <6 SPEC-scope files>` → `Test Files 6 passed (6) / Tests 80 passed (80)` (suites: actions 26 + menu-item 23 + MenuRenderer 8 + by-key route 3 + bundle-schema 11 + menu-button-image 9). PRESERVE anchors re-run at HEAD: `git diff a9e637a..HEAD --stat -- apps/web/app/admin/site/design/` → *(empty)*; `-- AdminSidebar.tsx` → *(empty)*. AC-009: `grep -n "^status:" .moai/specs/_archive/SPEC-MENU-001/spec.md` → `4:status: superseded`; `git log --oneline --grep="supersedes SPEC-MENU-001"` → `93dc1fb feat(SPEC-LEGACY-PARITY-001): supersedes SPEC-MENU-001`. |
| Security | 25% | 90 | **PASS** (must-pass) | All six repairs grep-verified at HEAD (see §1). Upload chain read at `actions.ts:169-221`: `assertMimeAllowed` → `assertSizeAllowed` → `isImageMimeType` → `matchesRasterSignature(buffer, mimeType)` **before** `storage.write` → scanner with delete-on-dirty. XSS probe `grep -rn "dangerouslySetInnerHTML" MenuRenderer.tsx MenuItemEditor.tsx` → no matches (exit 1). eslint SPEC-scope 9 files → `✖ 11 problems (0 errors, 11 warnings)`. No Critical/High finding remains in SPEC scope. |
| Craft | 20% | 73 | PASS (not must-pass) | `tsc --noEmit` → `apps/web tsc exit=0`, `packages/admin tsc exit=0`. eslint 0 errors/11 warnings (matches §E.4 corrected record exactly). Coverage **UNVERIFIED — toolchain skew re-confirmed**: `node_modules/vitest/package.json: "version": "3.2.4"` vs `node_modules/@vitest/coverage-v8/package.json: "version": "3.2.7"` (mixed-version coverage runs self-invalidate; known gap, not re-flagged as new). |
| Consistency | 15% | 90 | PASS | Conventional commits w/ SPEC-ID + `🗿 MoAI` trailer on all six repairs (git log verified); MX tags carry mandatory `@MX:REASON`/`@MX:SPEC` sub-lines (D1 anchor, D2/D5 notes); code comments in Korean per `code_comments: ko`; D2 reuses the scanner-path deletion idiom (`storage.delete(key).catch(() => {})`) rather than inventing a new one. |

**Must-pass firewall**: Functionality 88 ≥ threshold and Security 90 ≥ threshold, no Critical/High finding → **firewall satisfied**. The prior FAIL driver (Security must-pass) is cleared by verified repairs, not by re-scoring.

---

## 1. Six-repair verification (each independently re-verified against the current tree)

| # | Commit / Defect | Claim | Verdict | Command + observed output |
|---|---|---|---|---|
| D1 | `baa571d` authorization gate | `denyIfNotAdmin()` at entry of all 6 menu Server Actions, before side effects | **VERIFIED** | `grep -n "denyIfNotAdmin\|const denied" apps/web/app/admin/menu/actions.ts` → definition at `:55`, call sites `:76, :105, :319, :375, :456, :485` (createMenu, deleteMenu, createMenuItem, updateMenuItem — before `parseButtonImageFields`, deleteMenuItem, duplicateMenuItem). Regression: `actions.test.ts (26 tests)` ✓ incl. 7 unauthenticated-block tests. |
| D2 | `79e3797` upload key reclamation | `writtenKeys` tracked; reclaimed on all 3 post-upload failure paths | **VERIFIED** | `grep -n "reclaimUploadedKeys\|writtenKeys" actions.ts` → `:242` helper, `:277/:287` collection in `parseButtonImageFields`, reclaims at `:412` (field-parse failure), `:428` (zod failure), `:442` (tRPC catch). Success path and pre-upload failure reclaim nothing (bidirectional tests in 26/26). |
| D3 | `a5c79b3` export-time union validation + drop | `menuItemButtonSchema` safeParse at export; non-conforming → drop + `metadata.droppedButtonImages` | **VERIFIED** | `grep -n "menuItemButtonSchema\|droppedButtonImages" packages/admin/src/export/bundle-schema.ts serializer.ts` → schema export `bundle-schema.ts:48`, optional metadata field `:203`, `serializer.ts:44` `safeParse`, `:260` metadata report. `vitest run packages/admin/src/export/bundle-schema.test.ts packages/admin/src/import/menu-button-image.test.ts` → `Tests 20 passed (20)`. |
| D4 | `308c986` recursion guard | reorder ancestor-chain cycle rejection (pre-write); copySubtree visited-set + depth cap; buildMenuTree depth guard | **VERIFIED** | `grep -n "순환 감지\|MAX_MENU_DEPTH\|visited" menu-item.ts` → reorder guard `:186-190` (BAD_REQUEST before `$transaction`), copySubtree `:274-310` (path-based visited w/ `:310` delete, depth ≤ `MAX_MENU_DEPTH=100`); `grep -c MAX_MENU_DEPTH MenuRenderer.tsx` → `3` (constant + guard + comment). Tests: `menu-item.test.ts (23 tests)` ✓ incl. 7 cycle regressions; `D4-7` depth test in MenuRenderer 8/8. |
| D5 | `e5179e7` magic-byte validation | Byte-signature check before `storage.write`; non-raster (SVG) auto-rejected | **VERIFIED** | `grep -n "RASTER_IMAGE_SIGNATURES\|matchesRasterSignature" actions.ts` → table `:132`, check `:202-204` between buffer acquisition (`:198`) and `storage.write` (`:206`). Unknown declared MIME returns false (closed allowlist: PNG/JPEG/GIF/WebP-RIFF+WEBP). 6 regressions in 26/26. |
| D6 | `f07b8ac` nosniff | `X-Content-Type-Options: nosniff` on both download routes | **VERIFIED** | `grep -rn "nosniff" 'apps/web/app/api/files/[id]/download/route.ts' 'apps/web/app/api/files/by-key/[key]/download/route.ts'` → `:48` and `:36`. `by-key route.test.ts (3 tests)` ✓ (nosniff set, prior headers preserved, key restoration). |

Regression-test composition cross-check: per-commit test additions 7 (D1) + 5 (D2) + 6 (D5) + 3 (D6) + 7 (D4) = 28 dedicated regression tests — consistent with commit stats (`+99/+105/+106/+56/+151` test-file lines).

**HEAD-integrity note**: `git log --oneline` shows `d170bf3..7988302` contains only `docs/NEXT_SESSION.md` (docs); `git status --short -- apps packages` shows no modified tracked source (only untracked `apps/web/.claude/`, harness template noise, out of scope). All greps above ran against the working tree at HEAD.

---

## 2. Contested point adjudications

### 2.1 D1 severity reclassification High → Medium — **UPHELD (Medium is correct)**

Grounds observed in the tree:

1. **The original High premise is refuted, and I verified its refutation basis in code.** `apps/web/proxy.ts:53` declares `protectedRoutes = ['/dashboard', '/admin', '/settings', '/profile']`; `:200-208` redirects any unauthenticated request whose pathname starts with `/admin` → `307 /login`. The prior audit's premise ("no `middleware.ts` exists") checked for the pre-Next-16 filename; Next 16 renamed middleware to `proxy.ts` (the file itself documents this at `:2`). Request-stage blocking of `/admin` is real.
2. **The residual defect class was real but secondary.** Next.js Server Actions are addressed by action ID in the POST body, not by the URL path — a crafted POST to an unprotected pathname carries the request past the path-prefix gate into the action body unauthenticated. Exploitation required extracting the action ID from client JS and deliberate crafting; it was not a default-reachable unauthenticated write (and the write target is a server-generated `YYYY/MM/<uuid>` key — no path traversal, followed by malware scan). A globally-addressable action lacking its own entry gate is a defense-in-depth failure: **Medium**.
3. **The classification no longer affects exposure.** `denyIfNotAdmin()` now gates all six actions before any side effect, verified above with 7 regression tests. High would demand a currently-reachable unauthenticated privileged write; none exists in the tree.

I did **not** re-assert the refuted premise, and I note honestly: the empirical `307 → /login, 0 files written` measurement could not be re-executed here (docker unavailable — see Gaps); the code-level basis (proxy gate + action gate) is independently verified from the tree.

### 2.2 D3 "migration not required" — **SUFFICIENT GROUNDS — CONCUR (with the recorded residual)**

1. **The team-lead correctly refuses the primary-DB zero as evidence** (`rhymix_ts` = 0 rows/68 tables proves nothing about data shape).
2. **Ground (b) is structural and independently verified from the tree**: legacy `rx_menu_item` button columns are plaintext `varchar(255)` filenames, and the import union normalizes any string into the conforming shape — `bundle-schema.ts:48-51`: `z.union([menuButtonImageSchema, z.string().transform((s) => ({ image: s }))])`. The legacy→new path cannot produce a non-conforming value regardless of which legacy row is imported. This holds by construction, not by row count.
3. **Ground (a)** (`rhymix_ts_verify`: 3 real `menu_items` rows, 0 with button values) is recorded FIX-stream evidence; I could not re-run the query (docker WSL integration off in this environment) — recorded as a Gap, not accepted on faith for anything beyond what the structural argument already covers.
4. **Decisive containment**: even if a populated instance *did* carry a non-conforming jsonb value (the only possible producer being rhymix-ts's own pre-M3 editor textarea, which the renderer never read — a write-only field per research.md §1.4), the repaired export path now **drops it and reports it** (`droppedButtonImages`) instead of failing the whole bundle. The defect class is contained by construction; a migration would only serve to preserve old placeholder style-JSON values that have no consumer. **Migration not required is sound.** Residual (as recorded): other populated rhymix-ts instances should run the same query before relying on this.

### 2.3 Should the 3 unverified ACs (AC-SITE-004/005/006) still block a PASS? — **NO**

- A FAIL verdict requires a criterion to FAIL or a must-pass dimension to fail. **Unverified-in-this-environment ≠ failed.** The three ACs' verification means are **committed in the repo** (`c3037dd`: `apps/web/e2e/menu-parity.spec.ts` + `seeder`, 484 added lines, test-only, with fault-injection-validated non-vacuous GREEN) and the behaviors carry a first-hand M1 runtime observation record (2026-08-16). What is absent is audit-env reproducibility: no docker → no DB → the e2e cannot run here, and running it would seed/mutate the DB state other evidence rests on.
- The prior FAIL was driven by Security must-pass, not by these three. Nothing in the remediation changed their status; blocking the verdict on an environment limitation rather than a product defect would repeat the prior verdict out of inertia.
- They remain honestly recorded Gaps (progress.md §E.4 Gaps 2 does this) and residual risk — that is the correct disposition. Best follow-up: a unit-level pin for AC-006 (slot assignment currently e2e-only).

---

## 3. Findings

- **F1** [info] [optional] standing-gap — AC-SITE-004/005/006 not re-executable in audit env (e2e means committed at `c3037dd`; docker WSL integration off). Required fix: none for this verdict; follow-up candidate = unit-level pin for AC-006 slots (`listSlotAssignments` round-trip).
- **F2** [low] [optional] coverage unmeasurable — root `vitest@3.2.4` + `@vitest/coverage-v8@3.2.7` version skew (re-confirmed today); `vitest.config.ts` coverage.include also stale. Required fix (follow-up): align versions, refresh include scope, then measure against the 85% profile threshold.
- **F3** [low] [optional] `packages/admin` has no lint configured (`"lint": "echo 'no lint'"`). Pre-known; follow-up: configure eslint for the package.
- **F4** [low] [optional] 7 `no-unused-vars` warnings in SPEC scope (`actions.ts:402` `err`, `ReadableStream` ×2 in download routes, `actions.test.ts:46/57/75/76`). Cosmetic; underscore-prefix or remove.
- **F5** [info] [optional] 4 `no-img-element` warnings deferred with corrected rationale (self-origin URLs via `resolveButtonImageUrl` → `next/image` migration needs no `remotePatterns`). Out of SPEC scope; recorded.
- **F6** [info] [optional] series-level note: `denyIfNotAdmin` covers the six *menu* actions (this SPEC's surface); other Server Actions elsewhere in the app still rely on the proxy+tRPC pattern. Out of scope here — flag for the LEGACY-PARITY series.

No blocking findings. An all-optional findings list does not convert this PASS into a FAIL.

## 4. Gaps (explicitly NOT observed in this audit run)

1. **Runtime D1 repro not re-executed** — docker unavailable; the recorded `307 → /login, 0 files` measurement was accepted only as corroboration of the code-level proxy verification.
2. **D3 ground (a) DB query not re-executed** — same docker limitation; adjudication rests on the structurally-verified ground (b) + containment.
3. **Coverage not measured** — toolchain skew makes any root coverage number self-invalidating (F2).
4. **Full monorepo test suite not run** — audit scoped to the 6 SPEC-scope suites (80 tests) + the SPEC's own AC verifications; the 2,490-test full suite was not re-executed.
5. **e2e menu-parity suite not run** — environment cannot (no DB); disposition in §2.3.

## 5. Residual risk

- The D1/D3 DB-grounded adjudications rest on recorded FIX-stream runs plus tree-verified structural arguments; a live re-check on a populated instance would close them fully.
- Craft remains capped by the unmeasured coverage; the 85% threshold is untested, not failed.
- Harmonic scoring punishes the lowest dimension (Craft 73); raising it requires only the coverage toolchain fix, not code changes.

## 6. Score derivation

Flat weighted: 0.40×88 + 0.25×90 + 0.20×73 + 0.15×90 = **85.8**
Harmonic (auditor stance — resistant to a single high dimension masking a weak one): 4/(1/88 + 1/90 + 1/73 + 1/90) = **84.6**
Must-pass: Functionality **PASS** (88), Security **PASS** (90) → firewall satisfied → **Overall PASS**.
