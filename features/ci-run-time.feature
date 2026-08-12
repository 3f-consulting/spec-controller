@CIP
Feature: Reconcile a MEASURED fitness check against its threshold — the @ci-run-time axis

  THE SECOND WAY A FITNESS FUNCTION IS ASSESSED. Every fitness check reconciled so far is
  read over the source: an ESLint rule, a type check, a corpus analyser. Its observation is
  a pair of facts about the tree — the check exists, and CI runs it — and its threshold is
  binary and unwritten (zero violations), so nothing on the ledger ever had to hold a
  number. A MEASURED check is the other half of the family: it is assessed by RUNNING the
  suite and measuring it, its observation is a number, and its obligation is the threshold
  that number is held against (canon, technical-design/fitness-functions.md → Runtime
  fitness functions). ci-run-time — the CI pipeline timing its own suites — is the
  prototype; coverage and mutation follow it through this same seam.

  ONE POSTING RULE STILL, AND THE RUNNER HOLDS THE MAPPING. A measured check's credit cites
  the @SCN of the stepless fitness scenario that raises its obligation, exactly as a static
  check's does and exactly as a unit test's does. What differs is WHERE the citation comes
  from. A static check's run is a script handle, so its @SCN is resolved at observation time
  over two hops — handle to bare tag through the registry, bare tag to scenario through the
  corpus. A measurement has no handle to resolve: the thing that measures the suite is the
  timing wrapper around the step, and canon puts the check-to-scenario mapping in that
  runner (double-entry-manifesto.md → Fitness Scenario, "the check-to-scenario mapping held
  by the runner, as @ci-run-time's is"). So the measurement ARRIVES already citing, and the
  two-hop seam is not consulted at all.

  WHICH IS WHY ONE TAG MAY NAME MANY SCENARIOS HERE. The corpus hop keeps first-in-corpus
  order and drops the runners-up, so two stepless scenarios sharing one bare check is a
  corpus fault on the static axis — the second reads missing, out loud (@SCN-LNT-008). Canon
  asks the opposite of this axis: several checks of one characteristic are several stepless
  scenarios sharing the tag, told apart by @SCN. Both readings are correct, because they are
  about different seams. The debit is raised per scenario and always was, and a measured
  credit carries its own @SCN, so nothing in the middle has to choose between two rows.

  THE THRESHOLD IS A CEILING, WHICH IS WHAT THE WORD MEANS HERE — a bar you stay under, never
  an allowance drawn down. A measurement at or under its threshold is satisfied and
  one over it is failing — the ordinary two-sided pair, no new outcome. The two-level
  trigger-and-gate model the wrapper prints every run (measured against the engineering
  anchor, with a variance band above it before anything reds) is the WRAPPER's report and
  stays there: an "over the anchor but not yet red" band would be an eleventh outcome, and
  the ledger has ten. What reaches the ledger is the failing threshold and the number.

  A FLOOR-SHAPED CHECK IS NOT IN SCOPE. A mutation score must be at LEAST its threshold,
  which is the comparison inverted; that is 3F-2509's to argue, and this slice deliberately
  builds the ceiling canon defines rather than a direction flag nothing yet asks for.

  WHY NO SCENARIO BELOW RAISES A MEASURED OBLIGATION OF ITS OWN. Every scenario here is
  STEPPED — it is an example of what the engine does — so its bare tags raise nothing
  (@SCN-LNT-006: steplessness is the discriminator). The checks and thresholds named below
  are fixture data, planted per scenario, under fixture @SCN ids no feature file carries.
  spec-controller's own timed suites become stepless fitness scenarios in 3F-2236, which
  wires the wrapper into this repository's CI and puts the obligation on the books; raising
  it here, before anything measures it, would leave a permanently unsettleable row and red
  the self-reconciliation gate for the length of the gap. The engine is built first, and its
  own suites join the ledger when they can be observed.

  Rule: a stepless fitness scenario tagged with a measured check raises an Evidence Obligation carrying its threshold

    WHAT THE DEBIT HAS TO HOLD, AND WHY IT CANNOT COME FROM THE CREDIT. A static check's
    obligation names its bare tag and nothing more, because the check itself decides pass
    from fail and the ledger reconciles what it decided. A measured check cannot work that
    way: if the measurement arrived carrying both the number AND the bar it was judged
    against, the runner would be grading its own homework and the ledger would be
    transcribing a verdict rather than reconciling one. Double entry requires the two sides
    to be independently sourced, so the threshold is authored on the DEBIT side and the
    measurement is only ever a number.

    ONE OBLIGATION, NAMED BY THE SAME RULES AS ANY OTHER. A measured check is a bare tag
    raised only from a stepless scenario, owed once however many of a scenario's effective
    tags name it. Nothing about the debit rule is special-cased for it; what is new is that
    the obligation carries a number.

    THE THRESHOLD IS KEYED BY @SCN, THEN BY CHECK. Keyed by the tag alone it could not
    express what canon asks of this axis — two scenarios sharing one characteristic with
    different ceilings — and flat under the @SCN it would re-open on the debit side the
    non-uniqueness @SCN-LNT-012 closed on the credit side: a scenario may carry two bare
    checks, so one @SCN can owe two obligations, and one number under it would answer for
    both.

    @unit @integration @SCN-CIP-001
    Scenario: a stepless scenario tagged with a measured check raises one Evidence Obligation carrying its threshold
      Given "ci-run-time" is a measured fitness check whose threshold for "SCN-MSD-001" is 75
      And the corpus carries a stepless scenario "SCN-MSD-001" tagged with the bare check "ci-run-time"
      When the measured corpus is read
      Then that scenario raises exactly one Evidence Obligation, naming the measured check "ci-run-time"
      And that Evidence Obligation carries the threshold 75

    @unit @integration @SCN-CIP-002
    Scenario: a measured obligation whose threshold nothing supplies never reads satisfied, and names what is unsupplied

      THE FAULT THE SECOND HOME MAKES REACHABLE. The threshold is authored outside the feature
      file, so the corpus and the ceilings are two artefacts that have to agree about an @SCN
      — and two artefacts keyed by the same word agree until the day one of them is edited. A
      renumbered scenario, a retired one, a ceiling typed against a code that never existed:
      each leaves an obligation with no bar to be held to.

      SILENCE IS THE ONE OUTCOME THAT MUST NOT BE REACHABLE. An unsupplied ceiling has an
      obvious cheap reading — treat it as unbounded, and every measurement is under it — which
      produces a green row for a check nobody set a bar for. That is the watermelon this axis
      exists to refuse, manufactured by the engine rather than by the target.

      THE FIXTURE IS THE REALISTIC FAULT, not a contrivance: a second timed suite, added
      without a ceiling of its own, whose measurement duly arrives. The check tag is still
      recognised, because the measured set is drawn from the whole registry rather than from
      this row's entry — which is exactly why the obligation is raised and can go loud.

      Given "ci-run-time" is a measured fitness check whose threshold for "SCN-MSD-001" is 75
      And the corpus carries a stepless scenario "SCN-MSD-001" tagged with the bare check "ci-run-time"
      And the corpus carries a stepless scenario "SCN-MSD-002" tagged with the bare check "ci-run-time"
      And the timing artefact records a measurement of 12.5 for "ci-run-time" on "SCN-MSD-002"
      When the corpus and the measurements are reconciled
      Then the row "SCN-MSD-002" reconciles missing on the measured check "ci-run-time"
      And the obligation on row "SCN-MSD-002" names no threshold at all

  Rule: a measurement posts one Evidence Observation citing the @SCN its runner stamped

    THE NEW SOURCE. The measurement is neither a test result nor a fact about the tree, so it
    arrives from neither reader: the timing wrapper that measures a step emits it, and the
    engine ingests that artefact as a third evidence stream. It carries what the ledger
    reconciles on — the @SCN naming the row, the bare check tag naming which of that row's
    obligations it answers, and the number — because a citation is not an address on its own
    (@SCN-LNT-012) and one scenario may owe more than one measured check.

    THE ARTEFACT IS READ TOLERANTLY, ROW BY ROW. A malformed row is dropped rather than
    thrown on, for the reason every input at this edge is: the run's job is to produce a
    verdict, and one bad row costing the whole verdict is loud nowhere, while a dropped
    measurement is loud on the ledger as the obligation it leaves unanswered.

    @unit @integration @SCN-CIP-003
    Scenario: a measurement in the timing artefact posts one Evidence Observation citing its scenario and naming its check
      Given the timing artefact records a measurement of 42.1 for "ci-run-time" on "SCN-MSD-001"
      And the timing artefact also carries a row missing its check
      When the timing artefact is ingested
      Then exactly one Evidence Observation is produced, citing "SCN-MSD-001" and naming the check "ci-run-time"
      And it carries the measurement 42.1

  Rule: a measured obligation reconciles against its threshold

    THE THREE OUTCOMES, AND NO FOURTH. Under the ceiling, a measurement at or below the
    threshold satisfies the obligation and one above it fails — the same two-sided pair a
    unit test produces, reached by comparing numbers rather than reading a status. The third
    is the absence: no measurement arrived at all, which is missing.

    MISSING IS THE ONE THAT CARRIES THE AXIS. A step that never ran produces no measurement,
    and the reading that must never be produced is a balanced row — the suite whose timing
    nobody measured looking exactly like the suite that came in under its threshold. On the
    static axis that fact has its own name (the watermelon: the check exists, CI does not run
    it) because it is read from the config. Here it is not read from anywhere: there is
    nothing to observe when nothing ran, so the honest outcome is the debit standing alone.

    AT OR BELOW IS SATISFIED. A ceiling a measurement sits exactly on has not been exceeded,
    so the comparison is at-or-below and not below — an off-by-one here would red a run for
    hitting its bar precisely, which is not a rule anyone would state out loud.

    @unit @integration @SCN-CIP-004
    Scenario: a measurement within its threshold reconciles satisfied
      Given "ci-run-time" is a measured fitness check whose threshold for "SCN-MSD-001" is 75
      And the corpus carries a stepless scenario "SCN-MSD-001" tagged with the bare check "ci-run-time"
      And the timing artefact records a measurement of 75 for "ci-run-time" on "SCN-MSD-001"
      When the corpus and the measurements are reconciled
      Then the row "SCN-MSD-001" reconciles satisfied on the measured check "ci-run-time"
      And that reconciling item carries both the measurement and the threshold

    @unit @integration @SCN-CIP-005
    Scenario: a measurement over its threshold reconciles failing, naming the measurement and the threshold

      ACTIONABLE WITHOUT A SECOND LOOKUP. "ci-run-time is failing" sends a reader nowhere;
      "96.4 against a ceiling of 75" sends them somewhere. Both numbers already ride the
      reconciling item — the ceiling on the debit, the measurement on the credit — and this
      scenario pins that they are THERE. Whether they are rendered is @SCN-CIP-008's.

      AND THE VERDICT FOLLOWS, which is asserted rather than assumed. A new route that
      produced an out-of-balance outcome and quietly failed to reach the run's verdict would
      be the exact watermelon this tool exists to catch, produced by the tool.

      Given "ci-run-time" is a measured fitness check whose threshold for "SCN-MSD-001" is 75
      And the corpus carries a stepless scenario "SCN-MSD-001" tagged with the bare check "ci-run-time"
      And the timing artefact records a measurement of 96.4 for "ci-run-time" on "SCN-MSD-001"
      When the corpus and the measurements are reconciled
      Then the row "SCN-MSD-001" reconciles failing on the measured check "ci-run-time"
      And that reconciling item carries both the measurement and the threshold
      And the row is out-of-balance

    @unit @integration @SCN-CIP-006
    Scenario: a measured obligation no measurement reaches reconciles missing — a step that never ran is never balanced

      THE CLAUSE THE WHOLE AXIS EXISTS FOR. The reading that must be unreachable is the
      BALANCED row: a suite whose timing nobody measured looking exactly like a suite that
      came in under its threshold. This check was filed because "no @SCN, it's CI-infra" is a
      watermelon's hiding place, and an engine that answered an unobserved measured
      obligation with silence would rebuild that hiding place inside the ledger.

      NOT THE WATERMELON, AND THE DISTINCTION IS LOAD-BEARING. On the static axis "the check
      exists and CI does not run it" is READ — the script is in the manifest, the run: step is
      not in the workflow — so it is observable and has its own outcome. A measured check is
      read from nowhere: when the step does not run there is no artefact, no row, nothing to
      observe. The debit stands alone, which is exactly missing. Pinned so a later reader does
      not improve it into a watermelon this axis cannot honestly detect.

      Given "ci-run-time" is a measured fitness check whose threshold for "SCN-MSD-001" is 75
      And the corpus carries a stepless scenario "SCN-MSD-001" tagged with the bare check "ci-run-time"
      And no timing artefact was produced at all
      When the corpus and the measurements are reconciled
      Then the row "SCN-MSD-001" reconciles missing on the measured check "ci-run-time"
      And that reconciling item carries no measurement at all
      And the row is out-of-balance

    @unit @integration @SCN-CIP-007
    Scenario: two stepless scenarios sharing one measured check each reconcile against their own threshold and their own measurement

      THE CASE THE STATIC AXIS CANNOT DO, and the case the first consumer needs. The step gate
      times two suites — the unit suite and the Cucumber suite — under one characteristic and
      two ceilings, which is exactly the shape canon names for this tag. On the static axis the
      second scenario would read missing by design, because one run is one credit and the
      corpus hop can only hand it to one row.

      NOTHING IS SHARED BETWEEN THE TWO ROWS, which is what this proves. Each stepless scenario
      raises its own obligation with its own ceiling; each measurement cites its own @SCN. So
      the fixture below is built to DISAGREE — one suite inside its ceiling and one over it —
      because two rows that agreed could not tell a per-@SCN reader from a per-tag one: both
      would produce the same report. A reader resolving the citation through the tag would hand
      one measurement to both rows and turn one of them into a report that is not about it.

      Given "ci-run-time" is a measured fitness check whose threshold for "SCN-MSD-001" is 75
      And "ci-run-time" also has a threshold of 150 for "SCN-MSD-002"
      And the corpus carries a stepless scenario "SCN-MSD-001" tagged with the bare check "ci-run-time"
      And the corpus carries a stepless scenario "SCN-MSD-002" tagged with the bare check "ci-run-time"
      And the timing artefact records a measurement of 42.1 for "ci-run-time" on "SCN-MSD-001"
      And the timing artefact also records a measurement of 181.7 for "ci-run-time" on "SCN-MSD-002"
      When the corpus and the measurements are reconciled
      Then the row "SCN-MSD-001" reconciles satisfied on the measured check "ci-run-time"
      And the row "SCN-MSD-002" reconciles failing on the measured check "ci-run-time"

  Rule: a measured reconciling item renders on the Ledger

    ON THE LEDGER, NOT BESIDE IT. The whole point of the citation is that the measurement
    posts somewhere, and a posting nobody renders is a posting nobody reads. A measured row
    appears in both renderings — the markdown a person reads and the JSON a machine consumes
    — and an out-of-balance one carries the two numbers, because "the suite is over its
    ceiling" is not actionable and "96.4 against 75" is.

    THE UN-CEILINGED ROW SAYS SO IN WORDS. Rendered as a blank a reader has to interpret, or
    as a zero, the fault @SCN-CIP-002 makes loud on the data would go quiet again on the page
    — and a zero would read as a ceiling of zero, which is a different and much louder claim
    than nobody having set one.

    @unit @integration @SCN-CIP-008
    Scenario: a failing measured row renders in the markdown report and in the JSON, carrying its measurement against its threshold
      Given "ci-run-time" is a measured fitness check whose threshold for "SCN-MSD-001" is 75
      And the corpus carries a stepless scenario "SCN-MSD-001" tagged with the bare check "ci-run-time"
      And the timing artefact records a measurement of 96.4 for "ci-run-time" on "SCN-MSD-001"
      When the corpus and the measurements are reconciled and rendered
      Then the markdown names the check "ci-run-time" with its measurement 96.4 and its threshold 75
      And the JSON carries the measurement and the threshold on the row's own entries
