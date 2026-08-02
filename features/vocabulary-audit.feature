@VOC
Feature: Audit every surface's vocabulary against the manifesto (one-time, report-only)

  The closed-vocabulary completeness audit (slice 4 of [spec-controller] Outputs
  & vocabulary). Prior sweeps failed two ways — scope was GUESSED and the sweeper had
  DISCRETION. This removes both. The tool scans every file by default (the only exclusions:  node_modules, .git, lockfiles, and the audit's own detection machinery — the meta-mention exemption, the files that name the rejected vocabulary), decomposes every name into words (camelCase / kebab /
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
