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
  (code identifiers, JSON/YAML keys, filenames) applies the full closed
  vocabulary — every word must prove it is approved; PROSE mode (comments, doc/markdown
  prose, string literals, titles, and every line of a .feature file INCLUDING the
  author-chosen tags on its tag lines) examines only the controlled domain vocabulary — a banned
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
    at all. SCOPE, AS OF @SCN-VOC-013: a bare Gherkin TAG LINE used NOT to be reached —
    the scanner skipped tag lines wholesale as structural, which was exactly wrong for a
    term whose canonical form IS a tag. That segmentation decision was never a property of
    this arm, and it is not this arm that fixed it: @SCN-VOC-013 below now walks a tag
    line per token, so `@ci-performance` reds here like anywhere else.

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

  Rule: the retired evidence-obligation words "demand" and "undemanded" red; the canon outcome "no-evidence-obligation" stays green

    The third regrowth guard (@SCN-VOC-004, 3F-2291), and the largest purge on the list:
    the debit side is an EVIDENCE OBLIGATION, not a "demand", so every inflection of the
    retired word is retired with it. Like @SCN-VOC-007, and unlike the phrase rules
    of @SCN-VOC-003 and @SCN-VOC-006, this one needs no adjacency: `demand` carries
    no canon homograph, so it is a plain BANNED WORD, the strongest matcher — it
    reds in BOTH modes, in an identifier and in prose alike. The singulariser folds one
    inflection only (`demands` → `demand`, `demanders` → `demander`), so `demanded`,
    `demanding` and `demander` each carry their own entry — asserted, not assumed.

    WHICH WORD IS CANON IS EXACTLY WHAT MOVED (3F-2300, superseding 3F-2281). This Rule used
    to hold `undemanded` GREEN and called that its load-bearing half: the handle for a credit
    with no matching obligation was canon, so a rule that redded it was the failure the
    scenario existed to prevent. 3F-2300 renamed that handle to `no-evidence-obligation` and
    swept all 431 occurrences, so `undemanded` is a RETIRED word now — its vendored row moves
    deferred → adopted with this scenario, and the derivation of @SCN-VOC-010 turns that row
    into a ban with no code edit. The scenario's SUBJECT never moved; the word underneath it
    did, which is what makes this an Update rather than a new guard.

    BOTH HALVES, OR THE UPDATE IS GREEN BY EROSION. Swapping the word inside the old negative
    — "`no-evidence-obligation` is not flagged" — is TRUE, and green, and throws away
    everything the scenario protects: it would pass just as well with the whole `demand`
    matcher deleted. So the retired word is asserted FLAGGED, naming `no-evidence-obligation`
    as its replacement, and the new canon word is asserted GREEN, in the one scenario. The
    same trap as the `demand` → `declare` swap 3F-2281 caught, one rename later.

    THE ADOPTION IS THE COMPLETENESS PROOF, NOT BOOKKEEPING. `undemanded` is whole-word by
    construction — `decomposeName` yields the single token "undemanded" (≠ "demanded") — so
    the flip cannot half-match, and any occurrence surviving the sweep flags. The ones that
    remain are the files whose PURPOSE is to name the retired vocabulary, and they are the
    self-exempt set, not an allowance made for this word. The green half stands on the
    adjacency @SCN-VOC-012 pins — `evidence` immediately before `obligation` — not on
    `no-evidence-obligation` being unguarded.

    @unit @SCN-VOC-004
    Scenario: the audit reds "demanded" and "undemanded", and stays green on the canon "no-evidence-obligation"
      Given a corpus carrying the retired "demanded" and "undemanded" and the canon "no-evidence-obligation"
      When the vocabulary audit runs over the corpus
      Then "demanded" is flagged, renamed to "evidence obligation"
      And "undemanded" is flagged, renamed to "no-evidence-obligation"
      And "no-evidence-obligation" is not flagged

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

    THE SELF-EXEMPT SET IS NOW SYMMETRIC (3F-2327). `vocabAuditCli.test.ts` was the last
    of the three unit-test files over the detection subsystem still outside the set, while
    the module it tests was already inside it — so the audit could not see `insideWorkTree`
    where it is DEFINED and counted it 24 times where it is REFERENCED. Measured on this
    tree: 56 rows, 55 of them `review` (generic-technical candidates) and exactly 1
    `rename`, itself a reference to the already-exempt fixture corpus. Moving that content
    to fixtures was the alternative and was rejected on the numbers: the file holds NO
    banned-word corpus at all — its flagged words are the subject-under-test's own API
    names and the test's local helpers — so at most 5 of the 56 rows could relocate and
    every edit would still move the headline.

    AND THE EXEMPTION IS A BLIND SPOT, said out loud because this codebase has been bitten
    by it: an adopted retired word in an exempt file goes unreported, which is why 3F-2300's
    `undemanded` rename looked complete when it was merely unmeasured. The trade is taken
    here because the measured cost is ZERO adopted words hidden today, and because 56
    permanent false positives that move on every edit train a reader to stop reading the
    headline — a signal nobody reads is not a safeguard. Sweeping the exempt set itself for
    ADOPTED words is the mechanism that closes this properly, and it has its own ticket
    (3F-2345) rather than riding in under a membership change.

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

  Rule: a canon row carrying no adoption status reds rather than passing unnoticed

    THE HALF THAT MAKES THE DEFERRAL HONEST (@SCN-VOC-011, 3F-2331). @SCN-VOC-010 above
    lets a row be marked deferred and stay green — the only reason this repository can
    ship against a canon table whose unadopted rows carry 2,272 occurrences. It is also
    the obvious way to smuggle a canon row past everybody: leave the status cell out and
    the row enforces nothing, silently. Without this Rule "deferred" is indistinguishable
    from "nobody looked", and the whole mechanism degrades into the honour system it was
    built to replace.

    SO THE TABLE IS A TRIAGE RECORD, NOT A LIST. Every row must carry exactly one of
    `adopted` / `deferred` / `not-applicable`, and the check reds on a row that carries
    none, a row whose cell reads something else, and a `deferred` row that names no ticket
    and no date. A DEFERRAL WITHOUT A TICKET IS AN INTENTION, NOT A DECISION: nobody is
    holding it, nothing will ever surface it again, and the debt is invisible in exactly
    the way an omitted row is.

    WHAT THE RED HAS TO SAY. It names WHICH row and WHAT is missing from it — never "the
    table is invalid", which sends a reader back to a table they have just read and tells
    them nothing about where to look.

    THE CHECK IS ITS OWN NAMED CI SCRIPT, AND THE `lint:` PREFIX IS NOT COSMETIC.
    `runningStaticChecks` observes a CI script only when its name carries an observed
    prefix (`lint:` / `guard:`), so a name outside that set would run in CI while being
    structurally invisible to spec-controller's own ledger — a real quality check kept off
    the books, which is where a watermelon hides. The `@lint=lint:blocked-vocabulary` tag
    below is then what keeps it out of the suspense row as an uncited static check.
    Observed AND declared is the balanced state (the @SCN-CPX-003 precedent).

    THE DEGENERATE CASE IS PART OF THE SAME BEHAVIOUR. "Every row is triaged" is vacuously
    true of no rows at all, so a table the parser reads nothing out of — a lost header, a
    changed column count — would exit 0 while checking nothing. A check that cannot tell
    "all clear" from "I did not run" is the failure this Rule exists to remove, so an empty
    parse reds too.

    @unit @integration @lint=lint:blocked-vocabulary @SCN-VOC-011
    Scenario: a table row with no adoption status reds the build
      Given the vendored blocked-vocabulary table carries a row with no adoption status
      When the blocked-vocabulary status check runs
      Then it reds naming the row that has no status

  Rule: the canon handle "no-evidence-obligation" passes because "evidence" precedes "obligation" in the same scanned unit, not because "obligation" is unguarded

    THE REASON THE NEW HANDLE IS GREEN, WRITTEN DOWN (@SCN-VOC-012, 3F-2341). 3F-2300 renamed
    the credit-side outcome `undemanded` → `no-evidence-obligation`. The new handle decomposes
    to `no` / `evidence` / `obligation`, and bare `obligation` is a FULL_TERM_ONLY word — the
    strongest matcher after the banned set. It passes for exactly ONE reason: `fullTermSatisfied`
    reads the IMMEDIATELY PRECEDING word and finds `evidence`. Nothing else holds it green — it
    is in no word-set of its own. The camelCase `noEvidenceObligation` decomposes identically,
    so it is green by the same rule rather than by a second one, which is why both forms are
    asserted here and neither is left to be assumed from the other.

    SO THE HANDLE IS ONE WORD-ORDER AWAY FROM REDDENING. `obligation-with-no-evidence` says the
    same thing in English and flags, because the adjacency is gone. Anyone rewording the handle
    needs to know that BEFORE a manifest diff tells them.

    BOTH HALVES, OR THE SCENARIO EARNS NOTHING. "The handle is not flagged" is equally true of a
    world where `obligation` had been quietly dropped from FULL_TERM_ONLY or allowlisted — the
    green-by-erosion shape @SCN-VOC-004 exists to prevent, one Rule over. Pairing it with "a
    bare `obligation` still flags as a bare shortening" is what makes the first half mean GREEN
    BY ADJACENCY rather than GREEN BECAUSE NOTHING GUARDS IT. A one-sided version of this
    scenario would stay green with the whole matcher deleted.

    THE EXEMPTION REACHES EXACTLY ONE SCANNED UNIT, WHICH IS NARROWER THAN "the phrase is
    exempt". Adjacency is judged inside the word sequence `classifyWords` is handed — ONE
    identifier in NAME mode, ONE line in PROSE mode — never across the file. Where the scanner
    splits the handle across units the exemption cannot apply and the `obligation` flags: a
    REGEX LITERAL is code rather than a string, so `identSegments` emits one single-word segment
    per identifier run and `no`, `evidence` and `obligation` never meet. That is live in this
    tree, not hypothetical — `tests/steps/report.steps.ts` carries the handle inside two
    `Then(/…/)` patterns and each flags its `obligation`. Recorded because the wider reading is
    a promise the code does not keep. Widening the matcher to span segments is a DIFFERENT
    behaviour and deliberately NOT this scenario's.

    @unit @SCN-VOC-012
    Scenario: no-evidence-obligation is green while a bare obligation still flags
      Given a corpus carrying "no-evidence-obligation" and a bare "obligation"
      When the vocabulary audit runs over the corpus
      Then "no-evidence-obligation" is not flagged
      And the bare "obligation" is flagged as a bare shortening
      And an occurrence the scan reads one word at a time still flags its "obligation"

  Rule: an author-chosen Gherkin tag is vocabulary and is audited; the tag GRAMMAR around it is not

    THE SURFACE THE SCANNER COULD NOT SEE (@SCN-VOC-013, 3F-2313). Every `.feature` line
    whose trimmed form began with `@` was skipped WHOLESALE — `if (text.trim().startsWith("@"))
    return;`. Defensible for an ID scheme, and exactly WRONG for a term whose canonical form
    IS A TAG: `@ci-performance` → `@ci-run-time` is a TAG rename, so the one surface most
    worth policing was the one surface that was invisible. Proven, not inferred — 3F-2289
    planted `@ci-performance` on a tag line and got NO manifest row, while the identical
    token in a comment, an identifier, a string and a doc all fired.

    A LATENT HOLE, NOT A LIVE MISS, WHICH IS WHY THE PLANT IS THE EVIDENCE. 3F-2299 grepped
    every `^@` line and found ZERO occurrences of the retired terms, so a green run over this
    tree proves NOTHING — the surface returned zero either way. `pnpm audit:vocab` also always
    exits 0 (it is a report, not a gate), so its exit code is worthless here too. The only
    thing that can distinguish "clean" from "unread" is a PLANT, in both directions, which is
    what this scenario is.

    THE WORK IS DECIDING WHAT ON A TAG LINE IS VOCABULARY AND WHAT IS GRAMMAR, because
    deleting the skip naively floods the audit. MEASURED over every tracked `.feature` file
    (58 of them — 19 under features/, 39 more under tests/fixtures/, none self-exempt), the
    population is FIVE shapes, not the four the ticket guessed:

      * `@SCN-<FFF>-<NNN>` (234) — an ID scheme, already blanked by SCN_TOKEN_RE before a
        single line is read. GRAMMAR, and it gets NO ARM in the tag walk: an id can never
        reach it, so an arm would be unreachable code that no mutation could kill. An earlier
        draft carried one and the probe proved it dead. The BLANKING is the exemption, and
        that is what the assertion below pins.
      * `@<FFF>` the feature-code header tag (57) — the SAME ID scheme, one slot up: it IS
        the `<FFF>` inside every scenario id, allocated in featureCodes.ts's REGISTRY and
        held unique by lint:feature-codes. GRAMMAR. This category was missed entirely by the
        ticket's taxonomy and is the second largest.
      * the tier tags (359) — `@unit` / `@integration` / `@e2e`, their `pending` variants and
        `@wip`. GRAMMAR, and single-sourced: the predicate is scnTags.ts's OWN `isTierTag`,
        imported rather than copied, because a second list would agree by diligence and then
        drift (the agreeing-by-copy @SCN-VOC-008 and @SCN-VOC-010 each removed one level up).
        Note the tags the ticket named as the flood risk — bare `@lint`, `@performance` —
        have ZERO occurrences, while five `pending` variants it did not name have 25.
      * `@lint=<handle>` (18) — a `key=value` tag whose VALUE is a CI script name, not
        vocabulary (3F-1929; 3F-1852 owns the handles). The value is dropped and the key
        judged alone. WHAT ACTUALLY HOLDS THESE 18 GREEN IS `isTierTag`, which recognises the
        whole `lint=<handle>` FORM — a rule scnTags.ts already owned so a bare-`lint`-only
        match would not false-flag every static-check scenario. Said plainly because the first
        draft of this Rule claimed the value-drop was worth ~10 rows here and a MUTATION PROBE
        disproved it: deleting the value-drop leaves this tree's headline untouched. The rule
        is kept for the `key=value` tag whose key is NOT a tier (`@owner=…`), of which the
        tree has zero — so it is pinned by a constructed case, the only thing that can.
      * ANYTHING ELSE — author-chosen, and the thing this Rule reaches.

    PROSE MODE, NOT NAME MODE, and the preamble above is CORRECTED rather than implemented —
    it claimed feature tags were NAME-scanned, which was aspirational and never true, since
    the lines were skipped outright. Only ONE flag tier is mode-gated (`unknown`); banned
    words, bare-shortenings, `bare-different-word`, `entry-domain` and all three retired-phrase
    arms fire in BOTH modes. So PROSE delivers the whole red half of this Rule, while NAME
    would buy only `unknown` — a question about whether a tag is a legitimate community tag,
    which is lint:scn-tags' ground, not this audit's — at a cost of 9 permanent false
    positives over deliberately-meaningless fixture tags (`@foo`, `@skip`, `@todo`, …). Every
    OTHER line of a `.feature` is already prose-scanned, so NAME here would also red a word on
    the tag line and green the same word in the scenario title one line below it.

    A LINE IS A TAG LINE ONLY WHEN EVERY TOKEN ON IT STARTS WITH `@` — scnTags.ts →
    parseScenarios' existing definition, reused. The old `trim().startsWith("@")` was looser
    and swallowed prose lines that merely OPEN with a tag reference; two live in
    tests/fixtures/pending-tags/, silently unscanned until now.

    ALL FIVE ASSERTIONS ARE ONE SCENARIO, and splitting them would destroy both halves. "The
    grammar is not flagged" stays true with the ENTIRE tag walk deleted; "the retired term
    reds" stays true with every grammar exemption removed, flooding the manifest. An
    unasserted green is the erosion trap — it survives the deletion of the very exemption it
    depends on — so each protected shape is asserted OUT LOUD rather than left unmentioned.

    @unit @integration @SCN-VOC-013
    Scenario: a retired term on a Gherkin tag line is flagged while the tag grammar is not
      Given a feature corpus whose tag lines carry a retired term alongside a scenario id, a feature code, a tier tag and a lint handle
      When the vocabulary audit runs over the corpus
      Then the retired term on the tag line is flagged
      And the scenario id is not flagged
      And the feature-code header tag is not flagged
      And the tier tag is not flagged
      And the lint handle value is not flagged

  Rule: an adopted row's term occurring in the tracked tree reds the build

    THE HALF THAT MAKES ADOPTION MEAN SOMETHING (@SCN-VOC-014, 3F-2343). @SCN-VOC-010 made
    the enforced word set a derivation of the vendored table's adopted rows, and every row
    states its triage under @SCN-VOC-011. Between them, "adopted" became a fact the
    repository RECORDS. It is still not a fact the repository ENFORCES: `audit:vocab` is a
    report and exits 0 however many words it flags — deliberately, so a finding never shares
    the can't-scan exit code — and `lint:blocked-vocabulary` validates the TABLE, never the
    tree. So every adopted word can silently regrow, and one nearly did: 3F-2340's comment
    rewrite reintroduced a demand-root, caught by a hand-run manifest diff against
    origin/main rather than by CI. A purge that only a human diff protects is honour, which
    is the thing the whole vocabulary arc was built to stop being.

    This Rule is the tree half. It is a THIRD check with a distinct subject, not a widening
    of either sibling: the report says what is there, the table lint says the triage is
    honest, and this says the tree obeys the triage.

    IT REUSES THE AUDIT'S FILE SET RATHER THAN DERIVING ONE. `filesInScope` already answers
    "what is the project, minus the audit's own machinery" (@SCN-VOC-008), and a second
    implementation of that question would agree with the first by coincidence and then
    drift — the agreeing-by-copy this feature has removed twice already. So the self-exempt
    blind spot is inherited, not re-declared here; 3F-2345 is the ticket that sweeps it.

    @unit @integration @lint=lint:adopted-vocabulary @SCN-VOC-014
    Scenario: an adopted retired term in a non-exempt file reds the gate, and a tree carrying none passes
      Given a tree whose canon table adopts a retired term
      When the adopted-vocabulary gate runs over a copy of that tree carrying the term in an ordinary source file
      Then the gate fails, naming the file, the line and the term
      When the adopted-vocabulary gate runs over a copy carrying no adopted term at all
      Then the gate passes, reporting nothing to enforce

  Rule: a deferred row's term is visible in the report and does not red the build

    THE FILTER THAT MAKES THE GATE LANDABLE (@SCN-VOC-015, 3F-2343), and it is load-bearing
    rather than a detail of the one above. The vendored table's unadopted rows carry 2,272
    measured occurrences in this tree — the `declare` family alone is 1,212 across 133 files,
    which is why 3F-2329 owns it and why the row says `deferred` rather than `adopted`. A
    gate that read the table's terms without reading its STATUS column would red `main`
    permanently on debt the operator has already dated, ticketed and chosen not to pay yet.

    So the status column is the gate's authority, exactly as it is the enforced word set's
    (@SCN-VOC-010): `adopted` reds, `deferred` and `not-applicable` do not. Asserting the
    green out loud is the point — an unasserted green survives the deletion of the very
    filter it depends on, the erosion trap @SCN-VOC-013 names one Rule over. Without this
    scenario, collapsing the filter would look like a passing build until the next run.

    @unit @integration @SCN-VOC-015
    Scenario: a deferred row's term occurring in the tree leaves the gate green
      Given a canon table whose retired terms are split between an adopted row and a deferred one
      When the adopted-vocabulary gate runs over a tree carrying the deferred row's term
      Then the gate passes, because a deferred row records debt rather than an enforced ban
      And the adopted row's term would still have failed that same tree
