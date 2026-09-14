@TCR
Feature: a fixture target whose manifest still registers a check through the retired registry

  Planted for @SCN-USG-021. This tree's package.json still configures
  `specController.checkRegistry`, mapping the CI step `lint:foo` to the bare check tag `foo` —
  the old, retired way of declaring a fitness check (3F-3161) — deliberately, so the arm proves
  the report NAMES the key rather than merely stopping reading it. Nothing here registers the
  check any longer: the pipeline runs `lint:foo`, the corpus carries a scenario tagged `foo` and
  nothing carried it to the other, because nothing reads the block joining them.

  THE BARE-TAGGED SCENARIO CARRIES NO @SCN, deliberately — a stepless fitness scenario under
  the retired route never needed one; the registry itself was the join. Left as it always was,
  it is what makes the third claim measurable: with no registry to resolve it, it reconciles
  like any other untagged scenario rather than like an answered obligation.

  @foo
  Scenario: the check the registry names is exercised
