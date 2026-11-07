@TPN
Feature: The command ships a licence notice for every package its bundle carries

  The command's build writes one licence notice for each package its bundle carries, headed by the package's name, its version when it is installed, and the licence it declares. The build fails rather than write a notice it cannot fill truthfully.

  Rule: the command's build refuses a notice it cannot fill from a bundled package's manifest

    @unit @CLM-TPN-001
    Scenario: building the command fails, naming the package and the field, when a bundled package's manifest gives an empty or missing name or version, or a licence that is empty or not text

    @unit @CLM-TPN-002
    Scenario: building the command fails when the engine is not among the packages its bundle carries
