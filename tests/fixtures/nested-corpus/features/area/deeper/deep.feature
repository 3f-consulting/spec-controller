@NTC
Feature: a feature file two directories below the top of a nested fixture corpus

  A FIXTURE feature (NOT under features/), two subdirectories deep. One of its
  scenarios has no evidence, so the target is out of balance wherever this file
  is read from.

  Rule: the deep file names one satisfied and one unproven unit-level scenario

    @unit @CLM-NTC-001
    Scenario: the deep file's first scenario is proven
      Given the target repo's source

    @unit @CLM-NTC-002
    Scenario: the deep file's second scenario has no evidence
      Given the target repo's source
