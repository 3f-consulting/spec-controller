@TGT
Feature: a fixture target carrying a mistyped tier tag

  A FIXTURE target (NOT under features/) standing in for a codebase whose @SCN scenario
  carries `@untit` — a typo for `@unit`. The scenario looks tiered to a reader and is
  not: the static check must red, name the tag, and name the tier it resembles. Never a
  real features/ scenario — a planted fixture only.

  Rule: a mistyped tier tag

    @untit @SCN-TGT-001
    Scenario: a scenario whose only tier-ish tag is a typo
      Given the target source
