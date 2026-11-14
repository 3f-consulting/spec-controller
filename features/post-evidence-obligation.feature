@OBL
Feature: Evidence Obligations are raised, one for each kind of quality check

  Your project's feature files make claims. balance reads them and raises the Evidence Obligations
  each claim asks for. This is the debit side.

  First, balance finds the executable claims, in every feature file in the feature corpus, at any
  depth, in path order. A scenario is one executable claim, and so is each row of an Outline with a
  clm column. A scenario with a deferral tag, such as @wip, on the scenario, its Rule or its Feature,
  is not an executable claim.

  Next, balance raises an Evidence Obligation for each kind-of-check tag on the executable claim.
  A row of an Outline takes its Outline's tags. A tag such as @integrationpending is ignored, so
  it raises nothing. In a strict run, a deferral tag is ignored, and @integrationpending is read
  as @integration.

  Last, balance reads the claim's code. An executable claim raises its Evidence Obligations under
  its claim code when it has exactly one. With two codes, an empty clm cell, or a claim code tagged
  on an Outline that also has a clm column, it raises them with no claim code.

  Rule: an executable claim is a scenario, or a row of an Outline with a clm column

    @unit
    Scenario Outline: an Outline will be one executable claim for each row only when it has a clm column
      given a Scenario Outline had <shape>
      when balance reads the corpus
      then there will be <executable claims>

      Examples:
        | clm         | shape                                                                                         | executable claims                                  |
        | CLM-OBL-001 | two rows with the claim codes CLM-ONE-001 and CLM-ONE-002                                     | two executable claims, CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBL-002 | the tag @CLM-ONE-001 and no clm column                                                        | one executable claim, CLM-ONE-001                  |
        | CLM-OBL-033 | an Examples block with CLM-ONE-001 in its clm column, and an Examples block with no table yet | one executable claim, CLM-ONE-001                  |

    @unit @CLM-OBL-031
    Scenario: balance reads a scenario after a Background as an executable claim
      given a feature file had a Background, and a scenario tagged @unit @CLM-ONE-001
      when balance reads the corpus
      then there will be one executable claim, CLM-ONE-001

    @unit @CLM-OBL-034
    Scenario: balance reads a scenario in a subfolder of the feature corpus as an executable claim
      given the feature corpus's one feature file was two folders down, at area/deeper/one.feature, with a scenario tagged @unit @CLM-ONE-001
      when balance reads the corpus
      then there will be one executable claim, CLM-ONE-001

    @unit @CLM-OBL-035
    Scenario: balance reads the feature corpus in path order
      given the feature corpus had b.feature and a/x.feature
      when balance reads the corpus
      then the executable claims of a/x.feature will come before those of b.feature

    @unit @CLM-OBL-032
    Scenario: a feature file with no Feature has no executable claims
      given a feature file was empty, or had only a comment
      when balance reads the corpus
      then there will be no executable claim

  Rule: a scenario with a deferral tag is not an executable claim

    @unit
    Scenario Outline: a deferral tag on the scenario, its Rule or its Feature will leave no executable claim
      given a scenario tagged @unit had <deferral tag> on <where>
      when balance reads the corpus
      then there will be no executable claim

      Examples:
        | clm         | deferral tag                           | where        |
        | CLM-OBL-003 | @wip                                   | the scenario |
        | CLM-OBL-008 | @blocked, configured as a deferral tag | the scenario |
        | CLM-OBL-025 | @wip                                   | its Feature  |
        | CLM-OBL-026 | @wip                                   | its Rule     |

  Rule: an executable claim raises one Evidence Obligation for each kind-of-check tag that applies to it, and none without one

    @unit
    Scenario Outline: the Evidence Obligations will follow the claim's kind-of-check tags
      given an executable claim with the code CLM-ONE-001 had <tags>
      when balance reads the corpus
      then its claim will raise <Evidence Obligations>

      Examples:
        | clm         | tags                                     | Evidence Obligations                          |
        | CLM-OBL-009 | @unit                                    | a unit Evidence Obligation                    |
        | CLM-OBL-010 | @unit @e2e                               | a unit and an e2e Evidence Obligation         |
        | CLM-OBL-011 | @unit @integration @e2e @performance     | four Evidence Obligations, one of each kind   |
        | CLM-OBL-012 | @fitness                                 | a fitness Evidence Obligation                 |
        | CLM-OBL-013 | no other tag                             | no Evidence Obligation                        |
        | CLM-OBL-014 | @unit @integrationpending                | a unit Evidence Obligation                    |
        | CLM-OBL-015 | @integrationpending                      | no Evidence Obligation                        |
        | CLM-OBL-016 | @unit and @integration, from its Outline | a unit and an integration Evidence Obligation |

  Rule: a strict run reads every claim as if nothing were put off

    @unit
    Scenario Outline: a strict run will raise the Evidence Obligations a deferral put off
      given a scenario with the code CLM-ONE-001 had <tags>
      when balance reads the corpus in a strict run
      then its claim will raise <Evidence Obligations>

      Examples:
        | clm         | tags                      | Evidence Obligations                          |
        | CLM-OBL-017 | @wip @unit                | a unit Evidence Obligation                    |
        | CLM-OBL-018 | @integrationpending       | an integration Evidence Obligation            |
        | CLM-OBL-019 | @unit @integrationpending | a unit and an integration Evidence Obligation |
        | CLM-OBL-027 | @unitpending              | a unit Evidence Obligation                    |
        | CLM-OBL-028 | @e2epending               | an e2e Evidence Obligation                    |
        | CLM-OBL-029 | @performancepending       | a performance Evidence Obligation             |
        | CLM-OBL-030 | @fitnesspending           | a fitness Evidence Obligation                 |

  Rule: an executable claim raises its Evidence Obligations under its claim code only when it has exactly one

    @unit
    Scenario Outline: an executable claim with no single claim code will raise its Evidence Obligations with no claim code
      given an executable claim tagged @unit had <codes>
      when balance reads the corpus
      then its unit Evidence Obligation will be raised with no claim code

      Examples:
        | clm         | codes                                                    |
        | CLM-OBL-020 | the tags @CLM-ONE-001 and @CLM-ONE-002                   |
        | CLM-OBL-021 | an empty clm cell                                        |
        | CLM-OBL-024 | a claim code tag on its Outline, which also has a clm column |
