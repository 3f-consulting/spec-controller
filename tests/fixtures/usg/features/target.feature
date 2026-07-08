@TGT
Feature: a fixture target declaring one of its two lint guards

  A FIXTURE target (NOT under features/) standing in for a codebase whose CI runs two
  lint guards (lint:foo + lint:bar) but declares @lint on only one (lint:foo). So the
  derived CI guard-set is {lint:bar, lint:foo}, the declared set is {lint:foo}, and
  lint:bar is the unattributed static-guard. `test` / `cucumber` run in CI but are not
  lint:* → never derived as guards.

  Rule: a rule guarded live by lint:foo

    @unit @lint=lint:foo @SCN-TGT-001
    Scenario: lint:foo rejects a violation
      Given the target source
