@VOC
Feature: Audit every surface's vocabulary against the manifesto (one-time, report-only)

  The closed-vocabulary completeness audit (slice 4 of [spec-controller] Outputs
  & vocabulary). Prior sweeps failed two ways — scope was GUESSED and the sweeper had
  DISCRETION. This removes both. The tool scans THE FILE SET GIT REPORTS FOR THE PROJECT — every gitignored path excluded, and beyond that only lockfiles and the audit's own detection machinery (the meta-mention exemption, the files that name the rejected vocabulary) — decomposes every name into words (camelCase / kebab /
  snake / dotted / path → words: rootProgramme → root, programme) and checks each word
  against the approved word-set (manifesto domain vocabulary + the endorsed generic-technical
  allowlist + the ruled-allowed-outright report/spec/feature). Burden flips: a word in
  NEITHER set flags. The banned shortenings (supply, execution(s), state, unattributed) and
  the bare full-term words (obligation / observation / ghost) always flag.

  Two scanning modes keep the audit useful without flooding on ordinary English: NAME mode
  (code identifiers, JSON/YAML keys, feature tags, filenames) applies the full closed
  vocabulary — every word must prove it is approved; PROSE mode (comments, doc/markdown
  prose, string literals, titles) examines only the controlled domain vocabulary — a banned
  or rejected-alias word flags, ordinary English is left alone, and any COMPOSITE token
  (a deliberate multi-word name embedded in prose) is escalated to NAME mode.

  The tool is report-only — NOT a wired CI gate, NOT a standing lint:*-vocab guard (operator
  ruling 2026-07-02: the audit is a one-time completeness instrument, re-run once at slice 5
  to prove zero). It emits two artefacts for operator review: a per-name manifest
  (surface | file | symbol | current | new | action | decision — `new` from the manifesto's
  rejected-alias→canonical mapping) and a coverage matrix (surfaces × flagged-words, counts)
  so completeness is confirmable at a glance — a surface with zero rows catches a miss.

  The unit arm proves the word-decomposition + classification + matrix assembly in isolation;
  the integration arm drives the real CLI over a fixture corpus carrying known banned and
  known approved names and asserts the emitted manifest + matrix.

  Rule: a name whose word is outside the approved set flags; an all-approved name does not

    `guard` is the discriminating case (canon L5 / L129). It is a DIFFERENT WORD — a check
    protecting an invariant — so its qualified compounds keep it, while a bare `guard`
    standing in for a static guard is the banned shortening. A qualifier need only
    CO-OCCUR on the name or line (co-occurrence, not strict adjacency), so anaphora —
    "the static guard ... the guard" — passes (the qualifier `static` co-occurs), and
    only a genuinely standalone bare `guard` flags. Its action is `review`, never auto-`rename`: bare, it
    may be the different word used alone rather than a shortening, so a human looks.
    That is why it does not inherit obligation/observation's rename disposition.

    @unit @integration @SCN-VOC-001
    Scenario: the audit flags a non-conforming word across surfaces and passes an approved one
      Given a fixture corpus carrying a banned word in an identifier and an approved word in another
      And the corpus carries a bare "guard" identifier and a qualified "static guard" identifier
      When the vocabulary audit runs over the corpus
      Then the manifest lists the banned name with its canonical replacement
      And the approved name is not flagged
      And the bare "guard" is flagged for review, not rename
      And the qualified "static guard" is not flagged

  Rule: the coverage matrix enumerates every surface, so a zero-flag surface still appears

    @unit @integration @SCN-VOC-002
    Scenario: a surface with no flagged word still appears as a coverage-matrix row
      Given a fixture corpus that flags a word on one surface only
      When the vocabulary audit renders the coverage matrix over the corpus
      Then the coverage matrix lists every scanned surface as a row
      And a surface with zero flagged words is present with a zero count

  Rule: the forbidden kind-label phrase "declared scenario" reds; canon "undeclared scenario" stays green

    The purge guard (@SCN-VOC-003, 3F-2147). Whole-word `declared` IMMEDIATELY before
    `scenario` is the retired kind-label — so it reds wherever it hides (a comment, a
    Gherkin line, a doc, a string), renamed to the bare canon `scenario` (which already
    means the real, declared kind). Whole-word by construction: `undeclared` decomposes to
    the single token "undeclared", so canon "undeclared scenario" stays green. Phrase-only,
    honest scope: it does NOT catch a bare kind-label enumeration ("declared, phantom and
    suspense") — that is a separate, deferred residual.

    @unit @SCN-VOC-003
    Scenario: the audit reds on "declared scenario" and stays green on "undeclared scenario"
      Given a corpus carrying the phrase "declared scenario" and the canon phrase "undeclared scenario"
      When the vocabulary audit runs over the corpus
      Then the phrase "declared scenario" is flagged, renamed to the bare "scenario"
      And the phrase "undeclared scenario" is not flagged

  Rule: the retired tag "ci-performance" reds; the canon "ci-run-time" stays green

    The first regrowth guard (@SCN-VOC-006, 3F-2289). The retired tag `@ci-performance`
    is renamed to `@ci-run-time`, and it has ZERO occurrences in this tree — so the rule
    is a REGROWTH guard only: nothing to purge, everything to keep out. Whole-word `ci`
    IMMEDIATELY before `performance` is the retired tag, so it reds wherever it hides (a
    comment, a doc, an identifier, a string, a filename, a config key), renamed to
    `ci-run-time`. It must be the PHRASE, not a banned word: `ci` and `performance` are
    BOTH individually allowlisted — bare `@performance` is the canon runtime quality
    check and stays green, and canon `ci-run-time` decomposes to `ci` / `run` / `time`,
    all approved. Sibling in shape to @SCN-VOC-003, and ordered with it AHEAD of the
    approved-word and mode gates, which is what lets a phrase of two approved words red
    at all. Honest scope: a bare Gherkin TAG LINE is not reached, because the scanner
    skips tag lines wholesale as structural — a pre-existing, all-rules segmentation
    decision that @SCN-VOC-003 shares, not a property of this arm.

    @unit @SCN-VOC-006
    Scenario: the audit reds "ci-performance" and stays green on "ci-run-time"
      Given a corpus carrying the retired tag "ci-performance" and the canon tag "ci-run-time"
      When the vocabulary audit runs over the corpus
      Then "ci-performance" is flagged, renamed to "ci-run-time"
      And "ci-run-time" is not flagged

  Rule: the retired metric word "budget" reds; the canon "threshold" stays green

    The second regrowth guard (@SCN-VOC-007, 3F-2290), and the first that also PURGES:
    a threshold is a ceiling, not something spent down, so the CI/metric sense of
    `budget` is retired in favour of `threshold`. Unlike @SCN-VOC-003 / @SCN-VOC-006
    this needs no phrase rule and no adjacency — `budget` carries no canon homograph
    anywhere in this vocabulary, so it is a plain BANNED WORD, which is the strongest
    matcher available: it reds in BOTH modes, in an identifier and in prose alike, and
    the naive singulariser folds `budgets` onto the same stem, so the plural is covered
    by construction rather than by a second entry. `threshold` is held green POSITIVELY —
    it joins the endorsed generic allowlist, so the canon word is APPROVED rather than
    merely un-flagged (before this rule it flagged as `unknown` on a Stryker JSON key,
    which is a green nobody chose).

    @unit @SCN-VOC-007
    Scenario: the audit reds a metric "budget" and stays green on "threshold"
      Given a corpus carrying a metric "budget" and the canon "threshold"
      When the vocabulary audit runs over the corpus
      Then "budget" is flagged, renamed to "threshold"
      And "threshold" is not flagged

  Rule: the retired evidence-obligation word "demand" reds; the canon outcome "undemanded" stays green

    The third regrowth guard (@SCN-VOC-004, 3F-2291), and the largest purge on the list:
    the debit side is an EVIDENCE OBLIGATION, not a "demand", so every inflection of the
    retired word is retired with it. Like @SCN-VOC-007, and unlike the phrase rules
    of @SCN-VOC-003 and @SCN-VOC-006, this one needs no adjacency: `demand` carries
    no canon homograph, so it is a plain BANNED WORD, the strongest matcher — it
    reds in BOTH modes, in an identifier and in prose alike. The singulariser folds one
    inflection only (`demands` → `demand`, `demanders` → `demander`), so `demanded`,
    `demanding` and `demander` each carry their own entry — asserted, not assumed.

    The load-bearing constraint is the NEGATIVE: the canon outcome `undemanded` — the
    handle for a credit with no matching obligation (double-entry-manifesto.md line 42) —
    must stay green throughout, on every one of its occurrences. It is whole-word by
    construction: `decomposeName` yields the single token "undemanded" (≠ "demanded"),
    exactly as canon `undeclared` survives @SCN-VOC-003, and it stays a DOMAIN word so its
    green is APPROVED rather than merely un-matched. A rule that reds the canon outcome
    is the failure this scenario exists to prevent, so it is asserted explicitly.

    @unit @SCN-VOC-004
    Scenario: the audit reds "demanded" and stays green on the canon "undemanded"
      Given a corpus carrying the retired "demanded" and the canon outcome "undemanded"
      When the vocabulary audit runs over the corpus
      Then "demanded" is flagged, renamed to "evidence obligation"
      And "undemanded" is not flagged

  Rule: the retired class name "static guard" reds; the canon "static check" stays green

    The fourth regrowth guard (@SCN-VOC-005, 3F-2299), and the one that closes the retired-term
    slice. The class of checks that run in CI over the committed source is a STATIC CHECK —
    industry-legible — so the retired class name is retired with its purge. Like @SCN-VOC-003
    and @SCN-VOC-006, and unlike the plain banned words @SCN-VOC-004 / @SCN-VOC-007, this MUST
    be a PHRASE rule: whole-word `static` IMMEDIATELY before `guard` (singular or plural).
    Neither half can be banned — `static` is a manifesto DOMAIN word (the static axis, the
    static evidence observation), and `guard` is canon's DIFFERENT WORD, kept deliberately by
    the Rule at the top of this file.

    ORDERING IS THE WHOLE RULE. The arm sits with its phrase siblings AHEAD of the
    FULL_TERM_ONLY gate and the approved-word gate, because `static` is an APPROVED domain
    word: reached by `isApproved` first, the phrase would pass and the entire class would stay
    green by accident — a green nobody chose. The same ordering is what leaves `guard` alone:
    the arm flags the `static` token and returns, so the following word is judged by the
    unchanged `guard` machinery, where `["static"]` still co-occurs as a GUARD_QUALIFIERS
    entry and holds it green. One occurrence, one row, one rename — exactly the
    `declared scenario` shape, where `declared` reds and canon `scenario` does not.

    The load-bearing NEGATIVES, each asserted rather than left unmentioned: the canon
    `static check` decomposes to `static` / `check`, both already approved, so it earns no
    flag of any kind; bare `guard` keeps passing under its remaining ruled qualifiers
    (`both-missing`, `exhaustiveness`, `regression`, `existence`, `readability`); and a
    `guard:`-prefixed CI SCRIPT NAME (`guard:domain-purity`) is a VALUE, not vocabulary, so
    it is untouched by this rule. This arm reds the retired CLASS NAME, never the word.

    @unit @SCN-VOC-005
    Scenario: the audit reds "static guard" and stays green on "static check"
      Given a corpus carrying the retired phrase "static guard" and the canon "static check"
      When the vocabulary audit runs over the corpus
      Then the phrase "static guard" is flagged, renamed to "static check"
      And the phrase "static check" is not flagged

  Rule: the audit scans the project git tracks, never build output

    The scope fix (@SCN-VOC-008, 3F-2324). The audit used to descend the tree itself,
    excluding only `.git`, `node_modules` and lockfiles by name — so it read every
    gitignored copy of the project as though it were the project. Measured 2026-08-03:
    735 files, of which 364 `.stryker-tmp/` + 136 `dist/` + 2 `reports/` carried 40,767
    of the 48,361 manifest rows — 84.3% of the headline, all of it STALE, since those
    trees regenerate from already-purged source after any build or mutation run. A
    headline whose meaning depends on when you last built is not a measurement.

    GIT IS THE AUTHORITY ON WHAT THE PROJECT IS, and the rule is a substitution, not an
    addition: `git ls-files --cached --others --exclude-standard` with `cwd` at the
    resolved root replaces the descent, and every judgement downstream is untouched.
    Reimplementing `.gitignore` was the alternative and is rejected outright —
    negations, nested ignore files and glob precedence are subtle enough that a second
    implementation agrees with git by COINCIDENCE and then drifts, which is the
    agreeing-by-copy this codebase has spent several slices removing.

    `--others --exclude-standard` IS LOAD-BEARING, and invisible to any run: plain
    `--cached` returns the same 244 paths on this tree, so no green could tell them
    apart — but tracked-only would make a NEW, UNCOMMITTED source file invisible to the
    audit, trading a coverage hole for a noise fix. The form is pinned by the @unit arm
    for exactly that reason. The audit's own filters survive the substitution unchanged:
    `pnpm-lock.yaml` is TRACKED, so git hands it back where the old walk excluded it by
    name, and the self-exemption stays repo-relative — which is what keeps the narrow
    fixture root of @SCN-VOC-001/002 scanning its 3 files.

    @unit @integration @SCN-VOC-008
    Scenario: a banned word in gitignored build output is not reported
      Given a corpus carrying a banned word in a tracked file and the same word under a gitignored path
      When the vocabulary audit runs over the corpus
      Then the tracked occurrence is reported
      And the occurrence under the gitignored path is not

  Rule: outside a git work tree the audit refuses to scan rather than guess

    The precondition (@SCN-VOC-009, 3F-2325), and the close of the scope fix. Asking git
    what the project is buys an honest headline, and it buys a PRECONDITION the audit never
    used to have: git must have an answer. This arm rules on its absence — operator-ruled
    2026-08-03, FAIL LOUD.

    THE FALLBACK IS THE BUG, NOT THE FIX. "No git? use the old recursive walk" is the
    obvious implementation and it re-creates @SCN-VOC-008's fault exactly, only quieter: the
    run would appear to succeed, emit a manifest, and leave the reader no way to know build
    output was counted. That is a number whose meaning depends on an UNSTATED SCANNING MODE
    — the whole fault this Rule's sibling removes. Refusing is honest; guessing is not.

    NO ARTEFACT AT ALL, not an empty one. An empty CSV sitting at the path the operator
    asked for is indistinguishable from a clean scan to anything that reads the file
    afterwards, and this codebase has been bitten by that false-identical before. So the
    refusal happens BEFORE any write, and the message names the actual problem and the ROOT
    IT TRIED — it could not determine the project's file set, because THAT path is not in a
    git work tree. Never a bare "scan failed".

    GIT ANSWERS QUESTIONS ABOUT GIT here too: `git rev-parse --is-inside-work-tree`, never a
    `.git` DIRECTORY probe. A `.git` FILE is a valid work tree (git worktrees, submodules)
    and would be missed; a `.git` directory further up may not be the right one and would be
    a false pass. Both cases are invisible on this tree, so the query form is pinned by the
    unit arm rather than by any run — as is git's `false` answer, which is what a path INSIDE
    a `.git` directory returns: a repository, but not a work tree.

    THE EXIT-CODE SPLIT IS DELIBERATE, and easy to "fix" wrongly. A SUCCESSFUL scan stays
    exit 0 however many words it flags — the audit is a report, not a gate (operator ruling
    2026-07-02, unchanged). This scenario introduces the ONLY non-zero exit in the tool, and
    it signals a PRECONDITION FAILURE, not a finding. A later reader must not unify them by
    making flagged words fail too.

    @unit @integration @SCN-VOC-009
    Scenario: the audit errors when its root is not in a git work tree
      Given a corpus directory that is not inside a git work tree
      When the vocabulary audit runs over the corpus
      Then it reports that it cannot determine the project's file set
      And it exits non-zero without emitting a manifest

  Rule: the enforced term set is the vendored canon table's adopted rows

    The source fix (@SCN-VOC-010, 3F-2330). Until now the retired words lived in a
    hand-maintained set inside `vocabWordSets.ts` — a COPY of canon's
    `double-entry-manifesto.md` → *Appendix — Blocked vocabulary*, agreeing with it by
    diligence. Canon lives in a DIFFERENT REPOSITORY that this repository's CI never
    checks out and a public consumer would not have, so no check here could ever read
    it. That leaves two hops, and only one is ours: code ↔ a VENDORED copy of the table,
    in-repo; and vendored copy ↔ canon, which belongs to the maintainers' private repository's CI
    across every product and is deliberately NOT built here.

    DERIVATION, NOT COMPARISON. The in-repo hop is not checked, it is DISSOLVED: the
    table is committed at `static-checks/blockedVocabulary.md` and the enforced word set
    is PARSED OUT OF IT, so there is no second list left to drift. "A new plain adopted
    row is a table edit only" stops being a promise and becomes a structural fact — the
    throwaway-term proof in this scenario's PR adds a nonsense row to the table with no
    `.ts` edit at all and watches the audit red on it.

    THE ADOPTION-STATUS COLUMN IS WHAT LETS THE TREE STAY GREEN. Adopting all seven canon
    rows verbatim would red 2,272 occurrences this slice does not own, so each row carries
    a triaged status and ONLY `adopted` rows enter the enforced set. `deferred` rows name
    their date and their ticket — the debt is visible, never silently omitted;
    `not-applicable` is a DIFFERENT verdict, for the work-item `tree`/`root`/`branch` row
    that this repository has no model for at all (its occurrences are filesystem, git and
    CLI senses — `--root`, `repoRoot`, the git work tree @SCN-VOC-009 added one slice
    ago). Deferring that row would book debt nobody should ever pay; adopting it would red
    correct code.

    BOTH HALVES ARE LOAD-BEARING. "An adopted row reds" alone would still pass if the
    parser enforced EVERY row — the very mistake that would red the tree wholesale. The
    deferred-stays-green half is what makes the status column mean anything, so it is
    asserted rather than assumed.

    CANON OWNS *WHICH*; CODE OWNS *HOW*. The table supplies the words; the matcher per
    term stays in code and is NOT collapsed — whole-word for a plain row (the default),
    per-inflection entries for the retired evidence-obligation family, and the
    phrase-adjacency arms of @SCN-VOC-005 / @SCN-VOC-006, whose ordering ahead of the
    approved-word gate remains exactly as those Rules describe. The table names which
    rows are the documented matcher exceptions; only whole-word adopted rows join the
    banned set.

    @unit @integration @SCN-VOC-010
    Scenario: an adopted row reds a planted usage; a deferred row does not
      Given the vendored blocked-vocabulary table marks one term adopted and another deferred
      When the vocabulary audit runs over a corpus carrying both terms
      Then the adopted term is flagged
      And the deferred term is not flagged
