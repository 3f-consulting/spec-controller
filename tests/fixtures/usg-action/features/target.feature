@TAC
Feature: a fixture target whose CI runs a quality check as an action

  A FIXTURE target (NOT under features/) standing in for a pipeline whose static analysis is an
  action rather than a command. Its CI runs github/codeql-action/analyze@v3 and one ordinary
  command check, and neither is cited anywhere below.

  THE ACTION IS THE SUBJECT. It invokes no script of this target's, so nothing about a package.json
  name can reach it and no handle can be read out of its command — it has none. What puts it on the
  books is that it is a step of the pipeline that is not a runner this manifest named, not the
  reconciler, and not a step this manifest names a non-check. What names it on them is the action
  reference itself, which is what GitHub shows for a step carrying no name: of its own.

  ITS HANDLE IS REGISTERED BY NOTHING, and that is the consumer this scenario is about rather than
  an omission. A pipeline whose analysis is CodeQL arrives having configured nothing at all, and
  the first run it gets has to say the action ran and nothing cites it. Registering it here would
  answer a question about the registry instead.

  THE COMMAND CHECK IS THE CONTROL, and it is registered-and-uncarried so that it reaches the
  suspense row for the one reason the posting rule allows: specController maps domain-purity to the
  bare check domain-purity, and no scenario below carries that tag. Without a second check still on
  the books, "the action is an uncited check" is satisfied by a reader that discovered nothing —
  and a reader that had traded its run: steps for uses: steps would satisfy it too.

  NO RUNNER AND NO PLUMBING, so the count is exactly two. This target names no behavioural runner
  because its pipeline runs no suite, which is a supported state and not a gap.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TAC-001
    Scenario: the target source is exercised
      Given the target source
