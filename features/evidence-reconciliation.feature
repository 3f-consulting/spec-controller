@EVR
Feature: The Evidence Reconciliation states the run verdict, the totals, the step account and the provenance

  balance reconciles each executable claim against the test and CI evidence, and writes the
  Evidence Reconciliation: the Claim Reconciliations and the Summary over them.

  The run verdict is balanced, out of balance, or not reconciled. A run is not reconciled when
  balance cannot rely on what it read, and the verdict names why: unsound, when some evidence
  never ran; claim code errors, when balance finds a claim code error; configuration errors, when
  balance finds a configuration error; or nothing to reconcile, when there are no Claim
  Reconciliations to count. When several reasons apply, unsound comes before claim code errors,
  claim code errors before configuration errors, and configuration errors before nothing to
  reconcile; each comes before out of balance.

  The totals count the Claim Reconciliations, the Quality Check Reconciliations by kind and
  outcome, where each Evidence Observation was filed, the excluded claim code occurrences and the
  scenarios a deferral tag set aside. The step account counts every CI step balance read, by job.
  The provenance names the target, the source SHA, the tool, each input and when the run started.

  Rule: a run is balanced only when all the Claim Reconciliations it counts are

    @unit
    Scenario Outline: the run will be balanced or out of balance, as its Claim Reconciliations call for
      given a run had <what it has>
      when balance reconciles it
      then the run verdict will be <run verdict>

      Examples:
        | clm         | what it has                                                       | run verdict    |
        | CLM-EVR-001 | only balanced Claim Reconciliations                               | balanced       |
        | CLM-EVR-002 | a Claim Reconciliation out of balance                             | out of balance |
        | CLM-EVR-003 | no feature corpus, and Evidence Observations citing no claim code | out of balance |

  Rule: the run verdict says why balance could not reconcile a run

    @unit
    Scenario Outline: the run will be not reconciled, naming why
      given a run had <what it has>
      when balance reconciles it
      then the run verdict will be not reconciled, because <why>

      Examples:
        | clm         | what it has                                                                                               | why                  |
        | CLM-EVR-004 | an Evidence Observation that never ran                                                                    | unsound              |
        | CLM-EVR-005 | a claim code error, and only balanced Claim Reconciliations                                               | claim code errors    |
        | CLM-EVR-096 | a settings file with the key unitt, and only balanced Claim Reconciliations                               | configuration errors |
        | CLM-EVR-097 | a runner balance found in a workflow, whose step named no report, and only balanced Claim Reconciliations | configuration errors |
        | CLM-EVR-006 | no feature files, and no Evidence Observation                                                             | nothing to reconcile |
        | CLM-EVR-008 | a feature corpus with no scenario, and no Evidence Observation                                            | nothing to reconcile |

    @unit
    Scenario Outline: when several reasons apply, the run verdict follows a fixed order among them
      given a run had <what it has>
      when balance reconciles it
      then the run verdict will be not reconciled, because <why>

      Examples:
        | clm         | what it has                                                                        | why                  |
        | CLM-EVR-009 | an Evidence Observation that never ran and a Claim Reconciliation out of balance   | unsound              |
        | CLM-EVR-010 | an Evidence Observation that never ran and a claim code error                      | unsound              |
        | CLM-EVR-098 | an Evidence Observation that never ran and a configuration error                   | unsound              |
        | CLM-EVR-011 | a claim code error and a Claim Reconciliation out of balance                       | claim code errors    |
        | CLM-EVR-012 | a corpus whose only scenario is tagged with two codes, and no Evidence Observation | claim code errors    |
        | CLM-EVR-099 | a claim code error and a configuration error                                       | claim code errors    |
        | CLM-EVR-100 | a configuration error and a Claim Reconciliation out of balance                    | configuration errors |
        | CLM-EVR-101 | a configuration error, with no feature files and no Evidence Observation           | configuration errors |

  Rule: a team can gate on the claims it has written before every test cites one

    @unit
    Scenario Outline: a run counting only the executable claims is balanced or out of balance as its executable claims call for
      given a run had <executable claim>
      and it had <other evidence>
      when balance reconciles it counting only the executable claims
      then the run verdict will be <run verdict>

      Examples:
        | clm         | executable claim                                                                                | other evidence                                          | run verdict    |
        | CLM-EVR-084 | one asking for unit evidence, with a passing unit test citing it                                | a passing unit test citing a code no claim has          | balanced       |
        | CLM-EVR-085 | one asking for unit evidence, with a passing unit test citing it                                | a failing unit test citing a code no claim has          | balanced       |
        | CLM-EVR-086 | one asking for unit evidence, with a passing unit test citing it                                | a failing unit test citing no code                      | balanced       |
        | CLM-EVR-087 | one asking for unit evidence, with a passing unit test citing it                                | a unit test citing a code no claim has, which never ran | balanced       |
        | CLM-EVR-088 | one asking for unit evidence, with a passing unit test citing it                                | a unit test citing no code, which never ran             | balanced       |
        | CLM-EVR-089 | one asking for unit evidence, with a failing unit test citing it                                | a passing unit test citing no code                      | out of balance |
        | CLM-EVR-090 | one asking for unit evidence, with no test citing it                                            | a passing unit test citing no code                      | out of balance |
        | CLM-EVR-091 | one asking for unit evidence, with a passing unit test and a passing integration test citing it | nothing                                                 | out of balance |
        | CLM-EVR-092 | one asking for fitness evidence, whose CI step succeeded and set continue-on-error to true      | nothing                                                 | out of balance |

    @unit
    Scenario Outline: a run counting only the executable claims is not reconciled for a reason an executable claim gives, or for having none
      given a run had <executable claim>
      and it had <other evidence>
      when balance reconciles it counting only the executable claims
      then the run verdict will be not reconciled, because <why>

      Examples:
        | clm         | executable claim                                        | other evidence                                          | why                  |
        | CLM-EVR-093 | one asking for unit evidence, whose unit test never ran | nothing                                                 | unsound              |
        | CLM-EVR-094 | none                                                    | a passing unit test citing no code                      | nothing to reconcile |
        | CLM-EVR-095 | none                                                    | a unit test citing a code no claim has, which never ran | nothing to reconcile |

  Rule: the summary counts what was reconciled

    @unit
    Scenario Outline: Total of the Claim Reconciliations
      given a run had <what the run had>
      when balance reconciles it
      then the totals will have <total> Claim Reconciliations, <balanced> balanced and <out of balance> out of balance

      Examples:
        | clm         | what the run had                                                   | total | balanced | out of balance |
        | CLM-EVR-015 | a claim with a passing unit test, and one with a failing unit test | 2     | 1        | 1              |
        | CLM-EVR-016 | a unit test citing no code                                         | 1     | 0        | 1              |

    @unit
    Scenario Outline: Total of the Quality Check Reconciliations, by kind of quality check and outcome
      given a run had <what the run had>
      when balance reconciles it
      then the totals will have, for <kind>, <obligations> Evidence Obligations, <observations> Evidence Observations and <by outcome>

      Examples:
        | clm         | what the run had                                                                   | kind        | obligations | observations | by outcome                |
        | CLM-EVR-017 | a claim with a unit Evidence Obligation, and a passing unit test citing it         | unit        | 1           | 1            | 1 satisfied               |
        | CLM-EVR-054 | a claim with a unit Evidence Obligation, and two passing unit tests citing it      | unit        | 1           | 2            | 2 satisfied               |
        | CLM-EVR-055 | a claim with an integration Evidence Obligation, and no integration test citing it | integration | 1           | 0            | 1 missing                 |
        | CLM-EVR-056 | a claim with a unit Evidence Obligation, and a unit test citing it that never ran  | unit        | 1           | 1            | 1 missing and 1 never-ran |
        | CLM-EVR-062 | a passing unit test citing no code                                                 | unit        | 0           | 1            | 1 cites-no-claim          |
        | CLM-EVR-063 | a scenario with a code and no kind-of-quality-check tag                            | no kind     | 0           | 0            | 1 no-quality-check        |

    @unit @CLM-EVR-065
    Scenario: Total of every kind
      given a run had a claim with a unit Evidence Obligation and a passing unit test citing it, and a scenario with a code and no kind-of-quality-check tag
      when balance reconciles it
      then the totals will have, for all kinds, 1 Evidence Obligation, 1 Evidence Observation, 1 satisfied and 1 no-quality-check

    @unit
    Scenario Outline: Total of the Evidence Observations, by where they were filed
      given a run had <what the run had>
      when balance reconciles it
      then the totals will have <total> Evidence Observations, <by where filed>

      Examples:
        | clm         | what the run had                                                            | total | by where filed           |
        | CLM-EVR-066 | a claim with a unit Evidence Obligation, and a passing unit test citing it | 1     | 1 on an executable claim |
        | CLM-EVR-067 | a passing unit test citing no code                                          | 1     | 1 on the unnamed claim   |
        | CLM-EVR-068 | a passing unit test citing a code no claim has                              | 1     | 1 on a phantom claim     |
        | CLM-EVR-069 | a unit test citing a code no claim has, which never ran                     | 1     | 1 on a phantom claim     |
        | CLM-EVR-076 | a claim with a unit Evidence Obligation, and no test citing it             | 0     | 0 on an executable claim |

    @unit
    Scenario Outline: Total of the out-of-balance Claim Reconciliations, by feature file
      given a Claim Reconciliation out of balance was for <claim>
      when balance reconciles it
      then the totals will have it <where>

      Examples:
        | clm         | claim                                                                | where                               |
        | CLM-EVR-023 | tagged @CLM-ONE-001, in one.feature tagged @ONE                      | under one.feature                   |
        | CLM-EVR-024 | a scenario with no code, in one.feature tagged @ONE                  | under one.feature                   |
        | CLM-EVR-025 | a scenario with no code, in three.feature, which has no feature code | under three.feature                 |
        | CLM-EVR-026 | the unnamed claim                                                    | in the total, under no feature file |

    @unit
    Scenario Outline: Total of the excluded claim code occurrences
      given a feature file had the claim code CLM-ONE-001 as <where it was written>
      when balance reads the corpus
      then the totals will have <excluded> excluded claim code occurrences

      Examples:
        | clm         | where it was written                              | excluded |
        | CLM-EVR-027 | a scenario's tag                                  | 0        |
        | CLM-EVR-028 | a word in a scenario's title                      | 1        |
        | CLM-EVR-029 | a word in a comment                               | 1        |
        | CLM-EVR-030 | a scenario's tag, and again in a comment          | 1        |
        | CLM-EVR-031 | a cell of a clm column                            | 0        |
        | CLM-EVR-070 | a word with a comma after it, in an Examples cell | 1        |

    @unit
    Scenario Outline: Total of the scenarios a deferral tag set aside
      given a run had <what the run had>
      when balance reconciles it <how>
      then the totals will have <count> scenarios set aside by a deferral tag

      Examples:
        | clm         | what the run had                                                              | how             | count |
        | CLM-EVR-081 | two scenarios tagged @wip, and one with no deferral tag                       |                 | 2     |
        | CLM-EVR-082 | an Outline tagged @wip with three rows, and one scenario with no deferral tag |                 | 1     |
        | CLM-EVR-083 | two scenarios tagged @wip, and one with no deferral tag                       | in a strict run | 0     |

  Rule: balance accounts for every step it reads

    @unit @CLM-EVR-032
    Scenario: each job's counts will add up to the steps read in it
      given a run read the steps of two jobs
      when balance reconciles it
      then each job will have a count of its runners, reconciler steps, non-checks, plumbing and fitness functions
      and those counts will add up to the steps read in that job

    @unit @CLM-EVR-033
    Scenario: the total will be the sum of the jobs
      given a run read the steps of two jobs
      when balance reconciles it
      then the total of each count will be the sum over the jobs

    @unit @CLM-EVR-072
    Scenario: a job that calls a reusable workflow has no steps of its own to read
      given a workflow had a job that called a reusable workflow, and a job with one step
      when balance reconciles it
      then the step account will count the one step, and nothing for the job that called the reusable workflow

    @unit @CLM-EVR-073
    Scenario: a workflow whose every line is commented out has no steps to read
      given a workflow had every line commented out
      when balance reconciles it
      then the step account will count no steps

  Rule: the provenance says what the run used

    @unit
    Scenario Outline: the provenance will name the target the run was given, or the one its origin names
      given the run had <what it had>
      when balance reconciles it
      then the provenance will have <target>

      Examples:
        | clm         | what it had                                                                                       | target                                                         |
        | CLM-EVR-037 | a target given as acme/web                                                                        | the target acme/web                                            |
        | CLM-EVR-039 | no target given, and the origin https://ci:s3cret@example.com/acme/web?x=1#y                      | the target acme/web, with no user, password, query or fragment |
        | CLM-EVR-045 | no target given, and the origin git@github.com:acme/web.git                                       | the target acme/web                                            |
        | CLM-EVR-049 | no target given, and the origin ssh://git@github.com/acme/web.git                                 | the target acme/web                                            |
        | CLM-EVR-050 | no target given, and the origin github.com:acme/web.git                                           | the target acme/web                                            |
        | CLM-EVR-074 | no target given, and the origin git@github.com:acme/acme.github.io.git                            | the target acme/acme.github.io                                 |
        | CLM-EVR-075 | no target given, and the origin https://gitlab.com/group/sub/web.git                              | the target sub/web                                             |
        | CLM-EVR-047 | no target given, and the origin /srv/git/web.git                                                  | the target web                                                 |
        | CLM-EVR-048 | no target given, and the origin file:///srv/git/web.git                                           | the target web                                                 |
        | CLM-EVR-051 | no target given, and the origin git://example.com/acme/web.git                                    | the target unknown-target                                      |
        | CLM-EVR-052 | no target given, and the origin https://example.com/web, with no owner and repository in its path | the target unknown-target                                      |
        | CLM-EVR-071 | no target given, and the origin foo, which no form of origin reads                                | the target unknown-target                                      |

    @unit @CLM-EVR-038
    Scenario: the provenance will have the source SHA the run was given
      given the run had a source SHA given as abc1234, in a git repository at def5678
      when balance reconciles it
      then the provenance will have the source SHA abc1234

    @unit
    Scenario Outline: the tool will be its commit when it runs from its checkout, else its version
      given the run had <what it had>
      when balance reconciles it
      then the provenance will have <tool>

      Examples:
        | clm         | what it had                                                  | tool                         |
        | CLM-EVR-040 | the tool running from its own checkout at 9f8e7d6            | the tool SHA 9f8e7d6         |
        | CLM-EVR-041 | the tool installed as a package, version 0.1.256             | no tool SHA, version 0.1.256 |
        | CLM-EVR-046 | the tool copied in, its nearest package.json with no version | no tool SHA, version unknown |

    @unit
    Scenario Outline: the inputs will list each input given, name each one not given as absent, and show a path inside the target relative to it
      given the run had <what it had>
      when balance reconciles it
      then the provenance will have <inputs>

      Examples:
        | clm         | what it had                                               | inputs                        |
        | CLM-EVR-042 | a Cucumber evidence report read                           | that report, among the inputs |
        | CLM-EVR-043 | no Cucumber evidence report read                          | that report, named as absent  |
        | CLM-EVR-044 | an input at /work/acme/a.json, for a target at /work/acme | that input as a.json          |

    @unit @CLM-EVR-053
    Scenario: the provenance will have the time the run started
      given the run started at 2026-11-12T07:08:14Z
      when balance reconciles it
      then the provenance will have the run's time 2026-11-12T07:08:14Z
