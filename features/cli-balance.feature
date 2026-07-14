@CLI
Feature: spec-controller balance runs standalone

  The `spec-controller balance` command reconciles a target's declared scenarios
  against its observed evidence and emits the Evidence Reconciliation. It runs on
  the public core plus the application layer alone — no private engine, no
  `analyse` / `migrate` — so the open-source tool is complete and useful on its
  own: a developer installs `spec-controller`, points `balance` at their features
  and test reports, and gets the reconciliation.

  @SCN-CLI-001 @e2e
  Scenario: balance reconciles a target and emits the Evidence Reconciliation to stdout
    Given a target with declared scenarios and a Vitest report of what ran
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
      Given a target with declared scenarios and a Vitest report
      When "spec-controller balance" is invoked with no --cucumber flag through the CLI binary
      Then the command exits zero
      And it reconciles the declared scenarios against the supplied evidence

  Rule: balance's exit code reflects the reconciliation verdict.

    `balance` is a GATE, not just a reporter: any out-of-balance reconciliation makes
    it exit EXACTLY `1` — not merely non-zero — so it reds a CI build and can't
    masquerade as the usage error (`2`, @SCN-CLI-002). Out-of-balance is a domain
    derivation over the WHOLE reconciliation: out-of-balance iff ANY reconciling item
    exists anywhere — a scenario's out-of-balance items AND the suspense-row items
    (a static-guard watermelon, an undemanded credit, a phantom scenario) — NOT a scan
    of declared-scenario verdicts alone, which would let a watermelon-only run (no
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
    4 unsound). A present-but-unparseable report is an INPUT fault — sibling to a missing
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

  # THE DECLARED SIDE of the same rule (@SCN-CLI-016, 3F-1767). The tool's inputs are not only
  # the evidence reports; the FEATURE CORPUS is an input too — the ledger's DEBIT side. It was
  # read by a hand-rolled TAG-LINE SCAN that never looked for a Scenario: header, so a malformed
  # tag line simply stopped being a tag line and its scenario CEASED TO EXIST. One stray
  # character — in a file cucumber itself rejects — deleted a failing row and turned an
  # out-of-balance run (exit 1) into a clean BALANCED (exit 0). A dropped scenario cannot even
  # reconcile `missing`, because it was never DECLARED to be missing: the run reads CLEANER THAN
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
  # A VALID scenario carrying no @SCN is NOT this fault — it parses cleanly. Whether undeclarable
  # work should red a run is a policy question, deliberately kept out of this bug fix (3F-1774).

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

  Rule: the CLI answers --help from a single command/flag registry, completeness-guarded.

    `spec-controller balance --help` (and `-h`) prints the balance command's flags —
    each name + arg-placeholder + description — rendered from the declarative
    command/flag registry, and exits 0. It is handled in `runBalance` BEFORE any
    parse/reconcile, so `--help` never falls through as a stray flag while balance runs
    anyway. The registry is the single source: a flag exists ⇒ a registry entry ⇒ it
    appears in help, by construction.

    @SCN-CLI-006 @unit @e2e
    Scenario: balance --help lists the command's flags and exits 0
      Given the spec-controller binary
      When "spec-controller balance --help" is invoked
      Then it exits 0 and prints each registered balance flag with its description

    @SCN-CLI-007 @unit @e2e
    Scenario: spec-controller --help lists the commands and the global --store/--run-id modifiers
      Given the spec-controller top-level binary
      When "spec-controller --help" is run
      Then it exits 0, lists each registered command, and documents the global --store and --run-id modifiers

    @SCN-CLI-008 @unit
    Scenario: every registered flag, command and modifier reaches its help surface (completeness guard)
      Given the two-scope command/flag registry and its two help renderers
      Then no per-command flag the registry declares is missing from the balance --help render
      And no global modifier and no registered command is missing from the top-level --help render
      And a registry entry that its help surface omits reds the guard

    @SCN-CLI-009 @unit @e2e
    Scenario: an unregistered flag to balance is a usage error
      Given the spec-controller balance command
      When "spec-controller balance --bogus" is run through the CLI binary
      Then it exits with status 2 naming the unrecognised flag --bogus on stderr
      And nothing is reconciled to stdout
