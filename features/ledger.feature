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
      Given a declared scenario "SCN-LDG-001" requiring unit-level evidence
      And a passing unit-level result for "SCN-LDG-001"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-001" as balanced with no reconciling items

  Rule: a scenario whose required test exists but fails is out of balance

    @unit @integration @SCN-LDG-002
    Scenario: a scenario whose required test exists but fails is reported as out of balance with a failing reconciling item
      Given a declared scenario "SCN-LDG-002" requiring unit-level evidence
      And a failing unit-level result for "SCN-LDG-002"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-002" as out of balance
      And the reconciling items for "SCN-LDG-002" are "failing"

  Rule: a scenario that requires a level with no matching result is out of balance

    @unit @integration @SCN-LDG-003
    Scenario: a scenario that requires a level with no matching result is reported as out of balance with a missing reconciling item
      Given a declared scenario "SCN-LDG-003" requiring integration-level evidence
      And no result matches "SCN-LDG-003"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-003" as out of balance
      And the reconciling items for "SCN-LDG-003" are "missing"

  Rule: an out-of-balance scenario carries its reconciling items as a list

    @unit @integration @SCN-LDG-005
    Scenario: an out-of-balance scenario lists its reconciling item rather than collapsing to one scenario outcome
      Given a declared scenario "SCN-LDG-005" requiring unit-level evidence
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
      Given a declared scenario "SCN-LDG-004" requiring both unit-level and integration-level evidence
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
      Given a declared scenario "SCN-LDG-006" requiring unit-level evidence
      And a passing unit-level result for an undeclared scenario "SCN-PHANTOM-999"
      When the reconciler runs
      Then the ledger reports "SCN-PHANTOM-999" as a phantom-scenario reconciliation with a cites-unknown-scenario item
      And the phantom-scenario "SCN-PHANTOM-999" is out of balance

  Rule: a credit citing no scenario is a suspense-scenario reconciliation

    The bidirectional reconciler also consumes credits that cite NO scenario at
    all — a runtime result carrying no @SCN anchor, or a CI static guard no @lint declares
    (ruling Q4). A credit that posts to no scenario lands on the SUSPENSE scenario
    (a suspense account holds postings that match no
    real account). ALL uncited credits aggregate into ONE suspense-scenario Scenario
    Reconciliation, sentinel id "(no scenario)", each Quality Check Reconciliation carrying
    the outcome cites-no-scenario (and the evidence observation's locator as the where-to-fix),
    verdict always out of balance. The suspense-evidence-observation and
    unattributed-static-guard detail lists dissolve into this row (no double-report; the
    counts survive in the summary balance-check identities).

    @unit @integration @SCN-LDG-007
    Scenario: a credit citing no scenario is reported as a suspense-scenario reconciliation, out of balance
      Given a declared scenario "SCN-LDG-007" requiring unit-level evidence
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
      Given a declared scenario "SCN-LDG-008" requiring unit-level evidence
      And a passing integration-level result for "SCN-LDG-008"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-008" with an undemanded item at integration

    # The negative twin (@SCN-LDG-010): a ZERO-evidence obligation declared scenario whose @SCN IS cited
    # by a stray credit. It has an evidence observation at an undeclared quality-check, so it is undemanded
    # — NOT both-missing. This pins the general case and the both-missing boundary: detection keys
    # on rows-emitted, not on evidenceObligations.length === 0 (both-missing itself lands in LDG-009).
    @unit @integration @SCN-LDG-010
    Scenario: a zero-evidence obligation scenario cited by a stray credit is undemanded, not both-missing
      Given a zero-evidence obligation declared scenario "SCN-LDG-010"
      And a passing unit-level result for "SCN-LDG-010"
      When the reconciler runs
      Then the ledger reports "SCN-LDG-010" with an undemanded item at unit
      And "SCN-LDG-010" is not reported as both-missing

  Rule: a declared scenario with zero rows on both sides is both-missing

    The neither-side reconciling item (@SCN-LDG-009) — the last shape the
    bidirectional reconciler emits. A declared scenario that reconciles to ZERO rows on
    BOTH sides — no declared evidence obligation AND no citing evidence observation — has nothing
    to balance in either direction. It posts one degenerate Quality Check Reconciliation,
    blank on both sides, outcome both-missing (label: "Evidence Observation and
    Evidence Obligation are both missing for the Scenario."), verdict out of balance. Detection keys
    on the reconciler emitting NOTHING either way — NOT a hard evidenceObligations.length
    === 0 map: a zero-evidence obligation scenario cited by a stray credit is undemanded (LDG-010),
    not both-missing. This retires the no-evidence-declared warning — the warnings section,
    JSON key, and ScenarioWarning type dissolve; the scenario's new home is this row.

    @unit @integration @SCN-LDG-009
    Scenario: a declared scenario with zero evidence obligations and zero evidence observations is reported as both-missing, out of balance
      Given a zero-evidence obligation declared scenario "SCN-LDG-009"
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
