@EVR
Feature: The Evidence Reconciliation states the run verdict, the totals, the step account and the provenance

  balance reconciles each executable claim against the test and CI evidence, and writes the
  Evidence Reconciliation: the Claim Reconciliations and the Summary over them.

  A run verdict is what the whole run comes to: balanced, out of balance, or not reconciled. A
  run is not reconciled when balance cannot rely on what it read, and the verdict names why:
  unsound, when some evidence never ran; claim code errors, when a claim code is misfiled; or
  nothing to reconcile, when there are no Claim Reconciliations. A run that cannot reach a
  verdict gives none.

  Rule: a run is balanced only when all its Claim Reconciliations are

    @unit
    Scenario Outline: the run will be balanced or out of balance, as its Claim Reconciliations call for
      given a run had <what it has>
      when balance reconciles it
      then the run verdict will be <run verdict>

      Examples:
        | clm         | what it has                                               | run verdict    |
        | CLM-EVR-001 | only balanced Claim Reconciliations                       | balanced       |
        | CLM-EVR-002 | a Claim Reconciliation out of balance                     | out of balance |
        | CLM-EVR-003 | no corpus, and Evidence Observations citing no claim code | out of balance |

  Rule: the run verdict says why balance could not reconcile a run

    @unit
    Scenario Outline: the run will be not reconciled, naming why
      given a run had <what it has>
      when balance reconciles it
      then the run verdict will be not reconciled, because <why>

      Examples:
        | clm         | what it has                                                 | why                  |
        | CLM-EVR-004 | an Evidence Observation that never ran                      | unsound              |
        | CLM-EVR-005 | a claim code error, and only balanced Claim Reconciliations | claim code errors    |
        | CLM-EVR-006 | no corpus directory, and no Evidence Observation            | nothing to reconcile |
        | CLM-EVR-007 | an empty corpus directory, and no Evidence Observation      | nothing to reconcile |
        | CLM-EVR-008 | a corpus with no scenario, and no Evidence Observation      | nothing to reconcile |

    @unit
    Scenario Outline: when several reasons apply, unsound comes first, then claim code errors, then nothing to reconcile, all before out of balance
      given a run had <what it has>
      when balance reconciles it
      then the run verdict will be not reconciled, because <why>

      Examples:
        | clm         | what it has                                                                        | why               |
        | CLM-EVR-009 | an Evidence Observation that never ran and a Claim Reconciliation out of balance   | unsound           |
        | CLM-EVR-010 | an Evidence Observation that never ran and a claim code error                      | unsound           |
        | CLM-EVR-011 | a claim code error and a Claim Reconciliation out of balance                       | claim code errors |
        | CLM-EVR-012 | a corpus whose only scenario is tagged with two codes, and no Evidence Observation | claim code errors |

  Rule: the summary counts what was reconciled

    @unit
    Scenario Outline: Total of the Claim Reconciliations
      given a run had <what the run had>
      when balance reconciles it
      then the totals will have <total> Claim Reconciliations, <balanced> balanced and <out of balance> out of balance

      Examples:
        | clm         | what the run had                                                   | total | balanced | out of balance |
        | CLM-EVR-013 | a claim with a passing unit test                                   | 1     | 1        | 0              |
        | CLM-EVR-014 | a claim with a failing unit test                                   | 1     | 0        | 1              |
        | CLM-EVR-015 | a claim with a passing unit test, and one with a failing unit test | 2     | 1        | 1              |
        | CLM-EVR-016 | a unit test citing no code                                         | 1     | 0        | 1              |

    @unit
    Scenario Outline: Total of the Quality Check Reconciliations, by kind of quality check and outcome
      given a run had <what the run had>
      when balance reconciles it
      then the totals will have, for <kind>, <obligations> Evidence Obligations, <observations> Evidence Observations and <by outcome>

      Examples:
        | clm         | what the run had                                                                                | kind        | obligations | observations | by outcome                  |
        | CLM-EVR-017 | a claim asking for a unit test, and a passing unit test citing it                               | unit        | 1           | 1            | 1 satisfied                 |
        | CLM-EVR-054 | a claim asking for a unit test, and two passing unit tests citing it                            | unit        | 1           | 2            | 2 satisfied                 |
        | CLM-EVR-018 | a claim asking for a unit test, and a failing unit test citing it                               | unit        | 1           | 1            | 1 failing                   |
        | CLM-EVR-055 | a claim asking for an integration test, and no integration test citing it                       | integration | 1           | 0            | 1 missing                   |
        | CLM-EVR-056 | a claim asking for a unit test, and a unit test citing it that never ran                        | unit        | 1           | 1            | 1 missing and 1 never-ran   |
        | CLM-EVR-057 | a claim asking for a unit test, a passing unit test citing it, and one citing it that never ran | unit        | 1           | 2            | 1 satisfied and 1 never-ran |
        | CLM-EVR-058 | a claim asking for a fitness function, and its step passing                                     | fitness     | 1           | 1            | 1 satisfied                 |
        | CLM-EVR-059 | a claim asking for a fitness function, and its step passing where its failure is allowed        | fitness     | 1           | 1            | 1 cannot-fail               |
        | CLM-EVR-060 | a claim asking for a fitness function, and its step skipped                                     | fitness     | 1           | 1            | 1 missing and 1 never-ran   |
        | CLM-EVR-061 | a claim asking for a fitness function, and no step for it                                       | fitness     | 1           | 0            | 1 missing                   |
        | CLM-EVR-019 | a scenario with no code, asking for a unit test                                                 | unit        | 1           | 0            | 1 no-claim-code             |
        | CLM-EVR-020 | two scenarios sharing @CLM-ONE-001, each asking for a unit test                                 | unit        | 2           | 0            | 2 duplicate-claim-code      |
        | CLM-EVR-021 | a claim asking only for an e2e test, and a passing unit test citing it                          | unit        | 0           | 1            | 1 not-asked-for             |
        | CLM-EVR-022 | a passing fitness function citing a code no claim has                                           | fitness     | 0           | 1            | 1 cites-unknown-claim       |
        | CLM-EVR-062 | a passing unit test citing no code                                                              | unit        | 0           | 1            | 1 cites-no-claim            |
        | CLM-EVR-063 | a scenario with a code and no kind-of-check tag                                                 | no kind     | 0           | 0            | 1 no-quality-check          |
        | CLM-EVR-064 | a scenario with no code and no kind-of-check tag                                                | no kind     | 0           | 0            | 1 no-claim-code             |

    @unit @CLM-EVR-065
    Scenario: Total of every kind, as the All row
      given a run had a claim asking for a unit test with a passing unit test citing it, and a scenario with a code and no kind-of-check tag
      when balance reconciles it
      then the totals will have, for all kinds, 1 Evidence Obligation, 1 Evidence Observation, 1 satisfied and 1 no-quality-check

    @unit
    Scenario Outline: Total of the Evidence Observations, by where they were filed
      given a run had <what the run had>
      when balance reconciles it
      then the totals will have <total> Evidence Observations, <by where filed>

      Examples:
        | clm         | what the run had                                                  | total | by where filed           |
        | CLM-EVR-066 | a claim asking for a unit test, and a passing unit test citing it | 1     | 1 on an executable claim |
        | CLM-EVR-067 | a passing unit test citing no code                                | 1     | 1 on the unnamed claim   |
        | CLM-EVR-068 | a passing unit test citing a code no claim has                    | 1     | 1 on a phantom claim     |
        | CLM-EVR-069 | a unit test citing a code no claim has, which never ran           | 1     | 1 on a phantom claim     |

    @unit
    Scenario Outline: Total of the out-of-balance Claim Reconciliations, by feature
      given a claim out of balance was <claim>
      when balance reconciles it
      then the totals will have it <where>

      Examples:
        | clm         | claim                                                                | where                             |
        | CLM-EVR-023 | tagged @CLM-ONE-001, in one.feature tagged @ONE                      | on one.feature's row              |
        | CLM-EVR-024 | a scenario with no code, in one.feature tagged @ONE                  | on one.feature's row              |
        | CLM-EVR-025 | a scenario with no code, in three.feature, which has no feature code | on a row named three.feature      |
        | CLM-EVR-026 | the unnamed claim                                                    | in the total, on no feature's row |

    @unit
    Scenario Outline: Total of the claim codes written where no claim reads them
      given a feature file had <claim code>
      when balance reads the corpus
      then the totals will have <excluded> excluded claim code occurrences

      Examples:
        | clm         | claim code                                      | excluded |
        | CLM-EVR-027 | @CLM-ONE-001 as a scenario's tag                | 0        |
        | CLM-EVR-028 | @CLM-ONE-001 in a scenario's title              | 1        |
        | CLM-EVR-029 | @CLM-ONE-001 in a comment                       | 1        |
        | CLM-EVR-030 | @CLM-ONE-001 as a tag and again in a comment    | 1        |
        | CLM-EVR-031 | CLM-ONE-001 in a clm column                     | 0        |
        | CLM-EVR-070 | @CLM-ONE-001, with a comma, in an Examples cell | 1        |

  Rule: balance accounts for every step it reads

    @unit @CLM-EVR-032
    Scenario: each job's counts will add up to the steps read in it
      given a run had read the steps of two jobs
      when balance reconciles it
      then each job will have a count of its runners, reconciler steps, non-checks, plumbing and candidates
      and those counts will add up to the steps read in that job

    @unit @CLM-EVR-033
    Scenario: the total will be the sum of the jobs
      given a run had read the steps of two jobs
      when balance reconciles it
      then the total of each count will be the sum over the jobs

    @unit @CLM-EVR-072
    Scenario: a job that calls a reusable workflow has no steps of its own to read
      given a workflow had a job that called a reusable workflow, and a job with one step
      when balance reconciles it
      then the step account will read the one step, and nothing for the job that called the reusable workflow

  Rule: the provenance says what the run used

    @unit
    Scenario Outline: the provenance describes the run
      given the run had <what it had>
      when balance reconciles it
      then the provenance will include <details>

      Examples:
        | clm         | what it had                                                                                       | details                                                                            |
        | CLM-EVR-037 | a target given as acme/web                                                                        | the target acme/web                                                                |
        | CLM-EVR-039 | no target given, and the origin https://ci:s3cret@example.com/acme/web?x=1#y                      | a target named owner/repo from its path, with no user, password, query or fragment |
        | CLM-EVR-045 | no target given, and the origin git@github.com:acme/web.git                                       | the target acme/web                                                                |
        | CLM-EVR-049 | no target given, and the origin ssh://git@github.com/acme/web.git                                 | the target acme/web                                                                |
        | CLM-EVR-050 | no target given, and the origin github.com:acme/web.git                                           | the target acme/web                                                                |
        | CLM-EVR-074 | no target given, and the origin git@github.com:acme/acme.github.io.git                            | the target acme/acme.github.io                                                     |
        | CLM-EVR-047 | no target given, and the origin /srv/git/web.git                                                  | the target web                                                                     |
        | CLM-EVR-048 | no target given, and the origin file:///srv/git/web.git                                           | the target web                                                                     |
        | CLM-EVR-051 | no target given, and the origin git://example.com/acme/web.git                                    | the target unknown-target                                                          |
        | CLM-EVR-052 | no target given, and the origin https://example.com/web, with no owner and repository in its path | the target unknown-target                                                          |
        | CLM-EVR-071 | no target given, and the origin foo, which no form of origin reads                                | the target unknown-target                                                          |
        | CLM-EVR-038 | a source SHA given as abc1234, in a git repository at def5678                                     | the source SHA abc1234                                                             |
        | CLM-EVR-040 | the tool running from its own checkout at 9f8e7d6                                                 | the tool SHA 9f8e7d6                                                               |
        | CLM-EVR-041 | the tool installed as a package, version 0.1.256                                                  | no tool SHA, version 0.1.256                                                       |
        | CLM-EVR-046 | the tool copied in, its nearest package.json with no version                                      | no tool SHA, version unknown                                                       |
        | CLM-EVR-042 | a Cucumber evidence report given                                                                  | that report, among the inputs                                                      |
        | CLM-EVR-043 | no Cucumber evidence report given                                                                 | that report, named as absent                                                       |
        | CLM-EVR-044 | an input at /work/acme/a.json, for a target at /work/acme                                         | that input as a.json                                                               |
        | CLM-EVR-053 | a run that started at 2026-11-12T07:08:14Z                                                        | the run's time 2026-11-12T07:08:14Z                                                |
