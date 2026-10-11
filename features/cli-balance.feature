@CLI
Feature: spec-controller balance runs standalone

  The `spec-controller balance` command reconciles a target's scenarios
  against its observed evidence and emits the Evidence Reconciliation. It runs on
  the public core plus the application layer alone — no private engine, no
  `analyse` / `migrate` — so the open-source tool is complete and useful on its
  own: a developer installs `spec-controller`, points `balance` at their features
  and test reports, and gets the reconciliation.

  @SCN-CLI-001 @e2e
  Scenario: balance reconciles a target and emits the Evidence Reconciliation to stdout
    Given a target with scenarios and a Vitest report of what ran
    When balance is asked to reconcile that target
    Then the run ends on the balanced verdict
    And it reports the Evidence Reconciliation
    And the reconciliation reports the target's scenarios

  Rule: A supplied input path that does not exist is a hard error, not silent empty evidence.

    A supplied `--vitest` / `--cucumber` / `--features` / `--ci` / `--package-json`
    whose path does not exist halts `balance` BEFORE reconciling — non-zero exit,
    stderr naming the flag and the missing path — never the silent zero-evidence
    all-red report a mistyped path would otherwise produce. The five flags are
    Examples of one boundary behaviour; scope is existence only.

    @SCN-CLI-002 @unit @e2e
    Scenario Outline: a supplied-but-missing <flag> exits non-zero and names the path
      Given a target, and the <flag> pointing at a path that does not exist
      When balance is asked to reconcile that target
      Then the run is rejected for the missing path
      And the rejection names the <flag> and the missing path
      And nothing is reconciled

      Examples:
        | flag                   |
        | Vitest report option   |
        | Cucumber report option |
        | feature corpus option  |
        | CI workflows option    |
        | manifest option        |

    @SCN-CLI-003 @unit @e2e
    Scenario: an omitted optional input flag is not an error
      Given a target with scenarios and a Vitest report
      When balance is asked to reconcile that target without the Cucumber report option
      Then the run ends on the balanced verdict
      And it reconciles the scenarios against the supplied evidence

  Rule: balance's exit code reflects the reconciliation verdict.

    `balance` is a GATE, not just a reporter: any out-of-balance reconciliation makes
    it exit EXACTLY `1` — not merely non-zero — so it reds a CI build and can't
    masquerade as the usage error (`2`). Out-of-balance is a domain
    derivation over the WHOLE reconciliation: out-of-balance iff ANY reconciling item
    exists anywhere — a scenario's out-of-balance items AND the suspense-row items
    (a fitness-function watermelon, a no-evidence-obligation credit, a phantom scenario) — NOT a scan
    of scenario verdicts alone, which would let a watermelon-only run (no
    out-of-balance scenario) exit `0`, the false pass this gate must never give.

    @SCN-CLI-004 @unit @e2e
    Scenario: an out-of-balance reconciliation exits 1
      Given a target that reconciles out-of-balance
      When balance is asked to reconcile that target
      Then the run ends on the out-of-balance verdict
      And it reports the Evidence Reconciliation

    @SCN-CLI-005 @unit @e2e
    Scenario: an all-balanced reconciliation exits 0
      Given a target that reconciles all-balanced
      When balance is asked to reconcile that target
      Then the run ends on the balanced verdict

  Rule: an unsound run pre-empts the balance verdict

    You cannot trust a reconciliation whose evidence never materialised, so unsound
    DOMINATES. Exit 4 (taxonomy: 0 balanced / 1 out-of-balance / 2 usage / 3 pending-
    under-strict / 4 unsound) even though a broken run is ALSO out-of-balance — the broken
    item sits on the suspense row, so the balance verdict is already false. Exit 1 says "the
    ledger disagrees"; exit 4 says "the ledger could not be trusted to disagree". The
    pre-emption is load-bearing, not cosmetic: unless broken evidence is checked BEFORE
    the balance verdict, exit 4 is unreachable and the collection failure stays masked as
    an honest disagreement.

    @unit @e2e @SCN-CLI-012
    Scenario: a run whose vitest report carries a collection-failed suite exits 4, not 1
      Given a target whose vitest report carries a collection-failed suite
      When balance is asked to reconcile that target
      Then the run ends on the unsound verdict
      And it reports the Evidence Reconciliation

  Rule: --strict escalates Pending Items to a run failure

    Pending Items are run-neutral by default; --strict
    is the opt-in that fails a run carrying them. This Rule pins the LENIENT DEFAULT first:
    a reconciliation that is balanced except for Pending Items exits 0 through the real binary
    when --strict is NOT given, so deferred work never reds a build unless the team opts in.

    @unit @e2e @SCN-CLI-010
    Scenario: an only-Pending-Items reconciliation with no --strict → balance exits 0
      Given a target whose only exception is Pending Items
      When balance is asked to reconcile that target
      Then the run ends on the balanced verdict
      And it reports the Evidence Reconciliation
      And the reconciliation reports a Pending Item

    @unit @e2e @SCN-CLI-011
    Scenario: an only-Pending-Items reconciliation with --strict → balance exits 3, and its verdict headline names exit 3
      Given a target whose only exception is Pending Items
      When balance is asked to reconcile that target under the strict option
      Then the run ends on the pending verdict
      And it reports the Evidence Reconciliation
      And the reconciliation reports a Pending Item
      And the verdict headline reads PENDING and names the exit it ends with

  Rule: the printed verdict agrees with the process exit code

    THREE VIEWS OF ONE RUN CAN DISAGREE: a scenario tally saying 0 out-of-balance (a pass),
    an obligation tally saying 17, and a process exiting 1. Each is internally consistent;
    unless something pins them TOGETHER, they drift and a failing run reads as clean.

    The tally counts every Scenario Reconciliation, so the tally, the balance verdict and the
    exit code are three statements of one fact. Pin that they agree — so no future change
    can move one without moving the others.

    @unit @e2e @SCN-CLI-013
    Scenario: the tally, the verdict headline and the process exit code name the same outcome
      Given a target whose only out-of-balance row is the suspense reconciliation
      When balance is asked to reconcile that target
      Then the trial-balance table counts 1 out-of-balance Scenario Reconciliation
      And the verdict headline reads OUT-OF-BALANCE and names the exit it ends with
      And the run ends on the out-of-balance verdict
      And the tally, the verdict headline and the run's exit agree

  Rule: a re-render exits the verdict its saved reconciliation carries

    A saved spec-reconciliation.json carries its verdict: the ledger, the scenario code errors and
    whether the run treated a deferral as a failure. Re-rendering it reads that verdict rather than
    recomputing it, and exits the code it names, so a failed run never reads as a pass because it
    was read back. The re-rendered headline and the exit agree exactly as a live run's do.

    @unit @e2e @SCN-CLI-069
    Scenario Outline: a re-render of a saved <verdict> reconciliation ends on <code>, and its verdict headline names the exit for <code>
      Given a saved reconciliation of a target that reconciles <verdict>
      When balance is asked to re-render the saved reconciliation
      Then the re-render ends on <code>
      And the re-render's verdict headline names the exit for <code>

      Examples:
        | verdict                            | code                             |
        | all-balanced                       | the balanced verdict             |
        | out-of-balance                     | the out-of-balance verdict       |
        | balanced-with-scenario-code-errors | the scenario-code-errors verdict |
        | unsound                            | the unsound verdict              |
        | nothing to reconcile               | the nothing-to-reconcile verdict |

    @unit @e2e @SCN-CLI-070
    Scenario Outline: a re-render is strict when the saved run was strict or the re-render is given --strict
      Given a saved reconciliation of a target whose only exception is Pending Items, saved <saved>
      When balance is asked to re-render the saved reconciliation <given>
      Then the re-render ends on <code>
      And the re-render's verdict headline names the exit for <code>

      Examples:
        | saved                          | given                   | code                 |
        | under the strict option        | with no options         | the pending verdict  |
        | without the strict option      | under the strict option | the pending verdict  |
        | without the strict option      | with no options         | the balanced verdict |
        | before strictness was recorded | with no options         | the balanced verdict |

    @unit @e2e @SCN-CLI-071
    Scenario Outline: under --exit-zero a re-render moves 1 and 3 to 0 and never 4 or 5, printing the same report
      Given a saved reconciliation of a target that reconciles <verdict>
      When balance is asked to re-render the saved reconciliation, once without the report-only option and once under it
      Then without the report-only option the re-render ends on <code>
      And under the report-only option the re-render ends on <zeroed>
      And the two re-renders report the same, byte for byte

      Examples:
        | verdict                                    | code                             | zeroed                           |
        | out-of-balance                             | the out-of-balance verdict       | success                          |
        | only-Pending-Items under the strict option | the pending verdict              | success                          |
        | unsound                                    | the unsound verdict              | the unsound verdict              |
        | nothing to reconcile                       | the nothing-to-reconcile verdict | the nothing-to-reconcile verdict |

  Rule: a re-render reads its saved report and refuses every flag it would otherwise drop

    A re-render reads the saved report, --strict and --exit-zero, and nothing else: it reconciles
    nothing, so a live input, a provenance override or an output destination given beside it would
    be silently ignored. Each is refused as a usage fault, naming the flag, before anything is
    rendered. --help still answers first. A re-render keeps no run, so under --store it is refused
    before the run starts, naming --store.

    @unit @e2e @SCN-CLI-072
    Scenario Outline: a <flag> given beside --render-from-json exits 2 naming the flag, and nothing is rendered
      Given a saved reconciliation of a target that reconciles out-of-balance
      When balance is asked to re-render the saved reconciliation with the <flag> given <value>
      Then the re-render is refused as a usage error
      And the refusal names the <flag>
      And nothing is re-rendered

      Examples:
        | flag                   | value                     |
        | feature corpus option  | /nonexistent              |
        | Vitest report option   | /nonexistent              |
        | Cucumber report option | /nonexistent              |
        | CI workflows option    | /nonexistent              |
        | manifest option        | /nonexistent              |
        | CI step record option  | /nonexistent              |
        | target-name option     | elsewhere                 |
        | source-commit option   | 0000000                   |
        | format option          | the json report in a file |

  Rule: an input the tool cannot read is a usage error, never a verdict

    exit 1 means OUT-OF-BALANCE — the accounts disagree — and nothing else. A tool that
    CRASHED before reconciling must never reach for it: a broken invocation masquerading
    as an honest disagreement is precisely the meaning-collision the exit taxonomy exists
    to prevent (0 balanced / 1 out-of-balance / 2 usage / 3 pending-under-strict /
    4 unsound / 5 nothing to reconcile). A present-but-unparseable report is an INPUT fault — sibling to a missing
    path and an unrecognised flag, both already exit 2 — so
    it halts BEFORE reconciling, naming the file and the parse failure, and exits 2.

    Not 4 (unsound): unsound is a VALID, parseable report whose evidence didn't fully
    materialise — the reconciliation still runs and can be trusted to say so. A malformed
    report cannot be reconciled at all.

    Scope is every input the run reads. A report that parses but is not in the shape its reader
    expects is an input the tool cannot read too: read as nothing, it would reach a verdict about
    evidence the tool threw away, and read as far as it goes, it crashed. The feature corpus and
    the CI workflows are read from disk as a directory or a file, and a path the tool cannot open
    as the kind its flag reads, or may not open at all, is the same fault. The one input read
    tolerantly by design is a workflow's YAML: a workflow the reader cannot walk contributes no
    steps, and the run reconciles without them.

    The rule reaches --render-from-json too, the one flag the guard lane never
    reached: it returns BEFORE the input guards run, so it honoured neither — a missing path
    crashed to ENOENT and a malformed file to SyntaxError, both landing on exit 1. Its
    missing-path case was a live violation of the usage-error principle, which the
    CLI enforced for the five evidence flags and not for this one. MISSING and UNPARSEABLE
    are two Examples of the one boundary rule.

    @unit @e2e @SCN-CLI-014
    Scenario: a present-but-unparseable evidence report exits 2, naming the file and the parse failure
      Given a target, and the Vitest report option pointing at a report that exists but is not valid JSON
      When balance is asked to reconcile that target
      Then the run is refused as a usage error
      And the refusal names the unparseable report and the parse failure
      And nothing is reconciled

    @unit @e2e @SCN-CLI-015
    Scenario Outline: a --render-from-json report the tool cannot read exits 2, naming the file
      Given the re-render option pointing at a saved report that is <defect>
      When balance is asked to re-render that saved report
      Then the run is refused as a usage error
      And the refusal names the unreadable saved report
      And nothing is rendered

      Examples:
        | defect      |
        | missing     |
        | unparseable |

    @unit @e2e @SCN-CLI-016
    Scenario Outline: a feature file the tool cannot parse exits 2, naming the file and the parse failure
      Given a feature corpus containing a feature file that is <defect>
      When balance is asked to reconcile that target
      Then the run is refused as a usage error
      And the refusal names the unparseable feature file and the parse failure
      And nothing is reconciled

      Examples:
        | defect                     |
        | a corrupt tag line         |
        | a corrupt scenario keyword |
        | wholly unparseable         |

    @unit @e2e @SCN-CLI-076
    Scenario Outline: a Vitest report not in the Vitest reporter's shape is refused as unreadable, naming where its shape is wrong
      Given a target whose Vitest report parses but holds <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the input and where its shape is wrong

      Examples:
        | defect                                       |
        | no list of test results                      |
        | a list where the report belongs              |
        | test results that are not a list             |
        | a test file that is not an object            |
        | a test file whose assertions are not a list  |
        | a test file whose name is not a string       |

    @unit @e2e @SCN-CLI-077
    Scenario Outline: a Cucumber report not in the Cucumber formatter's shape is refused as unreadable, naming where its shape is wrong
      Given a target whose Cucumber report parses but holds <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the input and where its shape is wrong

      Examples:
        | defect                                          |
        | an object where the list of features belongs    |
        | a string where the list of features belongs     |
        | a feature whose scenarios are not a list        |
        | a scenario whose tags are not a list            |
        | a scenario whose steps are not a list           |
        | a feature whose location is not a string        |

    @unit @e2e @SCN-CLI-078
    Scenario Outline: a CI step record not in the shape of a record of step outcomes is refused as unreadable, naming where its shape is wrong
      Given a target whose CI step record parses but holds <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the input and where its shape is wrong

      Examples:
        | defect                                              |
        | a list where the record belongs                     |
        | nothing where the record belongs                    |
        | a scenario-coded step that is not an object         |
        | a scenario-coded step whose outcome is not a string |

    @unit @e2e @SCN-CLI-079
    Scenario Outline: a package.json not in a manifest's shape is refused as unreadable, whether given or read by default
      Given a target whose manifest, <how>, holds <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the input and where its shape is wrong

      Examples:
        | how             | defect                            |
        | given by name   | a list where the manifest belongs |
        | given by name   | scripts that are not a map        |
        | given by name   | a script that is not a string     |
        | read by default | a script that is not a string     |
        | read by default | text that does not parse          |

    @unit @e2e @SCN-CLI-080
    Scenario Outline: a well-formed but empty report is read as empty, never refused
      Given a target whose <input> is well formed and holds nothing
      When the balance run reads that input
      Then the run reads it and reaches its verdict

      Examples:
        | input           |
        | Vitest report   |
        | Cucumber report |
        | CI step record  |

    @unit @e2e @SCN-CLI-075
    Scenario Outline: an input path that is not the kind of path its flag reads is refused as unreadable, naming the flag and the path
      Given a target whose <input> path is <kind>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the input it could not read and the path

      Examples:
        | input          | kind                                                     |
        | feature corpus | a regular file                                           |
        | feature corpus | a single feature file                                    |
        | feature corpus | a directory holding a directory named as a feature file  |
        | CI workflows   | a directory holding a directory named as a workflow file |

    @unit @e2e @SCN-CLI-082
    Scenario Outline: an input the tool is not permitted to read is refused as unreadable, naming the flag and the path
      Given a target in which <input> is not permitted to be read
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the input it could not read and the path
      And the refusal says the tool was not permitted to read it

      Examples:
        | input                        |
        | a feature file               |
        | the feature corpus directory |
        | the CI workflow file         |
        | the CI workflows directory   |
        | the manifest read by default |
        | the Vitest report            |

    @unit @e2e @SCN-CLI-074
    Scenario Outline: a saved file that parses but is not a saved reconciliation is refused as unreadable, and nothing is rendered
      Given a saved report that parses but is <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the input and where its shape is wrong

      Examples:
        | defect                              |
        | a list, not a reconciliation        |
        | a reconciliation with no ledger     |
        | holding a section of the wrong kind |
        | unreadable below its top            |

    @e2e @SCN-CLI-081
    Scenario Outline: a stored run given an input it cannot read in shape is refused and stores nothing
      Given a stored run's target whose <input> is one the tool cannot read in shape
      When a stored balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refused run leaves nothing in the run store

      Examples:
        | input           |
        | feature corpus  |
        | Cucumber report |

  Rule: a target with no Gherkin corpus is reconciled, not refused

    `new-client` is a supported adoption state, not a degraded one, and most targets have
    no `features/` directory at all. An absent DEFAULT corpus escaped as a raw ENOENT and
    landed on Node's default exit 1 — the out-of-balance code — which is the exact collision
    closed on every other input, alive on the one path each new
    consumer is guaranteed to take. The corpus that is ABSENT and the corpus that holds NO
    SCENARIO are one answer, not two, and the report names the directory it examined.

    A SUPPLIED `--features` at a path that does not exist is untouched by this Rule and stays a
    usage fault at exit 2: supplied-but-absent is the operator mistyping,
    absent-by-default is the target's honest shape.

    @SCN-CLI-017 @unit @e2e
    Scenario: a target with no features/ directory is reported on, never crashed over
      Given a target with no Gherkin corpus at all — no features directory on disk
      When balance is asked to reconcile that target
      Then it reports the Evidence Reconciliation
      And the run ends on the exit its verdict headline names, rather than on a stack trace

    @SCN-CLI-018 @unit @e2e
    Scenario: an absent corpus and a corpus holding no scenario reach the same verdict by the same sentence
      Given a target with no corpus directory, a target whose corpus is empty, and a target whose corpus carries no scenario
      When balance is asked to reconcile each of those targets
      Then every one of them is told the same verdict by the same sentence
      And that sentence names the corpus directory it examined

  Rule: a run with nothing to reconcile has no verdict to give, and says so

    The balance verdict holds when every row balances, and so is VACUOUSLY TRUE on an empty
    ledger: a target that carried no scenario and produced nothing would be told "BALANCED … (exit 0)"
    — a green over silence, from the tool whose whole claim is that silence is not the same as nothing
    wrong. Nothing-to-reconcile is its OWN enumerated state — not balanced (no accounts to
    agree), not out-of-balance (nothing disagrees), not a usage fault (the invocation was valid
    and the target supported), not unsound (no proof failed; none was owed). Exit 5 (taxonomy:
    0 balanced / 1 out-of-balance / 2 usage / 3 pending-under-strict / 4 unsound / 5 nothing to
    reconcile).

    KEYED ON THE EMPTY LEDGER, NEVER ON THE EMPTY CORPUS, and that is load-bearing rather than
    pedantic: a target with no corpus but uncited credits HAS rows — its suspense row — and is
    an ordinary out-of-balance report at exit 1. Key this on "no corpus" instead and the modal
    first run's whole report disappears behind exit 5.

    @SCN-CLI-019 @unit @e2e
    Scenario: a run with nothing to reconcile exits 5 and its headline says so, rather than reporting balanced
      Given a target that carried no scenario and produced no evidence
      When balance is asked to reconcile that target
      Then the run ends on the nothing-to-reconcile verdict
      And the verdict headline says the run had nothing to reconcile, never that it balanced

    @SCN-CLI-020 @unit @e2e
    Scenario: a corpus-less run carrying uncited credits is an ordinary out-of-balance report at exit 1
      Given a target with no Gherkin corpus whose unit evidence cites no scenario
      When balance is asked to reconcile that target
      Then the uncited credits are posted to the suspense reconciliation
      And the verdict headline reads OUT-OF-BALANCE and names the exit it ends with
      And the run ends on the out-of-balance verdict
      And the run is never read as one with nothing to reconcile

  Rule: --exit-zero moves the verdict codes to 0 and never the couldn't-run codes

    The on-ramp for a new-client or annotated adopter: the gate's report, stated exactly,
    without the red. Gate stays the default. The flag is a CLI-edge suppression of the
    process status only and is never recorded, unlike --strict, which the saved report carries
    — so the report, headline included, still names the code the GATE gives; the agreement
    between the headline and the gate holds unchanged with no flag.

    @SCN-CLI-021 @unit @e2e
    Scenario Outline: under --exit-zero a <verdict> run prints the same report byte for byte and exits 0
      Given a target that reconciles <verdict>
      When balance is asked to reconcile that target <flags>, once without the report-only option and once under it
      Then without the report-only option the run ends on <code>
      And under the report-only option the run ends on success
      And the two runs report the same Evidence Reconciliation, byte for byte but for the run timestamp each stamps for itself

      Examples:
        | verdict                            | flags                   | code                             |
        | all-balanced                       | with no options         | the balanced verdict             |
        | out-of-balance                     | with no options         | the out-of-balance verdict       |
        | only-Pending-Items                 | under the strict option | the pending verdict              |
        | balanced-with-scenario-code-errors | with no options         | the scenario-code-errors verdict |

    @SCN-CLI-022 @unit @e2e
    Scenario Outline: --exit-zero never masks a run that could give no verdict — <state> still ends on <code>
      Given <target>
      When balance is asked to reconcile that target under the report-only option
      Then the run ends on <code>
      And <evidence>

      Examples:
        | state                | target                                                                        | code                             | evidence                                                                           |
        | usage                | a target, and the Vitest report option pointing at a path that does not exist | a usage error                    | the rejection names the Vitest report option and the missing path                  |
        | unsound              | a target whose vitest report carries a collection-failed suite                | the unsound verdict              | it reports the Evidence Reconciliation                                             |
        | nothing to reconcile | a target that carried no scenario and produced no evidence                    | the nothing-to-reconcile verdict | the verdict headline says the run had nothing to reconcile, never that it balanced |
        | unsound              | a target whose collection-failed suite sits beside a misfiled scenario code   | the unsound verdict              | the report still lists the scenario code error                                     |

  Rule: a corpus-shape fault never pre-empts the report

    A scenario code error is a fault in how the corpus files its codes, not in what its
    accounts say, so it never stops the reconciliation. It takes the exit-1 rung ahead of the
    balance verdict — 5, 4, then 1 for scenario code errors, then 1 for out of balance, then 3 —
    and the report still carries every account, balanced or not.

    @SCN-CLI-055 @unit @e2e
    Scenario: An out-of-balance account and a scenario code error in one run exit 1, both reported
      Given a target whose corpus misfiles a scenario code and whose ledger has an account out of balance
      When balance is asked to reconcile that target
      Then the run ends on the out-of-balance verdict
      And the report lists the scenario code error
      And the report carries the out-of-balance account
      And the verdict headline names both the scenario code error and the accounts out of balance

  Rule: an unknown command is a usage fault, and exits 2

    An unknown command is a usage fault: the invocation was wrong. It exits 2, the usage status
    in the published exit table ("2 | usage — the invocation was wrong",
    packages/spec-controller/README.md), and never 1, which is a verdict against the corpus.
    A typo such as `blance` and a command that has left the tool both land here. The command is
    named on stderr, and the help that follows is for a person at a terminal; the status is for
    the pipeline.

    @SCN-CLI-056 @unit @e2e
    Scenario Outline: an unknown command is a usage fault — <request>
      Given the spec-controller host
      When it is asked for <request>
      Then the invocation is refused as a usage error
      And it names the command it does not know
      And it produces nothing a pipeline could read as a report

      Examples:
        | request                                    |
        | a typo of a command                        |
        | a name that is no command                  |
        | a name that is no command, as a stored run |

    @SCN-CLI-057 @unit @e2e
    Scenario: --exit-zero after an unknown command never moves its usage status
      Given the spec-controller host
      When it is asked for a name that is no command, with the report-only option after the command
      Then the invocation is refused as a usage error

  Rule: a flag that takes a value, given none, is a usage fault, refused before anything runs

    Which flags take a value is the registry's to say: a flag with a value placeholder, in either
    scope. So the rule reaches a flag added later with no new row. A value is missing when nothing
    follows the flag, when a flag follows it, or when it is empty. The invocation is refused at the
    usage status before any reconcile, report or store write, and --exit-zero cannot move it,
    because a usage fault is not a verdict. A missing value is never read as the word "true": a
    path flag would go looking for a file called true, --target and --source-sha would record it,
    and --format would drop it and run to a verdict that --exit-zero turned green.

    @SCN-CLI-058 @unit @e2e
    Scenario Outline: balance refuses <flag> given no value as a usage fault, naming the missing value — <shape>
      Given a target that reconciles out-of-balance
      When balance is asked to run with <flag> given no value, <shape>
      Then balance refuses the run as a usage fault, with nothing reconciled
      And the refusal names <flag> as a flag missing its value

      Examples:
        | flag                      | shape                                                       |
        | the format option         | at the end of the arguments                                 |
        | the format option         | followed by the report-only option                          |
        | the target-name option    | followed by the report-only option                          |
        | the Vitest report option  | at the end, with a file named true in the working directory |
        | the re-render option      | at the end of the arguments                                 |
        | the feature corpus option | with an empty value                                         |

    @SCN-CLI-059 @unit @e2e
    Scenario Outline: the host refuses <modifier> given no value as a usage fault, and stores nothing — <shape>
      Given a target that reconciles out-of-balance, and an empty run store
      When a stored balance run is asked for with <modifier> given no value, <shape>
      Then the invocation is refused as a usage error
      And the refusal names <modifier> as a flag missing its value
      And nothing is written to the run store or the working directory

      Examples:
        | modifier              | shape                                |
        | the store modifier    | alone                                |
        | the store modifier    | followed by the run-name modifier    |
        | the run-name modifier | at the end, after the store modifier |
        | the run-name modifier | with an empty value                  |
        | the store modifier    | with an empty value                  |

  Rule: a flag goes on its own side of the command, and one on the wrong side is refused as out of place

    The host reads its modifiers before the command, and the command reads its own flags after it.
    A flag on the wrong side is a usage fault that names the flag and where it belongs. It is never
    read as a command the host does not know, and never given the pin advice meant for a flag no
    version accepts. A --help or -h among the host's own tokens still answers the
    top-level help first, whatever else is out of place beside it.

    @SCN-CLI-060 @unit @e2e
    Scenario Outline: a flag given before the command is refused as a flag out of place, never as an unknown command — <flag>
      Given a target that reconciles out-of-balance, and an empty run store
      When a stored run is asked for with <flag>
      Then the invocation is refused as a usage error
      And the refusal names the flag as given before the command, never as an unknown command
      And nothing is written to the run store or the working directory

      Examples:
        | flag                                            |
        | the report-only option, before balance          |
        | the format option given md, before balance      |
        | an unknown flag, before balance                 |
        | the report-only option, before no known command |

    @SCN-CLI-061 @unit @e2e
    Scenario: a host modifier given after the command is refused as out of place, naming where it goes, with no pin advice
      Given a target that reconciles out-of-balance, and an empty run store
      When balance is asked to run with the store modifier given after the command
      Then balance refuses the run as a usage fault, with nothing reconciled
      And the refusal names the store modifier as one that goes before the command
      And the refusal advises no pin
      And nothing is written to the run store or the working directory

  Rule: every argument is read as what it is, or refused as a usage fault before anything runs

    The unknown-flag check bounds a flag's NAME against the registry. That alone let
    a value given to a flag that takes none, a word that is no flag at all, a second copy of a
    single-value flag, a flag spelled --flag=value, and a command read as a modifier's value all past
    it, and three of those ran to a verdict --exit-zero turned green. Which flags take a value, which take none,
    and which may repeat are the registry's to say, so a flag added later is covered by construction.
    A refusal inside a stored run leaves no run.yaml. --help still answers first, whatever else is
    given: it runs nothing and reaches no verdict, so --exit-zero has nothing to turn green.
    A host modifier needs a command after it, or help. Given last, it is refused, and a bare
    spec-controller still answers help. --run-id names a stored run. Given without
    --store there is no run for it to name, so it is refused, and a request for help still
    answers first.

    @SCN-CLI-062 @unit @e2e
    Scenario Outline: balance refuses a value given to a flag that takes none, naming both — <shape>
      Given a target that reconciles out-of-balance, and an empty run store
      When balance is asked to run with <flag> given the value <value>, <shape>
      Then balance refuses the run as a usage fault, with nothing reconciled
      And the refusal names <flag> as a flag that takes no value, and <value> as the value it was given
      And the run store holds no record of a run

      Examples:
        | flag                   | value | shape                                     |
        | the strict option      | foo   | after the target's flags                  |
        | the report-only option | foo   | after the target's flags                  |
        | the strict option      | foo   | after the target's flags, in a stored run |

    @SCN-CLI-063 @unit @e2e
    Scenario Outline: balance refuses an argument that is neither a flag nor a flag's value, naming it — <shape>
      Given a target that reconciles out-of-balance, and an empty run store
      When balance is asked to run with an argument that is no flag, <shape>
      Then balance refuses the run as a usage fault, with nothing reconciled
      And the refusal names that argument as one balance does not take
      And the run store holds no record of a run

      Examples:
        | shape                                                                      |
        | the target's features directory alone, with no flag before it              |
        | a stray word after the target's flags, under the report-only option        |
        | a single-dash token after the target's flags, under the report-only option |
        | the command given twice, in a stored run                                   |

    @SCN-CLI-064 @unit @e2e
    Scenario Outline: a flag that does not repeat, given twice, is refused naming the flag, never read as its last value — <flag> <shape>
      Given a target that reconciles out-of-balance, and an empty run store
      When a run is asked for with <flag> given twice, <shape>
      Then the invocation is refused as a usage error
      And nothing is reconciled
      And the refusal names <flag> as given more than once
      And the run store holds no record of a run

      Examples:
        | flag                      | shape                                                                           |
        | the feature corpus option | at a path that does not exist, then at the target, under the report-only option |
        | the target-name option    | as two different names                                                          |
        | the strict option         | with no value either time                                                       |
        | the target-name option    | as two different names, in a stored run                                         |
        | the store modifier        | before the command, the second time at the run store                            |
        | the run-name modifier     | before the command, as two ids, in a stored run                                 |

    @SCN-CLI-065 @unit @e2e
    Scenario Outline: a flag written --flag=value is refused naming the form and the spelling that is read, with no pin advice — <written> <shape>
      Given a target that reconciles out-of-balance, and an empty run store
      When a run is asked for with <written>, <shape>
      Then the invocation is refused as a usage error
      And nothing is reconciled
      And the refusal names <written> as a form that is not read, and <spelling> as the spelling that is
      And the refusal advises no pin, and calls the flag neither unknown nor out of place
      And the run store holds no record of a run

      Examples:
        | written                                                        | spelling                                                   | shape                                                  |
        | the format option and json joined by an equals sign            | the format option and json as two arguments                | after the target's flags                               |
        | the format option and json joined by an equals sign            | the format option and json as two arguments                | after the target's flags, under the report-only option |
        | the feature corpus option and nothing joined by an equals sign | the feature corpus option and a directory as two arguments | after the target's flags                               |
        | the store modifier and the run store joined by an equals sign  | the store modifier and the run store as two arguments      | before the command                                     |
        | the store modifier and the run store joined by an equals sign  | the store modifier and the run store as two arguments      | after the command                                      |
        | the format option and json joined by an equals sign            | the format option and json as two arguments                | after the target's flags, in a stored run              |

    @SCN-CLI-066 @unit @e2e
    Scenario Outline: the host refuses a modifier that took the command as its value, naming both, and stores nothing — <modifier> <shape>
      Given a target that reconciles out-of-balance, and an empty run store
      When a stored run is asked for, with the command given as the value of <modifier>, <shape>
      Then the invocation is refused as a usage error
      And the refusal names <modifier> as having taken the command as its value
      And nothing is written to the run store or the working directory

      Examples:
        | modifier              | shape                                                      |
        | the store modifier    | with the target's flags after it                           |
        | the store modifier    | with nothing after it                                      |
        | the run-name modifier | after the store modifier, with the target's flags after it |

    @SCN-CLI-067 @unit @e2e
    Scenario Outline: the host refuses a modifier with no command after it, naming it, and stores nothing — <modifiers> <shape>
      Given a target that reconciles out-of-balance, and an empty run store
      When the host is asked for nothing but <modifiers>, <shape>
      Then the invocation is refused as a usage error
      And it produces nothing a pipeline could read as a report
      And the refusal names every modifier given, and says no command followed them
      And nothing is written to the run store or the working directory

      Examples:
        | modifiers                                    | shape                            |
        | the store modifier                           | at a run store that is not there |
        | the store modifier                           | at the empty run store           |
        | the run-name modifier                        | alone                            |
        | the store modifier and the run-name modifier | in that order                    |
        | the run-name modifier and the store modifier | in that order                    |

    @SCN-CLI-068 @unit @e2e
    Scenario Outline: help after a modifier, or nothing given at all, still answers the top-level help — <request>
      Given a target that reconciles out-of-balance, and an empty run store
      When spec-controller is asked for <request>
      Then it answers with the same top-level help as a bare invocation, and succeeds
      And nothing is written to the run store or the working directory

      Examples:
        | request                                                                          |
        | help by its long name after the store modifier                                   |
        | the help command after the store modifier                                        |
        | help by its short name after the store modifier                                  |
        | help by its long name after the run-name modifier                                |
        | help by its long name after the store modifier and the run-name modifier         |
        | nothing at all                                                                   |
        | help by its long name after the store modifier, given a command as its value     |
        | help by its short name after the store modifier, given a command as its value    |
        | help by its long name after the run-name modifier, given a command as its value  |
        | help by its short name after the run-name modifier, given a command as its value |

    @SCN-CLI-073 @unit @e2e
    Scenario Outline: a --help or -h among the host's own tokens answers the top-level help ahead of any refusal of the tokens beside it, and writes nothing — <request>
      Given a target that reconciles out-of-balance, and an empty run store
      When the host is given <request>
      Then it answers with the same top-level help as a bare invocation, and succeeds
      And nothing is written to the run store or the working directory

      Examples:
        | request                                                                                |
        | help by its long name after a flag out of place                                        |
        | help by its long name after a flag out of place, before a command                      |
        | help by its long name after a modifier that took the command, and the target's flags   |
        | help by its short name between a modifier that took the command and the target's flags |
        | help by its long name after a modifier that took the command, and another modifier     |
        | help by its long name where a modifier's value goes                                    |
        | help by its long name after a modifier given twice                                     |
        | help by its long name after a modifier joined to its value by an equals sign           |
        | help by its short name as a modifier's value, before a command                         |

    @SCN-CLI-083 @unit @e2e
    Scenario Outline: the host refuses --run-id given without --store as a usage fault, naming it, and nothing runs or is written — <shape>
      Given a target that reconciles out-of-balance, and an empty run store
      When a run is named with the run-name modifier and given no store modifier, <shape>
      Then the invocation is refused as a usage error
      And it produces nothing a pipeline could read as a report
      And the refusal names the run-name modifier as naming a run that is not kept
      And nothing is written to the run store or the working directory

      Examples:
        | shape                                                      |
        | before a live balance run                                  |
        | before a live balance run, under the report-only option    |
        | before a live balance run, under the strict option         |
        | before a live balance run that writes its report to a file |
        | before a balance re-render of a saved report               |

    @SCN-CLI-084 @unit @e2e
    Scenario Outline: a request for balance's help after --run-id with no --store answers balance's help as it does alone, and writes nothing — <request>
      Given a target that reconciles out-of-balance, and an empty run store
      When balance's help is asked for <request>, after the run-name modifier with no store modifier
      Then it answers with balance's help, exactly as it does with nothing before it, and succeeds
      And nothing is written to the run store or the working directory

      Examples:
        | request           |
        | by its long name  |
        | by its short name |

  Rule: the CLI answers --help from a single command/flag registry, completeness-guarded.

    `<command> --help` (and `-h`) prints THAT command's flags — each name +
    arg-placeholder + description — rendered from the data-driven command/flag
    registry, and exits 0. Each command answers it BEFORE any parse or work of its
    own, so `--help` never falls through as a stray flag while the command runs
    anyway. The registry is the single source: a flag exists ⇒ a registry entry ⇒ it
    appears in help, by construction.

    The scope is per-command because the REGISTRY has always been two-scope — a global
    host-modifier scope and a set of per-command scopes. The per-command renderer was
    nonetheless written against the one command that existed and found `balance` BY NAME,
    so a second command had no help surface at all: not an empty one, no way to ask for
    it. The command is a parameter, so what the renderer covers is the registry's shape
    rather than the command set's size on the day it was written.

    @SCN-CLI-006 @unit
    Scenario: <command> --help lists that command's flags and exits 0

    @SCN-CLI-007 @unit
    Scenario: spec-controller --help lists the commands and the global --store/--run-id modifiers

    @SCN-CLI-008 @unit
    Scenario: every registered flag, positional argument, command and modifier reaches its help surface (completeness guard)

    @SCN-CLI-009 @unit @e2e
    Scenario: an unregistered flag to balance is a usage error
      Given a flag balance has never registered
      When balance is asked to run with that unregistered flag
      Then the run is refused as a usage error, naming the unrecognised flag
      And nothing is reconciled
      And the refusal names the version that refused it and the bump that cures a pinned skew

  Rule: a flag balance has retired is refused as retired, naming what replaced it — never as skew a pin can cure

    An unregistered flag is refused with drift advice: the pin and the tree
    have drifted, so bump the pin to a version that accepts it. That advice is true of a flag
    newer than the pin and false of a flag the product has retired, which every earlier
    version accepts and no later one will: the only pin that satisfies it is a downgrade back
    onto the route the retirement removed. So a retired flag is refused as retired,
    with the version that retired it and what took its place, and no pin is offered.

    The retired flags are data on the command's registry entry, beside the flags it accepts,
    and append-only: a flag retires once and is never accepted again.

    @SCN-CLI-023 @unit @e2e
    Scenario: a retired flag to balance is refused as retired, naming its replacement and no pin that restores it
      Given a flag balance has retired
      When balance is asked to run with that flag
      Then balance refuses the run as a usage fault and reconciles nothing
      And the refusal names the flag as retired, with the version that retired it
      And the refusal names what replaced it
      And the refusal advises no pin toward a version that still accepts the flag
