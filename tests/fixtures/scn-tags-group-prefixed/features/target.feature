@TGT
Feature: a fixture target whose author spelled the group into the tag

  A FIXTURE target (NOT under features/) standing in for a codebase whose author wrote
  fitness=complexity where the flat set has only complexity. The SHIPPED corpus check —
  `spec-controller tags`, run from this directory the way a consumer runs it in their own
  tree — must red and name the bare tag that was meant. Never a real features/ scenario;
  a planted fixture only.

  EVERY SCENARIO HERE NAMES A TIER, deliberately. The grammar question is meant to be the
  whole of the fault in this tree, so a scenario that also owed something else would let a
  finding raised for the wrong reason still exit 1 and still name a tag.

  THE PACKAGE.JSON BESIDE THIS TREE CONFIGURES NOTHING, and that is the point of it rather
  than an omission. `spec-controller tags` resolves the deferral set — and, from 3F-3305,
  the check-tag union — off the manifest at its cwd, so a run from the repository root
  would resolve THIS repository's config while claiming to have read the fixture's. An
  empty manifest is what makes "means nothing HERE" a statement about this target.

  Rule: a check tag carrying its group

    @unit @fitness=complexity @SCN-TGT-001
    Scenario: a tiered scenario carrying a check tag with its group spelled in
      Given the target source

  Rule: the retired lint=<handle> form, which is the same fault in an older spelling

    THE SHAPE A READER WOULD MOST EXPECT TO BE EXCUSED. This tree once wrote its style-lint
    citations as lint=<handle>, and the form raises no Evidence Obligation any more
    (@SCN-LNT-007) — so admitting it as a tier would let this scenario look tiered while
    owing nothing. It is group-prefixed like any other, and no clause anywhere carves it
    out: dropped of its group, the message names what is left.

    @unit @lint=typecheck @SCN-TGT-002
    Scenario: a tiered scenario carrying the retired lint=<handle> form
      Given the target source
