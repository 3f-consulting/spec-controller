@INR
Feature: a scenario code tagged on a Rule

  A FIXTURE feature (NOT under features/). The one scenario carries no scenario code of
  its own, and inherits its Rule's.

  @unit @SCN-INR-001
  Rule: the rule carries the scenario code

    Scenario: the one scenario beneath it
      Given the target repo's source
