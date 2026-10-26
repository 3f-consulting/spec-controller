@UNT
Feature: an untagged-scenario fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose Gherkin
  the untagged-scenario audit parses (@SCN-RPT-014). It carries a mix of
  `@SCN-tagged` and untagged scenarios so readEvidenceObligations's parse + file-pairing can
  be exercised over real files: the untagged ones surface in the report's Warnings.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see @UNT / @SCN-UNT-NNN.

  Rule: a mix of tagged and untagged scenarios

    @unit @SCN-UNT-001
    Scenario: a tagged scenario with an anchor
      Given the target repo's source

    Scenario: an untagged scenario with no anchor
      Given the target repo's source

    Scenario Outline: an untagged outline with no anchor
      Given the target repo's source for <case>
      Examples:
        | case |
        | one  |
