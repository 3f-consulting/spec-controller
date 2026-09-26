@FMT
Feature: Emit each output format to stdout or a caller-given path

  The tool holds
  no storage opinion: it emits each requested format to stdout or a path the caller
  gives, via a repeatable "--format <fmt>[:<path>]" flag — like vitest/cucumber. No
  auto-archive, no target resolution; the caller decides where output lands. Extensible
  to future formats (html, sarif); applies across all modes (balance / analyse / migrate).

  Dispatch splits by layer (the three-layer architecture): the renderers stay pure
  (model → string); planOutput is a PURE parse+validate of the --format grammar
  (→ an OutputPlan or a typed error); a thin writer performs the only IO (stdout / file);
  the CLI is the thin edge. Each @integration arm asserts the REAL IO effect (stdout
  bytes / file contents / exit + stderr hint), never a re-run of the planOutput @unit.

  Rule: markdown emits to stdout by default

    No --format flag — and an explicit "--format md" — emits the markdown report to
    stdout, the default human output. Establishes planOutput and the writer.

    @unit @integration @SCN-FMT-001
    Scenario: with no --format flag the markdown report is written to stdout
      Given a reconciled ledger for a target corpus
      When the outputs are planned with no --format flag and written
      Then the rendered markdown report is written to stdout

  Rule: a format routes to a caller-given file

    A "<fmt>:<path>" spec writes that format's report to the file; stdout stays clean.
    The path is everything after the first colon; the renderer is unchanged.

    @unit @integration @SCN-FMT-002
    Scenario: --format json:<path> writes the JSON report to that file
      Given a reconciled ledger for a target corpus
      When the outputs are planned with a json:<path> spec and written to that path
      Then the rendered JSON report is written to that file and stdout stays empty

    @unit @integration @SCN-FMT-003
    Scenario: --format md:<path> writes the markdown report to a file instead of stdout
      Given a reconciled ledger for a target corpus
      When the outputs are planned with a md:<path> spec and written to that path
      Then the rendered markdown report is written to that file and stdout stays empty

  Rule: multiple formats route independently in one invocation

    Several --format specs in one run each route to their own destination — so a caller
    gets markdown on stdout and json in a file from a single invocation (exactly one
    output bound for stdout, which the stdout invariant allows).

    @unit @integration @SCN-FMT-004
    Scenario: --format md --format json:<path> emits markdown to stdout and json to the file
      Given a reconciled ledger for a target corpus
      When the outputs are planned with a md spec and a json:<path> spec and written
      Then the markdown report is written to stdout and the JSON report to that file

  Rule: at most one output may route to stdout

    Every output routes to stdout or a file, and AT MOST ONE may route to stdout, so
    stdout never carries two interleaved documents. Two outputs both bound for stdout —
    two different formats, OR the same format twice — are rejected with a non-zero exit
    and a hint to give one of them a :<path>. The check counts stdout-destined outputs
    (≤ 1), so "--format md --format md" is caught, not only distinct formats.

    @unit @integration @SCN-FMT-005
    Scenario: two outputs both routed to stdout are rejected with a hint
      Given a target corpus to reconcile
      When the CLI is run with --format md and --format json
      Then the CLI exits non-zero
      And stderr hints to give one of the outputs a :<path>

  Rule: the legacy --json flag is rejected with a migration hint

    The earlier --json <path> flag is gone. Supplying it fails fast with a hint to use
    --format json:<path>, so the removed flag never silently no-ops and drops output.

    @unit @integration @SCN-FMT-006
    Scenario: the legacy --json flag is rejected with a hint to use --format json:<path>
      Given a target corpus to reconcile with a legacy --json destination
      When the CLI is run with the removed --json flag
      Then the CLI exits non-zero and does not create the --json file
      And stderr hints to use --format json:<path>

  Rule: an unknown format is rejected

    A --format naming an unsupported format (e.g. xml, or a typo) fails fast with a
    non-zero exit and a hint listing the supported formats (md, json) — basic public-CLI
    robustness, the same typed-error surface as the stdout-collision and legacy-flag
    rejections.

    @unit @integration @SCN-FMT-007
    Scenario: --format xml (an unsupported format) is rejected with a hint listing md and json
      Given a target corpus to reconcile with an unsupported --format
      When the CLI is run with --format xml
      Then the CLI exits non-zero rejecting the unknown format
      And stderr lists the supported formats md and json

  Rule: a file destination that cannot be written is refused before anything is emitted, never a crash

    Exit 1 means out-of-balance and nothing else, and Node's default is never one of the tool's
    codes. A report destination the tool cannot write is the invocation being wrong, exactly as an
    input it cannot read is, so it is refused as a usage error: one line naming the destination and
    the operating system's reason, and no stack trace. That covers a read-only file, a directory, a
    path under a regular file, a directory it may not write, and a parent that does not exist. The
    writer creates no directories. The refusal outranks the verdict: a target that is out of balance
    still ends on the usage code when its report has nowhere to go.

    @unit @e2e @SCN-FMT-008
    Scenario Outline: a --format file destination that cannot be written is refused naming the path and why, with no stack trace
      Given an out-of-balance target and a report destination that is <location>
      When the operator asks for the <format> report to be written to that destination
      Then the run is refused as a usage error, never reported as a verdict
      And the refusal names the destination and says <reason>
      And the refusal carries no stack trace
      And no report is printed

      Examples:
        | location                                     | format   | reason                         |
        | a read-only file                             | json     | permission was denied          |
        | a path under a regular file                  | json     | a parent is not a directory    |
        | a file in a directory it may not write       | json     | permission was denied          |
        | an existing directory                        | json     | the destination is a directory |
        | an existing directory                        | markdown | the destination is a directory |
        | a file whose parent directory does not exist | json     | the parent does not exist      |

    @unit @e2e @SCN-FMT-009
    Scenario Outline: when one file destination cannot be written, no destination is written: no report on stdout, and no other file created or changed
      Given an out-of-balance target and a json report destination under a regular file
      And a markdown report destination that is <markdown>
      When the operator asks for both reports, the <first> one named first
      Then the run is refused as a usage error, never reported as a verdict
      And no report is printed
      And the markdown report destination is left exactly as it was

      Examples:
        | markdown                      | first    |
        | the terminal                  | markdown |
        | the terminal                  | json     |
        | a file that does not exist    | markdown |
        | a file that does not exist    | json     |
        | a file holding an earlier run | markdown |
        | a file holding an earlier run | json     |
