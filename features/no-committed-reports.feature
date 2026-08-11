@NCR
Feature: The repo commits no report artefact — actively enforced

  The outside-repo store
  made active. A spec-controller reconciliation report enumerates a codebase's gaps,
  dangling anchors, and watermelons — more sensitive than the code — so it lives OUTSIDE
  the repo (~/spec-controller-runs/), never committed. This feature makes that a
  CI-enforced invariant, not just a documented rule: a static check fails if any report
  artefact is tracked in the repo.

  The guard is itself a CI static-check over the real source, so a stepless fitness
  scenario NAMES it by its bare `@no-committed-reports` tag — spec-controller's own ledger
  reconciles it, so it is never an uncited static-check (the Uncited-static-checks
  increment).

  Rule: a committed report artefact reds the no-committed-reports guard

    The lint:no-committed-reports guard fails (non-zero, naming the offending path) if any
    tracked file is under runs/ (the in-repo leak vector), and passes over a clean tree.
    Its red-to-green over the real tree is the tidy-up move — red while the legacy reports
    are tracked, green once they relocate to the outside store.

    @unit @integration @SCN-NCR-001
    Scenario: the no-committed-reports guard fails on a tracked report artefact and passes over a clean tree
      Given the real spec-controller repository tree
      When the no-committed-reports guard runs over the real tree
      Then the guard passes, reporting no report artefact tracked under the runs directory

  Rule: this repository tracks no report artefact

    THE CHARACTERISTIC ITSELF, held against spec-controller's own tree rather than against
    a planted one. The Rule above is an EXAMPLE of the guard deciding, so it carries steps;
    this is the whole-system property the guard exists to hold, so it carries none. The bare
    `@no-committed-reports` tag raises the Evidence Obligation the CI run settles, which is
    what keeps that run off the suspense row as an uncited static check.

    @no-committed-reports @SCN-NCR-002
    Scenario: no report artefact is tracked under the runs directory
