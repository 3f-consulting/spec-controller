@TGS
Feature: a fixture target whose static check runs in a sibling workflow

  A FIXTURE target (NOT under features/) standing in for a codebase that splits its
  pipeline: ci.yml runs the suites and no static check at all, while nightly.yml runs
  lint:nightly on a schedule — the ordinary layout a slow gate ends up in.

  The scenario NAMES that check (@lint=lint:nightly), so the whole point is that the
  named set and the running set agree once every workflow is read. Read ci.yml alone
  and they disagree, and the disagreement is scored against the target: lint:nightly
  reports as a watermelon, a real gate called fabricated.

  The workflows live under workflows/ rather than .github/workflows/ deliberately — the
  reader takes a DIRECTORY, not GitHub's layout, and a fixture that spelled the layout
  out would let a path convention harden into the tool unnoticed.

  Rule: a rule enforced nightly by lint:nightly

    @lint=lint:nightly @SCN-TGS-001
    Scenario: lint:nightly rejects a violation
      Given the target source
