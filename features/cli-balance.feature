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
    When "spec-controller balance" is invoked over that target through the CLI binary
    Then the command exits zero
    And it prints the Evidence Reconciliation to stdout
    And the reconciliation reports the target's scenarios

  Rule: A supplied input path that does not exist is a hard error, not silent empty evidence.

    A supplied `--vitest` / `--cucumber` / `--features` / `--ci` / `--package-json`
    whose path does not exist halts `balance` BEFORE reconciling — non-zero exit,
    stderr naming the flag and the missing path — never the silent zero-evidence
    all-red report that a mistyped path used to produce. The five flags are
    Examples of one boundary behaviour; scope is existence only.

    @SCN-CLI-002 @unit @e2e
    Scenario Outline: a supplied-but-missing <flag> exits non-zero and names the path
      Given a target, and <flag> pointing at a path that does not exist
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the command exits non-zero
      And stderr names <flag> and the missing path
      And nothing is reconciled

      Examples:
        | flag           |
        | --vitest       |
        | --cucumber     |
        | --features     |
        | --ci           |
        | --package-json |

    @SCN-CLI-003 @unit @e2e
    Scenario: an omitted optional input flag is not an error
      Given a target with scenarios and a Vitest report
      When "spec-controller balance" is invoked with no --cucumber flag through the CLI binary
      Then the command exits zero
      And it reconciles the scenarios against the supplied evidence

  Rule: balance's exit code reflects the reconciliation verdict.

    `balance` is a GATE, not just a reporter: any out-of-balance reconciliation makes
    it exit EXACTLY `1` — not merely non-zero — so it reds a CI build and can't
    masquerade as the usage error (`2`, @SCN-CLI-002). Out-of-balance is a domain
    derivation over the WHOLE reconciliation: out-of-balance iff ANY reconciling item
    exists anywhere — a scenario's out-of-balance items AND the suspense-row items
    (a static-check watermelon, a no-evidence-obligation credit, a phantom scenario) — NOT a scan
    of scenario verdicts alone, which would let a watermelon-only run (no
    out-of-balance scenario) exit `0`, the false pass this gate must never give.

    @SCN-CLI-004 @unit @e2e
    Scenario: an out-of-balance reconciliation exits 1
      Given a target that reconciles out-of-balance
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the command exits with status 1
      And it prints the Evidence Reconciliation to stdout

    @SCN-CLI-005 @unit @e2e
    Scenario: an all-balanced reconciliation exits 0
      Given a target that reconciles all-balanced
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the command exits with status 0

  Rule: an unsound run pre-empts the balance verdict

    You cannot trust a reconciliation whose evidence never materialised, so unsound
    DOMINATES. Exit 4 (taxonomy: 0 balanced / 1 out-of-balance / 2 usage / 3 pending-
    under-strict / 4 unsound) even though a broken run is ALSO out-of-balance — the broken
    item sits on the suspense row, so `isBalanced` is already false. Exit 1 says "the
    ledger disagrees"; exit 4 says "the ledger could not be trusted to disagree". The
    pre-emption is load-bearing, not cosmetic: unless broken evidence is checked BEFORE
    the balance verdict, exit 4 is unreachable and the collection failure stays masked as
    an honest disagreement.

    @unit @e2e @SCN-CLI-012
    Scenario: a run whose vitest report carries a collection-failed suite exits 4, not 1
      Given a target whose vitest report carries a collection-failed suite
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the command exits with status 4
      And it prints the Evidence Reconciliation to stdout

  Rule: --strict escalates Pending Items to a run failure

    Pending Items are run-neutral by default (the slice-2 partition, @SCN-PND-008); --strict
    is the opt-in that fails a run carrying them. This Rule pins the LENIENT DEFAULT first:
    a reconciliation that is balanced except for Pending Items exits 0 through the real binary
    when --strict is NOT given, so deferred work never reds a build unless the team opts in.
    (The --strict escalation to exit 3 — distinct from out-of-balance's 1 — is @SCN-CLI-011.)

    @unit @e2e @SCN-CLI-010
    Scenario: an only-Pending-Items reconciliation with no --strict → balance exits 0
      Given a target whose only exception is Pending Items
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the command exits with status 0
      And it prints the Evidence Reconciliation to stdout
      And the reconciliation reports a Pending Item

    @unit @e2e @SCN-CLI-011
    Scenario: an only-Pending-Items reconciliation with --strict → balance exits 3
      Given a target whose only exception is Pending Items
      When "spec-controller balance" is invoked with --strict over that target through the CLI binary
      Then the command exits with status 3
      And it prints the Evidence Reconciliation to stdout
      And the reconciliation reports a Pending Item

  Rule: the printed verdict agrees with the process exit code

    The bug was THREE VIEWS OF ONE RUN DISAGREEING: the scenario tally said 0 out-of-balance
    (a pass), the obligation tally said 17, and the process exited 1. Each was internally
    consistent; nothing pinned them TOGETHER, so they drifted and a failing run read as
    clean for as long as anyone cared to look.

    Once the tally counts every Scenario Reconciliation, the tally, `isBalanced` and the
    exit code are three statements of one fact. Pin that they agree — so no future change
    can move one without moving the others.

    @unit @e2e @SCN-CLI-013
    Scenario: the tally, the verdict headline and the process exit code name the same outcome
      Given a target whose only out-of-balance row is the suspense reconciliation
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the trial-balance table counts 1 out-of-balance Scenario Reconciliation
      And the verdict headline reads OUT-OF-BALANCE and names exit 1
      And the command exits with status 1
      And the tally, the verdict headline and the process exit code agree

  Rule: an input the tool cannot read is a usage error, never a verdict

    exit 1 means OUT-OF-BALANCE — the accounts disagree — and nothing else. A tool that
    CRASHED before reconciling must never reach for it: a broken invocation masquerading
    as an honest disagreement is precisely the meaning-collision the exit taxonomy exists
    to prevent (0 balanced / 1 out-of-balance / 2 usage / 3 pending-under-strict /
    4 unsound / 5 nothing to reconcile). A present-but-unparseable report is an INPUT fault — sibling to a missing
    path (@SCN-CLI-002) and an unrecognised flag (@SCN-CLI-009), both already exit 2 — so
    it halts BEFORE reconciling, naming the file and the parse failure, and exits 2.

    Not 4 (unsound): unsound is a VALID, parseable report whose evidence didn't fully
    materialise — the reconciliation still runs and can be trusted to say so. A malformed
    report cannot be reconciled at all.

    Scope is the JSON-BEARING inputs. --ci is never JSON/YAML-parsed (it is read as text and
    scanned for run: steps) and --features is Gherkin-parsed tolerantly, so neither can crash
    the process: on garbage they reconcile normally and their exit 1 is a true verdict.

    The rule reaches --render-from-json too (@SCN-CLI-015), the one flag the guard lane never
    reached: it returns BEFORE the input guards run, so it honoured neither — a missing path
    crashed to ENOENT and a malformed file to SyntaxError, both landing on exit 1. Its
    missing-path case was a live violation of @SCN-CLI-002's own shipped principle, which the
    CLI enforced for the five evidence flags and not for this one. MISSING and UNPARSEABLE
    are two Examples of the one boundary rule.

    @unit @e2e @SCN-CLI-014
    Scenario: a present-but-unparseable evidence report exits 2, naming the file and the parse failure
      Given a target, and --vitest pointing at a report that exists but is not valid JSON
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the command exits with status 2
      And stderr names the unparseable report and the parse failure
      And nothing is reconciled

    @unit @e2e @SCN-CLI-015
    Scenario Outline: a --render-from-json report the tool cannot read exits 2, naming the file
      Given --render-from-json pointing at a saved report that is <defect>
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the command exits with status 2
      And stderr names the unreadable saved report
      And nothing is rendered

      Examples:
        | defect      |
        | missing     |
        | unparseable |

  # THE OBLIGATION SIDE of the same rule (@SCN-CLI-016, 3F-1767). The tool's inputs are not only
  # the evidence reports; the FEATURE CORPUS is an input too — the ledger's DEBIT side. It was
  # read by a hand-rolled TAG-LINE SCAN that never looked for a Scenario: header, so a malformed
  # tag line simply stopped being a tag line and its scenario CEASED TO EXIST. One stray
  # character — in a file cucumber itself rejects — deleted a failing row and turned an
  # out-of-balance run (exit 1) into a clean BALANCED (exit 0). A dropped scenario cannot even
  # reconcile `missing`, because it was never RAISED to be missing: the run reads CLEANER THAN
  # REALITY. That is the exact false-green this tool exists to prevent, aimed at itself.
  #
  # Every feature file is now VALIDATED by the real Gherkin parser — cucumber's own — before any
  # reconcile. A file the parser rejects is an input the tool cannot read: exit 2, halt before
  # reconciling, name the file and the parse failure. Never a verdict, and never a green.
  #
  # Validation is half the story: it decides whether a file can be READ. The corpus is then
  # EXTRACTED from that same real AST (@SCN-LDG-020), so what spec-controller reconciles IS what
  # cucumber runs — Feature/Rule tag inheritance included. One reading of the file, not two.
  #
  # A VALID scenario carrying no @SCN is NOT this fault — it parses cleanly. Whether UNCODED work
  # should red a run is a policy question, deliberately kept out of this bug fix (3F-1774).

    @unit @e2e @SCN-CLI-016
    Scenario Outline: a feature file the tool cannot parse exits 2, naming the file and the parse failure
      Given --features containing a feature file that is <defect>
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the command exits with status 2
      And stderr names the unparseable feature file and the parse failure
      And nothing is reconciled

      Examples:
        | defect                     |
        | a corrupt tag line         |
        | a corrupt scenario keyword |
        | wholly unparseable         |

  Rule: a target with no Gherkin corpus is reconciled, not refused

    `new-client` is a supported adoption state, not a degraded one, and most targets have
    no `features/` directory at all. An absent DEFAULT corpus escaped as a raw ENOENT and
    landed on Node's default exit 1 — the out-of-balance code — which is the exact collision
    that @SCN-CLI-014/015/016 closed on every other input, alive on the one path each new
    consumer is guaranteed to take. The corpus that is ABSENT and the corpus that holds NO
    SCENARIO are one answer, not two, and the report names the directory it examined.

    A SUPPLIED `--features` at a path that does not exist is untouched by this Rule and stays a
    usage fault at exit 2 (@SCN-CLI-002): supplied-but-absent is the operator mistyping,
    absent-by-default is the target's honest shape.

    @SCN-CLI-017 @unit @e2e
    Scenario: a target with no features/ directory is reported on, never crashed over
      Given a target with no Gherkin corpus at all — no features directory on disk
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then it prints the Evidence Reconciliation to stdout
      And the run ends on an enumerated status rather than a stack trace

    @SCN-CLI-018 @unit @e2e
    Scenario: an absent corpus and a corpus holding no scenario reach the same verdict by the same sentence
      Given a target with no corpus directory, a target whose corpus is empty, and a target whose corpus declares no scenario
      When "spec-controller balance" is invoked over each of those targets through the CLI binary
      Then every one of them is told the same verdict by the same sentence
      And that sentence names the corpus directory it examined

  Rule: a run with nothing to reconcile has no verdict to give, and says so

    `isBalanced` is `.every()` over the rows and so is VACUOUSLY TRUE on an empty ledger: a
    target that declared nothing and produced nothing was told "BALANCED … (exit 0)" — a green
    over silence, from the tool whose whole claim is that silence is not the same as nothing
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
      Given a target that declared no scenario and produced no evidence
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the command exits with status 5
      And the verdict headline says the run had nothing to reconcile, never that it balanced

    @SCN-CLI-020 @unit @e2e
    Scenario: a corpus-less run carrying uncited credits is an ordinary out-of-balance report at exit 1
      Given a target with no Gherkin corpus whose unit evidence cites no scenario
      When "spec-controller balance" is invoked over that target through the CLI binary
      Then the uncited credits are posted to the suspense reconciliation
      And the verdict headline reads OUT-OF-BALANCE and names exit 1
      And the command exits with status 1
      And the run is never read as one with nothing to reconcile

  Rule: --exit-zero moves the verdict codes to 0 and never the couldn't-run codes

    The on-ramp for a new-client or annotated adopter: the gate's report, stated exactly,
    without the red. Gate stays the default. The flag is a CLI-edge suppression of the
    process status only, invisible to the core exactly as --strict is — so the report,
    headline included, still names the code the GATE gives; @SCN-CLI-013's agreement is
    between the headline and the gate, and holds unchanged with no flag.

    @SCN-CLI-021 @unit @e2e
    Scenario Outline: under --exit-zero a <verdict> run prints the same report byte for byte and exits 0
      Given a target that reconciles <verdict>
      When "spec-controller balance" is invoked <flags> over that target through the CLI binary, once without --exit-zero and once with it
      Then without --exit-zero the command exits with status <code>
      And with --exit-zero the command exits with status 0
      And the two runs print the same Evidence Reconciliation to stdout, byte for byte but for the run timestamp each stamps for itself

      Examples:
        | verdict            | flags         | code |
        | all-balanced       | with no flags | 0    |
        | out-of-balance     | with no flags | 1    |
        | only-Pending-Items | with --strict | 3    |

    @SCN-CLI-022 @unit @e2e
    Scenario Outline: --exit-zero never masks a run that could give no verdict — <state> still exits <code>
      Given <target>
      When "spec-controller balance" is invoked with --exit-zero over that target through the CLI binary
      Then the command exits with status <code>
      And <evidence>

      Examples:
        | state                | target                                                         | code | evidence                                                                           |
        | usage                | a target, and --vitest pointing at a path that does not exist  | 2    | stderr names --vitest and the missing path                                         |
        | unsound              | a target whose vitest report carries a collection-failed suite | 4    | it prints the Evidence Reconciliation to stdout                                    |
        | nothing to reconcile | a target that declared no scenario and produced no evidence    | 5    | the verdict headline says the run had nothing to reconcile, never that it balanced |

  Rule: an unknown command reaches no verdict about the corpus, and exits 6

    Exit 6 means spec-controller was asked something it cannot answer, and so reached no
    verdict about your corpus. It is not 1: 1 is a verdict against the corpus, and nothing was
    reconciled. A typo such as `blance` and a command that has left the tool both land here,
    and before 3F-3634 both exited 1, so a consumer's CI read a mistyped step as an accusation.
    The help that follows the statement is for a person at a terminal; the status is for the
    pipeline. Later commands that are asked something they cannot answer cite this meaning
    rather than defining a second one.

    @SCN-CLI-056 @unit @e2e
    Scenario Outline: an unknown command reaches no verdict about the corpus — <request>
      Given the spec-controller top-level binary
      When it is asked for <request>
      Then it answers that it reached no verdict about the corpus, with the no-verdict status
      And it names the command it does not know
      And it prints nothing a pipeline could read as a report

      Examples:
        | request                                    |
        | a typo of a command                        |
        | a name that is no command                  |
        | a name that is no command, as a stored run |

    # --exit-zero moves verdicts, and an unknown command reached none, so the flag cannot move it
    # wherever it is written. Written before the command, the host reads the flag itself as the
    # command, which is one more command it does not know.

    @SCN-CLI-057 @unit @e2e
    Scenario Outline: --exit-zero never moves an unknown command's no-verdict status — the flag <placement>
      Given the spec-controller top-level binary
      When it is asked for a name that is no command, with --exit-zero <placement>
      Then it answers that it reached no verdict about the corpus, with the no-verdict status

      Examples:
        | placement          |
        | after the command  |
        | before the command |

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

    @SCN-CLI-006 @unit @e2e
    Scenario: <command> --help lists that command's flags and exits 0
      Given the spec-controller binary
      When "spec-controller balance --help" is invoked
      Then it exits 0 and prints each flag the registry gives that command, with its description

    @SCN-CLI-007 @unit @e2e
    Scenario: spec-controller --help lists the commands and the global --store/--run-id modifiers
      Given the spec-controller top-level binary
      When "spec-controller --help" is run
      Then it exits 0, lists each registered command, and documents the global --store and --run-id modifiers

    @SCN-CLI-008 @unit
    Scenario: every registered flag, command and modifier reaches its help surface (completeness guard)
      Given the two-scope command/flag registry and its two help renderers
      Then no flag the registry gives any command is missing from that command's --help render
      And no global modifier and no registered command is missing from the top-level --help render
      And a registry entry that its help surface omits reds the guard

    @SCN-CLI-009 @unit @e2e
    Scenario: an unregistered flag to balance is a usage error
      Given the spec-controller balance command
      When "spec-controller balance --bogus" is run through the CLI binary
      Then it exits with status 2 naming the unrecognised flag --bogus on stderr
      And nothing is reconciled to stdout
      And the refusal names the version that refused it and the bump that cures a pinned skew

  Rule: a flag balance has retired is refused as retired, naming what replaced it — never as skew a pin can cure

    An unregistered flag is refused with drift advice (@SCN-CLI-009): the pin and the tree
    have drifted, so bump the pin to a version that accepts it. That advice is true of a flag
    newer than the pin and false of a flag the product has retired, which every earlier
    version accepts and no later one will: the only pin that satisfies it is a downgrade back
    onto the route the retirement removed (3F-3528). So a retired flag is refused as retired,
    with the version that retired it and what took its place, and no pin is offered.

    The retired flags are data on the command's registry entry, beside the flags it accepts,
    and append-only: a flag retires once and is never accepted again.

    @SCN-CLI-023 @unit @e2e
    Scenario: a retired flag to balance is refused as retired, naming its replacement and no pin that restores it
      Given a flag the balance command has retired
      When balance is asked to run with that flag
      Then balance refuses the run as a usage fault and reconciles nothing
      And the refusal names the flag as retired, with the version that retired it
      And the refusal names what replaced it
      And the refusal advises no pin toward a version that still accepts the flag
