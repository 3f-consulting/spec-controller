@SNB
Feature: a feature file sharing its name with another in a sibling subdirectory

  A FIXTURE feature (NOT under features/). A file of the same name sits in alpha/,
  and each carries a scenario of the same title with no scenario code, so only the
  path under the corpus tells the two apart.

  Rule: the beta file names one proven scenario and one untagged scenario

    @unit @SCN-SNB-001
    Scenario: the beta file's scenario is proven
      Given the target repo's source

    Scenario: the run has no scenario code
      Given the target repo's source
