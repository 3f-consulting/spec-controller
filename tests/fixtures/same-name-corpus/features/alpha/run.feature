@SNA
Feature: a feature file sharing its name with another in a sibling subdirectory

  A FIXTURE feature (NOT under features/). A file of the same name sits in beta/,
  and each carries a scenario of the same title with no claim code, so only the
  path under the corpus tells the two apart.

  Rule: the alpha file names one proven scenario and one untagged scenario

    @unit @CLM-SNA-001
    Scenario: the alpha file's scenario is proven
      Given the target repo's source

    Scenario: the run has no claim code
      Given the target repo's source
