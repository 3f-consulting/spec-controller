@LDG
Feature: Ledger over obligation-vs-observation evidence

  spec-controller is a reconciliation engine, not a spec engine. It sets the evidence
  obligations a scenario raises through its tags for kinds of quality check, the debit side, against the
  evidence its tests produce. It reports a ledger: for each scenario, whether the books
  balance. It matches each evidence obligation on its kind of quality check. Evidence that is
  present and passes is balanced; present and failing is failing; absent is missing.

  A scenario's verdict is binary. A scenario is balanced when every Evidence Obligation it
  raises balances. Otherwise it is out of balance, and lists every reconciling item that
  does not balance, each typed and none ranked.

  Rule: a scenario whose Evidence Obligation is answered by evidence that exists and passes is balanced

    @unit @SCN-LDG-001
    Scenario: a scenario whose Evidence Obligation is answered by evidence that exists and passes is reported as balanced

  Rule: a scenario whose Evidence Obligation names a test that exists but fails is out of balance

    @unit @SCN-LDG-002
    Scenario: a scenario whose Evidence Obligation names a test that exists but fails is reported as out of balance with a failing reconciling item

  Rule: a scenario that raises an Evidence Obligation with no matching result is out of balance

    @unit @SCN-LDG-003
    Scenario: a scenario that raises an Evidence Obligation with no matching result is reported as out of balance with a missing reconciling item

  Rule: an out-of-balance scenario carries its reconciling items as a list

    @unit @SCN-LDG-005
    Scenario: an out-of-balance scenario lists its reconciling item rather than collapsing to one scenario outcome

  Rule: a multi-evidence obligation out-of-balance scenario lists every reconciling item, none ranked

    @unit @SCN-LDG-004
    Scenario: a multi-evidence obligation scenario failing one level and missing another lists both reconciling items

  Rule: an evidence observation citing a scenario no feature carries is a phantom claim's reconciliation

    The bidirectional reconciler consumes evidence observations,
    not just evidence obligations. An evidence observation citing an @SCN id that NO feature carries
    posts to no real scenario — it lands on a PHANTOM claim
    (posting to a non-existent account). Each
    cited id with no scenario behind it becomes ONE phantom claim's Claim Reconciliation, its
    Quality Check Reconciliation carrying the outcome cites-unknown-scenario (and the
    evidence observation's locator as the where-to-fix), verdict always out of balance.

    @unit @SCN-LDG-006
    Scenario: an evidence observation citing a scenario no feature carries is reported as a phantom claim's reconciliation, out of balance, its payload asserted on the observation

    @unit @SCN-LDG-034
    Scenario: an observation on a phantom claim's row carries the keys it has a value for and omits the rest

  Rule: an evidence observation citing no scenario is the unnamed claim's reconciliation

    The bidirectional reconciler also consumes evidence observations that cite NO scenario at
    all — a behavioural result carrying no @SCN anchor, or a CI fitness function no scenario cites.
    An evidence observation that posts to no scenario lands on the UNNAMED claim
    (a suspense account holds postings that match no
    real account). ALL uncited evidence observations aggregate into ONE unnamed claim's Claim
    Reconciliation, sentinel id "(unnamed claim)", each Quality Check Reconciliation carrying
    the outcome cites-no-scenario (and the evidence observation's locator as the where-to-fix),
    verdict always out of balance. Every uncited evidence observation is listed on this row.

    @unit @SCN-LDG-007
    Scenario: an evidence observation citing no scenario is reported as the unnamed claim's reconciliation, out of balance

  Rule: an evidence observation at a quality-check the scenario never raised is no-evidence-obligation

    The bidirectional reconciler also consumes evidence observations that cite a REAL
    scenario at a layer that scenario NEVER raised — a behavioural result attributed to
    a scenario, but at a level the scenario has no evidence obligation for. Such an evidence observation posts
    to a real account, but against no evidence obligation on it: outcome no-evidence-obligation (the GENERAL case —
    it applies whether or not the scenario carries other evidence obligations). It becomes an evidence-observation
    Quality Check Reconciliation ON THE REAL scenario's row (carrying the evidence observation locator as
    the where-to-fix, ruling Q5); the row's own evidence obligations reconcile as normal. So
    the count of behavioural observations never silently counts a
    stray evidence observation at a never-raised layer as one that matched an evidence obligation — no-evidence-obligation
    appears in summary.byOutcome, while the Evidence observations attributed (evidence observations citing a real
    scenario) still INCLUDES it as a subset. The two attributed counts stay distinct.

    @unit @SCN-LDG-008
    Scenario: an evidence observation at a quality check the scenario never raised is reported as no-evidence-obligation, its payload asserted on the observation

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

    An observation is posted at each layer its cited scenario is tagged with, integration, e2e
    or performance, in tag order and once each. A scenario tagged with no layer beyond @unit has
    its observation posted at the layer its report falls back to: unit for a report of
    test results, integration for a report of scenario runs. The source that produced an
    observation never overrides the scenario's own layer.

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

    @unit @SCN-LDG-045
    Scenario: a report of test results falls back to unit, and a report of scenario runs to integration

  Rule: a run carrying broken evidence is unsound

    @unit @SCN-LDG-018
    Scenario: a reconciliation carrying a broken item is unsound, and one carrying none is sound

  Rule: a scenario carrying no @SCN reconciles no-scn-code — no-scn-code work is never invisible

    @unit @SCN-LDG-021
    Scenario: a scenario carrying no @SCN reconciles no-scn-code on its own row, and the run is out-of-balance

  Rule: every evidence observation posts to exactly one ledger account, never to none — the evidence observation cites, on both axes

    An evidence observation is found once on its account, inside the quality-check reconciliation
    of its kind of quality check, and nowhere else on the row. A broken evidence observation posts to the
    claim it names, as every other does, as a broken item carrying it. The obligation it was meant
    to answer reconciles from the evidence that reached its proof.

    @unit @SCN-LDG-022
    Scenario: every evidence observation posts to exactly one ledger account and is found once there, inside the quality-check reconciliation of its quality check, a broken one on the claim it names

    @unit @SCN-LDG-035
    Scenario: a fitness-function evidence observation discharges only the obligation on the row whose @SCN it cites

  Rule: a balanced fitness-only corpus keeps summary.outOfBalance agreeing with the balanced verdict

    @unit @SCN-LDG-025
    Scenario: a corpus whose only fitness evidence observation is one satisfied citation-routed check reconciles balanced with no row for the unnamed claim, so summary.outOfBalance agrees with the balanced verdict

  Rule: the evidence obligations a scenario raises post to its ledger account, keyed by quality-check

    @unit @SCN-LDG-023
    Scenario: the evidence obligations a scenario raises post to its ledger account, keyed by quality-check

  Rule: a Quality Check Reconciliation carries the evidence obligation it reconciles (the debit side)
    @unit @SCN-LDG-026
    Scenario: a missing quality-check reconciliation carries its evidence obligation and no observation, read from its observation list

  Rule: a Quality Check Reconciliation carries every evidence observation of its quality check on its claim

    @unit @SCN-LDG-027
    Scenario: a quality-check reconciliation carries every evidence observation of its quality check on its claim

  Rule: a fitness missing reconciliation carries its obligation and no observation — an absent check is an absence

    @unit @SCN-LDG-028
    Scenario: a fitness missing quality-check reconciliation carries its obligation and no observation, read from its observation list

  Rule: a no-scn-code reconciliation carries a scenario-scope evidence obligation and no observation

    @unit @SCN-LDG-029
    Scenario: a no-scn-code quality-check reconciliation carries a scenario-scope obligation and no observation, read from its observation list

  Rule: a Quality Check Reconciliation's carried sides are consistent with its outcome

    @unit @SCN-LDG-030
    Scenario: every Reconciliation line's sides match its outcome's definition, a divergent pair is unconstructible, and the emitted report agrees

  Rule: each evidence observation a Quality Check Reconciliation holds is a Reconciliation line with its own outcome

    Each evidence observation a Quality Check Reconciliation holds is a Reconciliation line with its own outcome.
    The Quality Check Reconciliation's own outcome is its evidence obligation's line, present only when no evidence
    observation that ran answers that obligation. A claim is balanced when every Reconciliation line on its row is
    satisfied, and no line stands in for another evidence observation.

    @unit @SCN-LDG-047
    Scenario: each evidence observation a quality-check reconciliation holds reads its own outcome, every one counting toward the claim's verdict, and an obligation with none reads one missing line

  Rule: an evidence observation that cites more than one scenario credits none of them, whatever the runner

    A test cites exactly one scenario. One that cites several credits none of them and posts to the unnamed claim,
    naming every code, so no reader picks one (docs/ubiquitous-language.md, Attribution).

    @unit @SCN-LDG-042
    Scenario: an evidence observation citing two scenarios credits neither, and the unnamed claim's row names both codes

  Rule: two scenarios sharing one @SCN code are two claims

    Each scenario is a claim. A code two scenarios carry names neither, so evidence citing it credits
    neither and posts to the unnamed claim, naming the code, as evidence naming several scenarios does.

    @unit @SCN-LDG-046
    Scenario: two scenarios sharing one @SCN code reconcile as two duplicate-scn-code Claim Reconciliations under that code, each naming its own scenario, and an observation citing the code posts to the unnamed claim

  Rule: a test's run result gives the same evidence whatever the runner: broken when it never reached its assertions, nothing when it is inconclusive

    A test that ran its assertions posts what they said, passed or failed. A test its runner reports as
    never having reached them posts broken evidence. A test whose result is inconclusive posts nothing.
    Each runner's reader says which of its runner's results is which, as that runner's own scenarios
    state: a test file that failed to load, or a Cucumber step matching more than one definition, never
    reached its assertions, while a failed setup reads as failed for some runners and as skipped for others.

    @unit @SCN-LDG-043
    Scenario: a test that never reached its assertions posts broken evidence, whatever the runner

    @unit @SCN-LDG-044
    Scenario: a test whose result is inconclusive posts no evidence observation, whatever the runner
