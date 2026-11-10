@ERC
Feature: an error a reader is shown has its error code

  Every error the tool shows a reader has an error code, so it can be quoted and looked up
  whatever its words.

  @CLM-MSG-010
  Scenario: an error will be shown with its error code
    Given a run had met a flag the command does not take
    When it shows that error
    Then it will show the error code unknown-flag, once
