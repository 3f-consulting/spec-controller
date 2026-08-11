@TGN
Feature: a fixture target that both configures and cites the same static check

  A FIXTURE target (NOT under features/) standing in for the ordinary end state of 3F-2495:
  `typecheck` is configured (specController.staticChecks) AND cited — its own registry maps the
  handle to the bare check typecheck, and the stepless fitness scenario below carries that tag.
  So the seam resolves the handle to SCN-TGN-001 and the credit posts to that row rather than to
  suspense. `test` / `cucumber` run in this CI too, carry no check prefix and are registered
  nowhere, so they reach neither door onto this axis.

  ONE FACT APART FROM usg-configured, WHICH IS THE WHOLE OF WHY THE PAIR IS A CONTROL. That
  target configures the same script, runs it in the same CI, and registers the same handle to the
  same bare check; the only difference between the two is the tag on the scenario below. So
  nothing but the citation can move either verdict: a reader taking a registry entry for an
  attribution greens both, and one placing nothing reds both.

  THE BOUNDARY THAT KEEPS THE CONFIGURATION HONEST, and the reason this target and not its twin is
  where the double-count is caught. Both doors stand open over this handle — DISCOVERY finds
  typecheck because staticChecks says so, and the REGISTRY reaches it because the scenario carries
  the tag it resolves to — and here the two DISAGREE about where the credit lands, because only
  one of them carries the citation. The ingest edge's no-double-observe filter is what collapses
  them; remove it and this target reports two static checks run over a tree running one. Over
  usg-configured the same plant is inert, since neither door reaches a scenario there.

  THE HANDLE EQUALS ITS BARE TAG HERE, and that is deliberate rather than a fixture's convenience.
  typecheck registers to typecheck, which is the ordinary case for a script whose name already
  reads as its check, and it is the one case where a de-duplication keyed on the HANDLE would take
  the citing run for the non-citing one and post it twice to the row it had already reached. The
  seam keys on the citation instead, and this target is what can tell the two apart.

  THE @unit TAG BELOW IS DELIBERATE. It leaves this target owing a unit test no run supplies, so it
  reconciles OUT OF BALANCE and the CLI exits 1 — which is what the shared When step reads. Two
  axes on one stepless row is the shape @SCN-LNT-004 already models, so it costs the fitness
  reading nothing.

  Rule: the target holds itself to the typecheck check its CI runs

    @unit @typecheck @SCN-TGN-001
    Scenario: the tree stays inside the typecheck threshold
