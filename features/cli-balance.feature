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
