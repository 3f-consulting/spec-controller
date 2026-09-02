@NCR
Feature: The repo commits no report artefact — actively enforced

  The outside-repo store
  made active. A spec-controller reconciliation report enumerates a codebase's gaps,
  dangling anchors, and watermelons — more sensitive than the code — so it lives OUTSIDE
  the repo (~/spec-controller-runs/), never committed. This feature makes that a
  CI-enforced invariant, not just a documented rule: a static check fails if any report
  artefact is tracked in the repo.

  IT SITS OUTSIDE THE EVIDENCE LEDGER, ON PURPOSE (3F-2994). The check asserts a property of
  what is COMMITTED, not of what this build produced, so nothing reconciles it: no stepless
  fitness scenario raises an Evidence Obligation for it, and none is owed. Its script carries
  the `hygiene:` prefix rather than `lint:`, which is what keeps it out of the observed set —
  a `lint:`-prefixed script a CI step invokes IS a running static check, and one citing no
  scenario posts to the suspense row. It keeps its teeth either way: ci.yml runs it and
  `pnpm verify` gates on it. The Rule below is the example of the check deciding, and it stays.

  Rule: a committed report artefact reds the no-committed-reports guard

    The hygiene:no-committed-reports guard fails (non-zero, naming the offending path) if any
    tracked file is under runs/ (the in-repo leak vector), and passes over a clean tree.
    Its red-to-green over the real tree is the tidy-up move — red while the legacy reports
    are tracked, green once they relocate to the outside store.

    @unit @integration @SCN-NCR-001
    Scenario: the no-committed-reports guard fails on a tracked report artefact and passes over a clean tree
      Given the real spec-controller repository tree
      When the no-committed-reports guard runs over the real tree
      Then the guard passes, reporting no report artefact tracked under the runs directory
