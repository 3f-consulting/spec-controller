@CLI
Feature: spec-controller balance runs standalone

  The balance command reconciles a target's scenarios against its observed evidence and
  reports the Evidence Reconciliation. It is complete on its own: point it at a feature corpus
  and test reports and it gives the reconciliation.

  @CLM-CLI-001 @e2e
  Scenario: balance reconciles a target and emits the Evidence Reconciliation to stdout
    Given a target with scenarios and a Vitest report of what ran
    When balance is asked to reconcile that target
    Then the run ends on the balanced verdict
    And it reports the Evidence Reconciliation
    And the reconciliation reports the target's scenarios

  Rule: A supplied input path that does not exist is a hard error, not silent empty evidence.

    A supplied --vitest, --pytest, --jest, --junit, --rspec, --cucumber, --features, --ci,
    --package-json or --ci-steps whose path does not exist halts balance before reconciling. The
    run exits 2, the usage status, and names the flag and the missing path on stderr. This rule
    checks existence only.

    @CLM-CLI-002 @unit @e2e
    Scenario Outline: a supplied-but-missing <flag> exits non-zero and names the path
      Given a target, and the <flag> pointing at a path that does not exist
      When balance is asked to reconcile that target
      Then the run is rejected for the missing path
      And the rejection names the <flag> and the missing path
      And nothing is reconciled

      Examples:
        | flag                   |
        | Vitest report option   |
        | pytest report option   |
        | Jest report option     |
        | JUnit report option    |
        | RSpec report option    |
        | Cucumber report option |
        | feature corpus option  |
        | CI workflows option    |
        | manifest option        |

    @CLM-CLI-003 @unit @e2e
    Scenario: an omitted optional input flag is not an error
      Given a target with scenarios and a Vitest report
      When balance is asked to reconcile that target without the Cucumber report option
      Then the run ends on the balanced verdict
      And it reconciles the scenarios against the supplied evidence

  Rule: balance's exit code reflects the reconciliation verdict.

    An out-of-balance reconciliation exits exactly 1. A run is out of balance when any
    Claim Reconciliation carries a reconciling item: a scenario's, a phantom claim's or the
    unnamed claim's, including a fitness function's pass that cannot fail. A run whose only reconciling
    item is on the unnamed claim still exits 1.

    The exit codes are: 0 balanced, 1 out of balance, 2 usage error, 3 pending under --strict,
    4 unsound, 5 nothing to reconcile, 6 unexpected error.

    @CLM-CLI-004 @unit @e2e
    Scenario: an out-of-balance reconciliation exits 1
      Given a target that reconciles out-of-balance
      When balance is asked to reconcile that target
      Then the run ends on the out-of-balance verdict
      And it reports the Evidence Reconciliation

    @CLM-CLI-005 @unit @e2e
    Scenario: an all-balanced reconciliation exits 0
      Given a target that reconciles all-balanced
      When balance is asked to reconcile that target
      Then the run ends on the balanced verdict

  Rule: an unsound run pre-empts the balance verdict

    A run whose evidence did not fully materialise exits 4, even when it is also out of balance.

    @unit @e2e @CLM-CLI-012
    Scenario: a run whose vitest report carries a collection-failed suite exits 4, not 1
      Given a target whose vitest report carries a collection-failed suite
      When balance is asked to reconcile that target
      Then the run ends on the unsound verdict
      And it reports the Evidence Reconciliation

  Rule: --strict escalates Pending Items to a run failure

    Pending Items do not fail a run by default: a run balanced except for Pending Items exits
    0. Under --strict the same run exits 3.

    @unit @e2e @CLM-CLI-010
    Scenario: an only-Pending-Items reconciliation with no --strict → balance exits 0
      Given a target whose only exception is Pending Items
      When balance is asked to reconcile that target
      Then the run ends on the balanced verdict
      And it reports the Evidence Reconciliation
      And the reconciliation reports a Pending Item

    @unit @e2e @CLM-CLI-011
    Scenario: an only-Pending-Items reconciliation with --strict → balance exits 3, and its verdict headline names exit 3
      Given a target whose only exception is Pending Items
      When balance is asked to reconcile that target under the strict option
      Then the run ends on the pending verdict
      And it reports the Evidence Reconciliation
      And the reconciliation reports a Pending Item
      And the verdict headline reads PENDING and names the exit it ends with

  Rule: the printed verdict agrees with the process exit code

    The tally counts every Claim Reconciliation. The tally, the verdict headline and the
    exit code always state the same outcome.

    @unit @e2e @CLM-CLI-013
    Scenario: the tally, the verdict headline and the process exit code name the same outcome
      Given a target whose only out-of-balance row is the unnamed claim's reconciliation
      When balance is asked to reconcile that target
      Then the Reconciliation totals table counts 1 out-of-balance Claim Reconciliation
      And the verdict headline reads OUT-OF-BALANCE and names the exit it ends with
      And the run ends on the out-of-balance verdict
      And the tally, the verdict headline and the run's exit agree

  Rule: an input the tool cannot read is a usage error, never a verdict

    An input the tool cannot read stops the run before it reconciles. The run exits 2, the
    usage status, names the input and the fault, and never ends on exit 1.

    This holds for every input the run reads: a report that does not parse, a report that
    parses but does not have the shape its reader expects, a workflow that does not parse as
    YAML, a feature corpus or CI workflows path that is the wrong kind of path for its flag, a
    path the tool is not permitted to read, and a working directory that has since been
    removed, from which the feature corpus read by default cannot be read.

    A workflow that parses but declares no jobs is read, and adds no steps. A valid report
    whose evidence did not fully materialise is unsound (exit 4), not unreadable.

    @unit @e2e @CLM-CLI-014
    Scenario: a present-but-unparseable evidence report exits 2, naming the file and the parse failure
      Given a target, and the Vitest report option pointing at a report that exists but is not valid JSON
      When balance is asked to reconcile that target
      Then the run is refused as a usage error
      And the refusal names the unparseable report and the parse failure
      And nothing is reconciled

    @unit @e2e @CLM-CLI-016
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

    @unit @e2e @CLM-CLI-076
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

    @unit @e2e @CLM-CLI-077
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

    @unit @e2e @CLM-CLI-078
    Scenario Outline: a CI step record not in the shape of a record of step outcomes is refused as unreadable, naming where its shape is wrong
      Given a target whose CI step record parses but holds <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the input and where its shape is wrong

      Examples:
        | defect                                              |
        | a list where the record belongs                     |
        | nothing where the record belongs                    |
        | a claim-coded step that is not an object         |
        | a claim-coded step whose outcome is not a string |

    @unit @e2e @CLM-CLI-079
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

    @unit @e2e @CLM-CLI-080
    Scenario Outline: a well-formed but empty report is read as empty, never refused
      Given a target whose <input> is well formed and holds nothing
      When the balance run reads that input
      Then the run reads it and reaches its verdict

      Examples:
        | input                  |
        | Vitest report          |
        | pytest report          |
        | Jest report            |
        | RSpec report           |
        | JUnit report           |
        | JUnit report directory |
        | Cucumber report        |
        | CI step record         |

    @unit @e2e @CLM-CLI-075
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
        | JUnit reports  | a directory holding a directory named as a JUnit report  |

    @unit @e2e @CLM-CLI-082
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
        | the pytest report            |
        | the Jest report              |
        | the RSpec report             |
        | the JUnit report             |
        | the JUnit report directory   |

    @unit @e2e @CLM-CLI-100
    Scenario: a run from a working directory that no longer exists is refused as unreadable, naming the feature corpus read by default
      Given a target whose working directory has since been removed
      When balance is asked to reconcile it with no feature corpus given
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the feature corpus read by default and the working directory's read failure

    @unit @e2e @CLM-CLI-102
    Scenario Outline: a workflow that does not parse as YAML is refused as unreadable, naming the workflow and the parse error — <workflow>
      Given a target whose <workflow> does not parse as YAML
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the workflow and the parse error

      Examples:
        | workflow                    |
        | --ci workflow file          |
        | workflow in the --ci folder |
        | workflow read by default    |

  Rule: a target with no Gherkin corpus is reconciled, not refused

    An absent corpus and a corpus holding no scenario get the same answer, and the report names
    the directory it examined. A supplied --features path that does not exist is a usage fault,
    exit 2.

    @CLM-CLI-017 @unit @e2e
    Scenario: a target with no features/ directory is reported on, never crashed over
      Given a target with no Gherkin corpus at all — no features directory on disk
      When balance is asked to reconcile that target
      Then it reports the Evidence Reconciliation
      And the run ends on the exit its verdict headline names, rather than on a stack trace

    @CLM-CLI-018 @unit @e2e
    Scenario: an absent corpus and a corpus holding no scenario reach the same verdict by the same sentence
      Given a target with no corpus directory, a target whose corpus is empty, and a target whose corpus carries no scenario
      When balance is asked to reconcile each of those targets
      Then every one of them is told the same verdict by the same sentence
      And that sentence names the corpus directory it examined

  Rule: a run with nothing to reconcile has no verdict to give, and says so

    A run whose ledger holds no row has nothing to reconcile. It exits 5, and its headline
    says so, never that it balanced.

    A target with no corpus but with uncited evidence observations is not empty: the unnamed claim's
    row makes it an ordinary out-of-balance run at exit 1.

    @CLM-CLI-019 @unit @e2e
    Scenario: a run with nothing to reconcile exits 5 and its headline says so, rather than reporting balanced
      Given a target that carried no scenario and produced no evidence
      When balance is asked to reconcile that target
      Then the run ends on the nothing-to-reconcile verdict
      And the verdict headline says the run had nothing to reconcile, never that it balanced

    @CLM-CLI-020 @unit @e2e
    Scenario: a corpus-less run carrying uncited evidence observations is an ordinary out-of-balance report at exit 1
      Given a target with no Gherkin corpus whose unit evidence cites no claim
      When balance is asked to reconcile that target
      Then the uncited evidence observations are posted to the unnamed claim's reconciliation
      And the verdict headline reads OUT-OF-BALANCE and names the exit it ends with
      And the run ends on the out-of-balance verdict
      And the run is never read as one with nothing to reconcile

  Rule: --exit-zero moves the verdict codes to 0 and never the couldn't-run codes

    The report under --exit-zero is unchanged, headline included, so the headline names the code
    the gate would give. The usage, unsound and nothing-to-reconcile codes are never moved.
    Without the flag the gate exits as usual.

    @CLM-CLI-021 @unit @e2e
    Scenario Outline: under --exit-zero a <verdict> run prints the same report byte for byte and exits 0
      Given a target that reconciles <verdict>
      When balance is asked to reconcile that target <flags>, once without the report-only option and once under it
      Then without the report-only option the run ends on <code>
      And under the report-only option the run ends on success
      And the two runs report the same Evidence Reconciliation, byte for byte but for the run timestamp each stamps for itself

      Examples:
        | verdict                         | flags                   | code                          |
        | all-balanced                    | with no options         | the balanced verdict          |
        | out-of-balance                  | with no options         | the out-of-balance verdict    |
        | only-Pending-Items              | under the strict option | the pending verdict           |
        | balanced-with-claim-code-errors | with no options         | the claim-code-errors verdict |

    @CLM-CLI-022 @unit @e2e
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
        | unsound              | a target whose collection-failed suite sits beside a misfiled claim code   | the unsound verdict              | the report still lists the claim code error                                     |

  Rule: a run that stops on an unexpected error before its verdict exits 6, a code no verdict uses

    An error that no refusal names ends the run on exit 6, never on Node's default 1. One line on stderr names the error. A run that has already reached its verdict keeps it. --exit-zero never changes 6.

    @unit @CLM-CLI-101
    Scenario: a balance run that stops on an unexpected error exits 6 and names the error on one line, under --exit-zero too

    @unit @CLM-CLI-103
    Scenario: an error that cannot be formatted still ends the run at 6, named on one line

    @unit @CLM-CLI-104
    Scenario: an error raised after the verdict is set keeps the verdict's exit code

    @unit @CLM-CLI-105
    Scenario: an error raised after the run's own call, on stdout, on stderr or as an uncaught exception, ends a run with no verdict at 6

    @unit @CLM-CLI-106
    Scenario: an error while the program loads ends the run at 6, named on one line

    @unit @CLM-CLI-107
    Scenario: a run writes at most one crash line, and never calls a refusal's code or its own 6 a verdict

    @unit @CLM-CLI-108
    Scenario: an uncaught error ends the process once its line is written, on 6 or on the verdict kept

    @unit @CLM-CLI-111
    Scenario: an error in reading a feature file or workflow the parser accepted ends the run at 6, and is never refused as that file failing to parse

  Rule: a corpus-shape fault never pre-empts the report

    A claim code error never stops the reconciliation. The report still carries every
    account, balanced or not. When several exit codes apply, 5 comes first, then 4, then 1
    for claim code errors, then 1 for out of balance, then 3.

    @CLM-CLI-055 @unit @e2e
    Scenario: An out-of-balance account and a claim code error in one run exit 1, both reported
      Given a target whose corpus misfiles a claim code and whose ledger has an account out of balance
      When balance is asked to reconcile that target
      Then the run ends on the out-of-balance verdict
      And the report lists the claim code error
      And the report carries the out-of-balance account
      And the verdict headline names both the claim code error and the accounts out of balance

  Rule: an unknown command is a usage fault, and exits 2

    An unknown command, a typo or a name the tool does not have, exits 2, the usage status,
    never 1. The command is named on stderr, and help follows.

    @CLM-CLI-056 @unit @e2e
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

    @CLM-CLI-057 @unit @e2e
    Scenario: --exit-zero after an unknown command never moves its usage status
      Given the spec-controller host
      When it is asked for a name that is no command, with the report-only option after the command
      Then the invocation is refused as a usage error

  Rule: a flag that takes a value, given none, is a usage fault, refused before anything runs

    A flag that takes a value, given none, is refused at the usage status before any
    reconcile or report. A value is missing when nothing follows the flag, when
    another flag follows it, or when it is empty. --exit-zero cannot move the refusal. A
    missing value is never read as the word true.

    @CLM-CLI-058 @unit @e2e
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
        | the pytest report option  | at the end, with a file named true in the working directory |
        | the Jest report option    | at the end, with a file named true in the working directory |
        | the JUnit report option   | at the end, with a file named true in the working directory |
        | the RSpec report option   | at the end, with a file named true in the working directory |
        | the feature corpus option | with an empty value                                         |

  Rule: a flag given before the command is refused as out of place

    A command's flags go after it, and the refusal names where the flag belongs.

    @CLM-CLI-060 @unit @e2e
    Scenario Outline: a flag given before the command is refused as a flag out of place, never as an unknown command — <flag>
      Given a target that reconciles out-of-balance
      When a run is asked for with <flag>
      Then the invocation is refused as a usage error
      And the refusal names the flag as given before the command, never as an unknown command
      And nothing is written to the working directory

      Examples:
        | flag                                            |
        | the report-only option, before balance          |
        | the format option given md, before balance      |
        | an unknown flag, before balance                 |
        | the report-only option, before no known command |

  Rule: every argument is read as what it is, or refused as a usage fault before anything runs

    Refused as usage faults before anything runs: a value given to a flag that takes none, an
    argument that is neither a flag nor a flag's value, a second copy of a flag that does not
    repeat, and a flag written --flag=value.

    --help still answers first, whatever else is given, and reaches no verdict.

    @CLM-CLI-062 @unit @e2e
    Scenario Outline: balance refuses a value given to a flag that takes none, naming both — <shape>
      Given a target that reconciles out-of-balance
      When balance is asked to run with <flag> given the value <value>, <shape>
      Then balance refuses the run as a usage fault, with nothing reconciled
      And the refusal names <flag> as a flag that takes no value, and <value> as the value it was given

      Examples:
        | flag                   | value | shape                                     |
        | the strict option      | foo   | after the target's flags                  |
        | the report-only option | foo   | after the target's flags                  |

    @CLM-CLI-063 @unit @e2e
    Scenario Outline: balance refuses an argument that is neither a flag nor a flag's value, naming it — <shape>
      Given a target that reconciles out-of-balance
      When balance is asked to run with an argument that is no flag, <shape>
      Then balance refuses the run as a usage fault, with nothing reconciled
      And the refusal names that argument as one balance does not take

      Examples:
        | shape                                                                      |
        | the target's features directory alone, with no flag before it              |
        | a stray word after the target's flags, under the report-only option        |
        | a single-dash token after the target's flags, under the report-only option |
        | the command given twice                                                    |

    @CLM-CLI-064 @unit @e2e
    Scenario Outline: a flag that does not repeat, given twice, is refused naming the flag, never read as its last value — <flag> <shape>
      Given a target that reconciles out-of-balance
      When a run is asked for with <flag> given twice, <shape>
      Then the invocation is refused as a usage error
      And nothing is reconciled
      And the refusal names <flag> as given more than once

      Examples:
        | flag                      | shape                                                                           |
        | the feature corpus option | at a path that does not exist, then at the target, under the report-only option |
        | the target-name option    | as two different names                                                          |
        | the strict option         | with no value either time                                                       |

    @CLM-CLI-065 @unit @e2e
    Scenario Outline: a flag written --flag=value is refused naming the form and the spelling that is read, with no pin advice — <written> <shape>
      Given a target that reconciles out-of-balance
      When a run is asked for with <written>, <shape>
      Then the invocation is refused as a usage error
      And nothing is reconciled
      And the refusal names <written> as a form that is not read, and <spelling> as the spelling that is
      And the refusal advises no pin, and calls the flag neither unknown nor out of place

      Examples:
        | written                                                        | spelling                                                   | shape                                                  |
        | the format option and json joined by an equals sign            | the format option and json as two arguments                | after the target's flags                               |
        | the format option and json joined by an equals sign            | the format option and json as two arguments                | after the target's flags, under the report-only option |
        | the feature corpus option and nothing joined by an equals sign | the feature corpus option and a directory as two arguments | after the target's flags                               |
        | the format option and json joined by an equals sign            | the format option and json as two arguments                | before the command                                     |

    @CLM-CLI-068 @unit @e2e
    Scenario: nothing given at all answers the top-level help
      Given a target that reconciles out-of-balance
      When spec-controller is asked for nothing at all
      Then it answers with the top-level help, listing the commands, and succeeds
      And nothing is written to the working directory

    @CLM-CLI-073 @unit @e2e
    Scenario Outline: a --help before the command answers the top-level help ahead of any refusal of the tokens beside it, and writes nothing — <request>
      Given a target that reconciles out-of-balance
      When spec-controller is given <request>
      Then it answers with the same top-level help as a bare invocation, and succeeds
      And nothing is written to the working directory

      Examples:
        | request                                                           |
        | help by its long name after a flag out of place                   |
        | help by its long name after a flag out of place, before a command |

  Rule: the CLI answers --help from a single command/flag registry, completeness-guarded.

    <command> --help and -h print that command's flags, each with its name, value placeholder
    and description, and exit 0. Each command answers help before any parsing or work of its
    own.

    @CLM-CLI-006 @unit
    Scenario: <command> --help lists that command's flags and exits 0

    @CLM-CLI-007 @unit
    Scenario: spec-controller --help lists the commands

    @CLM-CLI-008 @unit
    Scenario: every registered flag, positional argument and command reaches its help surface (completeness guard)

    @CLM-CLI-009 @unit @e2e
    Scenario: an unregistered flag to balance is a usage error
      Given a flag balance has never registered
      When balance is asked to run with that unregistered flag
      Then the run is refused as a usage error, naming the unrecognised flag
      And nothing is reconciled
      And the refusal names the version that refused it and the bump that cures a pinned skew

  Rule: the corpus is every .feature file under the corpus directory, at any depth

    A project may keep its feature files in subdirectories. Where a feature file sits under
    the corpus changes nothing about how it is judged.

    @CLM-CLI-085 @unit @e2e
    Scenario: a feature file in a subdirectory of the corpus, at any depth, is read and judged as it would be at the top level
      Given a target whose feature files sit in its corpus at the top level and in subdirectories at several depths
      And the same target with every one of those feature files at the top level of its corpus
      When balance is asked to reconcile both of those targets
      Then the nested target's reconciliation reports the scenarios of every one of its feature files
      And both targets reach the same verdict over the same Claim Reconciliations

    @CLM-CLI-086 @unit @e2e
    Scenario: a feature file in a subdirectory is named by its path under the corpus, so two files of one name in different subdirectories are told apart
      Given a target whose corpus holds two feature files of one name in different subdirectories, each with a scenario of one title that carries no claim code
      When balance is asked to reconcile that corpus
      Then the reconciliation names each of those scenarios by its feature file's path under the corpus
      And each of those scenarios is counted against its own feature, not against the other

    @CLM-CLI-087 @unit @e2e
    Scenario: a subdirectory of the corpus the tool is not permitted to read is refused as unreadable, naming it, never skipped
      Given a target in which a subdirectory of the feature corpus, holding a feature file, is not permitted to be read
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the input it could not read and the path
      And the refusal says the tool was not permitted to read it

  Rule: with no deferral tags configured, balance defers a scenario that carries a built-in deferral tag

    @unit @CLM-CLI-088
    Scenario: a scenario tagged @wip, @ignore, @skip, @todo or @pending reads as a Pending Item while its untagged twin reads missing, whether Cucumber left it out or reported it pending

  Rule: balance hands fitness-function discovery the target's workflows, its manifest and its own command

    @unit @CLM-CLI-089
    Scenario: balance posts the checks a target's CI runs as fitness functions, and not the steps running the runners its manifest names

    @unit @CLM-CLI-090
    Scenario: balance recognises the step that runs it as the reconciler, with nothing configured, named in its step accounting

    @unit @CLM-CLI-091
    Scenario: a CI workflows input naming a directory is read as every workflow file in it, of either YAML spelling and nothing else

    @unit @CLM-CLI-092
    Scenario: balance writes nothing to stderr for a target whose specController block names no runners and no non-checks

  Rule: balance reads a corpus's claim codes end to end, and a claim code error never refuses the corpus

    @unit @CLM-CLI-093
    Scenario: balance over a corpus whose claim code two scenarios carry exits 1 with the report in full, one claim per sharer, reconciles every other account, and never refuses the corpus

    @unit @CLM-CLI-094
    Scenario: balance counts a prose mention of a feature part of two or five characters as an excluded claim code occurrence, and one of one or six characters as none, listing no claim code error

    @unit @CLM-CLI-095
    Scenario: balance over a scenario tagged with two claim codes opens no account under either, lists a several-claim-codes error naming both in the JSON and the markdown, and exits 1

    @unit @CLM-CLI-096
    Scenario: balance names each feature code by the file whose header carries it, and no file for a code only a scenario carries

    @unit @CLM-CLI-097
    Scenario: balance reads an empty feature directory as a corpus of no file and no feature code, judged with no claim code error

    @unit @CLM-CLI-098
    Scenario: balance reads a feature file's header code of two or five characters, and no code from a header of one or six

    @unit @CLM-CLI-099
    Scenario: balance names each code more than one scenario carries, with the file and the name of each scenario carrying it
