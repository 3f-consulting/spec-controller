@AMB
Feature: a broken-attribution reconciliation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose cucumber run
  hit an AMBIGUOUS STEP (@SCN-CUC-003) on a scenario that DID cite its @SCN. This is the
  corpus that produces the `broken` + REAL-`scnId` observation shape — the one the census
  used to count `attributed` while the reconciler posted it to suspense (@SCN-RPT-023).

  Two scenarios, so the assertion has teeth on BOTH sides of the move:
    - SCN-AMB-001: its cucumber step is AMBIGUOUS. The proof never ran, so the evidence observation posts
      to SUSPENSE and attributes to NOTHING — while the observation still carries scnId
      SCN-AMB-001. Its own integration obligation reconciles `missing` BY ABSENCE.
    - SCN-AMB-002: an ordinary passing scenario at the same quality-check. It stays
      ATTRIBUTED — proving the fold moved the broken evidence observation specifically, and did not
      simply empty the attributed tally.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @AMB / @SCN-AMB-NNN — they scan
  features/*.feature only.

  Rule: the fixture target names two integration-level scenarios, one of them broken

    @integration @SCN-AMB-001
    Scenario: the target names a scenario whose step is ambiguous
      Given the target repo's source

    @integration @SCN-AMB-002
    Scenario: the target names a scenario that runs cleanly
      Given the target repo's source
