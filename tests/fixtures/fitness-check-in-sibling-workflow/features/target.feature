@TGS
Feature: a fixture target whose fitness function runs in a sibling workflow

  A FIXTURE target (NOT under features/) standing in for a codebase that splits its
  pipeline: ci.yml runs the suites and no fitness function at all, while nightly.yml runs
  lint:nightly on a schedule — the ordinary layout a slow gate ends up in.

  The target CITES that check: the lint:nightly step in nightly.yml carries the code of its
  `@fitness` scenario as its own `id:`. So the running-check observer reads the citation
  directly off the step, under the claim code the row names rather than the
  handle that ran. The point is that the cited set and the running set agree once every
  workflow is read. Read ci.yml alone and they disagree, and the disagreement is scored
  against the target: lint:nightly reports as a watermelon, a real gate called fabricated.

  THE STEP IS CODED DELIBERATELY. Leaving it at cites-no-scenario would take the citation away for a
  second reason — a step naming no scenario reaches nothing either — and the target could
  then go on passing under a reader that never asked whether anything CITED the check.
  Coding it leaves the workflow split as the only thing this scenario turns on.

  NO TAG FOR A LAYER ON THE ROW, WHICH IS WHAT KEEPS THIS TARGET BALANCED. Every other @USG fixture
  is deliberately out of balance and reads exit 1; this one is asserted to exit 0, so the
  scenario below raises nothing beyond its fitness Evidence Obligation — and nightly.yml is what settles
  that obligation. Adding a tag for a layer here would leave the target with an Evidence Obligation no run
  answers and quietly turn the exit-0 read into a second assertion about balance.

  The workflows live under workflows/ rather than .github/workflows/ deliberately — the
  reader takes a DIRECTORY, not GitHub's layout, and a fixture that spelled the layout
  out would let a path convention harden into the tool unnoticed.

  Rule: the target holds itself to the nightly check its CI runs

    @fitness @CLM-TGS-001
    Scenario: the tree stays inside the nightly threshold
