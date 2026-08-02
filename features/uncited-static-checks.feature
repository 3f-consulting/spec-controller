@USG
Feature: Detect uncited static-checks — a CI guard no @lint declares

  The static-check (@lint) axis's UNCITED detection — the mirror of the
  runtime axis's cites-no-scenario evidence observations. The @lint axis was declared→observed only
  (checkStaticEvidenceObligations observes each DECLARED @lint=<guard>), structurally blind to the reverse:
  a guard that runs in CI with NOTHING declaring it — an unposted credit.

  The running-guard observer emits every running CI guard (the lint:* scripts a CI run: step
  invokes — runningStaticChecks) into the reconcile stream, so the ONE reconcile engine sees the
  complete static stream: a named guard matches its @lint obligation; an undemanded one — a
  guard that runs in CI with NO @lint declaring it — cites no scenario, so reconcile folds it to
  the suspense row (an UNCITED static-check). The report's static census is a pure counter
  over the stream (countStaticEvidenceObservationKinds → StaticEvidenceObservationKindCounts
  { runningStaticCheckCount, uncitedStaticCheckCount }; the named count is implicit, running −
  uncited, and the completeness invariant is asserted inside the counter), the static-axis
  mirror of RuntimeEvidenceObservationKindCounts. The report surfaces the counts under
  "### Static checks", mirroring "### Test volume"; the guard member detail lives in the rows. Only lint:* scripts are guards — install/checkout aren't
  scripts, and test/cucumber are the runtime axis's observed evidence (never double-counted);
  tsc deferred.

  The unit arm proves runningStaticChecks + countStaticEvidenceObservationKinds + the render section
  in isolation; the integration arm drives the real file reads (ci.yml + package.json + features)
  over a fixture target and asserts the rendered report surface.

  Rule: a CI check with no @lint scenario is reported as an uncited static check

    @unit @integration @SCN-USG-001
    Scenario: a CI check no @lint declares is reported as an uncited static check
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is declared by an @lint scenario
      When the reconciliation report is rendered for the target
      Then the Static checks section reports lint:bar as an uncited static check

  Rule: a check an @lint scenario declares is not reported as an uncited static check

    @unit @integration @SCN-USG-002
    Scenario: a check declared by an @lint scenario is attributed, not an uncited static check
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is declared by an @lint scenario
      When the reconciliation report is rendered for the target
      Then lint:foo is not reported as an uncited static check

  Rule: non-lint CI steps are not treated as static checks

    @unit @integration @SCN-USG-003
    Scenario: test and cucumber CI steps are not derived as static checks
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is declared by an @lint scenario
      When the reconciliation report is rendered for the target
      Then only lint:foo and lint:bar are counted as CI checks, not test or cucumber

  Rule: a guard:-prefixed CI script no @lint scenario declares is reported as an uncited static check

    @unit @integration @SCN-USG-004
    Scenario: an undeclared guard:-prefixed script running in CI is an uncited static check
      Given a target whose CI runs the guard:domain-purity script
      And no @lint scenario declares guard:domain-purity
      When the reconciliation report is rendered for the target
      Then the Static checks section reports guard:domain-purity as an uncited static check

  Rule: a guard:-prefixed CI script an @lint scenario declares is attributed, not uncited

    @unit @integration @SCN-USG-005
    Scenario: a declared guard:-prefixed script is attributed, not an uncited static check
      Given a target whose CI runs the guard:domain-purity script it declares
      And an @lint scenario declares guard:domain-purity
      When the reconciliation report is rendered for the target
      Then guard:domain-purity is not reported as an uncited static check
