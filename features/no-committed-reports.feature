@NCR
Feature: The repo commits no report artefact — actively enforced

  The outside-repo store
  made active. A spec-controller reconciliation report enumerates a codebase's gaps,
  dangling anchors, and watermelons — more sensitive than the code — so it lives OUTSIDE
  the repo (~/spec-controller-runs/), never committed. This feature makes that a
  CI-enforced invariant, not just a documented rule: a lint guard fails if any report
  artefact is tracked in the repo.

  The guard is itself a CI static-check over the real source, so it is NAMED by @lint
  (@lint=lint:no-committed-reports) — spec-controller's own ledger reconciles it, so it
  is never an uncited static-check (the Uncited-static-checks increment).

  Rule: a committed report artefact reds the no-committed-reports guard

    The lint:no-committed-reports guard fails (non-zero, naming the offending path) if any
    tracked file is under runs/ (the in-repo leak vector), and passes over a clean tree.
    Its red-to-green over the real tree is the tidy-up move — red while the legacy reports
    are tracked, green once they relocate to the outside store.

    @unit @integration @lint=lint:no-committed-reports @SCN-NCR-001
    Scenario: the no-committed-reports guard fails on a tracked report artefact and passes over a clean tree
      Given the real spec-controller repository tree
      When the no-committed-reports guard runs over the real tree
      Then the guard passes, reporting no report artefact tracked under the runs directory
