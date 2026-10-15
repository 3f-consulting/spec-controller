@LDG
Feature: Ledger over obligation-vs-observation evidence

  spec-controller is a reconciliation engine, not a spec engine. It sets the evidence
  obligations a scenario RAISES (its @unit / @integration tags, read as the
  debit side) against the evidence those tests actually
  PRODUCED, and reports a ledger — per scenario, whether the books
  balance. Evidence is keyed by (kind, level) per the two-axis model:
  per evidence obligation, present+pass → balanced;
  present+fail → failing; absent → missing. The scenario
  VERDICT is binary: a scenario is balanced iff EVERY Evidence Obligation
  it raises balances; otherwise it is out of balance, carrying the LIST of
  every non-balanced reconciling item — each typed, none ranked.

  Rule: a scenario whose Evidence Obligation is answered by evidence that exists and passes is balanced

    @unit @SCN-LDG-001
    Scenario: a scenario whose Evidence Obligation is answered by evidence that exists and passes is reported as balanced

  Rule: a scenario whose Evidence Obligation names a test that exists but fails is out of balance

    @unit @SCN-LDG-002
    Scenario: a scenario whose Evidence Obligation names a test that exists but fails is reported as out of balance with a failing reconciling item

  Rule: an evidence obligation answered by several evidence observations reads the worst outcome any of them carries, and names an evidence observation carrying it

    A runner emits one evidence observation per test, so a scenario cited by several tests carries several
    evidence observations at one quality check. Each is read on its own, and the obligation reads the worst of
    those readings — failing over watermelon over satisfied — on every quality check. A failed one is a failing observation whatever passed beside it, and nothing about
    where its file sorts may discharge it. The item names the first evidence observation carrying that outcome
    in the order the books read evidence in; the rest stay posted on the row.

    @unit @SCN-LDG-036
    Scenario: a failing test in a file that sorts after a passing one citing the same scenario reads failing, and the run is out of balance

    @unit @SCN-LDG-037
    Scenario: a passing and a failing test in one file citing the same scenario read failing, whichever order the two evidence observations arrive in

    @unit @SCN-LDG-038
    Scenario: whatever evidence observations answer one evidence obligation, on either arm, in any order and wherever their files sort, it reads the worst outcome among them and names an evidence observation carrying it

  Rule: a scenario that raises an Evidence Obligation with no matching result is out of balance

    @unit @SCN-LDG-003
    Scenario: a scenario that raises an Evidence Obligation with no matching result is reported as out of balance with a missing reconciling item

  Rule: an out-of-balance scenario carries its reconciling items as a list

    @unit @SCN-LDG-005
    Scenario: an out-of-balance scenario lists its reconciling item rather than collapsing to one scenario outcome

  Rule: a multi-evidence obligation out-of-balance scenario lists every reconciling item, none ranked

    @unit @SCN-LDG-004
    Scenario: a multi-evidence obligation scenario failing one level and missing another lists both reconciling items

  Rule: an evidence observation citing a scenario no feature carries is a phantom-scenario reconciliation

    The bidirectional reconciler consumes evidence observations,
    not just evidence obligations. An evidence observation citing an @SCN id that NO feature carries
    posts to no real scenario — it lands on a PHANTOM scenario
    (posting to a non-existent account). Each
    phantom cited id becomes ONE phantom-scenario Scenario Reconciliation, its
    Quality Check Reconciliation carrying the outcome cites-unknown-scenario (and the
    evidence observation's locator as the where-to-fix), verdict always out of balance. This is
    the foundation sub-issue that lays the full reconciler spine that consumes evidence observations.

    @unit @SCN-LDG-006
    Scenario: an evidence observation citing a scenario no feature carries is reported as a phantom-scenario reconciliation, out of balance

    @unit @SCN-LDG-034
    Scenario: a phantom row's item carries the keys its evidence observation has a value for and omits the rest

  Rule: an evidence observation citing no scenario is a suspense-scenario reconciliation

    The bidirectional reconciler also consumes evidence observations that cite NO scenario at
    all — a behavioural result carrying no @SCN anchor, or a CI fitness function no scenario cites
    (ruling Q4). An evidence observation that posts to no scenario lands on the SUSPENSE scenario
    (a suspense account holds postings that match no
    real account). ALL uncited evidence observations aggregate into ONE suspense-scenario Scenario
    Reconciliation, sentinel id "(no scenario)", each Quality Check Reconciliation carrying
    the outcome cites-no-scenario (and the evidence observation's locator as the where-to-fix),
    verdict always out of balance. Every uncited evidence observation is listed on this row.

    @unit @SCN-LDG-007
    Scenario: an evidence observation citing no scenario is reported as a suspense-scenario reconciliation, out of balance

  Rule: an evidence observation at a quality-check the scenario never raised is no-evidence-obligation

    The bidirectional reconciler also consumes evidence observations that cite a REAL
    scenario at a quality-check that scenario NEVER raised — a behavioural result attributed to
    a scenario, but at a level the scenario has no evidence obligation for. Such an evidence observation posts
    to a real account, but against no evidence obligation on it: outcome no-evidence-obligation (the GENERAL case —
    it applies whether or not the scenario carries other evidence obligations). It becomes an evidence-observation
    Quality Check Reconciliation ON THE REAL scenario's row (carrying the evidence observation locator as
    the where-to-fix, ruling Q5); the row's own evidence obligations reconcile as normal. So
    the count of behavioural observations never silently counts a
    stray evidence observation at a never-raised quality-check as one that matched an evidence obligation — no-evidence-obligation
    appears in summary.byOutcome, while the Test-volume attributed (evidence observations citing a real
    scenario) still INCLUDES it as a subset. The two attributed counts stay distinct.

    @unit @SCN-LDG-008
    Scenario: an evidence observation at a quality-check the scenario never raised is reported as no-evidence-obligation

    @unit @SCN-LDG-010
    Scenario: a zero-evidence obligation scenario cited by a stray evidence observation is no-evidence-obligation, not both-missing

  Rule: a scenario with zero rows on both sides is both-missing

    The neither-side reconciling item — the last shape the
    bidirectional reconciler emits. A scenario that reconciles to ZERO rows on
    BOTH sides — no evidence obligation AND no citing evidence observation — has nothing
    to balance in either direction. It posts one degenerate Quality Check Reconciliation,
    blank on both sides, outcome both-missing (label: "Evidence Obligation and
    Evidence Observation are both missing — the Scenario is untagged and uncited"), verdict out of balance. Detection keys
    on the reconciler emitting NOTHING either way — NOT a hard qualityCheckReconciliations.length
    === 0 map: a zero-evidence obligation scenario cited by a stray evidence observation is no-evidence-obligation (LDG-010),
    not both-missing. The report has no warnings section: this row is where such a scenario
    is reported.

    @unit @SCN-LDG-009
    Scenario: a scenario with zero evidence obligations and zero evidence observations is reported as both-missing, out of balance

  Rule: a behavioural observation's level is the cited scenario's own tier tag, not the input source

    An observation is posted at each tier its cited scenario is tagged with, integration, e2e
    or performance, in tag order and once each. A scenario tagged with no tier beyond @unit has
    its observation posted at the quality check its source names as the fallback. The source
    that produced an observation never overrides the scenario's own tier.

    @unit @SCN-LDG-011
    Scenario: an observation of a scenario tagged @e2e is posted at e2e, whatever its source's fallback

    @unit @SCN-LDG-012
    Scenario: an observation of a scenario tagged @integration is posted at integration

    @unit @SCN-LDG-013
    Scenario: a @unit @e2e scenario with a vitest and a cucumber observation satisfies both tiers

    @unit @SCN-LDG-014
    Scenario: an observation of a scenario tagged @integration and @e2e is posted at both

    @unit @SCN-LDG-015
    Scenario: an observation of a scenario carrying no tier tag beyond @unit is posted at its source's fallback

  Rule: a vitest assertion is attributed to the @SCN its own leaf cites, not its ancestor's

    @unit @SCN-LDG-016
    Scenario: a self-citing leaf discharges its own scenario while a bare sibling leaf still discharges the ancestor's

  Rule: evidence that never materialised is broken, not absent

    @unit @SCN-LDG-017
    Scenario: a collection-failed vitest file posts a broken suspense item naming the file and its error, while the scenario it would have proven still reads missing

    @unit @SCN-LDG-019
    Scenario: an ambiguous cucumber step posts a broken suspense item naming the step, while the scenario it would have proven still reads missing

  Rule: a run carrying broken evidence is unsound

    @unit @SCN-LDG-018
    Scenario: a reconciliation carrying a broken item is unsound, and one carrying none is sound

  Rule: a scenario's tags include the ones it inherits from its Feature and Rule

    @unit @SCN-LDG-020
    Scenario Outline: an evidence tier tagged on the <ancestor> is named of the scenarios beneath it

      Examples:
        | ancestor |
        | Feature  |
        | Rule     |

  Rule: a scenario carrying no @SCN reconciles no-scn-code — no-scn-code work is never invisible

    @unit @SCN-LDG-021
    Scenario: a scenario carrying no @SCN reconciles no-scn-code on its own row, and the run is out-of-balance

    @SCN-LDG-039 @unit @e2e
    Scenario Outline: a scenario whose @SCN it inherits from its <ancestor> is reconciled once, on that code's row, and never also as no-scn-code
      Given a target whose one scenario carries no scenario code of its own, inherits one from its <ancestor>, and has passing evidence citing that code
      When balance reconciles that target
      Then the scenario is reconciled once, balanced, on its scenario code's row
      And no reconciliation names it as a scenario with no scenario code
      And the run balances

      Examples:
        | ancestor |
        | Feature  |
        | Rule     |

  Rule: every evidence observation posts to exactly one ledger account, never to none — the evidence observation cites, on both axes

    @unit @SCN-LDG-022
    Scenario: every evidence observation posts to exactly one ledger account and is findable there — behavioural and fitness evidence observations alike

    @unit @SCN-LDG-035
    Scenario: a fitness-function evidence observation discharges only the obligation on the row whose @SCN it cites

  Rule: a balanced fitness-only corpus keeps summary.outOfBalance agreeing with the balanced verdict

    @unit @SCN-LDG-025
    Scenario: a corpus whose only fitness evidence observation is one satisfied citation-routed check reconciles balanced with no suspense row, so summary.outOfBalance agrees with the balanced verdict

  Rule: the evidence obligations a scenario raises post to its ledger account, keyed by quality-check

    @unit @SCN-LDG-023
    Scenario: the evidence obligations a scenario raises post to its ledger account, keyed by quality-check

  Rule: a Quality Check Reconciliation carries the evidence obligation it reconciles (the debit side)
    @unit @SCN-LDG-026
    Scenario: a missing quality-check reconciliation carries its evidence obligation and no observation

  Rule: a Quality Check Reconciliation carries the evidence observation it reconciles (the evidence observation side)
    @unit @SCN-LDG-027
    Scenario: a no-evidence-obligation quality-check reconciliation carries its evidence observation and no obligation

  Rule: a fitness missing reconciliation carries its obligation and no observation — an absent check is an absence

    @unit @SCN-LDG-028
    Scenario: a fitness missing quality-check reconciliation carries its obligation and no observation

  Rule: a no-scn-code reconciliation carries a scenario-scope evidence obligation and no observation

    @unit @SCN-LDG-029
    Scenario: a no-scn-code quality-check reconciliation carries a scenario-scope obligation and no observation

  Rule: a Quality Check Reconciliation's carried sides are consistent with its outcome

    @unit @SCN-LDG-030
    Scenario: every outcome's sides match its definition, a divergent pair is unconstructible, and the emitted report agrees

  Rule: a vitest citation is the bracketed token — an SCN-shaped token in prose is prose

    @unit @SCN-LDG-033
    Scenario: an assertion whose only SCN-shaped token is prose cites no scenario — the evidence observation posts to suspense

    @unit @SCN-LDG-032
    Scenario: a leaf naming a scenario id in prose does not override its describe's bracketed citation

  Rule: an evidence observation that cites more than one scenario credits none of them, whatever the runner

    A test cites exactly one scenario. One that cites several credits none of them and posts to suspense,
    naming every code, so no reader picks one (doc/ubiquitous-language.md, Attribution).

    @unit @SCN-LDG-040
    Scenario: a Vitest test whose title cites two scenarios credits neither, and suspense names both codes

    @unit @SCN-LDG-041
    Scenario: a Cucumber scenario tagged with two scenario codes credits neither, and suspense names both codes
