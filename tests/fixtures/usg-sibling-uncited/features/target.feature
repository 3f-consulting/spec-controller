@TGU
Feature: a fixture target whose uncited fitness function runs in a sibling workflow

  A FIXTURE target (NOT under features/) standing in for the case a check ARRIVES as:
  added to package.json and to a nightly workflow, cited by no scenario, passing green
  and off the books. ci.yml runs the suites only; nightly.yml runs lint:sweep; nothing
  in this corpus carries lint:sweep's check tag.

  THE HANDLE ANSWERS NO CONFIGURED ROW AND NO SCENARIO CARRIES ITS TAG, which is what leaves it
  uncited: no `specController.fitnessChecks` row names sweep's scenario and no CI step
  states a row's code, so the seam that would resolve a citation has nothing to resolve. This
  manifest once also carried a `checkRegistry` entry making the same claim over the now-retired
  registry route (3F-3395); it changed nothing observable then either, since nothing in the
  corpus below ever carried the tag it would have resolved.

  The mirror of the usg-sibling fixture, and kept separate from it: that one's check IS
  cited, so it reconciles balanced, and adding an uncited check to it would fold a
  suspense row onto a target asserted to exit 0.

  Since 3F-2306 the uncited verdict reds a build, which is what makes this the
  interesting direction — moving a check into a sibling workflow would otherwise be a
  way to make a red go away without fixing anything.

  Rule: a rule nothing cites

    @unit @SCN-TGU-001
    Scenario: the target behaves
      Given the target source
