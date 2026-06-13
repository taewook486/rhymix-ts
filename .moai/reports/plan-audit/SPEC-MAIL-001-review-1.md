# SPEC Review Report: SPEC-MAIL-001
Iteration: 1/3
Verdict: FAIL
Overall Score: 0.62

> Reasoning context ignored per M1 Context Isolation. This audit is based solely on
> `spec.md` (primary) with cross-reference to `acceptance.md`. The author's prior
> reasoning, drafts, and conversation history were not consulted.

## Must-Pass Results

- **[FAIL] MP-1 REQ Number Consistency**: REQ numbers are NOT sequential without gaps. The
  SPEC uses a category-block numbering scheme with deliberate gaps between blocks:
  001–006 (spec.md:L73–83), then jumps to 010–017 (L87–107), 020–027 (L111–129),
  030–037 (L133–160), 040–045 (L164–183), 050–055 (L187–203), 060–065 (L207–221),
  070–075 (L225–250). There are no duplicates (verified: each of the 54 REQ headers
  appears exactly once) and zero-padding is consistent (3 digits throughout). However,
  MP-1 as written requires "REQ-001, REQ-002, ... REQ-N with no gaps." The sequence
  skips 007–009, 018–019, 028–029, 038–039, 046–049, 056–059, 066–069. Under the
  literal MP-1 rule ("Even one gap ... = FAIL"), this is a FAIL. If the project
  convention explicitly sanctions block-grouped numbering (gaps reserved for future
  REQs within a category), manager-spec must state that convention; absent such a
  declared convention in the SPEC, the gaps are unexplained and fail the must-pass
  criterion. When in doubt, FAIL (per audit protocol).

- **[FAIL] MP-2 EARS Format Compliance**:
  - Section 2 "Requirements (EARS Format)" requirements are largely well-formed EARS,
    BUT two are mislabeled, and the document's designated **Acceptance Criteria**
    section (Section 4, spec.md:L280–299) is written in **Given-When-Then**, not EARS.
    MP-2 states: "Every acceptance criterion must match one of the five EARS patterns.
    ... Given/When/Then test scenarios mislabeled as EARS ... = FAIL." Section 4 ACs
    (AC-MAIL-A1 through AC-MAIL-A5) are explicitly "GIVEN ... WHEN ... THEN" scenarios
    (e.g., L285, L288, L291). This is the exact M3-flagged failure mode.
  - Pattern mislabeling in Section 2:
    - REQ-MAIL-011 (spec.md:L89): labeled `(Event-Driven)` but uses keyword `WHERE`
      and expresses a state/condition ("is not set or is empty"). It does not match
      the Event-Driven "When [trigger]" pattern it claims.
    - REQ-MAIL-053 (spec.md:L199): labeled `(Event-Driven)` but uses keyword `WHILE`,
      which is the State-Driven pattern — mislabeled.
    - REQ-MAIL-010 (spec.md:L87): labeled `(Event-Driven)` `WHEN ... is set` — a
      standing condition phrased as an event; borderline.
  - Verdict FAIL on both the Section 4 Given-When-Then issue and Section 2 mislabels.

- **[FAIL] MP-3 YAML Frontmatter Validity**: Required fields are id, version, status,
  created_at (ISO date), priority, labels. The frontmatter (spec.md:L1–16) contains:
  `id`, `title`, `version`, `status`, `created`, `updated`, `author`, `priority`,
  `phase`, `parent`, `depends-on`, `issue_number`, `related-research`, `language`.
  - **Missing `created_at`**: the field is named `created` (L6: `created: 2026-05-27`),
    not `created_at`. MP-3 requires the field `created_at`. Missing required field = FAIL.
  - **Missing `labels`**: no `labels` field (array or string) is present anywhere in
    the frontmatter. MP-3 lists `labels` as required. Missing required field = FAIL.
  - `priority: P1` (L9) is a string and present (PASS on that field).
  - Two missing required fields → MP-3 FAIL.

- **[N/A] MP-4 Section 22 Language Neutrality**: N/A. This SPEC is scoped to a single
  application's mail subsystem (TypeScript/Node, nodemailer). It is not template-bound
  or universal multi-language tooling content. The "language" concern here is human
  i18n (ko/en email copy), not programming-language tooling neutrality. Auto-passes
  per the N/A clause. Evidence: spec.md:L58 ("ko/en 2개"), L33 ("nodemailer 4.x 기반").

## Category Scores (0.0-1.0, rubric-anchored)

| Dimension | Score | Rubric Band | Evidence |
|-----------|-------|-------------|----------|
| Clarity | 0.75 | 0.75 band | Requirements are precise and mostly single-interpretation (e.g., REQ-MAIL-012 env table L91–97, REQ-MAIL-040 backoff L164). Minor ambiguity: REQ-MAIL-042 hardcodes `attempts: 3` (L174) while acceptance.md:L152,L155 flags the value as undecided ("attempts=1 or 3 ... expert-backend가 결정") — a self-acknowledged unresolved interpretation. REQ-MAIL-072 (L234) offers two implementation choices ("또는 호출 측에서 별도 dispatch"). |
| Completeness | 0.75 | 0.75 band | All major sections present: HISTORY (L20), Goal/Audience (WHY, L26), Requirements (WHAT, L67), Technical Approach (HOW, L303), Acceptance Criteria (L280), Exclusions (L447, 20 specific entries). Frontmatter is sparse on the two MP-3 fields (created_at naming, labels absent), which holds this below 1.0. |
| Testability | 0.80 | 0.75 band | Most ACs in acceptance.md are binary-testable (e.g., A2.2 "console.warn 정확히 1회" L97; A3.1 "sendMail 정확히 3회" L130). No prohibited weasel words ("appropriate"/"adequate"/"reasonable") found in normative AC text. Deduction: REQ-MAIL-042 attempts value is left open (L155 acceptance), and AC-MAIL-A3 "호출 간격이 ≈1s, ≈2s" (L291) uses approximate timing that requires fake-timer interpretation. |
| Traceability | 0.50 | 0.50 band | Section 4 ACs map to REQs (L284–297) and acceptance.md has a coverage table (L479–490). BUT multiple REQs have NO corresponding AC: REQ-MAIL-004 (barrel export), 016 (no env read in dispatch), 027 (no cc/bcc), 036 (inline CSS), 037 (site name), 044 (retry in-class), 045/055/065/075 (Unwanted SHALL-NOTs), 050 (admin display fields), 060–064 (quality), 070–074 (integration) are not covered by any Given-When-Then AC. Roughly half the 54 REQs lack a traced AC. |

## Defects Found

D1. spec.md:L1–16 — Frontmatter uses `created` instead of required `created_at`; the
required `labels` field is entirely absent. Two MP-3 violations. — Severity: critical

D2. spec.md:L280–299 — The designated "Acceptance Criteria" section (Section 4) is
written in Given-When-Then test-scenario format, not EARS. MP-2 explicitly fails
Given/When/Then mislabeled as acceptance criteria. — Severity: critical

D3. spec.md:L89 — REQ-MAIL-011 labeled `(Event-Driven)` but uses `WHERE` and expresses
a state condition; pattern label does not match content. — Severity: major

D4. spec.md:L199 — REQ-MAIL-053 labeled `(Event-Driven)` but uses `WHILE` (State-Driven
pattern). Mislabeled. — Severity: major

D5. spec.md:L73–250 — REQ numbering has unexplained gaps (007–009, 018–019, 028–029,
038–039, 046–049, 056–059, 066–069). No declared block-numbering convention in the
SPEC to sanction the gaps. MP-1 violation as written. — Severity: critical

D6. spec.md:L174 vs acceptance.md:L152,L155 — REQ-MAIL-042 normatively specifies
`diff.attempts: 3`, but acceptance.md openly defers the value ("attempts=1 ... 또는
3으로 spec에서 결정", "expert-backend가 결정"). A normative requirement contradicted by
its own acceptance doc; the value is left to implementer discretion, undermining
binary testability of the audit-trail field. — Severity: major

D7. Traceability gap — ~27 REQs (e.g., REQ-MAIL-004, 016, 027, 036, 037, 044, 045,
050, 055, 060–065, 070–075) have no corresponding AC in Section 4 or acceptance.md's
coverage table (acceptance.md:L479–490). Many are Quality/Integration/Unwanted REQs
that ship behavior but are never asserted by an AC. — Severity: major

D8. spec.md:L72,L85,L109,L131,L162,L185,L205,L223 — Section headers declare REQ ranges
ending in -009/-019/-029/-039/-049/-059/-069/-079 (e.g., "REQ-MAIL-001 ~ 009",
"REQ-MAIL-070 ~ 079") but those upper-bound numbers are never defined, reinforcing
that the gaps are intentional placeholders yet undocumented as a convention. — Severity: minor

D9. spec.md:L111 vs L33 — Inconsistent nodemailer version reference: HISTORY/L33 says
"nodemailer 4.x 기반" while REQ-MAIL-020 (L111) and REQ-MAIL-074 (L248) specify
"^6.9.0". The `4.x` mention in L33 is a factual contradiction within the document. — Severity: minor

## Chain-of-Verification Pass

Second-look findings (re-read sections to confirm thoroughness):
- Re-read **every** REQ header L73–250 via grep extraction (54 headers, each unique, no
  duplicates) — confirmed D5 gaps end-to-end, not spot-checked. Confirmed no duplicate
  REQ IDs (corrects against a false-FAIL on duplication).
- Re-read **Exclusions** (L447–472): 20 entries, each specific with a named follow-up
  SPEC or rationale (e.g., L451 "SPEC-MAIL-SAAS-001", L466 "RFC 5322 deep validation").
  Exclusions are genuinely specific, not vague — SC-6 PASSES. No defect here.
- Re-checked **EARS keyword vs label** for ALL conditional REQs, not just samples:
  found the `WHERE`/`WHILE` mislabels (D3, D4) that a skim would miss. Confirmed the
  14 `WHEN`+Event-Driven pairings are internally consistent.
- New defect surfaced on second pass: **D9** (nodemailer 4.x vs ^6.9.0 contradiction,
  L33 vs L111/L248) — missed in first pass, added here.
- New defect surfaced on second pass: **D8** (header-declared REQ ranges reference
  undefined upper-bound numbers) — added.
- Cross-checked acceptance.md coverage table (L479–490) against the full REQ list to
  confirm D7's uncovered set rather than assuming it.

## Recommendation (actionable fixes for manager-spec)

1. **Frontmatter (D1, blocks MP-3)**: Rename `created: 2026-05-27` to
   `created_at: 2026-05-27` (spec.md:L6). Add a `labels` field, e.g.
   `labels: [mail, smtp, auth, phase-3]` (array) in the frontmatter block.

2. **Acceptance Criteria format (D2, blocks MP-2)**: Convert Section 4 (spec.md:L280–299)
   acceptance criteria into EARS patterns, OR clearly retitle Section 4 as "Acceptance
   Test Scenarios" and ensure the normative acceptance criteria are the EARS REQs in
   Section 2. The document must not present Given-When-Then under an "Acceptance
   Criteria" heading that the audit treats as EARS-bound.

3. **EARS labels (D3, D4)**: Re-label REQ-MAIL-011 (L89) and REQ-MAIL-053 (L199) to
   match their keywords — `WHERE` → Optional/State, `WHILE` → State-Driven — and align
   the keyword with the chosen pattern, or rewrite with the correct EARS keyword.

4. **REQ numbering (D5, D8)**: Either renumber REQs to be strictly sequential
   (REQ-MAIL-001..054) with no gaps, OR add an explicit statement in Section 2 declaring
   the category-block reservation convention (e.g., "each category reserves a 10-number
   block; intra-block gaps are reserved for future REQs"). Without a declared convention,
   MP-1 cannot pass.

5. **Resolve attempts ambiguity (D6)**: Fix REQ-MAIL-042 (L174) so `attempts` has one
   defined meaning (actual attempt count vs constant 3) and make acceptance.md (L152–155)
   assert that single value. Remove "expert-backend가 결정" from a normative audit field.

6. **Traceability (D7)**: Add at least one AC (EARS or scenario) for each currently
   uncovered REQ, or consolidate untestable governance REQs and mark them explicitly as
   non-acceptance-gated with rationale. Target: every REQ-MAIL-XXX has >= 1 AC.

7. **Version consistency (D9)**: Correct the "nodemailer 4.x" reference in HISTORY (L33)
   to match the specified `^6.9.0` (L111, L248).

Re-audit required after fixes. Iteration 1 of 3.

Verdict: FAIL
