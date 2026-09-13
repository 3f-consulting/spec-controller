@TNB
Feature: a fixture target that has configured nothing at all

  A FIXTURE target (NOT under features/) standing in for the consumer the free rung is sold to —
  one who installed the tool and did nothing else. Its specController block is present and empty:
  no runners, no non-checks, no static checks, no registry. Every step of its pipeline is therefore
  a candidate fitness check, and nothing cites any of them.

  THE BLOCK IS EMPTY RATHER THAN ABSENT, deliberately. An absent block and an empty one resolve to
  the same target — nothing was said either way — and the empty one is the shape the planted
  consumer in this axis's analysis had, so the fixture is the measured case rather than a tidier
  one beside it.

  ITS PIPELINE IS ORDINARY AND IS BOTH FORMS. Two plumbing actions, an install command, two checks
  whose script names match no convention of this tool's, the target's own unit suite, and one
  quality check that is an action. Nothing here is spelled the way the retired prefix rule wanted,
  which is why a reader keyed on names reports one of the seven or none.

  THE UNIT SUITE IS A CANDIDATE, AND THAT IS THE FIXTURE'S POINT rather than an oversight in it.
  This target names no runner, so pnpm test is a step like any other and lands on the books as one.
  It is a false positive, it is visible, and it is one line of this manifest away from being
  correct — which is the direction this axis chose and the direction the report can be read for.

  NO RECONCILER STEP. The reconciler and its dump come out by construction whatever a manifest says
  (@SCN-USG-014), so a pipeline running them here would let a claim about "every step" be satisfied
  or falsified by an exclusion this fixture is not about.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TNB-001
    Scenario: the target source is exercised
      Given the target source
