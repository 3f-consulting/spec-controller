@FMT
Feature: Emit each output format to stdout or a caller-given path

  The tool holds
  no storage opinion: it emits each requested format to stdout or a path the caller
  gives, via a repeatable "--format <fmt>[:<path>]" flag — like vitest/cucumber. No
  auto-archive, no target resolution; the caller decides where output lands. Extensible
  to future formats (html, sarif); applies to every command.

  Dispatch splits by layer (the three-layer architecture): the renderers stay pure
  (model → string); planning the output is a PURE parse+validate of the --format grammar
  (→ an output plan or a typed error); a thin writer performs the only IO (stdout / file);
  the CLI is the thin edge. Each @integration arm asserts the REAL IO effect (stdout
  bytes / file contents / exit + stderr hint), never a re-run of the output plan's @unit.

  Rule: markdown emits to stdout by default

    No --format flag — and an explicit "--format md" — emits the markdown report to
    stdout, the default human output. It rests on the output plan and the writer.

    @unit @SCN-FMT-001
    Scenario: with no --format flag the markdown report is written to stdout

  Rule: a format routes to a caller-given file

    A "<fmt>:<path>" spec writes that format's report to the file; stdout stays clean.
    The path is everything after the first colon; the renderer is unchanged.

    @unit @SCN-FMT-002
    Scenario: --format json:<path> writes the JSON report to that file

    @unit @integration @SCN-FMT-003
    Scenario: --format md:<path> writes the markdown report to a file instead of stdout
      Given a target corpus to reconcile
      When the operator asks for the markdown report in a file
      Then the markdown report is in that file, and nothing else is reported

    @unit @e2e @SCN-FMT-012
    Scenario: a --format path that is a symlink to a file not yet created is written through the link
      Given a balanced target and a link to a report file that does not exist yet
      When the operator asks for the json report to be written at the link
      Then the run succeeds and nothing is refused
      And the json report is written into the file the link points to, and the link still points there

  Rule: multiple formats route independently in one invocation

    Several --format specs in one run each route to their own destination — so a caller
    gets markdown on stdout and json in a file from a single invocation (exactly one
    output bound for stdout, which the stdout invariant allows).

    @unit @SCN-FMT-004
    Scenario: --format md --format json:<path> emits markdown to stdout and json to the file

  Rule: at most one output may route to stdout

    Every output routes to stdout or a file, and AT MOST ONE may route to stdout, so
    stdout never carries two interleaved documents. Two outputs both bound for stdout —
    two different formats, OR the same format twice — are rejected with a non-zero exit
    and a hint to give one of them a :<path>. The check counts stdout-destined outputs
    (≤ 1), so "--format md --format md" is caught, not only distinct formats. A path that
    names standard output itself (/dev/stdout, /dev/fd/1, or a link to either) routes to
    stdout and is counted with it, whatever standard output is connected to.

    @unit @integration @SCN-FMT-005
    Scenario: two outputs both routed to stdout are rejected with a hint
      Given a target corpus to reconcile
      When the operator asks for the markdown report and the json report, neither given a file of its own
      Then the run is rejected
      And the rejection hints to give one of the outputs a path of its own

    @unit @e2e @SCN-FMT-011
    Scenario Outline: a --format path naming stdout counts as routed to stdout, so beside another stdout output it is refused and no report is printed
      Given an out-of-balance target whose default report destination is <connected to>
      When the operator asks for the markdown report at <first> and the json report at <second>
      Then the run is refused as a usage error, never reported as a verdict
      And the refusal says more than one output goes to the same place
      And the refusal carries no stack trace
      And nothing reaches the default report destination

      Examples:
        | connected to | first               | second                      |
        | a pipe       | standard output     | /dev/stdout                 |
        | a pipe       | /dev/stdout         | /dev/stdout                 |
        | a pipe       | standard output     | /dev/fd/1                   |
        | a pipe       | standard output     | a link to /dev/stdout       |
        | a file       | standard output     | /dev/stdout                 |
        | a file       | /dev/fd/1           | a link to /dev/stdout       |

  Rule: the legacy --json flag is rejected with a migration hint

    The earlier --json <path> flag is gone. Supplying it fails fast with a hint to use
    --format json:<path>, so the removed flag never silently no-ops and drops output.

    @unit @integration @SCN-FMT-006
    Scenario: the legacy --json flag is rejected with a hint to use --format json:<path>
      Given a target corpus to reconcile with a destination for the legacy json option
      When the operator asks for the json report through the removed legacy json option
      Then the run is rejected and does not create that destination
      And the rejection hints to use the format option to write the json report to a file

  Rule: an unknown format is rejected

    A --format naming an unsupported format (e.g. xml, or a typo) fails fast with a
    non-zero exit and a hint listing the supported formats (md, json) — basic public-CLI
    robustness, the same typed-error surface as the stdout-collision and legacy-flag
    rejections.

    @unit @integration @SCN-FMT-007
    Scenario: --format xml (an unsupported format) is rejected with a hint listing md and json
      Given a target corpus to reconcile with an unsupported report format
      When the operator asks for the xml report
      Then the run is rejected for the unknown format
      And the rejection lists the supported formats md and json

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
      And no report is produced

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
      And no report is produced
      And the markdown report destination is left exactly as it was

      Examples:
        | markdown                      | first    |
        | the terminal                  | markdown |
        | the terminal                  | json     |
        | a file that does not exist    | markdown |
        | a file that does not exist    | json     |
        | a file holding an earlier run | markdown |
        | a file holding an earlier run | json     |

  Rule: two outputs never share one regular file, however it is named, and a run that asks for it is refused before anything is written

    A file written twice keeps only the last report written into it, so a run that sent two of its
    outputs to one file would exit as if both had been written when only one survives. Two outputs
    share a file when both land on one regular file, whatever path names it: the same path twice,
    the same format twice, a relative spelling beside an absolute one, a path through "..", a
    symbolic link, a path through a linked directory, a hard link, or the file standard output is
    redirected into. The file is recognised by the operating system's identity for it, not by the
    spelling. Such a run is refused as a usage error before any report is emitted, so every
    destination is left as it was. The refusal names both outputs as the operator gave them. A
    destination that is not a regular file (a terminal, a pipe, a device) is never refused for being
    shared, because writing it twice loses nothing.

    @unit @e2e @SCN-FMT-010
    Scenario Outline: two outputs naming one regular file are refused as a usage error naming both, and no destination is written or changed
      Given an out-of-balance target and a report file that <state>
      And a second path to that file that is <alias>
      When the operator asks for the <first> report at the file and the <second> report at the second path, and a third report at a file of its own
      Then the run is refused as a usage error, never reported as a verdict
      And the refusal names both outputs that share the file
      And the refusal carries no stack trace
      And no report is produced
      And every destination is left exactly as it was

      Examples:
        | state                | alias                                              | first    | second   |
        | does not exist       | the same path                                      | markdown | markdown |
        | does not exist       | the same path                                      | markdown | json     |
        | does not exist       | the same path                                      | json     | markdown |
        | holds an earlier run | the same path                                      | markdown | json     |
        | does not exist       | the path spelled from the current folder           | markdown | json     |
        | does not exist       | its absolute path                                  | markdown | json     |
        | does not exist       | a path through a sibling folder and back           | markdown | json     |
        | holds an earlier run | a symbolic link to it                              | markdown | json     |
        | holds an earlier run | a path through a link to its folder                | markdown | json     |
        | holds an earlier run | a hard link to it                                  | markdown | json     |
        | holds an earlier run | where the default report destination is redirected | markdown | json     |

  Rule: no output lands on a file the run reads, however it is named, and a run that asks for it is refused before anything is written

    A run reads its test reports, its record of the CI steps, its workflows, its feature files and
    its manifest: some because it was pointed at them, and some because they sit where it looks by
    default. A report written over one of them destroys it, and the run would still end on its
    ordinary verdict; for a workflow or the step record, the next run would not notice either. Such
    a run is refused as a usage error before any report is emitted, naming the report and the input
    it would have overwritten. The input is recognised by the operating system's identity for the
    file, as two outputs sharing a file are, so every spelling and every link counts, and so does
    standard output appended into an input. A file the run does not read, beside an input or inside
    one of its folders, is written as asked.

    @unit @e2e @SCN-FMT-013
    Scenario Outline: a --format naming a file the run reads as input is refused as a usage error naming the output and the input, and every input and destination is left as it was
      Given a <verdict> target the run reads <input> from
      And a path to that input that is <alias>
      When the operator <runs> it and asks for the <format> report at that path, and a second report at a file of its own
      Then the run is refused as a usage error, not a verdict, naming the report and the input it would overwrite
      And the refusal is a single line with no stack trace
      And nothing is reported
      And every file of the target is left exactly as it was

      Examples:
        | verdict        | input                                                       | alias                                            | runs            | format   |
        | balanced       | the unit test report                                        | its own path                                     | runs            | json     |
        | balanced       | the cucumber report                                         | its own path                                     | runs            | markdown |
        | balanced       | the record of the CI steps                                  | its own path                                     | runs            | json     |
        | balanced       | the manifest it was pointed at                              | its own path                                     | runs            | json     |
        | balanced       | the manifest it reads by default                            | its own path                                     | runs            | json     |
        | balanced       | a feature file of the corpus it was pointed at              | its own path                                     | runs            | markdown |
        | balanced       | a feature file of the corpus it reads by default            | its own path                                     | runs            | json     |
        | balanced       | the workflow file it was pointed at                         | its own path                                     | runs            | json     |
        | balanced       | a .yml workflow of the folder it was pointed at             | its own path                                     | runs            | json     |
        | balanced       | a .yaml workflow of the folder it was pointed at            | its own path                                     | runs            | json     |
        | balanced       | a workflow of the folder it reads by default                | its own path                                     | runs            | json     |
        | out-of-balance | the unit test report                                        | its own path                                     | runs            | json     |
        | balanced       | the unit test report                                        | the path spelled from the current folder         | runs            | json     |
        | balanced       | the unit test report                                        | its absolute path                                | runs            | json     |
        | balanced       | the unit test report                                        | a path through a sibling folder and back         | runs            | json     |
        | balanced       | the unit test report                                        | a symbolic link to it                            | runs            | json     |
        | balanced       | the unit test report                                        | a hard link to it                                | runs            | json     |
        | balanced       | a workflow of the folder it reads by default                | a path through a link to its folder              | runs            | json     |
        | balanced       | the unit test report, named through a symbolic link         | its own path                                     | runs            | json     |
        | balanced       | a feature file of the corpus, named through a linked folder | its own path                                     | runs            | json     |
        | balanced       | the unit test report                                        | where the default report destination is appended | runs            | markdown |
        | out-of-balance | the workflow file it was pointed at                         | where the default report destination is appended | runs            | markdown |
        | balanced       | the unit test report                                        | its own path                                     | stores a run of | json     |
        | balanced       | the manifest it reads by default                            | its own path                                     | stores a run of | markdown |
