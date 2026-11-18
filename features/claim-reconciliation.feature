@LDG
Feature: A Claim Reconciliation sets a claim's Evidence Obligations against its Evidence Observations

  balance sets a claim's Evidence Obligations against its Evidence Observations, matching them
  on their kind of quality check. balance works from both sides, so every claim, of whichever
  kind, has a Claim Reconciliation.

  A Quality Check Reconciliation's outcome follows from the sides it has:
  - With both, it is satisfied, failing, or cannot-fail when it passed where it could not have
    failed.
  - With an Evidence Obligation alone, it is missing or duplicate-claim-code.
  - With an Evidence Observation alone, it is not-asked-for, cites-unknown-claim, cites-no-claim
    or never-ran.
  - With neither, it is no-quality-check.
  A claim with no claim code reads no-claim-code on the Evidence Obligation side, whether or not
  it asks for a quality check.

  A claim's verdict has two values. It is balanced when every Quality Check Reconciliation on it
  is satisfied. Otherwise it is out of balance, and it lists every reconciling item, each with its
  outcome.

  Evidence no single executable claim can take is posted to the unnamed claim. balance groups it
  there by kind of quality check, file and shared claim code, and counts each group's results.

  Each Claim Reconciliation lists its Quality Check Reconciliations in one fixed order.

  Rule: a Quality Check Reconciliation's outcome follows from the sides it has

    @unit
    Scenario Outline: balance gives each Quality Check Reconciliation its outcome from its two sides
      given there was <Evidence Obligations> under <claim code>
      and there was <Evidence Observations>
      when balance reconciles them
      then its Quality Check Reconciliations will have the outcomes <outcomes>

      Examples:
        | clm         | claim code                              | Evidence Obligations                          | Evidence Observations                                                | outcomes                          |
        | CLM-LDG-001 | @CLM-ONE-001                            | a unit Evidence Obligation                    | a passing unit test citing it                                        | one satisfied                     |
        | CLM-LDG-049 | @CLM-ONE-001                            | an integration Evidence Obligation            | a passing integration test citing it                                 | one satisfied                     |
        | CLM-LDG-048 | @CLM-ONE-001                            | an e2e Evidence Obligation                    | a passing e2e test citing it                                         | one satisfied                     |
        | CLM-LDG-050 | @CLM-ONE-001                            | a performance Evidence Obligation             | a passing performance test citing it                                 | one satisfied                     |
        | CLM-LDG-025 | @CLM-ONE-001                            | a fitness Evidence Obligation                 | a passing fitness function citing it                                 | one satisfied                     |
        | CLM-LDG-027 | @CLM-ONE-001                            | a unit Evidence Obligation                    | three passing unit tests citing it                                   | three satisfied                   |
        | CLM-LDG-013 | @CLM-ONE-001                            | a unit and an e2e Evidence Obligation         | a passing unit test and a passing e2e test, each citing it           | two satisfied                     |
        | CLM-LDG-002 | @CLM-ONE-001                            | a unit Evidence Obligation                    | a failing unit test citing it                                        | one failing                       |
        | CLM-LDG-047 | @CLM-ONE-001                            | a unit Evidence Obligation                    | a passing and a failing unit test citing it                          | one satisfied and one failing     |
        | CLM-LDG-051 | @CLM-ONE-001                            | a fitness Evidence Obligation                 | a passing and a failing fitness function citing it                   | one satisfied and one failing     |
        | CLM-LDG-053 | @CLM-ONE-001                            | a fitness Evidence Obligation                 | a passing fitness function citing it, whose step cannot fail its job | one cannot-fail                   |
        | CLM-LDG-003 | @CLM-ONE-001                            | a unit Evidence Obligation                    | no unit test                                                         | one missing                       |
        | CLM-LDG-004 | @CLM-ONE-001                            | a unit and an integration Evidence Obligation | a failing unit test citing it                                        | one failing and one missing       |
        | CLM-LDG-052 | @CLM-ONE-001                            | a unit Evidence Obligation                    | a unit test citing it that never reached its assertions              | one missing and one never-ran     |
        | CLM-LDG-008 | @CLM-ONE-001                            | a unit Evidence Obligation                    | an e2e test citing it                                                | one missing and one not-asked-for |
        | CLM-LDG-010 | @CLM-ONE-001                            | no Evidence Obligation                        | a unit test citing it                                                | one not-asked-for                 |
        | CLM-LDG-009 | @CLM-ONE-001                            | no Evidence Obligation                        | no test citing it                                                    | one no-quality-check              |
        | CLM-LDG-021 | no code                                 | a unit Evidence Obligation                    | no test                                                              | one no-claim-code                 |
        | CLM-LDG-078 | no code                                 | no Evidence Obligation                        | no test                                                              | one no-claim-code                 |
        | CLM-LDG-054 | @CLM-ONE-001, shared with another claim | a unit Evidence Obligation                    | no test citing it                                                    | one duplicate-claim-code          |
        | CLM-LDG-077 | @CLM-ONE-001, shared with another claim | no Evidence Obligation                        | no test citing it                                                    | one no-quality-check              |
        | CLM-LDG-006 | @CLM-ONE-999, on no executable claim    | no Evidence Obligation                        | a unit test citing it                                                | one cites-unknown-claim           |
        | CLM-LDG-055 | @CLM-ONE-002, on a deferred scenario    | no Evidence Obligation                        | a unit test citing it                                                | one cites-unknown-claim           |
        | CLM-LDG-056 | @CLM-ONE-999, on no executable claim    | no Evidence Obligation                        | two unit tests citing it                                             | two cites-unknown-claim           |
        | CLM-LDG-007 | the unnamed claim                       | no Evidence Obligation                        | a unit test citing no code                                           | one cites-no-claim                |
        | CLM-LDG-057 | the unnamed claim                       | no Evidence Obligation                        | a test file that never ran, citing no code                           | one never-ran                     |
        | CLM-LDG-081 | the unnamed claim                       | no Evidence Obligation                        | a fitness function posted as not recorded, citing no code            | one cites-no-claim                |

  Rule: a claim is balanced only when every Quality Check Reconciliation on it is satisfied

    @unit
    Scenario Outline: balance gives a claim its verdict from the outcomes of its Quality Check Reconciliations
      given a claim's Quality Check Reconciliations had the outcomes <outcomes>
      when balance reconciles it
      then the Claim Reconciliation will be <verdict>

      Examples:
        | clm         | outcomes                      | verdict        |
        | CLM-LDG-079 | two satisfied                 | balanced       |
        | CLM-LDG-080 | one satisfied and one failing | out of balance |

    @unit @CLM-LDG-046
    Scenario: each executable claim sharing a claim code will have its own Claim Reconciliation, naming its feature file and title
      given a scenario titled "a" in one.feature and one titled "b" in two.feature were both tagged @CLM-ONE-001
      when balance reconciles them
      then there will be two Claim Reconciliations under @CLM-ONE-001, one naming one.feature and "a", the other two.feature and "b"

  Rule: balance groups the unnamed claim's evidence by kind of quality check, file and shared claim code

    @unit
    Scenario Outline: balance will split the unnamed claim's evidence by kind, file and shared claim code, and by nothing else
      given the unnamed claim had <evidence>
      when balance reconciles it
      then it will have <groups>

      Examples:
        | clm         | evidence                                                                             | groups                                     |
        | CLM-LDG-065 | two unit tests in a.test.ts, citing no code                                          | one unit group for a.test.ts               |
        | CLM-LDG-066 | a unit test in a.test.ts and one in b.test.ts, citing no code                        | a unit group for each file                 |
        | CLM-LDG-067 | a unit test and an integration test in a.test.ts, citing no code                     | a unit group and an integration group      |
        | CLM-LDG-068 | a test in a.test.ts citing no code, and one citing the shared claim code CLM-ONE-001 | two groups, one naming CLM-ONE-001         |
        | CLM-LDG-073 | a test in a.test.ts citing no code, and one citing both CLM-ONE-001 and CLM-ONE-002  | one unit group for a.test.ts               |
        | CLM-LDG-069 | two uncited fitness functions                                                        | one fitness group naming both              |
        | CLM-LDG-070 | an uncited fitness function, and one citing the shared claim code CLM-ONE-001        | two fitness groups, one naming CLM-ONE-001 |

    @unit
    Scenario Outline: balance counts a group's results and names those that failed
      given a group on the unnamed claim had <tests>
      when balance reconciles it
      then the group will have <ran> ran, <passed> passed and <failed> failed, naming <failures>

      Examples:
        | clm         | tests                                                             | ran | passed | failed | failures   |
        | CLM-LDG-071 | two passing tests                                                 | 2   | 2      | 0      | no test    |
        | CLM-LDG-072 | a passing test and a failing test "b"                             | 2   | 1      | 1      | the test b |
        | CLM-LDG-074 | a passing fitness function whose step cannot fail its job         | 1   | 1      | 0      | no test    |
        | CLM-LDG-075 | a passing test in a.test.ts, and a.test.ts's tests that never ran | 1   | 1      | 0      | no test    |
        | CLM-LDG-082 | a fitness function posted as not recorded                         | 0   | 0      | 0      | no test    |

  Rule: a Claim Reconciliation sorts its Quality Check Reconciliations, so two runs over the same evidence list them in the same order

    They are sorted by kind of quality check: unit, integration, e2e, performance, then fitness.
    Within a kind, a missing one comes first, then they are sorted by where their tests are, then
    by the code each cites, then by everything else each records.

    @unit
    Scenario Outline: balance will list a claim's Quality Check Reconciliations in the same order whatever order the evidence came in
      given there was <Evidence Obligations> under <claim code>
      and there was <Evidence Observations, in this order>
      when balance reconciles them
      then its Quality Check Reconciliations will be in the order <Quality Check Reconciliations, in order>

      Examples:
        | clm         | claim code        | Evidence Obligations                                                            | Evidence Observations, in this order                                                                                                            | Quality Check Reconciliations, in order                                                                                                         |
        | CLM-LDG-059 | @CLM-ONE-001      | a unit, an integration, an e2e, a performance and a fitness Evidence Obligation | a passing fitness function, performance test, e2e test, integration test, then unit test, each citing it                                        | a passing unit test, integration test, e2e test, performance test, then fitness function, each citing it                                        |
        | CLM-LDG-060 | @CLM-ONE-001      | a unit Evidence Obligation                                                      | a passing unit test in z.test.ts citing it, then a failing one in a.test.ts                                                                     | a failing unit test in a.test.ts citing it, then a passing one in z.test.ts                                                                     |
        | CLM-LDG-061 | the unnamed claim | no Evidence Obligation                                                          | a unit test in z.test.ts citing no code, then one in a.test.ts citing @CLM-ONE-002, on two executable claims                                    | a unit test in a.test.ts citing @CLM-ONE-002, on two executable claims, then one in z.test.ts citing no code                                    |
        | CLM-LDG-062 | the unnamed claim | no Evidence Obligation                                                          | a unit test in a.test.ts citing @CLM-ONE-002, on two executable claims, then one in a.test.ts citing no code                                    | a unit test in a.test.ts citing no code, then one in a.test.ts citing @CLM-ONE-002, on two executable claims                                    |
        | CLM-LDG-063 | the unnamed claim | no Evidence Obligation                                                          | a unit test in a.test.ts citing @CLM-ONE-002, on two executable claims, failing with "a", then one in a.test.ts citing no code failing with "b" | a unit test in a.test.ts citing no code failing with "b", then one in a.test.ts citing @CLM-ONE-002, on two executable claims, failing with "a" |
        | CLM-LDG-064 | @CLM-ONE-001      | a unit Evidence Obligation                                                      | a unit test in a.test.ts citing it failing with "b", then one failing with "a"                                                                  | a unit test in a.test.ts citing it failing with "a", then one failing with "b"                                                                  |
        | CLM-LDG-083 | @CLM-ONE-001      | a unit Evidence Obligation                                                      | a passing unit test in a.test.ts citing it, titled "b", then a passing one titled "a", neither with a message                                   | a passing unit test in a.test.ts citing it, titled "a", then a passing one titled "b"                                                           |
        | CLM-LDG-076 | @CLM-ONE-001      | a unit and a fitness Evidence Obligation                                        | a unit test in a.test.ts citing it that never ran                                                                                               | unit missing, the unit test in a.test.ts that never ran, then fitness missing                                                                   |
