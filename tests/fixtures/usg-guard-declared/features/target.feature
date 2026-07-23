@TGD
Feature: a fixture target declaring the guard:-prefixed guard its CI runs

  A FIXTURE target (NOT under features/) standing in for a codebase whose CI runs a
  guard:domain-purity guard (a guard:* script, not lint:*) AND declares @lint on it
  (@lint=guard:domain-purity) — the USG-004 mirror keeping the guard:* broadening honest.
  So the derived CI guard-set is {guard:domain-purity}, the declared set is
  {guard:domain-purity}, and guard:domain-purity is attributed to its @lint scenario — NOT
  an uncited static-guard, and counted exactly once. `test` / `cucumber` run in CI but
  are neither lint:* nor guard:* → never derived as guards.

  Rule: a rule guarded live by guard:domain-purity

    @unit @lint=guard:domain-purity @SCN-TGD-001
    Scenario: guard:domain-purity rejects a violation
      Given the target source
