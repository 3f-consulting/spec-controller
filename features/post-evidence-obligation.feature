@OBL
Feature: Evidence Obligations are raised, one for each kind of quality check

  Your project's feature files make claims. balance reads them and raises the Evidence Obligations
  each claim asks for. This is the debit side.

  First, balance finds the executable claims. A scenario is one executable claim, and so is each
  row of an Outline with a clm column. A scenario with a deferral tag, such as @wip, is not an
  executable claim.

  Next, balance raises an Evidence Obligation for each kind-of-check tag on the executable claim.
  A row of an Outline takes its Outline's tags. A tag such as @integrationpending is ignored, so
  it raises nothing. In a strict run, a deferral tag is ignored, and @integrationpending is read
  as @integration.

  Last, balance reads the claim's code. An executable claim has one claim code. With more than
  one, it raises its Evidence Obligations under none of them.

  Rule: an executable claim is a scenario, or a row of an Outline with a clm column

    @unit
    Scenario Outline: an Outline will be one executable claim for each row only when it has a clm column
      given a Scenario Outline had <shape>
      when balance reads the corpus
      then there will be <executable claims>

      Examples:
        | clm         | shape                                                     | executable claims                                  |
        | CLM-OBL-001 | two rows with the claim codes CLM-ONE-001 and CLM-ONE-002 | two executable claims, CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBL-002 | the tag @CLM-ONE-001 and no clm column                    | one executable claim, CLM-ONE-001                  |

  Rule: a scenario with a deferral tag is not an executable claim

    @unit
    Scenario Outline: each deferral tag, built in or configured, will remove the claim
      given a scenario tagged @unit also had <deferral tag>
      when balance reads the corpus
      then there will be no executable claim

      Examples:
        | clm         | deferral tag                           |
        | CLM-OBL-003 | @wip                                   |
        | CLM-OBL-004 | @ignore                                |
        | CLM-OBL-005 | @skip                                  |
        | CLM-OBL-006 | @todo                                  |
        | CLM-OBL-007 | @pending                               |
        | CLM-OBL-008 | @blocked, configured as a deferral tag |
        | CLM-OBL-025 | @wip, on the Feature                   |
        | CLM-OBL-026 | @wip, on the Rule it sits under        |

  Rule: an executable claim raises one Evidence Obligation for each kind-of-check tag that applies to it, and none without one

    @unit
    Scenario Outline: an executable claim will raise an Evidence Obligation for each kind-of-check tag that applies to it
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

  Rule: an executable claim raises its Evidence Obligations under the one claim code it has

    @unit
    Scenario Outline: an executable claim with no single claim code will raise its Evidence Obligations under none
      given an executable claim tagged @unit <code>
      when balance reads the corpus
      then <raised>

      Examples:
        | clm         | code                                                  | raised                                                            |
        | CLM-OBL-020 | was also tagged @CLM-ONE-001 and @CLM-ONE-002         | no Evidence Obligation will be raised under either code           |
        | CLM-OBL-021 | was a row whose clm cell was empty                    | a unit Evidence Obligation will be raised with no claim code      |
        | CLM-OBL-022 | was a row whose clm cell read "first"                 | a unit Evidence Obligation will be raised with no claim code      |
        | CLM-OBL-023 | was also tagged @CLM-A-001, which is not a claim code | a unit Evidence Obligation will be raised with no claim code      |
        | CLM-OBL-024 | was an Outline tagged @CLM-ONE-009 with a clm column  | no Evidence Obligation will be raised under its code or any row's |
