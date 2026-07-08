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
