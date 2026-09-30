@LDG
Feature: Ledger over obligation-vs-observation evidence

  spec-controller is a reconciliation engine, not a spec engine. It sets the evidence
  obligations a scenario RAISES (its @unit / @integration tags, read as the
  debit side) against the evidence those tests actually
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

  Rule: an evidence obligation answered by several credits reads the worst outcome any of them carries, and names a credit carrying it

    A runner emits one credit per test, so a scenario cited by several tests carries several
    credits at one quality check. Each is read on its own, and the obligation reads the worst of
    those readings — failing over watermelon over satisfied — on every quality check. A failed one is a failing observation whatever passed beside it, and nothing about
    where its file sorts may discharge it. The item names the first credit carrying that outcome
    in the order the books read evidence in; the rest stay posted on the row.

    @unit @integration @SCN-LDG-036
    Scenario: a failing test in a file that sorts after a passing one citing the same scenario reads failing, and the run is out of balance
      Given a runner report citing one scenario from two test files, the file that sorts first passing and the file that sorts last failing
      When balance reconciles each runner report
      Then the scenario's unit reconciliation reads failing, carrying the failed test's credit
      And the scenario and the run are both out of balance

    @unit @integration @SCN-LDG-037
    Scenario: a passing and a failing test in one file citing the same scenario read failing, whichever order the two credits arrive in
      Given a runner report citing one scenario from two tests in one file, one passing and one failing, and the same report with the two tests listed the other way round
      When balance reconciles each runner report
      Then the scenario's unit reconciliation reads failing, carrying the failed test's credit
      And the scenario and the run are both out of balance

    @unit @SCN-LDG-038
    Scenario: whatever credits answer one evidence obligation, on either arm, in any order and wherever their files sort, it reads the worst outcome among them and names a credit carrying it
      Given any set of credits answering one evidence obligation, at a behavioural quality check or at a fitness check, arriving in any order and from any files
      When the reconciler runs
      Then the obligation reads the worst outcome any one of those credits reads on its own
      And the credit its item names is one of them, and reads that same outcome on its own

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

    @unit @integration @SCN-LDG-004
    Scenario: a multi-evidence obligation scenario failing one level and missing another lists both reconciling items
      Given a scenario "SCN-LDG-004" requiring both unit-level and integration-level evidence
      And a failing unit-level result for "SCN-LDG-004"
      And no integration-level result for "SCN-LDG-004"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-004" as out of balance
      And the reconciling items for "SCN-LDG-004" are "failing,missing"

  Rule: a credit citing a scenario no feature carries is a phantom-scenario reconciliation

    The bidirectional reconciler consumes evidence observations (credits),
    not just evidence obligations. A credit citing an @SCN id that NO feature carries
    posts to no real scenario — it lands on a PHANTOM scenario
    (posting to a non-existent account). Each
    phantom cited id becomes ONE phantom-scenario Scenario Reconciliation, its
    Quality Check Reconciliation carrying the outcome cites-unknown-scenario (and the
    evidence observation's locator as the where-to-fix), verdict always out of balance. This is
    the foundation sub-issue that lays the full credit-consuming reconciler spine.

    @unit @integration @SCN-LDG-006
    Scenario: a credit citing a scenario no feature carries is reported as a phantom-scenario reconciliation, out of balance
      Given a scenario "SCN-LDG-006" requiring unit-level evidence
      And a passing unit-level result citing the phantom scenario "SCN-PHM-999"
      When the reconciler runs
      Then the ledger reports "SCN-PHM-999" as a phantom-scenario reconciliation with a cites-unknown-scenario item
      And the phantom-scenario "SCN-PHM-999" is out of balance

    @unit @integration @SCN-LDG-034
    Scenario: a phantom row's item carries the keys its credit has a value for and omits the rest
      Given a scenario "SCN-LDG-034" requiring unit-level evidence
      And a passing fitness credit citing the phantom scenario "SCN-PHM-034" naming the check "lint:complexity"
      When the reconciler runs
      Then the ledger reports "SCN-PHM-034" as a phantom-scenario reconciliation with a cites-unknown-scenario item
      And the phantom-scenario "SCN-PHM-034"'s item carries the check "lint:complexity" and no locator key
      And the phantom-scenario "SCN-PHM-034" is out of balance

  Rule: a credit citing no scenario is a suspense-scenario reconciliation

    The bidirectional reconciler also consumes credits that cite NO scenario at
    all — a runtime result carrying no @SCN anchor, or a CI static check no scenario cites
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

  Rule: a credit at a quality-check the scenario never raised is no-evidence-obligation

    The bidirectional reconciler also consumes credits that cite a REAL
    scenario at a quality-check that scenario NEVER raised — a runtime result attributed to
    a scenario, but at a level the scenario has no evidence obligation for. Such a credit posts
    to a real account, but against no evidence obligation on it: outcome no-evidence-obligation (the GENERAL case —
    it applies whether or not the scenario carries other evidence obligations). It becomes a credit-side
    Quality Check Reconciliation ON THE REAL scenario's row (carrying the evidence observation locator as
    the where-to-fix, ruling Q5); the row's own evidence obligations reconcile as normal. This
    fixes the latent attributed mis-count: countRuntimeEvidenceObservationKinds no longer silently counts a
    stray credit at a never-raised quality-check as reconciliation-matched-attributed — no-evidence-obligation
    appears in summary.byOutcome, while the Test-volume attributed (credits citing a real
    scenario) still INCLUDES it as a subset. The two attributed counts stay distinct.

    @unit @integration @SCN-LDG-008
    Scenario: a credit at a quality-check the scenario never raised is reported as no-evidence-obligation
      Given a scenario "SCN-LDG-008" requiring unit-level evidence
      And a passing integration-level result for "SCN-LDG-008"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-008" with a no-evidence-obligation item at integration

    @unit @integration @SCN-LDG-010
    Scenario: a zero-evidence obligation scenario cited by a stray credit is no-evidence-obligation, not both-missing
      Given a zero-evidence obligation scenario "SCN-LDG-010"
      And a passing unit-level result for "SCN-LDG-010"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-010" with a no-evidence-obligation item at unit
      And "SCN-LDG-010" is not reported as both-missing

  Rule: a scenario with zero rows on both sides is both-missing

    The neither-side reconciling item — the last shape the
    bidirectional reconciler emits. A scenario that reconciles to ZERO rows on
    BOTH sides — no evidence obligation AND no citing evidence observation — has nothing
    to balance in either direction. It posts one degenerate Quality Check Reconciliation,
    blank on both sides, outcome both-missing (label: "Evidence Obligation and
    Evidence Observation are both missing — the Scenario is untagged and uncited"), verdict out of balance. Detection keys
    on the reconciler emitting NOTHING either way — NOT a hard qualityCheckReconciliations.length
    === 0 map: a zero-evidence obligation scenario cited by a stray credit is no-evidence-obligation (LDG-010),
    not both-missing. This retires the earlier zero-evidence warning — the warnings section,
    JSON key, and ScenarioWarning type dissolve; the scenario's new home is this row.

    @unit @integration @SCN-LDG-009
    Scenario: a scenario with zero evidence obligations and zero evidence observations is reported as both-missing, out of balance
      Given a zero-evidence obligation scenario "SCN-LDG-009"
      And no results are observed
      When the reconciler runs
      Then the ledger reports "SCN-LDG-009" with a both-missing item
      And the ledger reports "SCN-LDG-009" as out of balance

  Rule: a runtime observation's level is the cited scenario's own tier tag, not the input source

    The headline of the tag-derivation fix. A runtime observation's
    level comes from the CITED scenario's own tier tag (integration / e2e /
    performance), NOT from the input source that produced it. Cucumber is an
    orchestrator ACROSS levels — a scenario names its tier by tag and cucumber runs
    whichever — so an e2e scenario proven via cucumber must yield an e2e observation,
    discharging its e2e obligation and reconciling balanced. Before the fix the cucumber
    source was hardcoded to integration, so an e2e-via-cucumber scenario false-red:
    e2e missing PLUS integration no-evidence-obligation (an adopter's repository 12-scenario false-red). The
    source level the caller passes survives only as the fallback for an untagged scenario;
    the reconciler's existing (scnId, level) matching does the rest, untouched.

    @unit @integration @SCN-LDG-011
    Scenario: an @e2e scenario proven via cucumber reconciles balanced
      Given a scenario tagged @e2e
      And a passing cucumber observation citing it
      When the ledger reconciles the target
      Then the scenario is balanced
      And it is not reported e2e-missing with a no-evidence-obligation integration observation

    @unit @integration @SCN-LDG-012
    Scenario: an @integration scenario proven via cucumber satisfies its integration obligation
      Given a scenario tagged @integration
      And a passing cucumber observation citing the @integration scenario
      When the ledger reconciles the target
      Then the integration obligation is satisfied and the scenario is balanced

    @unit @integration @SCN-LDG-013
    Scenario: a @unit @e2e scenario with a vitest and a cucumber observation satisfies both tiers
      Given a scenario tagged @unit @e2e
      And a passing vitest observation citing the @unit @e2e scenario
      And a passing cucumber observation citing the @unit @e2e scenario
      When the ledger reconciles the target
      Then both the unit and the e2e obligations are satisfied and the scenario is balanced

    @unit @integration @SCN-LDG-014
    Scenario: an @integration @e2e scenario with one cucumber observation satisfies both non-unit tiers
      Given a scenario tagged @integration @e2e
      And a single passing cucumber observation citing it
      When the ledger reconciles the target
      Then both the integration and the e2e obligations are satisfied and the scenario is balanced

    @unit @integration @SCN-LDG-015
    Scenario: a cucumber observation for a @unit-only scenario discharges nothing and is no-evidence-obligation
      Given a scenario tagged @unit only
      And a passing cucumber observation citing the @unit-only scenario
      When the ledger reconciles the target
      Then the cucumber observation is reported no-evidence-obligation
      And the @unit obligation remains the scenario's only required evidence

  Rule: a vitest assertion is attributed to the @SCN its own leaf cites, not its ancestor's

    @unit @integration @SCN-LDG-016
    Scenario: a self-citing leaf discharges its own scenario while a bare sibling leaf still discharges the ancestor's
      Given a scenario cited by an ancestor describe and a scenario self-cited by a leaf beneath it
      And a passing vitest report whose one leaf self-cites and whose sibling leaf does not
      When the ledger reconciles the target
      Then the self-citing leaf is attributed to the leaf-cited scenario, not to the ancestor
      And the ancestor scenario carries exactly one crediting observation — the bare sibling leaf
      And both scenarios are balanced

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

  Rule: a run carrying broken evidence is unsound

    @unit @integration @SCN-LDG-018
    Scenario: a reconciliation carrying a broken item is unsound, and one carrying none is sound
      Given a run whose vitest report carries a collection-failed file, and a second run whose report collects cleanly but defers an obligation
      When the ledger reconciles both runs
      Then the run carrying the collection failure reports broken evidence
      And the run that merely defers an obligation reports no broken evidence — a Pending Item does not make a run unsound
      And soundness is derived from the reconciling items, never stored on the reconciliation

  Rule: a scenario's tags include the ones it inherits from its Feature and Rule

    @unit @integration @SCN-LDG-020
    Scenario Outline: an evidence tier tagged on the <ancestor> is named of the scenarios beneath it
      Given a scenario tagged @unit whose <ancestor> carries @integration, with a passing unit test and no integration evidence
      When the ledger reconciles the run
      Then the scenario raises both the unit and the integration obligation
      And the integration obligation reconciles missing
      And the run is out-of-balance — never balanced on an obligation cucumber names

      Examples:
        | ancestor |
        | Feature  |
        | Rule     |

  Rule: a scenario carrying no @SCN reconciles no-scn-code — uncoded work is never invisible

    @unit @integration @SCN-LDG-021
    Scenario: a scenario carrying no @SCN reconciles no-scn-code on its own row, and the run is out-of-balance
      Given a corpus with one @SCN-tagged scenario, proven and passing, and one scenario carrying no @SCN
      When the ledger reconciles that corpus
      Then the untagged scenario has its own out-of-balance row, reconciling no-scn-code
      And the run is out-of-balance — a scenario the ledger cannot link is never a clean run

  Rule: every evidence observation posts to exactly one ledger account, never to none — the credit cites, on both axes

    @unit @integration @SCN-LDG-022
    Scenario: every evidence observation posts to exactly one ledger account and is findable there — behavioural and fitness credits alike
      Given a run whose credits span every shape — satisfied, no-evidence-obligation, pending-cited, phantom, uncited, broken, a cited fitness check and an uncited one
      When the ledger reconciles that run
      Then every evidence observation posts to exactly one ledger account
      And each credit is findable in the account its citation names
      And the credit citing a pending quality-check is posted and findable
      And the run's verdict and reconciling items are unchanged — posting classifies nothing

    @unit @integration @SCN-LDG-035
    Scenario: a static-check credit discharges only the obligation on the row whose @SCN it cites
      Given two fitness scenarios "SCN-AAA-001" and "SCN-AAA-002" whose rows share the retired characteristic word "complexity"
      And a fitness credit citing only "SCN-AAA-001"
      When the ledger reconciles that shared-check run
      Then the row "SCN-AAA-001" reconciles satisfied, holding the credit
      And the row "SCN-AAA-002" reconciles missing, holding no credit

  Rule: a balanced fitness-only corpus keeps summary.outOfBalance agreeing with the balanced verdict

    @unit @integration @SCN-LDG-025
    Scenario: a corpus whose only fitness credit is one satisfied citation-routed check reconciles balanced with no suspense row, so summary.outOfBalance agrees with the balanced verdict
      Given a corpus whose only fitness credit is a citation-routed check, wired and green in CI
      When the obligations-only corpus is reconciled
      Then the fitness scenario reconciles satisfied and the run is balanced
      And there is no suspense row, and summary.outOfBalance is 0 — agreeing with the balanced verdict

  Rule: the evidence obligations a scenario raises post to its ledger account, keyed by quality-check

    @unit @integration @SCN-LDG-023
    Scenario: the evidence obligations a scenario raises post to its ledger account, keyed by quality-check
      Given a run whose scenarios raise obligations of every shape — a runtime obligation, a fitness obligation carrying its bare check, and a pending one
      When the ledger reconciles that run
      Then every evidence obligation posts to its own scenario's account
      And each debit is findable on its account, keyed by quality-check
      And the pending obligation is posted and findable, though it earns no reconciled row
      And the run's verdict and reconciling items are unchanged — debit-posting classifies nothing

  Rule: a Quality Check Reconciliation carries the evidence obligation it reconciles (the debit side)
    @unit @integration @SCN-LDG-026
    Scenario: a missing quality-check reconciliation carries its evidence obligation and no observation
      Given a scenario "SCN-LDG-026" requiring @unit with no matching evidence observation
      When the ledger reconciles that run
      Then its unit Quality Check Reconciliation has outcome "missing"
      And it carries the evidence obligation it reconciles (the debit side)
      And it carries no evidence observation (the credit side is absent)
      And the JSON projects that evidence obligation on the reconciliation

  Rule: a Quality Check Reconciliation carries the evidence observation it reconciles (the credit side)
    @unit @integration @SCN-LDG-027
    Scenario: a no-evidence-obligation quality-check reconciliation carries its evidence observation and no obligation
      Given a scenario "SCN-LDG-027" cited by a credit at a quality-check it never named
      When the ledger reconciles that run
      Then its Quality Check Reconciliation has outcome "no-evidence-obligation"
      And it carries the evidence observation it reconciles (the credit side)
      And it carries no evidence obligation (the debit side is absent)
      And the JSON projects that evidence observation on the reconciliation

  Rule: a fitness missing reconciliation carries its obligation and no observation — an absent check is an absence

    @unit @integration @SCN-LDG-028
    Scenario: a fitness missing quality-check reconciliation carries its obligation and no observation
      Given a scenario "SCN-LDG-028" requiring a fitness check absent from both package.json and CI
      When the ledger reconciles that run
      Then its fitness Quality Check Reconciliation has outcome "missing"
      And it carries the evidence obligation it reconciles (the debit side)
      And it carries no evidence observation — an absent guard's {exists:false} is an absence, not an observation

  Rule: a no-scn-code reconciliation carries a scenario-scope evidence obligation and no observation

    @unit @integration @SCN-LDG-029
    Scenario: a no-scn-code quality-check reconciliation carries a scenario-scope obligation and no observation
      Given a corpus with one scenario carrying no @SCN
      When the ledger reconciles that corpus
      Then the untagged scenario's Quality Check Reconciliation has outcome "no-scn-code"
      And it carries a scenario-scope evidence obligation — empty, with no qualityCheck and no staticCheck
      And it carries no evidence observation
      And the scenario-level evidence obligations stay empty, so the census and markdown are unchanged

  Rule: a Quality Check Reconciliation's carried sides are consistent with its outcome

    @unit @integration @SCN-LDG-030
    Scenario: every outcome's sides match canon, a divergent pair is unconstructible, and the emitted report agrees
      Given the canon outcome-side profile OUTCOME_SIDE_PROFILE
      When a Quality Check Reconciliation is constructed for each outcome with its canon-correct sides
      Then each reconciliation's side-presence matches its canon row
      And constructing any outcome with a forbidden side throws — a divergent pair is unconstructible
      And when the real tool balances a corpus that exercises every outcome, every emitted Quality Check Reconciliation's sides match its canon row

  Rule: a vitest citation is the bracketed token — an SCN-shaped token in prose is prose

    @unit @integration @SCN-LDG-033
    Scenario: an assertion whose only SCN-shaped token is prose cites no scenario — the credit posts to suspense
      Given a scenario in the corpus and a fixture id that names nothing in it
      And a passing vitest report whose one assertion names both ids in prose, bracketing neither
      When the ledger reconciles the target
      Then the assertion cites no scenario and its credit posts to the suspense row
      And neither prose-named id mints a phantom scenario

    @unit @integration @SCN-LDG-032
    Scenario: a leaf naming a scenario id in prose does not override its describe's bracketed citation
      Given a scenario cited by an ancestor describe and a second scenario named only in a leaf's prose
      And a passing vitest report whose one leaf names the second scenario in prose beneath the citing describe
      When the ledger reconciles the target
      Then the leaf is attributed to the ancestor-cited scenario, not to the one its prose names
      And the prose-named scenario carries no crediting observation
