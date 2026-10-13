@NTA
Feature: a feature file at the top level of a nested fixture corpus

  A FIXTURE feature (NOT under features/). Its siblings sit one and two
  directories below it, so a run that reads only the corpus's top level judges
  this file alone.

  Rule: the top-level file names one satisfied unit-level scenario

    @unit @SCN-NTA-001
    Scenario: the top-level file's scenario is proven
      Given the target repo's source
