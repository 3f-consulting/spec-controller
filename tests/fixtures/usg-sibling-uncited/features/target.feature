@TGU
Feature: a fixture target whose uncited static check runs in a sibling workflow

  A FIXTURE target (NOT under features/) standing in for the case a check ARRIVES as:
  added to package.json and to a nightly workflow, named by no scenario, passing green
  and off the books. ci.yml runs the suites only; nightly.yml runs lint:sweep; nothing
  in this corpus names lint:sweep.

  The mirror of the usg-sibling fixture, and kept separate from it: that one's check IS
  named, so it reconciles balanced, and adding an uncited check to it would fold a
  suspense row onto a target asserted to exit 0.

  Since 3F-2306 the uncited verdict reds a build, which is what makes this the
  interesting direction — moving a check into a sibling workflow would otherwise be a
  way to make a red go away without fixing anything.

  Rule: a rule nothing names

    @unit @SCN-TGU-001
    Scenario: the target behaves
      Given the target source
