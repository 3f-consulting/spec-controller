@TGN
Feature: a fixture target that both configures and names the same static check

  A FIXTURE target (NOT under features/) standing in for the ordinary end state of
  3F-2495: `typecheck` is configured (specController.staticChecks) AND named by a
  scenario (@lint=typecheck) — which is exactly what spec-controller's own tree looks
  like once this slice lands.

  THE BOUNDARY THAT KEEPS THE CONFIGURATION HONEST. Both observers now see this check:
  the named-obligation one, which carries its authoritative exists / enforced detail,
  and the discovery one, which the configuration just widened. Counted twice, a named
  check acquires a phantom uncited twin and the run reds over a check that is fine.

  The mirror of usg-configured one file over: same script, same configuration, and the
  only difference is that a scenario names it. So the pair isolates the citation as
  the thing that moves the verdict.

  Rule: a rule guarded by typecheck

    @unit @lint=typecheck @SCN-TGN-001
    Scenario: typecheck rejects a violation
      Given the target source
