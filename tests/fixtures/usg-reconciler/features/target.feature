@TRC
Feature: a fixture target whose own pipeline runs the reconciliation

  A FIXTURE target (NOT under features/) standing in for a consumer who has adopted this tool and
  put it in their pipeline. Its CI runs three checks by today's reading: a sweep, a step-record
  dump, and the reconciliation itself. Its manifest says NOTHING about any of them — there is no
  specController block in it at all.

  THAT EMPTINESS IS THE FIXTURE'S WHOLE POINT. A pair of notChecks entries would produce the same
  report over the same pipeline, so a target carrying them could not tell the two answers apart.
  This one has written nothing, which is the state every consumer's first run is in, and it is the
  only state in which "excluded by construction" and "excluded by configuration" differ.

  BOTH RECONCILER STEPS ARE DISCOVERABLE BY TODAY'S PREFIX RULE, for the reason the usg-not-checks
  fixture's are: only a lint:-prefixed script a CI run: step invokes reaches the books right now,
  so a reconciler the current reader never saw could not be watched leaving them.

  THE SWEEP CHECK IS THE CONTROL. A reader that discovered nothing at all would satisfy "the
  reconciler is off the books" while being blind, so an ordinary check has to stay on them — same
  prefix, same job, nothing said about it anywhere.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TRC-001
    Scenario: the target source is exercised
      Given the target source
