@TOP
Feature: a fixture target whose check step runs its integration runner and pipes what it prints

  A FIXTURE target (NOT under features/). Two steps run cucumber-js as a whole token:

    Cucumber                  pnpm cucumber                                   -> the suite, via the manifest
    Unused step definitions   pnpm exec cucumber-js --dry-run ... | jq | awk  -> a gate on the runner's output

  The second is the shape of a gate that lists what the runner would do and lets a filter pass
  the verdict. It is cited by nothing, so it reaches the static axis as an uncited check. The
  first is the control: a reader that recognised no runner at all would put the gate on the books
  too, and only the suite step still named the runner shows the rule discriminates.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TOP-001
    Scenario: the target source is exercised
      Given the target source
