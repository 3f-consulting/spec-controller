@INR
Feature: a claim code tagged on a Rule

  A FIXTURE feature (NOT under features/). The one scenario carries no claim code of
  its own, and inherits its Rule's.

  @unit @CLM-INR-001
  Rule: the rule carries the claim code

    Scenario: the one scenario beneath it
      Given the target repo's source
