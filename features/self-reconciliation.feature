@SLF
Feature: This repository reconciles itself as a consumer, from the package it installed

  This repository runs spec-controller over its own tree. For most of this file's history it did
  that from its own source, and the operator named the smell four times: it is the app judging
  itself from its own source, so a reconciler defect could suppress its own out-of-balance and the
  arbiter was the code under change.

  THE CURE IS NOT A BETTER WRAPPER, AND THAT IS THE WHOLE OF THE RULING (3F-3105). "The app judging
  itself from its own source" had been read four times as "make the wrapper spawn a published
  binary" — which keeps the wrapper and keeps the special case. A repository that reaches its own
  verdict by a route nobody else can take has not proved the route anybody else takes, and proving
  that route is the entire point of dogfooding. So there is no wrapper: a dependency, a `run:` step,
  and the verdict its exit code gives, exactly as an adopter runs it.

  ITS PRECEDENT IN THIS CORPUS IS @LAD AND @REL, which assert properties of this repository's own
  pipeline rather than of the product's behaviour. @REL states the discriminator this file inherits:
  a scenario that reads a manifest is reading the source of the artefact, while a scenario that runs
  the installed one is reading the artefact. Only the second stands where a consumer stands.

  NUMBERING RESUMES AT -007 AND THE GAP IS DELIBERATE. @SCN-SLF-001 and -002 asserted the wrapper's
  verdict and went with it (3F-3293); -003 was the ledger carrying a row asserting that the ledger
  balances (3F-3113); -004, -005 and -006 were the fitness row bank (3F-3287). @SCN codes are
  append-only, so the retired six are never reclaimed.

  Rule: the artefact that reaches the verdict is not the tree it is judging

    A consumer pins spec-controller, then moves their own tree ahead of the pin — a new flag, a new
    manifest key. The pinned reader is handed argv it was published too early to understand, and
    what it says then is the difference between a reader who bumps the pin in a minute and one who
    hunts a typo that is not there. The refusal names the version doing the refusing, so version
    skew is legible from the CI log alone, while a genuine typo still reads as the usage fault it
    is — the exit status does not move.

    @integration @SCN-SLF-008
    Scenario: a pinned reader that cannot accept this tree's argv refuses by name, rather than reporting a usage fault or a verdict
      Given a consumer runs a spec-controller pinned to a version that does not match the tree it is reading
      When that reader is handed a flag its own version does not accept
      Then the refusal names the version that refused it, the flag, and the bump that cures it
      And the run exits with the usage status, not a reconciliation verdict

    @unit @integration @SCN-SLF-009
    Scenario: the bootstrap artefact is pinned to one exact published version, and a floating specifier reds
      A pin is the single declaration of which reader judges this tree, so it has to be one exact
      published version and nothing looser. `latest` would hand a stranger's publish the power to
      red this build, and a range would do the same on a narrower day. The reader that runs is then
      proved to be that one from the report's OWN provenance rather than from the manifest that
      asked for it — an installed package is not a git checkout, and says so.

      Given this repository declares the spec-controller it reconciles itself with
      When the declaration is read
      Then it names one exact published version, and a range, a dist-tag or a wildcard each red
      And the reader that reaches the verdict resolves from the installed package, not from this repository's own source

    @unit @integration @SCN-SLF-007
    Scenario: a defect planted in the working tree's reconciler leaves the gate's verdict untouched, and the same defect planted in the resolved artefact changes it
      This is the whole claim, made mechanical. Everything else in this file describes the
      arrangement; this asks whether the arrangement actually holds — whether the code under change
      can still reach the verdict that judges it.

      ONE ARM ALONE PROVES NOTHING, AND THE MISSING ONE IS ALWAYS THE CONTROL. "The plant changed
      nothing" is exactly what a plant that reached nothing also says: a defect in an unread branch,
      a typo that never compiled, a file nothing imports. So the same defect is put to a reader run
      from that source, and it must move THAT verdict. Only the pair means anything.

      Given a fixture corpus whose reconciliation the gate reports out-of-balance
      When the verdict function in this repository's own source is made to always balance
      Then a reader run from that source changes its verdict, so the defect is known to be live
      And the gate's own verdict does not move
      And the same defect planted in the resolved artefact does move the gate's verdict
