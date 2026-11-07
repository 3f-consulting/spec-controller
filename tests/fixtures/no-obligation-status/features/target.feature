@NOS
Feature: a fixture target whose tests cite a scenario at a check it holds no obligation for, one failing and one passing

  A fixture standing in for a target whose unit tests cite a scenario that asks only for
  integration evidence: both tests post to that scenario's row as observations no
  obligation asks for. One of them failed and one passed, and the report must not show
  them alike.

  Rule: the fixture target names one integration-level scenario

    @integration @CLM-NOS-001
    Scenario: the target names an integration-level scenario
      Given the target repo's source
