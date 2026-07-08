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
  only IO. Each @integration arm asserts the REAL on-disk effect under a temp root, and
  that nothing is written in the repo.

  Rule: a kept run creates a named directory with the routed outputs

    Under an injected store root, a kept run makes <root>/<target>/<run-id>/ and routes the
    tool's --format outputs into it — the document as spec-reconciliation.md, the machine form
    as spec-reconciliation.json (the whole-document report model). Nothing is written
    outside the root.

    @unit @integration @SCN-RMG-001
    Scenario: a kept run writes spec-reconciliation.md and spec-reconciliation.json under the run directory
      Given an injected store root and a target corpus to reconcile
      When a kept run is executed for that target
      Then the reconciliation document and the reconciliation JSON are written under the run directory <root>/<target>/<run-id>/
      And the repo working tree gains nothing

  Rule: a kept run stamps run.yaml with the decided fields

    The run dir carries a run.yaml manifest: schema_version, run_id, target, source_sha,
    mode (balance / analyse / migrate), date, purpose (a list of grouping slugs — empty by
    default, an ad-hoc run, curated by hand afterward), links, and the artefact filenames.

    @unit @integration @SCN-RMG-002
    Scenario: a kept run stamps run.yaml with schema_version, run_id, target, sha, mode, date, an empty purpose list, links, and artefacts
      Given an injected store root and the run metadata for a kept run
      When a kept run is executed with that metadata
      Then run.yaml in the run directory parses back to schema_version 1, the run_id, target, source_sha, mode, date, an empty purpose list, empty links, and the artefact filenames
      And the repo working tree gains nothing from the run.yaml stamp

  Rule: the run-id defaults to a timestamp, an operator mnemonic overrides it

    The run-id defaults to an ISO-8601 UTC timestamp (sortable, zero-friction); an operator
    may evidence observation a mnemonic (e.g. acme-q3, e1) via --run-id for a curated experiment or
    engagement, which names the run dir instead.

    A pure selection rule, so it is proven in isolation by Vitest — the run-id's downstream
    dir effect is already proven by RMG-001's @integration arm, so this scenario carries no
    integration arm of its own (substitution-is-degradation: the moved-to layer here,
    isolation, uniquely proves the default-vs-override rule over a pinned clock, with no IO).
    The default timestamp derives from an INJECTED instant (never a bare clock read), so the
    isolated Vitest test asserts the exact run-id string deterministically.

    @unit @SCN-RMG-003
    Scenario: the run-id is an ISO timestamp by default and an operator mnemonic overrides it
      Given an injected clock instant and no operator --run-id
      When the run-id is resolved
      Then it is that instant as a filesystem-safe ISO-8601 UTC timestamp — no colons, no milliseconds
      And resolving with an operator --run-id mnemonic instead returns that mnemonic verbatim, ignoring the clock

  Rule: the operator can store any command's run from the shipped tool

    A global --store <root> host modifier turns any command into a stored run. The host
    parses --store (and an optional --run-id) BEFORE dispatch; when --store is present it
    wraps the command via the kept-run scaffold — routing the command's outputs into
    <root>/<target>/<run-id>/ and stamping run.yaml — and hands the command its own clean
    args, unchanged. Storage is orthogonal to the command (it wraps balance now, analyse /
    migrate later with no change), so it is a cross-cutting HOST option — not a peer command,
    and never a flag inside balance, which stays emit-only. --store is required to store (no
    default: a default would write inside the repo, the committed-report leak); --run-id
    defaults to a timestamp. Without --store the host dispatches the command directly and its
    output is unchanged.

    The @unit proves the host rule in isolation — given --store the command is invoked wrapped
    (its clean args plus the store-dir --format specs), without --store it is dispatched
    directly. The @e2e proves operator-reachability through the REAL binary: a stored run dir
    the operator can open, not the scaffold in isolation.

    @unit @e2e @SCN-RMG-004
    Scenario: `spec-controller --store <root> balance` writes a stored run the operator can reach
      Given a reconcilable target and a store root outside the repo
      When the operator runs balance under a store directive through the CLI binary
      Then the store command exits zero
      And a run directory named for the target and run-id exists under the store root
      And that run directory holds spec-reconciliation.md, spec-reconciliation.json, and run.yaml
      And its run.yaml parses with mode balance, the target, and the run-id
