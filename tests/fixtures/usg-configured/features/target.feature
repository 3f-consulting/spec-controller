@TGZ
Feature: a fixture target configuring a static check its scenarios never cite

  A FIXTURE target (NOT under features/) standing in for the case 3F-2495 exists to
  close: a codebase whose CI runs `pnpm typecheck` — static analysis by any reading,
  reds the build on a violation — under a name carrying neither observed prefix, with
  NOTHING in its corpus citing it.

  The target CONFIGURES it (specController.staticChecks), so the discovery direction can
  see it at all; nothing CITES it, so it is the uncited static check. That pairing is
  the point: reaching a non-prefixed check has always worked through the obligation
  observer, and the gap was only ever in discovering one nobody took responsibility for.

  THE HANDLE IS REGISTERED AND STILL UNCITED, which is the shape only the one posting rule
  can produce and the reason this manifest carries a checkRegistry beside its staticChecks.
  specController maps typecheck to the bare check typecheck, so the seam can resolve a tag
  for the handle; nothing in the corpus below carries that tag, so it reaches no @SCN and
  the credit cites no scenario. Leaving the handle unregistered would report the same
  uncited check for a second reason — a handle nothing registers reaches nothing either —
  and this target would then go on passing under a reader that took every registered handle
  for an attributed one.

  THE ENTRY IS ALSO WHAT MAKES THE SECOND DOOR REACHABLE, and that is the half a sweep is most
  likely to read as decoration. There are two ways onto this axis: DISCOVERY, which reads CI
  through the prefix set and the staticChecks list above, and the REGISTRY, which is
  manifest-side and never reads CI at all. Over this target the two AGREE — nothing cites the
  check, so either door yields one uncited credit for the same handle — and the ingest edge's
  no-double-observe filter is what keeps a handle both doors reach from being counted twice.
  MEASURED rather than assumed: opening the registry door on its own changes nothing here,
  because that filter holds; opening it with the filter removed reports typecheck twice and
  reds the arm. Remove this entry and NEITHER plant can be planted — the double-count the arm
  is positioned to catch becomes unreachable rather than absent, which is the state a green
  board cannot tell from a guarded one.

  Two keys, two questions: staticChecks says WHICH scripts are checks here, checkRegistry says
  WHAT bare tag names this one.

  The mirror of the usg-guard fixture one convention over: that one's uncited check is
  found by its `guard:` prefix, this one's is found because the target said so.

  Rule: a rule with no static-check tag

    @unit @SCN-TGZ-001
    Scenario: the target source is exercised
      Given the target source
