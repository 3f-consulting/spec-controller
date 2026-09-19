@TGT
Feature: a target whose one scenario is cited from two test files

  A FIXTURE feature (NOT under features/) for the evidence-order scenario (3F-3495). Its one scenario is cited by two unit
  test files and one feature file, so the order a runner lists its files in can show in the row.

  Rule: the fixture target names one scenario at two levels

    @unit @integration @SCN-TGT-001
    Scenario: the target names a scenario proven at two levels
      Given the target repo's source
