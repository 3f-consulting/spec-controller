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
  the @SCN of the fitness scenario that raises its obligation, exactly as a static
  check's does and exactly as a unit test's does. What differs is WHERE the citation comes
  from. A static check's run is a script handle, so its @SCN is resolved at observation time
  over two hops — handle to bare tag through the registry, bare tag to scenario through the
  corpus. A measurement has no handle to resolve: the thing that measures the suite is a
  producer the consumer runs around their own step, and canon puts the check-to-scenario
  mapping in that runner (double-entry-manifesto.md → Fitness Scenario, "the check-to-scenario
  mapping held by the runner, as @ci-run-time's is"). So the measurement ARRIVES already
  citing, and the two-hop seam is not consulted at all. What the engine reads is the artefact,
  whoever wrote it; this repository ships no such producer and runs none.

  WHICH IS WHY ONE TAG MAY NAME MANY SCENARIOS HERE — AND, NOW A REGISTRY ENTRY CAN SAY WHICH
  SCENARIO A CHECK CREDITS, ON THE STATIC AXIS TOO. Canon asks one thing of both: several
  checks of one characteristic are several stepless scenarios sharing the tag, told apart
  by @SCN. This axis could always do it,
  because a measured credit carries its own @SCN. The static axis could not, and said so: the
  corpus hop keeps first-in-corpus order and dropped the runners-up, so a shared bare check
  left the second reading missing, out loud. That was a fault on the seam as it
  then stood, correctly reported. The seams no longer disagree — the register holds the
  check-to-scenario join and each entry names the row its own run credits, so a static credit
  reaches its own scenario as a measured one always has. The debit is raised per scenario and
  always was, so nothing in the middle has to choose between two rows.

  THE THRESHOLD IS A CEILING, WHICH IS WHAT THE WORD MEANS HERE — a bar you stay under, never
  an allowance drawn down. A measurement at or under its threshold is satisfied and
  one over it is failing — the ordinary two-sided pair, no new outcome. A two-level
  trigger-and-gate reading (measured against an engineering anchor, with a variance band
  above it before anything reds) is a report a producer may print for a person, and it stays
  the producer's: an "over the anchor but not yet red" band would be an eleventh outcome, and
  the ledger has ten. What reaches the ledger is the failing threshold and the number.

  A FLOOR-SHAPED CHECK IS NOT IN SCOPE. A mutation score must be at LEAST its threshold,
  which is the comparison inverted; that is 3F-2509's to argue, and this slice deliberately
  builds the ceiling canon defines rather than a direction flag nothing yet asks for.

  WHY NO ENGINE SCENARIO RAISES A MEASURED OBLIGATION OF ITS OWN, AND IT IS NOT THAT THEY
  CARRY STEPS. The tag is the discriminator and the steps say nothing about it (3F-3115), so a
  stepped scenario carrying "ci-run-time" would owe that check exactly as a
  stepless one does. The reason those scenarios stay silent is that NONE OF THEM CARRIES THE
  TAG AT ALL: the checks and thresholds they name are fixture data, planted per scenario
  inside a corpus their step definitions build, under fixture @SCN ids no feature file
  carries. A check named inside a fixture is not a tag on the row that plants it — which is
  why every scenario here can spell "ci-run-time" out repeatedly without owing it once.

  AND THIS REPOSITORY POSTS THIS AXIS NO MEASUREMENT AT ALL. Its own two run-time claims were once
  the last Rule here — two stepless scenarios carrying the bare tag, one per suite — and left this
  file at 3F-3166. They are @SCN-FIT-012 and @SCN-FIT-013, authored in
  features/fitness-checks.feature beside their rows in specController.fitnessChecks, and they are
  STEP-OUTCOME rows: each bar is the limit its CI step runs the suite under, that step carries the
  row's @SCN as its `id:`, and the row names no `atMost`. A suite past its limit fails its step,
  and the ledger reads that outcome as it reads any converted check's. So nothing here times a
  suite, and no ci-run-time number is written for the engine below to read. The engine is
  unchanged by that: every scenario in this file is product, for a consumer who does post a number,
  and it still holds a measured row to the `atMost` authored on its debit and never to anything
  the credit brings.

  Rule: a fitness scenario tagged with a measured check raises an Evidence Obligation carrying its threshold, steps or none

    THE COMPATIBILITY PATH: the bare check tag is a supported legacy reading, retired by 3F-3161.

    WHAT THE DEBIT HAS TO HOLD, AND WHY IT CANNOT COME FROM THE CREDIT. A static check's
    obligation names its bare tag and nothing more, because the check itself decides pass
    from fail and the ledger reconciles what it decided. A measured check cannot work that
    way: if the measurement arrived carrying both the number AND the bar it was judged
    against, the runner would be grading its own homework and the ledger would be
    transcribing a verdict rather than reconciling one. Double entry requires the two sides
    to be independently sourced, so the threshold is authored on the DEBIT side and the
    measurement is only ever a number.

    ONE OBLIGATION, NAMED BY THE SAME RULES AS ANY OTHER. A measured check is a bare tag
    raised from the scenario that carries it — STEPS OR NONE, exactly as the static half is
    raised (3F-3115) — and owed once however many of a scenario's effective
    tags name it. Nothing about the debit rule is special-cased for it; what is new is that
    the obligation carries a number.

    WHICH MEANS THE MEASURED HALF NEVER HAD A DISCRIMINATOR OF ITS OWN TO LOSE. Steplessness
    was a proxy on both halves of one rule, so it went from both at once, and what a fitness
    scenario carrying a runnable example now keeps is the ceiling it was written to be held
    to rather than nothing at all.

    THE THRESHOLD IS KEYED BY @SCN, THEN BY CHECK. Keyed by the tag alone it could not
    express what canon asks of this axis — two scenarios sharing one characteristic with
    different ceilings — and flat under the @SCN it would re-open on the debit side the
    non-uniqueness the credit side closed: a scenario may carry two bare checks, so one @SCN
    can owe two obligations, and one number under it would answer for both.

    @unit @integration @SCN-CIP-001
    Scenario: a scenario tagged with a measured check raises one Evidence Obligation carrying its threshold, steps or none

      THE TWO ROWS ARE READ FROM ONE CORPUS AND HELD TO DIFFERENT CEILINGS, which is what makes
      the assertion sharp on both halves at once. Identical bars could not tell a reader keying
      the threshold by @SCN from one keying it by the tag — both would answer 75 twice — so the
      stepped row is given a ceiling of its own, and a reader that had kept the steps in the
      question answers nothing for it at all.

      Given "ci-run-time" is a measured fitness check whose threshold for "SCN-MSD-001" is 75
      And "ci-run-time" also has a threshold of 150 for "SCN-MSD-002"
      And the corpus carries a stepless scenario "SCN-MSD-001" tagged with the bare check "ci-run-time"
      And the corpus carries a STEPPED scenario "SCN-MSD-002" tagged with the same bare check "ci-run-time"
      When the measured corpus is read
      Then each of those scenarios raises exactly one Evidence Obligation, naming the measured check "ci-run-time"
      And each Evidence Obligation carries the threshold authored for its own scenario

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
      And the measurement artefact records a measurement of 12.5 for "ci-run-time" on "SCN-MSD-002"
      When the corpus and the measurements are reconciled
      Then the row "SCN-MSD-002" reconciles missing on the measured check "ci-run-time"
      And the obligation on row "SCN-MSD-002" names no threshold at all

  Rule: a measurement posts one Evidence Observation citing the @SCN its runner stamped

    THE NEW SOURCE. The measurement is neither a test result nor a fact about the tree, so it
    arrives from neither reader: whatever measures the step — a consumer's own timing wrapper,
    say — emits it, and the engine ingests that artefact as a third evidence stream. It carries what the ledger
    reconciles on — the @SCN naming the row, the bare check tag naming which of that row's
    obligations it answers, and the number — because a citation is not an address on its own
    and one scenario may owe more than one measured check.

    THE ARTEFACT IS READ TOLERANTLY, ROW BY ROW. A malformed row is dropped rather than
    thrown on, for the reason every input at this edge is: the run's job is to produce a
    verdict, and one bad row costing the whole verdict is loud nowhere, while a dropped
    measurement is loud on the ledger as the obligation it leaves unanswered.

    @unit @integration @SCN-CIP-003
    Scenario: a measurement in the measurement artefact posts one Evidence Observation citing its scenario and naming its check
      Given the measurement artefact records a measurement of 42.1 for "ci-run-time" on "SCN-MSD-001"
      And the measurement artefact also carries a row missing its check
      When the measurement artefact is ingested
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
      And the measurement artefact records a measurement of 75 for "ci-run-time" on "SCN-MSD-001"
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
      And the measurement artefact records a measurement of 96.4 for "ci-run-time" on "SCN-MSD-001"
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
      And no measurement artefact was produced at all
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
      And the measurement artefact records a measurement of 42.1 for "ci-run-time" on "SCN-MSD-001"
      And the measurement artefact also records a measurement of 181.7 for "ci-run-time" on "SCN-MSD-002"
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
      And the measurement artefact records a measurement of 96.4 for "ci-run-time" on "SCN-MSD-001"
      When the corpus and the measurements are reconciled and rendered
      Then the markdown names the check "ci-run-time" with its measurement 96.4 and its threshold 75
      And the JSON carries the measurement and the threshold on the row's own entries
