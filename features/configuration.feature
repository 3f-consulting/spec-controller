@CFG
Feature: balance reads the specController block of the target's package.json

  The specController block in the target's package.json names its test runners, the steps that are not checks, and extra deferral tags. This feature states how balance reads it.

  Rule: the runner block is keyed by the four tiers and no other

    The tiers are unit, integration, e2e and performance. Any other key is named on the report,
    excludes nothing, and does not stop the run. A check whose script that key names is still
    reported as a fitness function.

    @unit @SCN-CFG-003
    Scenario: a runners key that is not one of the four tiers is reported, never silently honoured

  Rule: a specController entry the tool cannot use is named on the report, and the run is not refused over it

    An entry of the wrong kind is read as absent. The report names where it is, the kind it is and
    the kind that is read there; every other entry takes effect as it would without it.

    A key the block does not read, a retired key included, is named as unknown in the same words as
    any other. A saved run, re-rendered, names the same entries its live report named.

    @unit @SCN-CFG-004
    Scenario Outline: a specController entry of a kind its reader does not take is named on the report with the kind it is and the kind that is read, and every other entry takes effect as without it

    @unit @SCN-CFG-005
    Scenario Outline: a key the specController block does not read, a retired one included, is named on the report as unknown in the same words as any other, and the run is not refused over it

    @unit @SCN-CFG-006
    Scenario Outline: a specController block whose every entry is a kind its reader takes names nothing as the wrong kind

    @unit @SCN-CFG-007
    Scenario: a saved run re-rendered names the same specController entries its live report named
