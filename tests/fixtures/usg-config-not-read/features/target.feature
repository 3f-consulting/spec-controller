@CNR
Feature: a fixture target whose specController block names a runner, a non-check and a deferral tag

  Every entry of this target's block moves its report: the unit runner is recognised at a step,
  one notChecks entry excludes a step and the other matches none, and the deferral tag defers the
  second scenario. So a report that reads as though an entry were absent can only be one where
  that entry was taken as absent.

  Rule: a target holding itself to nothing this axis can cite

    @unit @SCN-CNR-001
    Scenario: the target source is exercised
      Given the target source

    @deferred @unit @SCN-CNR-002
    Scenario: the target defers this one
      Given the deferred source
