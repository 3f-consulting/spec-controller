@RMG
Feature: Keep a run — a named, metadata-stamped directory outside the repo

  When a run is KEPT (consultancy
  / product-dev, not CI), a thin scaffold turns a bare tool invocation into a stored run:
  it picks a run-id, makes <root>/<target>/<run-id>/, routes the tool's --format outputs
  in, and stamps run.yaml. Location-agnostic: the store root is an INJECTED parameter
  (the tool holds no storage opinion), proven against a temp root — the repo is never
  written. CI skips it (run the tool, consume stdout, discard).

  The scaffold splits by layer: a PURE planner (run-id, paths, run.yaml content from
  metadata) + an impure runner (mkdir, route --format, write run.yaml) — the runner is the
  only IO.

  Rule: a kept run creates a named directory with the routed outputs

    Under an injected store root, a kept run makes <root>/<target>/<run-id>/ and routes the
    tool's --format outputs into it — the document as spec-reconciliation.md, the machine form
    as spec-reconciliation.json (the whole-document report model). Nothing is written
    outside the root.

    @unit @CLM-RMG-001
    Scenario: a kept run writes spec-reconciliation.md and spec-reconciliation.json under the run directory

  Rule: a kept run stamps run.yaml with the decided fields

    The run dir carries a run.yaml manifest: schema_version (2), run_id, target, source_sha, tool_sha, tool_version,
    mode (balance), date, purpose (a list of grouping slugs — empty by
    default, an ad-hoc run, curated by hand afterward), links, and the artefact filenames.

    @unit @CLM-RMG-002
    Scenario: a kept run stamps run.yaml with schema_version, run_id, target, sha, tool identity, mode, date, an empty purpose list, links, and artefacts

  Rule: the run-id defaults to a timestamp, an operator mnemonic overrides it

    The run-id defaults to an ISO-8601 UTC timestamp (sortable, zero-friction); an operator
    may evidence observation a mnemonic (e.g. acme-q3, e1) via --run-id for a curated experiment or
    engagement, which names the run dir instead.

    A pure selection rule, so it is proven in isolation by Vitest: the default-vs-override rule over a pinned clock, with no IO.
    The default timestamp derives from an INJECTED instant (never a bare clock read), so the
    isolated Vitest test asserts the exact run-id string deterministically.

    @unit @CLM-RMG-003
    Scenario: the run-id is an ISO timestamp by default and an operator mnemonic overrides it

  Rule: the operator can store any command's run from the shipped tool

    A global --store <root> host modifier turns any command into a stored run. The host
    parses --store (and an optional --run-id) BEFORE dispatch; when --store is present it
    wraps the command via the kept-run scaffold — routing the command's outputs into
    <root>/<target>/<run-id>/ and stamping run.yaml — and hands the command its own clean
    args, unchanged. Storage is orthogonal to the command (it wraps any command with no change), so it is a cross-cutting HOST option — not a peer command,
    and never a flag inside balance, which stays emit-only. --store is required to store (no
    default: a default would write inside the repo, the committed-report leak); --run-id
    defaults to a timestamp. Without --store the host dispatches the command directly and its
    output is unchanged, unless --run-id is given, which names a stored run and so is refused
    (balance.feature).

    The @unit proves the host rule in isolation — given --store the command is invoked wrapped
    (its clean args plus the store-dir --format specs), without --store it is dispatched
    directly. The @e2e proves operator-reachability through the REAL binary: a stored run dir
    the operator can open, not the scaffold in isolation.

    @unit @e2e @CLM-RMG-004
    Scenario: `spec-controller --store <root> balance` writes a stored run the operator can reach
      Given a reconcilable target and a run store outside the repo
      When the operator runs balance under the store modifier and the run-name modifier
      Then the stored run ends on the out-of-balance verdict
      And a run directory named for the target and run-id exists under the run store
      And that run directory holds the saved reconciliation, in markdown and in JSON, and the run manifest
      And the run manifest reads mode balance, the target, and the run-id

  Rule: a store location that cannot take the run's reports is refused, never a crash

    A stored run writes a run directory and the two reports inside it. If any of them cannot
    be written, the run is refused as a usage error that names the location and the operating
    system's reason. The refusal shows no stack trace, and announces no run directory as if
    output had landed there. The refusal outranks the verdict. A root whose missing parents
    can be created is not refused: the store creates them. The run manifest is written last,
    after the reports. A run whose manifest cannot be written does not finish, and ends as an
    unexpected error, not a refusal.

    @unit @e2e @CLM-RMG-008
    Scenario Outline: a --store root that cannot be created is refused naming the location and why, with no stack trace and no run directory printed
      Given an out-of-balance target and a run store that is <location>
      When the operator stores a run of it under that run store
      Then the run is refused as a usage error, never reported as a verdict
      And the refusal names the run directory and says <reason>
      And the refusal carries no stack trace
      And no run directory is announced

      Examples:
        | location                                   | reason                          |
        | a regular file                             | a parent is not a directory     |
        | a path under a regular file                | a parent is not a directory     |
        | a directory it may not write               | permission was denied           |
        | a path under a directory it may not write  | permission was denied           |
        | a root whose run directory is a file       | the location already exists     |

    @unit @e2e @CLM-RMG-009
    Scenario Outline: a stored run that cannot write a report into its run directory is refused naming the file and why, with no stack trace and no run directory printed
      Given an out-of-balance target and a run store whose run directory already holds <obstacle>
      When the operator stores a run of it under that run store
      Then the run is refused as a usage error, never reported as a verdict
      And the refusal names <file> in the run directory and says <reason>
      And the refusal carries no stack trace
      And no run directory is announced

      Examples:
        | obstacle                                                      | file                                  | reason                         |
        | nothing it may write into                                     | the saved reconciliation, in markdown | permission was denied          |
        | a directory where the saved reconciliation, in markdown, goes | the saved reconciliation, in markdown | the destination is a directory |
        | a directory where the saved reconciliation, in JSON, goes     | the saved reconciliation, in JSON     | the destination is a directory |

  Rule: a --format output never shares a file the stored run writes

    A stored run writes its two reports and its run.yaml into its run directory. A --format given
    beside the store that names one of those files would be overwritten by the store's own write,
    or would overwrite it, and the run would end as if every report had landed. Such a run is
    refused as a usage error before any report is written: no run directory is announced, no
    run.yaml of this run is written, and an earlier run under the same run-id keeps its files.

    @unit @e2e @CLM-RMG-010
    Scenario Outline: a stored run given a --format naming its own report or run.yaml is refused naming the file, prints no run directory, and an earlier run under the same run id keeps its files
      Given an out-of-balance target and a run store holding <earlier>
      When the operator stores a run of it and also asks for the <format> report at <file> in the run directory
      Then the run is refused as a usage error, never reported as a verdict
      And the refusal names <file> in the run directory
      And the refusal carries no stack trace
      And no run directory is announced
      And no file under the run store was added, changed or removed

      Examples:
        | earlier                                   | format   | file                                  |
        | nothing yet                               | json     | the saved reconciliation, in markdown |
        | nothing yet                               | markdown | the saved reconciliation, in JSON     |
        | nothing yet                               | markdown | the saved reconciliation, in markdown |
        | nothing yet                               | markdown | the run manifest                      |
        | an earlier kept run under the same run-id | json     | the saved reconciliation, in markdown |
        | an earlier kept run under the same run-id | markdown | the saved reconciliation, in JSON     |
        | an earlier kept run under the same run-id | markdown | the run manifest                      |

  Rule: a --format output never overwrites an earlier stored run's files

    An earlier stored run's directory holds the run.yaml and the two reports that are its record.
    A run, bare or stored under another run id, given a --format naming one of those files would
    replace that record and end at its ordinary verdict. Such a run is refused as a usage error
    before any report is written, and the earlier run keeps its files. A directory is a stored
    run's when it holds a run.yaml that reads as a run manifest; the run needs no store to know it.

    @unit @e2e @CLM-RMG-012
    Scenario Outline: a run given a --format naming a file of an earlier stored run is refused naming the file, and that run keeps its files
      Given an out-of-balance target and a run store holding an earlier stored run of a balanced target
      When the operator makes <how> of it and also asks for the <format> report at <file> in the earlier run's directory
      Then the run is refused as a usage error, never reported as a verdict
      And the refusal names <file> in the earlier run's directory
      And the refusal carries no stack trace
      And no run directory is announced
      And no file under the run store was added, changed or removed

      Examples:
        | how                               | format   | file                                  |
        | a bare run                        | json     | the saved reconciliation, in JSON     |
        | a bare run                        | markdown | the run manifest                      |
        | a run stored under another run id | markdown | the saved reconciliation, in markdown |

    @unit @CLM-RMG-013
    Scenario: a --format path beside a run.yaml that is not a run manifest is written as before

    @unit @e2e @CLM-RMG-014
    Scenario Outline: a run given a --format that is a symlink to a file of an earlier stored run is refused naming the link and that run's directory, and that run keeps its files
      Given an out-of-balance target and a run store holding an earlier stored run of a balanced target
      And a link to <file> in the earlier run's directory
      When the operator makes <how> of it and also asks for the <format> report at that link
      Then the run is refused as a usage error, never reported as a verdict
      And the refusal names the link and the earlier run's directory
      And the refusal carries no stack trace
      And no run directory is announced
      And no file under the run store was added, changed or removed

      Examples:
        | how                               | format   | file                              |
        | a bare run                        | json     | the saved reconciliation, in JSON |
        | a run stored under another run id | markdown | the run manifest                  |

  Rule: a stored run's run.yaml records only a run that wrote its report

    run.yaml names the two reports a stored run writes. A run that writes neither keeps no
    manifest, and does not announce a run directory as if output had landed there. Help is
    answered before the store is touched, so it makes no store at all. A re-render keeps no run
    and is refused before one starts, naming the store. A refused run may leave an empty
    directory, a truthful record of a run that produced nothing. A manifest already under that
    run-id belongs to an earlier run and is left as it was.

    @unit @e2e @CLM-RMG-005
    Scenario Outline: a stored run refused for an unknown flag leaves no run.yaml and prints no run directory, and an earlier run under the same run-id keeps its record
      Given a run store holding <earlier>
      When the operator stores a balance run under that run-id with a flag balance does not accept
      Then the stored run is refused as a usage error, never reported as a verdict
      And the stored run announces no run directory
      And the refused run added, changed or removed no file under the run store

      Examples:
        | earlier                                   |
        | nothing yet                               |
        | an earlier kept run under the same run-id |

    @unit @e2e @CLM-RMG-006
    Scenario Outline: a stored balance --help answers the help before the store is touched, even under a store root that cannot be written
      Given a run store that is <root>
      When the operator asks for balance's help by its <name> name under that run store
      Then the help is answered, as it is with no run store
      And the run store is as it was before the run

      Examples:
        | name  | root           |
        | long  | not yet made   |
        | short | not yet made   |
        | long  | a regular file |
        | short | a regular file |

    @unit @e2e @CLM-RMG-007
    Scenario Outline: a stored --render-from-json re-render is refused naming --store, never a flag the operator did not give, and nothing is stored
      Given a saved reconciliation that is <saved>
      When the operator asks for it to be re-rendered under a run store <beside>
      Then the re-render is refused as a usage error, naming the store as what it cannot take
      And the refusal names no flag the operator did not give
      And the stored re-render produces no report
      And no run store is made

      Examples:
        | saved                     | beside                        |
        | of an out-of-balance run  | with nothing else             |
        | of an out-of-balance run  | strictly                      |
        | of an out-of-balance run  | with a failing verdict zeroed |
        | at a path that is missing | with nothing else             |

  Rule: a stored run never writes its own files over a file it reads

    A stored run writes its two reports and its run.yaml into its run directory. When one of the
    files the run reads already sits there under one of those names, the stored run would write
    over its own input and still end on its verdict. Such a run is refused as a usage error before
    anything is written, naming the file: no run directory is announced, no run.yaml of this run is
    written, and an earlier run under the same run-id keeps its files.

    @unit @e2e @CLM-RMG-011
    Scenario Outline: a stored run whose report or run.yaml would land on one of its inputs is refused naming the file, prints no run directory, and every input is left as it was
      Given a balanced target whose <input> sits where a stored run of it would write <file>, over <earlier>
      When the operator stores a run of it reading that input
      Then the stored run is refused as a usage error, naming that file
      And its refusal is a single line with no stack trace
      And no kept run is announced
      And every file of the target and its store is left exactly as it was

      Examples:
        | input            | file                                  | earlier                                   |
        | cucumber report  | the saved reconciliation, in JSON     | nothing yet                               |
        | unit test report | the saved reconciliation, in markdown | nothing yet                               |
        | workflow file    | the run manifest                      | nothing yet                               |
        | workflow file    | the run manifest                      | an earlier kept run under the same run-id |
