@USG
Feature: Detect unattributed static-guards — a CI guard no @lint declares

  The static-guard (@lint) axis's UNATTRIBUTED detection — the mirror of the
  runtime axis's unattributed evidence observations. The @lint axis was declared→observed only
  (checkStaticEvidenceObligations observes each DECLARED @lint=<guard>), structurally blind to the reverse:
  a guard that runs in CI with NOTHING declaring it — an unposted credit.

  The running-guard observer emits every running CI guard (the lint:* scripts a CI run: step
  invokes — runningStaticGuards) into the reconcile stream, so the ONE reconcile engine sees the
  complete static stream: a demanded guard matches its @lint obligation; an undemanded one — a
  guard that runs in CI with NO @lint declaring it — cites no scenario, so reconcile folds it to
  the suspense row (an UNATTRIBUTED static-guard). The report's static census is a pure counter
  over the stream (countStaticEvidenceObservationKinds → StaticEvidenceObservationKindCounts
  { runningGuardCount, unattributedStaticGuardCount }; the demanded count is implicit, running −
  unattributed, and the completeness invariant is asserted inside the counter), the static-axis
  mirror of RuntimeEvidenceObservationKindCounts. The report surfaces the counts under
  "### Static guards", mirroring "### Test volume"; the guard member detail lives in the rows. Only lint:* scripts are guards — install/checkout aren't
  scripts, and test/cucumber are the runtime axis's observed evidence (never double-counted);
  tsc deferred.

  The unit arm proves runningStaticGuards + countStaticEvidenceObservationKinds + the render section
  in isolation; the integration arm drives the real file reads (ci.yml + package.json + features)
  over a fixture target and asserts the rendered report surface.

  Rule: a CI guard with no @lint scenario is reported as an unattributed static-guard

    @unit @integration @SCN-USG-001
    Scenario: a CI guard no @lint declares is reported as an unattributed static-guard
      Given a target whose CI runs the lint:foo and lint:bar guards
      And only lint:foo is declared by an @lint scenario
      When the reconciliation report is rendered for the target
      Then the Static guards section reports lint:bar as an unattributed static-guard

  Rule: a guard an @lint scenario declares is not reported as unattributed evidence observation

    @unit @integration @SCN-USG-002
    Scenario: a guard declared by an @lint scenario is attributed, not unattributed evidence observation
      Given a target whose CI runs the lint:foo and lint:bar guards
      And only lint:foo is declared by an @lint scenario
      When the reconciliation report is rendered for the target
      Then lint:foo is not reported as an unattributed static-guard

  Rule: non-lint CI steps are not treated as static guards

    @unit @integration @SCN-USG-003
    Scenario: test and cucumber CI steps are not derived as static guards
      Given a target whose CI runs the lint:foo and lint:bar guards
      And only lint:foo is declared by an @lint scenario
      When the reconciliation report is rendered for the target
      Then only lint:foo and lint:bar are counted as CI guards, not test or cucumber
