@TGZ
Feature: a fixture target configuring a static check its scenarios never name

  A FIXTURE target (NOT under features/) standing in for the case 3F-2495 exists to
  close: a codebase whose CI runs `pnpm typecheck` — static analysis by any reading,
  reds the build on a violation — under a name carrying neither observed prefix, with
  NO scenario naming it.

  The target CONFIGURES it (specController.staticChecks), so the discovery direction can
  see it at all; nothing CITES it, so it is the uncited static check. That pairing is
  the point: naming a non-prefixed check has always worked through the obligation
  observer, and the gap was only ever in discovering one nobody named.

  The mirror of the usg-guard fixture one convention over: that one's uncited check is
  found by its `guard:` prefix, this one's is found because the target said so.

  Rule: a rule with no static-check tag

    @unit @SCN-TGZ-001
    Scenario: the target source is exercised
      Given the target source
