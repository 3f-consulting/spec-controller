@EVR
Feature: The Evidence Reconciliation states the run verdict, the totals, the step account and the provenance

  balance reconciles each executable claim against the test and CI evidence, and writes the
  Evidence Reconciliation: the Claim Reconciliations and the Summary over them. spec-controller is a reconciliation
  engine, not a spec engine.

  A run verdict is what the whole run comes to: balanced, out of balance, or not reconciled. A run
  is not reconciled when balance cannot rely on what it read, and the verdict names why: unsound, when some
  evidence never ran; claim code errors, when a code is misfiled; or nothing to reconcile, when there
  are no Claim Reconciliations. A run that cannot reach a
  verdict gives none.

  Rule: a run is balanced only when all its Claim Reconciliations are

    Scenario Outline: the run will be balanced or out of balance, as its Claim Reconciliations call for
      Given a run had <what it has>
      When balance reconciles it
      Then the run verdict will be <run verdict>

      Examples:
        | clm         | what it has                                               | run verdict    |
        | CLM-CLI-005 | only balanced Claim Reconciliations                       | balanced       |
        | CLM-CLI-004 | a Claim Reconciliation out of balance                     | out of balance |
        | CLM-CLI-020 | no corpus, and Evidence Observations citing no claim code | out of balance |

  Rule: the run verdict says why balance could not reconcile a run

    Scenario Outline: the run will be not reconciled, naming why
      Given a run had <what it has>
      When balance reconciles it
      Then the run verdict will be not reconciled, because <why>

      Examples:
        | clm         | what it has                                                 | why                  |
        | CLM-CLI-012 | an Evidence Observation that never ran                      | unsound              |
        | CLM-CLI-NEW | a claim code error, and only balanced Claim Reconciliations | claim code errors    |
        | CLM-CLI-017 | no corpus directory, and no Evidence Observation            | nothing to reconcile |
        | CLM-CLI-NEW | an empty corpus directory, and no Evidence Observation      | nothing to reconcile |
        | CLM-CLI-019 | a corpus with no scenario, and no Evidence Observation      | nothing to reconcile |

    Scenario Outline: when several reasons apply, unsound comes first, then claim code errors, then nothing to reconcile, all before out of balance
      Given a run had <what it has>
      When balance reconciles it
      Then the run verdict will be not reconciled, because <why>

      Examples:
        | clm         | what it has                                                                        | why               |
        | CLM-CLI-NEW | an Evidence Observation that never ran and a Claim Reconciliation out of balance   | unsound           |
        | CLM-CLI-022 | an Evidence Observation that never ran and a claim code error                      | unsound           |
        | CLM-CLI-055 | a claim code error and a Claim Reconciliation out of balance                       | claim code errors |
        | CLM-STG-NEW | a corpus whose only scenario is tagged with two codes, and no Evidence Observation | claim code errors |

  Rule: the summary counts what was reconciled

    Scenario Outline: Total of the Claim Reconciliations
      Given a run had <what the run had>
      When balance reconciles it
      Then the totals will have <total> Claim Reconciliations, <balanced> balanced and <out of balance> out of balance

      Examples:
        | clm         | what the run had                                                   | total | balanced | out of balance |
        | CLM-RMD-005 | a claim with a passing unit test                                   | 1     | 1        | 0              |
        | CLM-RPT-NEW | a claim with a failing unit test                                   | 1     | 0        | 1              |
        | CLM-RPT-NEW | a claim with a passing unit test, and one with a failing unit test | 2     | 1        | 1              |
        | CLM-RMD-001 | a unit test citing no code                                         | 1     | 0        | 1              |

    Scenario Outline: Total of the Quality Check Reconciliations, by outcome
      Given a run had <what the run had>
      When balance reconciles it
      Then the totals will have <total> Quality Check Reconciliations, <out of balance> out of balance, <by reconciling outcome>

      Examples:
        | clm         | what the run had                                                | total | out of balance | by reconciling outcome              |
        | CLM-RPT-NEW | a claim with a passing unit test                                | 1     | 0              | none                                |
        | CLM-RMD-008 | a claim with a failing unit test and no integration test        | 2     | 2              | 1 failing and 1 missing integration |
        | CLM-RPT-019 | a scenario with no code                                         | 1     | 1              | 1 no-claim-code                     |
        | CLM-RPT-064 | two scenarios sharing @CLM-ONE-001, each asking for a unit test | 2     | 2              | 2 duplicate-claim-code              |

    Scenario Outline: Total of the Evidence Observations, by kind of quality check and by kind of claim
      Given a run had <what the run had>
      When balance reconciles it
      Then the totals will have <total> Evidence Observations, <by kind>, <by kind of claim>

      Examples:
        | clm         | what the run had                                                                        | total | by kind              | by kind of claim                                |
        | CLM-RMD-003 | a passing unit test citing a claim                                                      | 1     | 1 unit               | 1 on an executable claim                        |
        | CLM-RPT-010 | a unit test citing no code, and a fitness function citing a code on no executable claim | 2     | 1 unit and 1 fitness | 1 on the unnamed claim and 1 on a phantom claim |

    Scenario Outline: Total of the out-of-balance Claim Reconciliations, by feature
      Given a claim out of balance was <claim>
      When balance reconciles it
      Then the totals will have it <where>

      Examples:
        | clm         | claim                                                                | where                             |
        | CLM-RMD-006 | tagged @CLM-ONE-001, in one.feature tagged @ONE                      | on one.feature's row              |
        | CLM-RPT-032 | a scenario with no code, in one.feature tagged @ONE                  | on one.feature's row              |
        | CLM-RPT-031 | a scenario with no code, in three.feature, which has no feature code | on a row named three.feature      |
        | CLM-RPT-030 | the unnamed claim                                                    | in the total, on no feature's row |

    Scenario Outline: Total of the claim codes written where no claim reads them
      Given a feature file had <claim code>
      When balance reads the corpus
      Then the totals will have <excluded> excluded claim code occurrences

      Examples:
        | clm         | claim code                                   | excluded |
        | CLM-RPT-008 | @CLM-ONE-001 as a scenario's tag             | 0        |
        | CLM-RPT-NEW | @CLM-ONE-001 in a scenario's title           | 1        |
        | CLM-RPT-NEW | @CLM-ONE-001 in a comment                    | 1        |
        | CLM-RPT-NEW | @CLM-ONE-001 as a tag and again in a comment | 1        |
        | CLM-RPT-NEW | CLM-ONE-001 in a clm column                  | 0        |

  Rule: balance accounts for every step it reads

    @CLM-USG-020
    Scenario: each job's counts will add up to the steps read in it
      Given a run had read the steps of two jobs
      When balance reconciles it
      Then each job will have a count of its runners, reconciler steps, non-checks, plumbing and candidates
      And those counts will add up to the steps read in that job

    @CLM-USG-018
    Scenario: the total will be the sum of the jobs
      Given a run had read the steps of two jobs
      When balance reconciles it
      Then the total of each count will be the sum over the jobs
      And the steps accounted for will equal the steps read

  Rule: only a fitness function that ran counts as run

    Scenario Outline: balance counts a fitness function as run only when its Evidence Observation ran
      Given a pipeline had <fitness function>
      When balance reconciles it
      Then it will <counted> among the fitness functions that ran

      Examples:
        | clm         | fitness function                                        | counted   |
        | CLM-LNT-033 | a fitness function that ran, whose failure does not fail its job | count     |
        | CLM-LNT-NEW | a fitness function whose Evidence Observation never ran | not count |
        | CLM-LNT-NEW | no step for a fitness function a claim asks for         | not count |

  Rule: the provenance says what the run used

    Scenario Outline: the provenance describes the run
      Given the run had <what it had>
      When balance reconciles it
      Then the provenance will include <details>

      Examples:
        | clm         | what it had                                                   | details                       |
        | CLM-RPT-001 | a target given as acme/web                                    | the target acme/web           |
        | CLM-RPT-003 | a source SHA given as abc1234, in a git repository at def5678 | the source SHA abc1234        |
        | CLM-RPT-NEW | no target given, and the origin https://ci:s3cret@example.com/acme/web?x=1#y | a target named from its host and path only, with no user, password, query or fragment |
        | CLM-RPT-026 | the tool running from its own checkout at 9f8e7d6             | the tool SHA 9f8e7d6          |
        | CLM-RPT-029 | the tool installed as a package, version 0.1.256              | no tool SHA, version 0.1.256  |
        | CLM-RPT-027 | a Cucumber evidence report given                              | that report, among the inputs |
        | CLM-RPT-028 | no Cucumber evidence report given                             | that report, named as absent  |
        | CLM-RPT-016 | an input at /work/acme/a.json, for a target at /work/acme     | that input as a.json          |
