@TGT
Feature: a feature file holding a scenario coded for another feature

  Planted for @SCN-STG-011's @integration arm — the CORPUS fault the rule refuses.
  This file carries the header code `@TGT`, and the second scenario below is coded
  `@SCN-ZZZ-001`. No file in this corpus carries `@ZZZ`, so the id names a feature
  that does not exist here.

  Measured on this very tree before the rule existed: `balance` ran clean through and
  printed a by-feature row for a feature `ZZZ` it had INVENTED from the id alone, and
  `pnpm lint:feature-codes` over the same tree reported OK — every feature code a header
  names is unique and registered. Silent in both readers.

  THE NATIVE SCENARIO IS HERE ON PURPOSE. `@SCN-TGT-001` agrees with the header, so a
  finding that names it has convicted the whole file rather than the one offending id.

  @unit @SCN-TGT-001
  Scenario: a scenario whose code names the file it is written in
    Given the target source

  @unit @SCN-ZZZ-001
  Scenario: a scenario coded for a feature this file is not
    Given the target source
