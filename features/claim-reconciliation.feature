@LDG
Feature: A Claim Reconciliation sets a claim's Evidence Obligations against its Evidence Observations

  balance sets one side against the other, matching each Evidence Obligation on its kind of
  quality check. Each Quality Check Reconciliation has an outcome, such as satisfied when evidence is present and
  passing, failing when it is present and failing, or missing when it is absent.

  Balancing runs in both directions, so there is a Claim Reconciliation for every claim, whichever
  kind of claim it is.

  A claim's verdict is binary. A claim is balanced when every Quality Check Reconciliation on it is satisfied. Otherwise it
  is out of balance, and it lists every reconciling item, each typed and none ranked.

  Rule: a Claim Reconciliation follows from its evidence

    @unit
    Scenario Outline: balance works out each Quality Check Reconciliation's outcome, and from those the verdict
      given there was <Evidence Obligations> under <claim code>
      and there was <Evidence Observations>
      when balance reconciles them
      then the Claim Reconciliation will be <verdict>
      and its Quality Check Reconciliations will have the outcomes <outcomes>

      Examples:
        | clm         | claim code                             | Evidence Obligations                          | Evidence Observations                                                 | verdict        | outcomes                          |
        | CLM-LDG-001 | @CLM-ONE-001                           | a unit Evidence Obligation                    | a passing unit test citing it                                         | balanced       | one satisfied                     |
        | CLM-LDG-049 | @CLM-ONE-001                           | an integration Evidence Obligation            | a passing integration test citing it                                  | balanced       | one satisfied                     |
        | CLM-LDG-048 | @CLM-ONE-001                           | an e2e Evidence Obligation                    | a passing e2e test citing it                                          | balanced       | one satisfied                     |
        | CLM-LDG-050 | @CLM-ONE-001                           | a performance Evidence Obligation             | a passing performance test citing it                                  | balanced       | one satisfied                     |
        | CLM-LDG-025 | @CLM-ONE-001                           | a fitness Evidence Obligation                 | a passing fitness function citing it                                  | balanced       | one satisfied                     |
        | CLM-LDG-027 | @CLM-ONE-001                           | a unit Evidence Obligation                    | three passing unit tests citing it                                    | balanced       | three satisfied                   |
        | CLM-LDG-013 | @CLM-ONE-001                           | a unit and an e2e Evidence Obligation         | a passing unit test and a passing e2e test, each citing it            | balanced       | two satisfied                     |
        | CLM-LDG-002 | @CLM-ONE-001                           | a unit Evidence Obligation                    | a failing unit test citing it                                         | out of balance | one failing                       |
        | CLM-LDG-047 | @CLM-ONE-001                           | a unit Evidence Obligation                    | a passing and a failing unit test citing it                           | out of balance | one satisfied and one failing     |
        | CLM-LDG-051 | @CLM-ONE-001                           | a fitness Evidence Obligation                 | a passing and a failing fitness function citing it                    | out of balance | one satisfied and one failing     |
        | CLM-LDG-003 | @CLM-ONE-001                           | a unit Evidence Obligation                    | no unit test                                                          | out of balance | one missing                       |
        | CLM-LDG-004 | @CLM-ONE-001                           | a unit and an integration Evidence Obligation | a failing unit test citing it                                         | out of balance | one failing and one missing       |
        | CLM-LDG-052 | @CLM-ONE-001                           | a unit Evidence Obligation                    | a unit test citing it that never reached its assertions               | out of balance | one missing and one never-ran     |
        | CLM-LDG-008 | @CLM-ONE-001                           | a unit Evidence Obligation                    | an e2e test citing it                                                 | out of balance | one missing and one not-asked-for |
        | CLM-LDG-010 | @CLM-ONE-001                           | no Evidence Obligation                        | a unit test citing it                                                 | out of balance | one not-asked-for                 |
        | CLM-LDG-009 | @CLM-ONE-001                           | no Evidence Obligation                        | no test citing it                                                     | out of balance | one no-quality-check              |
        | CLM-LDG-053 | @CLM-ONE-001                           | a fitness Evidence Obligation                 | a passing fitness function citing it, whose step cannot fail its job | out of balance | one cannot-fail                   |
        | CLM-LDG-021 | no code                                | a unit Evidence Obligation                    | no test, since none can cite it                                       | out of balance | one no-claim-code                 |
        | CLM-LDG-054 | @CLM-ONE-001, shared with another claim | a unit Evidence Obligation                    | no test citing it                                                     | out of balance | one duplicate-claim-code          |
        | CLM-LDG-006 | @CLM-ONE-999, on no executable claim   | no Evidence Obligation                        | a unit test citing it                                                 | out of balance | one cites-unknown-claim           |
        | CLM-LDG-055 | @CLM-ONE-002, on a deferred scenario   | no Evidence Obligation                        | a unit test citing it                                                 | out of balance | one cites-unknown-claim           |
        | CLM-LDG-056 | @CLM-ONE-999, on no executable claim   | no Evidence Obligation                        | two unit tests citing it                                              | out of balance | two cites-unknown-claim           |
        | CLM-LDG-007 | the unnamed claim                      | no Evidence Obligation                        | a unit test citing no code                                            | out of balance | one cites-no-claim                |
        | CLM-LDG-057 | the unnamed claim                      | no Evidence Obligation                        | a test file that never ran, citing no code                            | out of balance | one never-ran                     |
        | CLM-LDG-058 | the unnamed claim                      | no Evidence Obligation                        | two unit tests citing no code                                         | out of balance | two cites-no-claim                |

    @unit @CLM-LDG-046
    Scenario: each executable claim sharing a claim code will have its own Claim Reconciliation, naming its feature file and title
      given a scenario titled "a" in one.feature and one titled "b" in two.feature were both tagged @CLM-ONE-001
      when balance reconciles them
      then there will be two Claim Reconciliations under @CLM-ONE-001, one naming one.feature and "a", the other two.feature and "b"

  Rule: a Claim Reconciliation sorts its Quality Check Reconciliations, so two runs over the same evidence list them in the same order

    They are sorted by kind of quality check: unit, integration, e2e, performance, then fitness.
    Within a kind, they are sorted by where their tests are, then by the
    code each cites, then by everything else each records.

    @unit
    Scenario Outline: balance sorts a Claim Reconciliation's Quality Check Reconciliations by kind of quality check, then where the test is, then the code it cites, then what else it records
      given there was <Evidence Obligations> under <claim code>
      and there was, in this order, <Unsorted Evidence Observations>
      when balance reconciles them
      then its Quality Check Reconciliations will be sorted as <Sorted Evidence Observations>

      Examples:
        | clm         | claim code        | Evidence Obligations                                                            | Unsorted Evidence Observations                                                                                                                  | Sorted Evidence Observations                                                                                                                    |
        | CLM-LDG-059 | @CLM-ONE-001      | a unit, an integration, an e2e, a performance and a fitness Evidence Obligation | a passing fitness function, performance test, e2e test, integration test, then unit test, each citing it                                        | a passing unit test, integration test, e2e test, performance test, then fitness function, each citing it                                        |
        | CLM-LDG-060 | @CLM-ONE-001      | a unit Evidence Obligation                                                      | a passing unit test in z.test.ts citing it, then a failing one in a.test.ts                                                                     | a failing unit test in a.test.ts citing it, then a passing one in z.test.ts                                                                     |
        | CLM-LDG-061 | the unnamed claim | no Evidence Obligation                                                          | a unit test in z.test.ts citing no code, then one in a.test.ts citing @CLM-ONE-002, on two executable claims                                    | a unit test in a.test.ts citing @CLM-ONE-002, on two executable claims, then one in z.test.ts citing no code                                    |
        | CLM-LDG-062 | the unnamed claim | no Evidence Obligation                                                          | a unit test in a.test.ts citing @CLM-ONE-002, on two executable claims, then one in a.test.ts citing no code                                    | a unit test in a.test.ts citing no code, then one in a.test.ts citing @CLM-ONE-002, on two executable claims                                    |
        | CLM-LDG-063 | the unnamed claim | no Evidence Obligation                                                          | a unit test in a.test.ts citing @CLM-ONE-002, on two executable claims, failing with "a", then one in a.test.ts citing no code failing with "b" | a unit test in a.test.ts citing no code failing with "b", then one in a.test.ts citing @CLM-ONE-002, on two executable claims, failing with "a" |
        | CLM-LDG-064 | @CLM-ONE-001      | a unit Evidence Obligation                                                      | a unit test in a.test.ts citing it failing with "b", then one failing with "a"                                                                  | a unit test in a.test.ts citing it failing with "a", then one failing with "b"                                                                  |

  Rule: balance groups the unnamed claim's evidence by kind of quality check, file and shared claim code

    @unit
    Scenario Outline: evidence of the same kind, file and shared claim code will share a group
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
    Scenario Outline: a group of tests will count them and name those that failed
      given a group on the unnamed claim had <tests>
      when balance reconciles it
      then the group will have <ran> ran, <passed> passed and <failed> failed, naming <failures>

      Examples:
        | clm         | tests                                                     | ran | passed | failed | failures   |
        | CLM-LDG-071 | two passing tests                                         | 2   | 2      | 0      | no test    |
        | CLM-LDG-072 | a passing test and a failing test "b"                     | 2   | 1      | 1      | the test b |
        | CLM-LDG-074 | a passing fitness function whose step cannot fail its job | 1   | 1      | 0      | no test    |
