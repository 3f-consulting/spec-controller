@ERC
Feature: an error a reader is shown has its error code

  Every error the tool shows a reader has an error code.

  @unit @CLM-ERC-001
  Scenario: an error will be shown with its error code
    given a command line had a flag the command does not take
    when it is read
    then it will show the error code unknown-flag, once
