@USG
Feature: Detect uncited static-checks — a CI guard no @lint names

  The static-check (@lint) axis's UNCITED detection — the mirror of the
  runtime axis's cites-no-scenario evidence observations. The @lint axis was obligation→observation only
  (checkStaticEvidenceObligations observes each NAMED @lint=<guard>), structurally blind to the reverse:
  a guard that runs in CI with NOTHING naming it — an unposted credit.

  The running-guard observer emits every running CI guard (the lint:* scripts a CI run: step
  invokes — runningStaticChecks) into the reconcile stream, so the ONE reconcile engine sees the
  complete static stream: a named guard matches its @lint obligation; a no-evidence-obligation one — a
  guard that runs in CI with NO @lint naming it — cites no scenario, so reconcile folds it to
  the suspense row (an UNCITED static-check). The report's static census is a pure counter
  over the stream (countStaticEvidenceObservationKinds → StaticEvidenceObservationKindCounts
  { runningStaticCheckCount, uncitedStaticCheckCount }; the named count is implicit, running −
  uncited, and the completeness invariant is asserted inside the counter), the static-axis
  mirror of RuntimeEvidenceObservationKindCounts. The report surfaces the counts under
  "### Static checks", mirroring "### Test volume"; the guard member detail lives in the rows.

  WHICH SCRIPTS ARE STATIC CHECKS, AND WHY IT IS NOT A NAMING QUESTION (3F-2495). Membership is
  a PROPERTY of the check — does it analyse source without executing it and red the build on a
  violation — never a property of its name. The lint:/guard: prefixes and the target's own
  specController.staticChecks are two ways of DISCOVERING checks with that property; neither
  defines one. install/checkout are not scripts at all; test/cucumber are the runtime axis's
  observed evidence and are never double-counted here.

  This line used to end "tsc deferred", and that deferral outlived its reason: `tsc --noEmit`
  is static analysis on any reading, spec-controller ran it in CI throughout, and the report
  said 11 checks run over a tree running twelve. A deferral recorded only in a feature preamble
  is one nobody reads again — the arrangement scripts/verify.sh already carries two scars from.
  The scenario @SCN-API-002 now names typecheck, so it is on the books rather than in a
  sentence. (That line must not START with the @-token: Gherkin reads a leading @ as a tag
  line and reds with "A tag may not contain whitespace" — which is exactly what it did here.)

  `pnpm mutation` is still absent, and that is neither an oversight nor an exemption: it is a
  self-measuring threshold check — the pipeline measuring its own test strength — which belongs
  on an axis this tool has not built yet (3F-2509, the sibling of an adopter's repository's @ci-run-time). Ruling
  it "out of scope" is the dodge that feature file was written to reject.

  The unit arm proves runningStaticChecks + countStaticEvidenceObservationKinds + the render section
  in isolation; the integration arm drives the real file reads (ci.yml + package.json + features)
  over a fixture target and asserts the rendered report surface.

  Rule: a CI check with no @lint scenario is reported as an uncited static check

    @unit @integration @SCN-USG-001
    Scenario: a CI check no @lint names is reported as an uncited static check
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is named by an @lint scenario
      When the reconciliation report is rendered for the target
      Then the Static checks section reports lint:bar as an uncited static check

  Rule: a check an @lint scenario names is not reported as an uncited static check

    @integration @SCN-USG-002
    Scenario: a check named by an @lint scenario is attributed, not an uncited static check
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is named by an @lint scenario
      When the reconciliation report is rendered for the target
      Then lint:foo is not reported as an uncited static check

  Rule: non-lint CI steps are not treated as static checks

    @unit @integration @SCN-USG-003
    Scenario: test and cucumber CI steps are not derived as static checks
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is named by an @lint scenario
      When the reconciliation report is rendered for the target
      Then only lint:foo and lint:bar are counted as CI checks, not test or cucumber

  Rule: a guard:-prefixed CI script no @lint scenario names is reported as an uncited static check

    @unit @integration @SCN-USG-004
    Scenario: an uncited guard:-prefixed script running in CI is an uncited static check
      Given a target whose CI runs the guard:domain-purity script
      And no @lint scenario names guard:domain-purity
      When the reconciliation report is rendered for the target
      Then the Static checks section reports guard:domain-purity as an uncited static check

  Rule: a static check is observed wherever in the workflows it runs

    BOTH observers read a target's CI from ONE source. A check enforced from a sibling
    workflow — a nightly sweep, a security scan, an ordinary split of a pipeline — is
    therefore read as not enforced, and the two axes then fail it in OPPOSITE directions:
    a NAMED one is accused of being a watermelon it is not, an UNNAMED one leaves the
    books entirely.

    THE FIRST IS A FALSE ACCUSATION, which is why it leads. An omission under-reports;
    an invention tells a consultant their client's real, running gate is fabricated. The
    reconciler's word for a named-but-unenforced check is watermelon, and a check running
    in nightly.yml earns it today for no reason but where it was written down.

    The plural stops at SOURCES. ciRunCommands takes strings of CI config so a second
    ecosystem can supply its own; the walk from a directory to those strings is the
    ingest edge's, which already knows where GitHub keeps workflows and after this knows
    exactly the same amount.

    @unit @integration @SCN-USG-006
    Scenario: a named static check enforced from a sibling workflow is satisfied, not a watermelon
      Given a target whose ci.yml runs no static check and whose nightly.yml runs lint:nightly
      And an @lint scenario names lint:nightly
      When the reconciliation report is rendered over the target's workflow directory
      Then lint:nightly reconciles satisfied, with no watermelon raised against it

    @unit @integration @SCN-USG-007
    Scenario: an uncited static check running in a sibling workflow is reported uncited
      Given a target whose nightly.yml runs lint:sweep and whose ci.yml does not
      And no @lint scenario names lint:sweep
      When the reconciliation report is rendered over the target's workflow directory
      Then the Static checks section reports lint:sweep as an uncited static check

  Rule: an explicitly supplied CI file narrows observation to that file

    THE ANSWER TO WIDENING THE DEFAULT. Reading the whole workflow directory by default
    changes what an existing target's report says without its author asking for it, and
    the answer given was that the narrowing survives: name one file and you observe one
    file. An answer nobody tests is a promise.

    Every other scenario here asserts what IS found, so a change making an explicit
    input sweep its parent directory too would leave all of them green while silently
    widening a caller's deliberate scope — the direction that produces a surprise red on
    a client's tree. This is the arm that reds instead.

    @integration @SCN-USG-008
    Scenario: an explicitly supplied CI file narrows observation to that file alone
      Given a target whose nightly.yml runs lint:sweep and whose ci.yml does not
      When the reconciliation report is rendered for that target's ci.yml alone
      Then lint:sweep is not counted among the running static checks

  Rule: a guard:-prefixed CI script an @lint scenario names is attributed, not uncited

    @unit @integration @SCN-USG-005
    Scenario: a named guard:-prefixed script is attributed, not an uncited static check
      Given a target whose CI runs the guard:domain-purity script it names
      And an @lint scenario names guard:domain-purity
      When the reconciliation report is rendered for the target
      Then guard:domain-purity is not reported as an uncited static check

  Rule: a target can configure a script a static check, and the tool observes it on that axis

    THE PREFIX SET IS A DISCOVERY HEURISTIC, NOT A DEFINITION (3F-2495). Static-axis
    membership is a property of the check — does it analyse source without executing it —
    and `tsc --noEmit` has that property whatever its script is called. A check with the
    property and no recognised prefix is a FALSE NEGATIVE, not an exclusion.

    THE GAP IS ONLY IN THE DISCOVERY DIRECTION, which is narrower than it first looks.
    checkStaticEvidenceObligations — the named-obligation observer — never consulted the
    prefix set, so a scenario carrying @lint=typecheck has always reconciled satisfied.
    What has never worked is finding a non-prefixed check that NOBODY named: the
    unattributed static check this feature file exists to surface was invisible precisely
    when it was unattributed.

    RENAMING IS NOT THE REMEDY. A client's scripts are not ours to rename, so the tool has
    to be able to be TOLD. The configuration extends the discovery input; it never replaces
    the prefixes, and it buys no exemption — a configured check is uncited, and reds, on
    exactly the terms every other check is.

    THE MANIFEST IS STILL NOT THE SOURCE. A configured script CI does not run is not a gate,
    and would red every repository for owning a helper.

    THE CONFIGURATION BUYS NO EXEMPTION, which is what the second scenario holds. Its target
    differs from the first's in ONE character — the @lint tag on the fixture scenario — so
    the pair isolates the CITATION as the only thing moving the verdict. Widening discovery
    would otherwise be easy to implement as a privileged class: found, counted, and never
    asked for its attribution.

    Both scenarios are needed because each is the other's control. Alone, the first is
    satisfied by any change that reports every configured check uncited whether or not
    anything names it; alone, the second is satisfied by a tool that never reports
    anything uncited at all.

    @unit @integration @SCN-USG-009
    Scenario: a configured static check no scenario names is reported uncited, not invisible
      Given a target that configures typecheck a static check and runs it in CI
      And no @lint scenario names typecheck
      When the reconciliation report is rendered for the target
      Then the Static checks section reports typecheck as an uncited static check

    @unit @integration @SCN-USG-010
    Scenario: a configured static check a scenario names is attributed, not double-counted
      Given a target that configures typecheck a static check and names it
      When the reconciliation report is rendered for the target
      Then typecheck is counted once and attributed, not reported uncited
