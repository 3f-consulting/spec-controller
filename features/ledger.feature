@LDG
Feature: Ledger over declared-vs-observed evidence

  spec-controller is a reconciliation engine, not a spec engine. It sets a scenario's
  DECLARED evidence obligations (its @unit / @integration tags, read as
  evidence-obligation declarations) against the evidence those tests actually
  PRODUCED, and reports a ledger — per scenario, whether the books
  balance. Evidence is keyed by (kind, level) per the two-axis model:
  per evidence obligation, present+pass → balanced;
  present+fail → failing; absent → missing. The scenario
  VERDICT is binary: a scenario is balanced iff EVERY required
  (kind, level) balances; otherwise it is out of balance, carrying the LIST of
  every non-balanced reconciling item — each typed, none ranked.

  This feature is the @LDG runtime spine. It grows scenario-by-scenario
  as LDG-002…005 are driven; LDG-001 (here) is the headline balanced path that
  carries the foundation.

  Rule: a scenario whose required evidence exists and passes is balanced

    @unit @integration @SCN-LDG-001
    Scenario: a scenario whose required evidence exists and passes is reported as balanced
      Given a scenario "SCN-LDG-001" requiring unit-level evidence
      And a passing unit-level result for "SCN-LDG-001"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-001" as balanced with no reconciling items

  Rule: a scenario whose required test exists but fails is out of balance

    @unit @integration @SCN-LDG-002
    Scenario: a scenario whose required test exists but fails is reported as out of balance with a failing reconciling item
      Given a scenario "SCN-LDG-002" requiring unit-level evidence
      And a failing unit-level result for "SCN-LDG-002"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-002" as out of balance
      And the reconciling items for "SCN-LDG-002" are "failing"

  Rule: a scenario that requires a level with no matching result is out of balance

    @unit @integration @SCN-LDG-003
    Scenario: a scenario that requires a level with no matching result is reported as out of balance with a missing reconciling item
      Given a scenario "SCN-LDG-003" requiring integration-level evidence
      And no result matches "SCN-LDG-003"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-003" as out of balance
      And the reconciling items for "SCN-LDG-003" are "missing"

  Rule: an out-of-balance scenario carries its reconciling items as a list

    @unit @integration @SCN-LDG-005
    Scenario: an out-of-balance scenario lists its reconciling item rather than collapsing to one scenario outcome
      Given a scenario "SCN-LDG-005" requiring unit-level evidence
      And a failing unit-level result for "SCN-LDG-005"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-005" as out of balance
      And the reconciling items for "SCN-LDG-005" are "failing"

  Rule: a multi-evidence obligation out-of-balance scenario lists every reconciling item, none ranked

    # The multi-evidence obligation proof of the verdict model: two
    # evidence obligations in one scenario, failing one way AND missing the other. This is
    # the case that observably distinguishes "report EVERY reconciling item" from
    # the old "missing beats failing" prioritisation — both items must appear, with
    # no ranking, exercising the (kind, level) multi-level keying.
    @unit @integration @SCN-LDG-004
    Scenario: a multi-evidence obligation scenario failing one level and missing another lists both reconciling items
      Given a scenario "SCN-LDG-004" requiring both unit-level and integration-level evidence
      And a failing unit-level result for "SCN-LDG-004"
      And no integration-level result for "SCN-LDG-004"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-004" as out of balance
      And the reconciling items for "SCN-LDG-004" are "failing,missing"

  Rule: a credit citing an undeclared scenario is a phantom-scenario reconciliation

    The bidirectional reconciler consumes evidence observations (credits),
    not just declared evidence obligations. A credit citing an @SCN id that NO feature declares
    posts to no real scenario — it lands on a PHANTOM scenario
    (posting to a non-existent account). Each
    undeclared cited id becomes ONE phantom-scenario Scenario Reconciliation, its
    Quality Check Reconciliation carrying the outcome cites-unknown-scenario (and the
    evidence observation's locator as the where-to-fix), verdict always out of balance. This is
    the foundation sub-issue that lays the full credit-consuming reconciler spine.

    @unit @integration @SCN-LDG-006
    Scenario: a credit citing an undeclared scenario is reported as a phantom-scenario reconciliation, out of balance
      Given a scenario "SCN-LDG-006" requiring unit-level evidence
      And a passing unit-level result for an undeclared scenario "SCN-PHANTOM-999"
      When the reconciler runs
      Then the ledger reports "SCN-PHANTOM-999" as a phantom-scenario reconciliation with a cites-unknown-scenario item
      And the phantom-scenario "SCN-PHANTOM-999" is out of balance

  Rule: a credit citing no scenario is a suspense-scenario reconciliation

    The bidirectional reconciler also consumes credits that cite NO scenario at
    all — a runtime result carrying no @SCN anchor, or a CI static check no @lint declares
    (ruling Q4). A credit that posts to no scenario lands on the SUSPENSE scenario
    (a suspense account holds postings that match no
    real account). ALL uncited credits aggregate into ONE suspense-scenario Scenario
    Reconciliation, sentinel id "(no scenario)", each Quality Check Reconciliation carrying
    the outcome cites-no-scenario (and the evidence observation's locator as the where-to-fix),
    verdict always out of balance. The suspense-evidence-observation and
    uncited-static-check detail lists dissolve into this row (no double-report; the
    counts survive in the summary balance-check identities).

    @unit @integration @SCN-LDG-007
    Scenario: a credit citing no scenario is reported as a suspense-scenario reconciliation, out of balance
      Given a scenario "SCN-LDG-007" requiring unit-level evidence
      And a passing unit-level result carrying no scenario id
      When the reconciler runs
      Then the ledger reports a suspense-scenario reconciliation "(no scenario)" with a cites-no-scenario item
      And the suspense-scenario is out of balance

  Rule: a credit at an undeclared quality-check on a real scenario is undemanded

    The bidirectional reconciler also consumes credits that cite a REAL declared
    scenario at a quality-check that scenario NEVER declared — a runtime result attributed to
    a scenario, but at a level the scenario has no evidence obligation for. Such a credit posts
    to a real account, but against no evidence obligation on it: outcome undemanded (the GENERAL case —
    it applies whether or not the scenario carries other evidence obligations). It becomes a credit-side
    Quality Check Reconciliation ON THE REAL scenario's row (carrying the evidence observation locator as
    the where-to-fix, ruling Q5); the row's own declared evidence obligations reconcile as normal. This
    fixes the latent attributed mis-count: countRuntimeEvidenceObservationKinds no longer silently counts a
    stray credit at an undeclared quality-check as reconciliation-matched-attributed — undemanded
    appears in summary.byOutcome, while the Test-volume attributed (credits citing a declared
    scenario) still INCLUDES it as a subset. The two attributed counts stay distinct.

    @unit @integration @SCN-LDG-008
    Scenario: a credit at an undeclared quality-check on a real scenario is reported as undemanded
      Given a scenario "SCN-LDG-008" requiring unit-level evidence
      And a passing integration-level result for "SCN-LDG-008"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-008" with an undemanded item at integration

    # The negative twin (@SCN-LDG-010): a ZERO-evidence obligation scenario whose @SCN IS cited
    # by a stray credit. It has an evidence observation at an undeclared quality-check, so it is undemanded
    # — NOT both-missing. This pins the general case and the both-missing boundary: detection keys
    # on rows-emitted, not on qualityCheckReconciliations.length === 0 (both-missing itself lands in LDG-009).
    @unit @integration @SCN-LDG-010
    Scenario: a zero-evidence obligation scenario cited by a stray credit is undemanded, not both-missing
      Given a zero-evidence obligation scenario "SCN-LDG-010"
      And a passing unit-level result for "SCN-LDG-010"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-010" with an undemanded item at unit
      And "SCN-LDG-010" is not reported as both-missing

  Rule: a scenario with zero rows on both sides is both-missing

    The neither-side reconciling item (@SCN-LDG-009) — the last shape the
    bidirectional reconciler emits. A scenario that reconciles to ZERO rows on
    BOTH sides — no declared evidence obligation AND no citing evidence observation — has nothing
    to balance in either direction. It posts one degenerate Quality Check Reconciliation,
    blank on both sides, outcome both-missing (label: "Evidence Obligation and
    Evidence Observation are both missing — the Scenario is untagged and uncited"), verdict out of balance. Detection keys
    on the reconciler emitting NOTHING either way — NOT a hard qualityCheckReconciliations.length
    === 0 map: a zero-evidence obligation scenario cited by a stray credit is undemanded (LDG-010),
    not both-missing. This retires the no-evidence-declared warning — the warnings section,
    JSON key, and ScenarioWarning type dissolve; the scenario's new home is this row.

    @unit @integration @SCN-LDG-009
    Scenario: a scenario with zero evidence obligations and zero evidence observations is reported as both-missing, out of balance
      Given a zero-evidence obligation scenario "SCN-LDG-009"
      And no results are observed
      When the reconciler runs
      Then the ledger reports "SCN-LDG-009" with a both-missing item
      And the ledger reports "SCN-LDG-009" as out of balance

  Rule: a runtime observation's level is the cited scenario's declared tag, not the input source

    The headline of the tag-derivation fix (SCN-LDG-011). A runtime observation's
    level comes from the CITED scenario's declared tier tag (integration / e2e /
    performance), NOT from the input source that produced it. Cucumber is an
    orchestrator ACROSS levels — a scenario declares its tier by tag and cucumber runs
    whichever — so an e2e scenario proven via cucumber must yield an e2e observation,
    discharging its e2e obligation and reconciling balanced. Before the fix the cucumber
    source was hardcoded to integration, so an e2e-via-cucumber scenario false-red:
    e2e missing PLUS integration undemanded (an adopter's repository 12-scenario false-red). The
    caller-declared source level survives only as the fallback for an untagged scenario;
    the reconciler's existing (scnId, level) matching does the rest, untouched.

    @unit @integration @SCN-LDG-011
    Scenario: an @e2e scenario proven via cucumber reconciles balanced
      Given a scenario declared @e2e
      And a passing cucumber observation citing it
      When the ledger reconciles the target
      Then the scenario is balanced
      And it is not reported e2e-missing with an undemanded integration observation

    # The regression pin (SCN-LDG-012): the integration tier used to be correct by
    # ACCIDENT — the old CUCUMBER_QUALITY_CHECK="integration" hardcode happened to agree
    # with an @integration scenario. This pins that generalising the level to tag-DERIVATION
    # did not regress the tier that used to be right-by-coincidence. The observation carries
    # a CONTRASTING non-integration source (see the steps), so its integration level can only
    # come from DERIVING the scenario's @integration tag — never from the source fallback.
    @unit @integration @SCN-LDG-012
    Scenario: an @integration scenario proven via cucumber satisfies its integration obligation
      Given a scenario declared @integration
      And a passing cucumber observation citing the @integration scenario
      When the ledger reconciles the target
      Then the integration obligation is satisfied and the scenario is balanced

    # The split ACROSS RUNNERS (SCN-LDG-013): a scenario declared @unit @e2e, run by BOTH
    # runners, reconciles both tiers satisfied — the VITEST observation discharges @unit
    # (vitest is the unit substrate; its level is not derived), and the CUCUMBER observation
    # discharges @e2e (the level DERIVED from the @e2e tag; the @unit tag is inert for cucumber,
    # so cucumber does not double-count unit). This is the single-non-unit-tag case of the
    # multi-tag ruling — no reconciler change: the ledger's (scnId, level) matching balances
    # each. Distinct step wording (a vitest report AND a cucumber report) leaves LDG-011/012's
    # steps byte-untouched; only the generic "the ledger reconciles the target" When is shared.
    @unit @integration @SCN-LDG-013
    Scenario: a @unit @e2e scenario with a vitest and a cucumber observation satisfies both tiers
      Given a scenario declared @unit @e2e
      And a passing vitest observation citing the @unit @e2e scenario
      And a passing cucumber observation citing the @unit @e2e scenario
      When the ledger reconciles the target
      Then both the unit and the e2e obligations are satisfied and the scenario is balanced

    # The multi-tag ruling's TEETH (SCN-LDG-014): a scenario declared @integration @e2e,
    # proven by a SINGLE cucumber run, discharges BOTH non-unit obligations — the one
    # execution genuinely exercises the integrated components AND the end-to-end journey
    # (the journey contains the integration), so parseCucumberEvidenceObservations emits
    # ONE observation PER declared non-unit tier (integration + e2e) from the single pass.
    # This is the general rule LDG-011/012/013 are single-tier instances of. Why principled
    # (Evidence Manifesto §11): §11 complementarity is scoped to @unit-vs-the-run (isolation
    # vs the integrated system, different runners) — so @unit still needs its own vitest
    # observation; it does NOT bite WITHIN the cucumber tiers, so discharging both is honest,
    # not double-crediting. No new reconciling-item type, no flag — the reconciler's existing
    # (scnId, level) matching balances each. Distinct step wording ("declared @integration @e2e",
    # "a single passing cucumber observation", "both the integration and the e2e obligations")
    # leaves LDG-011/012/013's steps byte-untouched; only the generic When is shared.
    @unit @integration @SCN-LDG-014
    Scenario: an @integration @e2e scenario with one cucumber observation satisfies both non-unit tiers
      Given a scenario declared @integration @e2e
      And a single passing cucumber observation citing it
      When the ledger reconciles the target
      Then both the integration and the e2e obligations are satisfied and the scenario is balanced

    # The NEGATIVE BOUNDARY of the general rule (SCN-LDG-015): a @unit-only scenario cited by a
    # cucumber observation. @unit is NOT a cucumber-derivable tier (unit is vitest's substrate,
    # never derived from the cucumber report), so the observation derives NO non-unit level from
    # the scenario and falls back to the JS-ecosystem default (integration) — a level the
    # @unit-only scenario never declared, so the observation is UNDEMANDED on the scenario's OWN
    # row (a cited credit against no obligation; contrast the null-scnId suspense row of LDG-007).
    # It discharges NOTHING: the @unit obligation is NOT manufactured-discharged by cucumber — it
    # remains the scenario's only required evidence, unmet here because no vitest observation was
    # supplied. Pins that "a cucumber observation discharges the cited scenario's NON-UNIT
    # obligations" never manufactures a unit (or any) discharge where none is declared. Distinct
    # step wording ("declared @unit only", "citing the @unit-only scenario", "the cucumber
    # observation is reported undemanded", "the @unit obligation remains the scenario's only
    # required evidence") leaves LDG-011/012/013/014's steps byte-untouched; only the generic
    # "the ledger reconciles the target" When is shared.
    @unit @integration @SCN-LDG-015
    Scenario: a cucumber observation for a @unit-only scenario discharges nothing and is undemanded
      Given a scenario declared @unit only
      And a passing cucumber observation citing the @unit-only scenario
      When the ledger reconciles the target
      Then the cucumber observation is reported undemanded
      And the @unit obligation remains the scenario's only required evidence

  # MOST-SPECIFIC-CITATION-WINS (SCN-LDG-016). Vitest's `fullName` is the ANCESTOR PATH
  # (outermost describe → innermost it); the assertion's OWN name is `title`. The reader
  # matched the FIRST @SCN in `fullName + " " + title`, so a grouping describe's bracket
  # citation SHADOWED a self-citing child it: the leaf's own scenario reconciled `missing`
  # while the ancestor took a spurious SECOND credit. Found by an adopter's repository CI dogfood
  # (2026-07-13) — SCN-CLI-007 and SCN-CLI-041 false-red `missing` against passing,
  # self-citing tests. The fix is leaf-title-first, ancestor-path fallback: most-specific-
  # wins, done SEMANTICALLY (which name is the assertion's own) rather than positionally
  # (rejected: last-match on the concatenation, which misfires when a leaf's prose names a
  # second scenario after its own). Both halves of the rule reconcile in ONE pass, so they
  # are ONE scenario: a two-assertion report — one self-citing leaf, one BARE sibling leaf
  # beneath the same citing describe — exercises leaf-wins AND ancestor-fallback together.
  # The Thens assert attribution-set IDENTITY, not a balance boolean: a bare "the ancestor
  # is balanced" check is VACUOUS (the ancestor balances under the old code too — by BOTH
  # leaves — and under the new one by the sibling alone). So they pin WHICH observation
  # credits WHOM and HOW MANY, which is what locks the mirror symptom (the spurious double
  # credit) a balance boolean would ship untested. Distinct step wording leaves
  # LDG-011/012/013/014/015's steps byte-untouched; only the generic "the ledger reconciles
  # the target" When is shared.
  Rule: a vitest assertion is attributed to the @SCN its own leaf cites, not its ancestor's

    @unit @integration @SCN-LDG-016
    Scenario: a self-citing leaf discharges its own scenario while a bare sibling leaf still discharges the ancestor's
      Given a scenario cited by an ancestor describe and a scenario self-cited by a leaf beneath it
      And a passing vitest report whose one leaf self-cites and whose sibling leaf does not
      When the ledger reconciles the target
      Then the self-citing leaf is attributed to the leaf-cited scenario, not to the ancestor
      And the ancestor scenario carries exactly one crediting observation — the bare sibling leaf
      And both scenarios are balanced

  # BROKEN, NOT ABSENT (SCN-LDG-017). A vitest file that fails to COLLECT reports
  # `status: "failed"` with a message and ZERO assertionResults. The reader walked
  # `assertionResults[]` only, so it saw nothing to emit — and the scenario whose proof lived in
  # that file reconciled `missing`, indistinguishable from an unwritten test. A red harness
  # masqueraded as a benign gap (found by an adopter's repository CI dogfood, 2026-07-13: SCN-HNS-002 read
  # `missing` while its proving test existed and cited it correctly, the file having failed to
  # collect on `Cannot find package '@cucumber/tag-expressions'`). The remedies differ — fix the
  # harness vs write a test — so the ledger must distinguish them.
  #
  # Broken evidence names no test, so it cites no @SCN and CANNOT be attributed to any scenario:
  # it is a sibling of `cites-no-scenario` (both land in suspense because they name no scenario),
  # distinguished by broken-vs-completed. The scenario whose proof was in that harness STILL reads
  # `missing` — honest at its own resolution (no evidence citing it arrived) — but the run now
  # carries the fault, so the reader is sent to fix the harness rather than write a test that
  # already exists.
  #
  # BOUNDARY: a runtime throw INSIDE a named `it` is attributable (vitest reports it with a name
  # and status failed) and already lands as `failing`. `broken` is specifically the citation-less
  # case — the harness broke before the behaviour was ever exercised.
  #
  # FAIL-SAFE (operator-mandated): `broken` is checked BEFORE `status`. A broken observation must
  # NEVER reconcile as `failing` or `satisfied` — it names no scenario, so it can post to no
  # scenario's row. Pinned in the @unit arm (reconcile.test.ts) under BOTH status values, not in
  # the code alone.
  #
  # BROKEN IS READER-AGNOSTIC (SCN-LDG-019). @SCN-LDG-017 established `broken` over vitest's
  # instance of it — a file that failed to COLLECT. The concept is not vitest's: it is evidence
  # that NEVER MATERIALISED, reported as evidence that was never written. Cucumber has its own
  # instance, and exactly one: a step whose harness is AMBIGUOUS — two step definitions match, so
  # the step cannot run. The scenario cites its @SCN, the runner reports `ambiguous`, and the
  # reader today DROPS it as inconclusive: the obligation reconciles `missing`, sending the reader
  # to write a test that already exists while two step definitions collide.
  #
  # THE OTHER INCONCLUSIVE STATUSES STAY DROPPED, and stay honest: `undefined` (no step definition
  # is written — the test genuinely is absent), `pending` (explicitly deferred), `skipped` (never
  # ran). Only `ambiguous` is a BROKEN HARNESS: the proof exists and cannot execute.
  #
  # @SCN-PND-013's row `| ambiguous | missing |` STILL HOLDS — a bystander, not an Update. The
  # fail-safe excludes a broken observation from the match whatever it carries, so the obligation
  # still reconciles missing BY ABSENCE. What changes is that the run now also carries the broken
  # item and is stamped unsound, so the reader is sent to the step definitions, not the test file.
  #
  # NOT DETECTABLE, AND NOT OWED: a step-definition module that FAILS TO LOAD. Cucumber exits
  # before the formatter runs and writes NO JSON at all (probed, 2026-07-14) — there is no report
  # for a reader to read. Already caught loudly at the CLI edge: @SCN-CLI-002 makes a
  # supplied-but-absent --cucumber path a hard usage error.
  Rule: evidence that never materialised is broken, not absent

    @unit @integration @SCN-LDG-017
    Scenario: a collection-failed vitest file posts a broken suspense item naming the file and its error, while the scenario it would have proven still reads missing
      Given a scenario whose only proving test lived in a vitest file that failed to collect
      And a vitest report whose file carries a collection failure and zero assertions
      When the ledger reconciles the target
      Then the suspense scenario carries a broken reconciling item naming the collection-failed file and its error
      And the broken item is not reported as cites-no-scenario
      And the scenario whose proof was in the collection-failed file still reads missing

    @unit @integration @SCN-LDG-019
    Scenario: an ambiguous cucumber step posts a broken suspense item naming the step, while the scenario it would have proven still reads missing
      Given a scenario whose only proving step is matched by two step definitions
      And a cucumber report whose step for that scenario is ambiguous
      When the ledger reconciles the target
      Then the suspense scenario carries a broken reconciling item naming the ambiguous step and its feature file
      And the broken item is not reported as cites-no-scenario
      And the scenario whose proof was the ambiguous step still reads missing
      And the run reports broken evidence — an ambiguous harness makes the run unsound

  # UNSOUND IS A PROPERTY OF THE RUN (SCN-LDG-018). @SCN-LDG-017 and @SCN-LDG-019 put broken
  # evidence ON the ledger as a `broken` suspense item; this Rule reads the WHOLE run off it. If
  # any PROOF NEVER RAN — a vitest suite that failed to collect, or a cucumber step matched by two
  # or more definitions — the evidence never fully materialised, so every `missing` in that run is
  # SUSPECT: it may be a broken proof rather than an absent one. Soundness is therefore a
  # WHOLE-RUN predicate, `hasBrokenEvidence` — the existential twin of `hasPendingItems` (the same
  # `some(row => some(item => item.outcome === X))` scan) — and NOT a third ScenarioVerdict (a
  # scenario's own row stays honest at its own resolution) and NOT a stored flag.
  #
  # DERIVED, NEVER STORED: no soundness field is written onto the EvidenceReconciliation — the
  # same no-drift reason `isBalanced` and `hasPendingItems` derive. Machine consumers read
  # soundness off `summary.byOutcome.broken > 0`, type-forced into the JSON the moment `broken`
  # joined the Outcome union.
  #
  # The three whole-run predicates are INDEPENDENT: a run may carry Pending Items and be perfectly
  # sound; a run may carry broken evidence and no Pending Items. (A broken run is ALWAYS
  # out-of-balance — the `broken` item sits on the suspense row — which is exactly why the CLI
  # must check soundness BEFORE the balance verdict, @SCN-CLI-012.)
  #
  # "Unsound" is the RENDER HEADLINE word (@SCN-RPT-021), not the predicate's name — as
  # "out-of-balance" is the headline for `isBalanced`.
  Rule: a run carrying broken evidence is unsound

    @unit @integration @SCN-LDG-018
    Scenario: a reconciliation carrying a broken item is unsound, and one carrying none is sound
      Given a run whose vitest report carries a collection-failed file, and a second run whose report collects cleanly but defers an obligation
      When the ledger reconciles both runs
      Then the run carrying the collection failure reports broken evidence
      And the run that merely defers an obligation reports no broken evidence — a Pending Item does not make a run unsound
      And soundness is derived from the reconciling items, never stored on the reconciliation

  # THE DECLARED CORPUS IS WHAT CUCUMBER RUNS (@SCN-LDG-020, 3F-1775). The corpus is the ledger's
  # DEBIT side, and it was read by a hand-rolled TAG-LINE SCAN that saw only the contiguous tag
  # block directly above a Scenario:. Gherkin does not work that way — a scenario INHERITS the
  # tags of its Feature and of any enclosing Rule, and cucumber applies them.
  #
  # So an evidence tier hoisted to the Feature or Rule line — IDIOMATIC, VALID Gherkin, exactly
  # what an author does with a tier shared by every scenario beneath — was INVISIBLE to
  # spec-controller. The obligation was never declared, so its missing evidence could never
  # reconcile `missing`, and the run read BALANCED (exit 0) while cucumber named a tier that
  # nothing proved. A FALSE-GREEN ON WELL-WRITTEN FILES: the same fault class as the corrupt-file
  # false-green (3F-1767), but triggered by good practice rather than by corruption — which makes
  # it the likelier of the two to fire in the wild.
  #
  # The corpus is now extracted from the REAL Gherkin AST, so the scenarios spec-controller
  # reconciles carry EXACTLY the tags cucumber gives them — one reading of the file, not two.
  # Every tag inherits (@SCN included): parity is the goal, and excluding one would invent a rule
  # cucumber does not have. Whether a corpus SHOULD hoist an @SCN — every scenario beneath would
  # then share one id — is a corpus-authoring-fault policy, deferred (3F-1774's sibling).
  Rule: a scenario's declared tags include the ones it inherits from its Feature and Rule

    @unit @integration @SCN-LDG-020
    Scenario Outline: an evidence tier declared on the <ancestor> is named of the scenarios beneath it
      Given a scenario tagged @unit whose <ancestor> carries @integration, with a passing unit test and no integration evidence
      When the ledger reconciles the run
      Then the scenario declares both the unit and the integration obligation
      And the integration obligation reconciles missing
      And the run is out-of-balance — never balanced on an obligation cucumber names

      Examples:
        | ancestor |
        | Feature  |
        | Rule     |

  # UNDECLARABLE WORK IS NEVER INVISIBLE (@SCN-LDG-021, 3F-1774). A scenario carrying no @SCN
  # declares no obligation, so it cannot reconcile satisfied, failing, or even `missing` — an
  # obligation that was never DECLARED cannot be ABSENT. It was simply not there.
  #
  # So the tool PRINTED the problem ("N scenario(s) carry no @SCN tag", @SCN-RPT-014) and then
  # exited 0 BALANCED — naming a hole and certifying the run clean in the same breath, over a
  # scenario cucumber runs and nothing proves.
  #
  # The scenario is REAL and ORDINARY — not phantom, not suspense: it exists, and cucumber runs it.
  # What is absent is the @SCN CODE its Evidence Obligation needs in order to link to an Evidence
  # Observation. So its OWN row reconciles out-of-balance, DEBIT-side, via `no-scn-code` — the debit
  # twin of `cites-no-scenario` (same missing link, opposite side). Suspense stays credit-only.
  #
  # Exit 1, not 2: the corpus reads perfectly well. This is a FINDING about the corpus, not an
  # input the tool cannot read (@SCN-CLI-014/015/016's lane).
  Rule: a scenario declaring no @SCN reconciles no-scn-code — undeclarable work is never invisible

    @unit @integration @SCN-LDG-021
    Scenario: a scenario carrying no @SCN reconciles no-scn-code on its own row, and the run is out-of-balance
      Given a corpus with one @SCN-tagged scenario, proven and passing, and one scenario carrying no @SCN
      When the ledger reconciles that corpus
      Then the untagged scenario has its own out-of-balance row, reconciling no-scn-code
      And the run is out-of-balance — a scenario the ledger cannot link is never a clean run

  # EVERY ENTRY POSTS SOMEWHERE (@SCN-LDG-022, 3F-1846). The Ledger is the accounts with their
  # POSTED ENTRIES — canon's "evidence obligations (debits) and evidence observations (credits)
  # organised by real or invented scenario, keyed by quality-check" (double-entry-manifesto,
  # Ledger entry + chain step 4). The model had inputs (scenarios, observations) and outputs (rows
  # carrying outcomes) and NO ENTRIES IN BETWEEN: with nowhere for a posted entry to sit, an entry
  # either became a Quality Check Reconciliation or CEASED TO EXIST.
  #
  # POSTING IS NOT CLASSIFYING. An entry posts here WHATEVER IT RECONCILES TO — the posting claim
  # is indifferent to the outcome, and never depended on that outcome being right or wrong. The
  # load-bearing case is the credit citing a PENDING quality-check: it posts and is findable
  # whatever its outcome turns out to be. What that outcome IS belongs to the reconciler, not to
  # this scenario — 3F-1858 makes this particular credit reconcile honestly as `undemanded`, and
  # this Rule reads identically on both sides of that change. That is the point: a
  # misclassification should MISFILE an entry, not vaporise it.
  #
  # THE ACCOUNT IS THE SCENARIO RECONCILIATION (canon: "bookkeeping term: Account"). The same
  # accounts live in the ledger before and after balancing off, gaining their verdict IN PLACE —
  # this is NOT a pre-reconciliation input stage.
  #
  # THE POSTING RULE IS THE LINK TO AN ACCOUNT, never the outcome. A credit citing a declared @SCN
  # posts to that scenario's account; one citing an unknown @SCN posts to that phantom account; one
  # citing NO scenario — uncited, or broken (it named no test, so it cites nothing whatever it
  # structurally carries) — posts to SUSPENSE.
  #
  # A GUARD credit carries no @SCN, so its link is the GUARD HANDLE rather than a citation: the
  # same link the reconciler already follows to put a lint obligation's outcome on the naming
  # row. So the symmetry completes — a NAMED guard posts to EVERY account that names it; an
  # UNDEMANDED guard belongs to no account and posts to SUSPENSE, where it already reconciles
  # `cites-no-scenario`. Every credit posts to AT LEAST ONE account, never to none (canon,
  # double-entry-manifesto.md line 160: "Not exactly one — a static check posts to every account
  # that names it"). Exactly-one is a RUNTIME property (the credit cites, so it names one) — the
  # single-obligation instance below, not the universal. The multi-obligation instance is @SCN-LDG-024.
  Rule: every evidence observation posts to at least one ledger account, never to none — a runtime credit to the one it cites, a static check to every account that names it

    @unit @integration @SCN-LDG-022
    Scenario: over a single-obligation corpus every evidence observation posts to exactly one ledger account and is findable there — the never-zero invariant's instance where nothing is named twice
      Given a run whose credits span every shape — satisfied, undemanded, pending-cited, phantom, uncited, broken, a named guard and an undemanded guard
      When the ledger reconciles that run
      Then every evidence observation posts to exactly one ledger account
      And each credit is findable in the account its citation names
      And the credit citing a pending quality-check is posted and findable
      And the run's verdict and reconciling items are unchanged — posting classifies nothing

  # THE MULTI-OBLIGATION INSTANCE (@SCN-LDG-024, 3F-1850) — where "exactly one" breaks and the
  # never-zero invariant above lands at MORE than one. A static check's run cites no scenario, so
  # it is matched by handle and is evidence for EVERY naming scenario: two scenarios naming the same
  # static check both reconcile satisfied against the ONE run, which posts to each account BY
  # REFERENCE (one object on both — never copied, so the 3F-1831 census fold cannot double-count).
  # The case no corpus exercised until now (the coverage hole this closes).
  Rule: a static check named by two scenarios posts to each account

    @unit @integration @SCN-LDG-024
    Scenario: one static check's run, named by two scenarios, reconciles satisfied on both and is findable on each
      Given two scenarios that each name the same static check by @lint, wired and green in CI
      When the shared-guard corpus is reconciled
      Then both naming scenarios' lint obligations reconcile satisfied
      And the one static-check credit is findable on each naming account, one object on both

  # THE OBLIGATIONS-ONLY CORPUS (@SCN-LDG-025, 3F-1851) — isolating the named-guard posting rule so
  # it ALONE determines the verdict. Every other lint fixture mixes a named guard with another
  # credit shape (broken / uncited / undemanded) that independently mints the suspense row, so the
  # named-guard path never decides the outcome on its own — the rule was unfalsifiable (a rejected
  # post-to-suspense treatment went 501/501 green). A corpus whose ONLY lint credit is one satisfied
  # named guard removes every other cause: balanced, no suspense row, summary.outOfBalance 0
  # AGREEING with the verdict. The rejected treatment would mint a spurious empty out-of-balance
  # suspense row — summary.outOfBalance disagreeing with isBalanced, the 3F-1703 fault.
  Rule: a corpus whose only lint credits are named guards reconciles balanced — the named-guard path alone determines the verdict

    @unit @integration @SCN-LDG-025
    Scenario: a named-guards-only corpus reconciles balanced with no suspense row, so summary.outOfBalance agrees with the balanced verdict
      Given a corpus whose only lint credit is a named static check, wired and green in CI
      When the obligations-only corpus is reconciled
      Then the naming scenario reconciles satisfied and the run is balanced
      And there is no suspense row, and summary.outOfBalance is 0 — agreeing with the balanced verdict

  # THE DEBIT HALF of the same posting (@SCN-LDG-023). Where the credit side at least existed
  # unnamed (`byScn`, reconcile.ts), there is NO debit-side structure at all: `Scenario.
  # evidenceObligations` is walked one scenario at a time in the `for (const d of scenarios)` loop
  # and never indexed. The nearest thing is `evidenceObligationPairs` — a `Set<string>` of
  # "<scnId> <qualityCheck>" MEMBERSHIP keys that carries no entries at all, existing only for the
  # undemanded pair-check.
  #
  # So the ledger's two sides arrive by different routes and neither is the accounts-with-entries
  # canon describes. This scenario posts the declared obligations onto the account, keyed by
  # quality-check — the other half of "every entry posts somewhere".
  #
  # The debits post as `evidenceObligations` — canon's vocabulary, NEVER `debits`, which is the
  # bookkeeping ROOT of the metaphor rather than the vocabulary. The name is free because the
  # misnomer that held it (typed `QualityCheckReconciliation[]` — sub-rows, not debits) is now
  # `qualityCheckReconciliations`.
  #
  # A PENDING obligation is a declared evidence obligation that partitions off to a one-sided
  # Pending Item and earns NO reconciled row. It posts like any other: posting is not classifying,
  # and what pending DOES on the ledger is unchanged by this scenario.
  Rule: the evidence obligations a scenario declares post to its ledger account, keyed by quality-check

    @unit @integration @SCN-LDG-023
    Scenario: the evidence obligations a scenario declares post to its ledger account, keyed by quality-check
      Given a run whose scenarios declare obligations of every shape — a runtime obligation, a lint obligation carrying its guard handle, and a pending one
      When the ledger reconciles that run
      Then every declared evidence obligation posts to its own scenario's account
      And each debit is findable on its account, keyed by quality-check
      And the pending obligation is posted and findable, though it earns no reconciled row
      And the run's verdict and reconciling items are unchanged — debit-posting classifies nothing

  # THE DEBIT SIDE OF THE RECONCILING ITEM (@SCN-LDG-026, 3F-2005). Today a Quality Check
  # Reconciliation is an outcome LABEL only — the evidence obligation it reconciles sits in a
  # separate scenario-level array, joined by the markdown renderer at print time. This scenario
  # brings the debit side onto the reconciliation itself: every debit-bearing outcome carries the
  # `evidenceObligation` it reconciles, projected on the machine-readable JSON. The `missing` case
  # isolates the pure debit — a required @unit obligation present, its matching observation absent —
  # so the obligation is carried while the credit side stays absent (@SCN-LDG-027 adds the credit).
  Rule: a Quality Check Reconciliation carries the evidence obligation it reconciles (the debit side)
    @unit @integration @SCN-LDG-026
    Scenario: a missing quality-check reconciliation carries its evidence obligation and no observation
      Given a scenario "SCN-LDG-026" requiring @unit with no matching evidence observation
      When the ledger reconciles that run
      Then its unit Quality Check Reconciliation has outcome "missing"
      And it carries the evidence obligation it reconciles (the debit side)
      And it carries no evidence observation (the credit side is absent)
      And the JSON projects that evidence obligation on the reconciliation

  # THE CREDIT SIDE OF THE RECONCILING ITEM (@SCN-LDG-027, 3F-2006). The debit half
  # (@SCN-LDG-026) brought the evidence obligation onto the reconciliation; this scenario completes
  # the two-sidedness by bringing the CREDIT side — every observation-bearing outcome carries the
  # `evidenceObservation` it reconciles, projected on the machine-readable JSON. The `undemanded`
  # case isolates the pure credit — a credit citing a real scenario at a quality-check it never
  # named — so the observation is carried while the obligation side stays absent (the mirror of
  # LDG-026's pure debit). With both landed, `failing` vs `satisfied` vs `missing` is derivable
  # BECAUSE the two-sided outcomes carry both — the point of the slice.
  Rule: a Quality Check Reconciliation carries the evidence observation it reconciles (the credit side)
    @unit @integration @SCN-LDG-027
    Scenario: an undemanded quality-check reconciliation carries its evidence observation and no obligation
      Given a scenario "SCN-LDG-027" cited by a credit at a quality-check it never named
      When the ledger reconciles that run
      Then its Quality Check Reconciliation has outcome "undemanded"
      And it carries the evidence observation it reconciles (the credit side)
      And it carries no evidence obligation (the debit side is absent)
      And the JSON projects that evidence observation on the reconciliation

  # LINT MISSING IS OBLIGATION-ONLY (@SCN-LDG-028, 3F-2016 / corrects 3F-1995). An absent
  # static check is read as {exists:false} — an ABSENCE, not an observation. Canon (double-entry-manifesto
  # line 36): missing = Obligation Exists, Observation None. Only a REAL observation (exists:true →
  # satisfied/watermelon) is carried; the absent-guard record is not modelled as an observation.
  # Uniform with the runtime missing path, which already carries none.
  Rule: a lint missing reconciliation carries its obligation and no observation — an absent guard is an absence

    @unit @integration @SCN-LDG-028
    Scenario: a lint missing quality-check reconciliation carries its obligation and no observation
      Given a scenario "SCN-LDG-028" requiring a @lint guard absent from both package.json and CI
      When the ledger reconciles that run
      Then its lint Quality Check Reconciliation has outcome "missing"
      And it carries the evidence obligation it reconciles (the debit side)
      And it carries no evidence observation — an absent guard's {exists:false} is an absence, not an observation

  # NO-SCN-CODE IS DEBIT-SIDE (@SCN-LDG-029, 3F-2016 / corrects 3F-1995). Canon (double-entry-
  # manifesto line 39): no-scn-code = Obligation Exists, Observation None — the debit twin of
  # cites-no-scenario. The scenario is real and ordinary but carries no @SCN, so its obligation has
  # no code to link to; the reconciliation carries a SYNTHESIZED scenario-scope obligation ({}, no
  # qualityCheck / staticCheck — precedent: the scenario-scope pending obligation, journal.ts) and
  # no observation. The scenario-level evidenceObligations array stays empty — census + markdown
  # untouched.
  Rule: a no-scn-code reconciliation carries a scenario-scope evidence obligation and no observation

    @unit @integration @SCN-LDG-029
    Scenario: a no-scn-code quality-check reconciliation carries a scenario-scope obligation and no observation
      Given a corpus with one scenario carrying no @SCN
      When the ledger reconciles that corpus
      Then the untagged scenario's Quality Check Reconciliation has outcome "no-scn-code"
      And it carries a scenario-scope evidence obligation — empty, with no qualityCheck and no staticCheck
      And it carries no evidence observation
      And the scenario-level evidence obligations stay empty, so the census and markdown are unchanged

  # THE (OUTCOME, SIDE-PRESENCE) INVARIANT (@SCN-LDG-030, 3F-2016). Slice B made the two sides
  # optional and attached them procedurally, but nothing tied outcome to side-presence — so a QCR
  # could (and did) carry a canon-divergent pair, pinned green (the watermelon class this tool
  # exists to catch, in its own output). The fix: a QCR is UNCONSTRUCTIBLE except via
  # makeQualityCheckReconciliation, which enforces (outcome, side-presence) consistency with the
  # canon outcome table (double-entry-manifesto.md lines 35-44). NOT naive derivation — missing and
  # no-scn-code share (Exists, None); the three credit outcomes share (None, Exists) — a
  # consistency constraint against the type-forced OUTCOME_SIDE_PROFILE map.
  Rule: a Quality Check Reconciliation's carried sides are consistent with its outcome

    @unit @integration @SCN-LDG-030
    Scenario: every outcome's sides match canon, a divergent pair is unconstructible, and the emitted report agrees
      Given the canon outcome-side profile OUTCOME_SIDE_PROFILE
      When a Quality Check Reconciliation is constructed for each outcome with its canon-correct sides
      Then each reconciliation's side-presence matches its canon row
      And constructing any outcome with a forbidden side throws — a divergent pair is unconstructible
      And when the real tool balances a ten-outcome corpus, every emitted Quality Check Reconciliation's sides match its canon row

  # PIN OUTCOME_SIDE_PROFILE TO CANON (@SCN-LDG-031, 3F-2039). @SCN-LDG-030 pins each emitted QCR to
  # OUTCOME_SIDE_PROFILE — but nothing pinned OUTCOME_SIDE_PROFILE itself to the manifesto. So a
  # profile row and a producer wrong IN THE SAME DIRECTION agree, throw nothing, and pass everything
  # (the fault class that shipped one level up, 3F-2016). This closes the chain: constructor → profile
  # → canon. The pin carries an INDEPENDENT hand-transcription of the manifesto's Evidence Obligation
  # and Evidence Observation columns (double-entry-manifesto.md lines 35-44) — NEVER a re-read of
  # OUTCOME_SIDE_PROFILE, or the assertion is the tautology it exists to retire (the @SCN-RPT-025
  # idiom). The code is already canon-correct, so the pin is green on landing; its teeth are shown by
  # mutation (flip any profile row → the pin reds), both directions.
  Rule: OUTCOME_SIDE_PROFILE matches the manifesto's per-outcome side-presence columns

    @unit @SCN-LDG-031
    Scenario: every outcome's side-presence equals its manifesto row
      Given an independent recording of the manifesto's Evidence Obligation and Evidence Observation columns (double-entry-manifesto.md lines 35-44)
      When OUTCOME_SIDE_PROFILE is checked against it, keyed by the Outcome union
      Then every outcome's (obligation, observation) presence equals its manifesto row
      And flipping any profile row away from its manifesto value reds the pin
