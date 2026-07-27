@NPS
Feature: No parallel store re-represents the Ledger's entries

  The no-parallel-store lock turns "the Ledger is the ONE source of truth" from a design intention
  into a proof — the capstone of the DDD retrofit (Slice 8, 3F-2101). The evidence-observation
  census modules that once counted evidence into their OWN shapes (a per-(scnId, quality-check)
  attributed[] credit-list, an evidenceObservations section, RuntimeEvidenceObservationKindCounts /
  StaticEvidenceObservationKindCounts) are RETIRED: their counting folds onto the Ledger as the
  runtimeObservationTally / staticObservationTally domain folds. The posted credits live ON the
  Ledger rows (scenarioReconciliations[].evidenceObservations, SCN-LDG-022) — one store, no parallel.

  A parallel store is CC's failure mode here: a second structure re-representing what the Ledger
  already carries, drifting silently out of step. The lock closes it from two sides — a static guard
  that reds if a retired census creeps back into the pure core (this scenario), and a round-trip that
  reds if any materialised summary aggregate stops equalling the fold of the serialised Ledger.

  Both are pure checkers driven over real data by unit tests, mirroring engine-purity / domain-purity
  EXACTLY: Vitest is the observed evidence, Cucumber skips it, and CI enforces it via pnpm test — with
  no @lint corpus tag, no npm script, and no added CI step (which would self-trip the
  uncited-static-guard guard).

  By-hand residual (the manifesto call): the static guard catches the KNOWN retired names + the
  attributed field shape. A future parallel store smuggled in under a FRESH name is not name-matchable
  and remains a driver's-eye judgement at review — the guard is the floor, not the ceiling.

  Rule: no production core file resurrects a retired evidence-observation census

    @unit @SCN-NPS-001
    Scenario: a resurrected parallel store reds the build
      Given every production file under packages/core/src (excluding *.test.ts)
      When the no-parallel-store guard scans each file
      Then no file is a retired census module (evidenceObservations.ts / staticEvidenceObservations.ts)
      And no file declares a retired credit-list or section symbol
      And no file carries a parallel attributed credit-list field
      And the guard passes clean over the real packages/core/src tree

  Rule: every materialised summary aggregate re-folds from the serialised Ledger

    @unit @SCN-NPS-002
    Scenario: a summary aggregate that stops equalling the Ledger fold reds the build
      Given a report rendered to JSON over a spanning reconciler-true corpus
      When each summary aggregate is independently re-folded from parsed.ledger.scenarioReconciliations
      Then every re-derived value equals the materialised summary value
      And drifting a summary value — or a Ledger row — off its fold reds the round-trip
