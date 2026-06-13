# SPEC-MAIL-001 Plan Audit — Iteration 2

**Verdict**: FAIL
**Score**: 0.84 / 1.00
**Date**: 2026-06-13

> Reasoning context ignored per M1 Context Isolation. The prior-fix list supplied in the
> invocation was treated as a set of *claims to independently verify*, not as established
> facts. This audit rests solely on the current `spec.md` (primary) and `acceptance.md`
> (cross-reference), with every assertion backed by line citations.

---

## Must-Pass Criteria Results

- **MP-1 REQ Numbering**: **PASS** — 54 REQs extracted (REQ-MAIL-001..006, 010..017, 020..027,
  030..037, 040..045, 050..055, 060..065, 070..075). Each appears exactly once (no duplicates),
  3-digit zero-padding is consistent throughout. Gaps exist between category blocks (007–009,
  018–019, 028–029, 038–039, 046–049, 056–059, 066–069), but spec.md:L72 now carries an explicit
  **"REQ Numbering Convention (블록 번호 규약)"** declaration: each category reserves a 10-number
  block (`XX0~XX9`), intra-block unused numbers are intentionally reserved for future expansion,
  and section-header upper bounds (e.g. "REQ-MAIL-001 ~ 009") denote the reserved block range, not
  defined REQs. This satisfies the MP-1 convention-declaration clause ("a convention declaration
  exists ... explaining the block numbering scheme"). The header upper-bound concern (prior D8) is
  also explicitly addressed in the same paragraph. PASS.

- **MP-2 EARS Compliance**: **PASS** — Verified every REQ label/keyword pairing end-to-end:
  - REQ-MAIL-011 (spec.md:L92): now `(State-Driven)` + keyword `WHERE` — label matches keyword. FIXED.
  - REQ-MAIL-053 (spec.md:L202): now `(State-Driven)` + keyword `WHILE` — State-Driven permits WHILE. FIXED.
  - All 14 `(Event-Driven)` REQs use `WHEN` (010, 013, 014, 015, 022, 025, 033, 040, 041, 042, 043,
    051, 052, 072). All `(Ubiquitous)` REQs are keyword-less SHALL statements. All `(Unwanted)` REQs
    use SHALL NOT (005, 016, 027, 045, 055, 065, 075). No remaining keyword/label mismatch.
  - Section 4 "Acceptance Criteria" (spec.md:L287–300): all five ACs now use EARS keywords —
    A1 `WHEN…SHALL` (L288), A2 `WHERE…WHEN…SHALL` (L291), A3 `WHEN…SHALL` (L294), A4 `WHEN…SHALL`
    (L297), A5 `WHEN…SHALL` (L300). No Given-When-Then in spec.md Section 4. The Given-When-Then
    scenarios are correctly confined to `acceptance.md` (explicitly permitted by the task). FIXED.

- **MP-3 YAML Frontmatter**: **FAIL** — Frontmatter (spec.md:L1–17):
  - `id` ✓ (L2), `title` ✓ (L3), `status` ✓ (L5), `version` ✓ (L4), `author` ✓ (L8),
    `created_at: 2026-05-27` ✓ (L6 — prior D1 `created`→`created_at` FIXED),
    `labels: [mail, smtp, phase3]` ✓ (L10 — prior D1 missing-labels FIXED).
  - **BLOCKING**: The required field is named `updated` (L7: `updated: 2026-05-27`), NOT
    `updated_at`. The task's MP-3 required-field list is explicit: "created_at (NOT `created`),
    updated_at". The `created`→`created_at` correction was applied, but the *identical* defect on
    the sibling timestamp field was left half-fixed: `updated` was not renamed to `updated_at`.
    Under the stated MP-3 rule ("All required fields must be present and non-empty"), a required
    field present under the wrong name = missing required field = FAIL.

- **MP-4 Language Neutrality**: **PASS (N/A-equivalent)** — This SPEC is scoped to a single
  application's TypeScript/Node mail subsystem (nodemailer transport). It is not template-bound or
  universal multi-language-tooling content; the only "language" axis is human i18n (ko/en email
  copy, spec.md:L59), not programming-language tooling neutrality. The task's MP-4 forbids
  implementation-language-specific constructs in *functional* requirements for architecture-neutral
  SPECs; this SPEC is intentionally and correctly Node/nodemailer-bound by its goal (spec.md:L31–39),
  so MP-4 does not impose a violation. Auto-passes per the single-stack scope.

---

## Dimension Scores

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| REQ Quality (EARS, clarity, testability) | 0.93 | 0.30 | 0.279 |
| Acceptance Criteria (coverage, format, traceability) | 0.82 | 0.25 | 0.205 |
| Technical Completeness (architecture, error handling, security) | 0.90 | 0.25 | 0.225 |
| Document Structure (frontmatter, organization, cross-refs) | 0.65 | 0.20 | 0.130 |
| **Overall** | | | **0.839** |

**Note**: The weighted overall score (0.84) clears the 0.75 score threshold, but the verdict is
**FAIL** because MP-3 fails. Per the contract, PASS requires score ≥ 0.75 **AND all 4 must-pass
criteria pass**. A single must-pass failure forces an overall FAIL regardless of score.

Dimension rationale:
- **REQ Quality 0.93**: EARS labels now fully consistent; REQ-MAIL-042 attempts ambiguity resolved
  (spec.md:L177 defines `attempts: <actual attempt count>`, non-constant, with concrete values).
  Minor: REQ-MAIL-072 (L237) still offers two implementation options ("옵셔널 ctx … 또는 호출 측에서
  별도 dispatch"), a small residual ambiguity.
- **Acceptance Criteria 0.82**: Section 4 in EARS, acceptance.md scenarios binary-testable and now
  internally consistent on `attempts` (acceptance.md:L138 `=== 3`, L152/L155 `=== 1`). Coverage
  table (acceptance.md:L544–562) plus AC-COV-1..6 (L425–482) close most prior traceability gaps
  (REQ-004, 005, 023, 024, 027, 044, 073, 075 now covered). Residual: several governance/quality
  REQs (036, 037, 045, 055, 060–065, 070, 071, 074) still lack a dedicated AC.
- **Technical Completeness 0.90**: Strong — error taxonomy, retry/backoff algorithm (L335–354),
  permanent-vs-transient classification, Prisma-injection decision, security (no PII/token logging
  REQ-MAIL-005, javascript: URL rejection REQ-MAIL-033), edge-runtime exclusion all addressed.
- **Document Structure 0.65**: Held down by the MP-3 `updated`/`updated_at` defect plus the
  `created` field correctly fixed only on one of two timestamp fields — an internal inconsistency.

---

## Defects Found

### Must-Pass Failures (blocking)

**D1 (critical) — spec.md:L7**: Required frontmatter field is named `updated`, not `updated_at`.
The MP-3 required-field set mandates `updated_at`. The prior `created`→`created_at` fix was applied
(L6) but the identical defect on the sibling field `updated` was not. Missing required field → MP-3
FAIL. **Fix**: rename `updated: 2026-05-27` to `updated_at: 2026-05-27`.

### Non-Must-Pass Issues

**D2 (minor) — spec.md:L237 (REQ-MAIL-072)**: Requirement offers two divergent implementation
choices ("`verify-email.ts` 자체는 MailDispatcher 옵셔널 ctx로 추가 또는 호출 측에서 별도 dispatch
(권고…)"). A normative REQ that admits two implementations weakens single-interpretation testability.
Recommend pinning one approach (the parenthetical "권고" already leans toward call-site dispatch).

**D3 (minor) — Traceability**: REQs 036, 037, 045, 055, 060–065, 070, 071, 074 have no dedicated AC
or coverage-table row. Many are governance/quality REQs; either add a static-check AC (as already
done for 044/073/075 via AC-COV-2/5/6) or mark them explicitly non-acceptance-gated. Not blocking,
but keeps Traceability below 1.0.

**D4 (minor) — spec.md:L202 (REQ-MAIL-053)**: The warning-banner string embeds a `⚠` emoji literal
inside a normative requirement. Cosmetic; flagged only for consistency with the project's
no-emoji-in-instruction-text convention. Does not affect testability.

---

## Prior Iteration Fix Verification

| Prior Defect | Status | Evidence |
|---|---|---|
| **MP-1**: REQ numbering gaps unexplained | **RESOLVED** | spec.md:L72 now declares the block-numbering convention explicitly, sanctioning the gaps and the header upper-bound ranges. |
| **MP-2 (a)**: Section 4 ACs in Given-When-Then | **RESOLVED** | spec.md:L287–300 all use EARS `WHEN/WHERE…SHALL`; Given-When-Then confined to acceptance.md (permitted). |
| **MP-2 (b)**: REQ-MAIL-011 Event-Driven but uses WHERE | **RESOLVED** | spec.md:L92 relabeled `(State-Driven)` with `WHERE`. |
| **MP-2 (c)**: REQ-MAIL-053 Event-Driven but uses WHILE | **RESOLVED** | spec.md:L202 relabeled `(State-Driven)` with `WHILE`. |
| **MP-3 (a)**: `created` should be `created_at` | **RESOLVED** | spec.md:L6 `created_at: 2026-05-27`. |
| **MP-3 (b)**: missing `labels` field | **RESOLVED** | spec.md:L10 `labels: [mail, smtp, phase3]`. |
| **MP-3 (c)**: `updated_at` naming (sibling field) | **NOT RESOLVED (NEW BLOCKER)** | spec.md:L7 still `updated`, not `updated_at`. Carries the *same* defect class that was fixed for `created`. |
| **D6**: REQ-MAIL-042 attempts conflicts with acceptance.md | **RESOLVED** | spec.md:L177 defines `attempts: <actual attempt count>` (non-constant: 3 on transient-exhaustion, 1 on permanent); acceptance.md:L138/L152/L155 now agree exactly. "expert-backend가 결정" removed. |
| **D9**: HISTORY says nodemailer 4.x but REQs say ^6.9.0 | **RESOLVED** | No `4.x` reference remains; spec.md:L34, L114, L251 all consistently state `^6.9.0`. HISTORY (L23) no longer cites a version number. |

**Stagnation check**: No defect persists unchanged across all iterations. The `updated_at` failure
is a *newly surfaced* instance of the MP-3 timestamp-naming defect — the fix was applied to
`created` but not symmetrically to `updated`. This is partial-fix regression, not stagnation.

---

## Conclusion

Iteration 2 shows substantial, genuine progress: eight of the nine prior defects are fully resolved
with verifiable line-level evidence — the numbering convention is now declared (MP-1), all EARS
label/keyword pairings are consistent and Section 4 is EARS-formatted (MP-2), the attempts-field
contradiction is reconciled across spec and acceptance (D6), and the nodemailer version
inconsistency is gone (D9). The weighted quality score of 0.84 comfortably clears the 0.75
threshold. However, the SPEC still **FAILS** on a single must-pass criterion: the required
frontmatter field `updated_at` is present only under the legacy name `updated` (spec.md:L7). This
is the identical defect class corrected for `created`→`created_at`, left half-applied. Because
MP-3 is a hard firewall, this one-token omission forces an overall FAIL. The fix is trivial —
rename `updated` to `updated_at` on line 7 — after which all four must-pass criteria pass and the
SPEC should reach PASS on iteration 3.
