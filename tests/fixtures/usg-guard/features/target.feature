@TGP
Feature: a fixture target whose CI runs a guard:-prefixed guard it never declares

  A FIXTURE target (NOT under features/) standing in for a codebase whose CI runs a
  guard:domain-purity guard (a guard:* script, not lint:*) but declares NO @lint at all —
  an adopter's repository-shaped case. So the derived CI guard-set is {guard:domain-purity}, the declared
  set is {}, and guard:domain-purity is the uncited static-check. `test` / `cucumber`
  run in CI but are neither lint:* nor guard:* → never derived as guards.

  Rule: a rule with no static-check declaration

    @unit @SCN-TGP-001
    Scenario: the target source is exercised
      Given the target source
