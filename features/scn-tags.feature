@STG
Feature: The @SCN scheme polices itself — the rules a target runs from the package it installed

  The @SCN scheme is the mechanism the whole tool turns on, and every rule policing it used to
  live under tests/checks/ — not in either package's published files, unreachable from another
  repository by construction. So a target got the codes and inherited none of the policing. The
  Rules here are `balance`'s: the command a target already runs is the one that polices its codes.

  AN @SCN IS AN ACCOUNT NUMBER, AND A FEATURE FILE IS ITS ACCOUNT CLASS (3F-3609, 3F-3635). A code
  two scenarios carry makes that account unreconcilable, so it is reported on the account's rows.
  A code filed under the wrong class leaves every account reconciling but falsifies the by-feature
  cut, so it is listed as a scenario code error and reds the run.

  WHAT THE LEDGER ALREADY SAYS IS NOT SAID TWICE. A tier-less unparked @SCN scenario reconciles
  both-missing and is named by id in the report's own cut (3F-3308), and a tag the tool does not
  read is a consumer's own tag, not a fault (the `unrecognised-tag` diagnosis left, 3F-3635). The
  `tags` command that ran the older Rules here left the tool with them.

  Rule: a code filed under the wrong class, a class with no number, or two classes with one number is a scenario code error, listed in its own section

    THE @SCN IS THE ACCOUNT NUMBER AND THE FEATURE FILE IS ITS ACCOUNT CLASS. A misfiled code
    leaves every posting unambiguous — the account still reconciles exactly as it would if it
    were filed correctly — but the report's by-feature cut groups on the code, so a misfiled one
    makes that cut say something false. So `balance` lists each misfiling under
    `## Scenario code errors` (`scenarioCodeErrors` in the JSON), and any one of them reds the
    run. A duplicated @SCN is not one of these: it makes its account unreconcilable, and it is
    reported on that account's rows.

    THE CODE ARRIVES AND THE GRAMMAR IS READ ONCE. The file's header comes from the ingest edge,
    the reading the by-feature cut groups on; a scenario's `<FFF>` comes off its id through the
    one helper that owns that grammar. An id that helper cannot parse — a feature code longer
    than five characters — has no feature part to compare, so `foreign-scn-code` does not see it
    (3F-3636 owns that question).

    @unit @integration @SCN-STG-011
    Scenario: A scenario whose feature part is not its file's header code is listed as foreign-scn-code, and the run reds
      Given a target whose file headed @TWO holds a scenario coded @SCN-ONE-002, beside a file headed @ONE
      When balance reconciles that target
      Then the run fails on a scenario code error
      And the scenario code errors name foreign-scn-code with the file, the offending id and the code that file carries
      And they do not name the scenario whose code agrees with its file
      When the offending scenario is coded @SCN-ONE-1 instead
      Then the scenario code errors name foreign-scn-code for @SCN-ONE-1 in the same way
      When the offending scenario is re-coded to its own file
      Then the run balances with no scenario code error

    @unit @integration @SCN-STG-010
    Scenario: Two feature files carrying one header code are listed as duplicate-feature-code, and the run reds
      Given a target whose two feature files both carry the header code @ONE
      When balance reconciles that target
      Then the run fails on a scenario code error
      And the scenario code errors name duplicate-feature-code with the code and both files that carry it
      When one of the two files is given a code of its own
      Then the run balances with no scenario code error

    @unit @integration @SCN-STG-019
    Scenario: A feature file with no header code whose scenarios carry codes is listed as no-feature-code, and the run reds
      Given a target whose file carrying no header code holds a scenario coded @SCN-UNC-001, beside a file headed @ONE
      When balance reconciles that target
      Then the run fails on a scenario code error
      And the scenario code errors name no-feature-code with the file that carries no header code
      When that file is headed @TOOLONGCODE, a header code of more than five characters, and its scenario is coded @SCN-TOOLONGCODE-001
      Then the scenario code errors name no-feature-code with that file in the same way
      When the file carrying no header code holds only scenarios that carry no code
      Then the run lists no scenario code error

    @unit @integration @SCN-STG-020
    Scenario: A misfiled account reconciles exactly as it would if correctly filed
      Given three targets, one misfiling a scenario code in each of the three ways, and each one's correctly filed twin
      When balance reconciles each target and its twin
      Then each target's accounts reconcile exactly as its twin's do
      And only the scenario code errors tell them apart

    @unit @integration @SCN-STG-021
    Scenario: Clean scenario codes are stated, not left blank, and the section says a duplicated code is reported on the rows
      Given a target whose two feature files each carry a header code of their own, every scenario coded for its file
      When balance reconciles that target
      Then the report's scenario code errors section states the codes are clean, with the number of feature codes and feature files
      And it says a duplicated scenario code is reported on its account's rows
      And the run lists no scenario code error
      And the report saved as JSON re-renders the same section

  Rule: an @SCN is one account number, and two scenarios carrying it make that account unreconcilable

    THE ACCOUNT IS KEYED BY THE CODE, SO TWO SCENARIOS CARRYING ONE CODE ARE ONE ACCOUNT. A phantom
    account already exists for a cited code with no scenario behind it; a code carried twice is the
    mirror, two scenarios behind one account. No credit citing that code can be attributed to either
    of them, so nothing the account says can be trusted, and every quality check on it reads
    `duplicate-scn-code`. Each is a reconciling item, so the account is out of balance by the
    ordinary rule: no new verdict, no precedence. It is not `broken` — the proofs ran; what fails is
    the attribution.

    Until now `balance` refused such a corpus as unreadable (exit 2), and one bad code blanked the
    whole report. Reported on its account instead, it reds the run and leaves every other account
    reconciling exactly as before.

    @unit @integration @SCN-STG-013
    Scenario: Two scenarios in one file sharing an @SCN are one account, reading duplicate-scn-code at every quality check
      Given a feature file whose two scenarios carry one @SCN, each naming a unit check, the second also deferring an integration check
      When the ledger reconciles that corpus into accounts
      Then the corpus holds one account for that code
      And every quality check on it, the deferred integration check included, reads duplicate-scn-code
      And that account carries no Pending Item
      And that account is out of balance
      When the two scenarios name no quality check at all
      Then the one account carries a single duplicate-scn-code sub-row, never both-missing

    @unit @integration @SCN-STG-014
    Scenario: Two scenarios in different files sharing an @SCN are one account, reading duplicate-scn-code at every quality check
      Given a corpus of two feature files, each holding a scenario that carries the same @SCN and names a unit check
      When the ledger reconciles that corpus into accounts
      Then the corpus holds one account for that code
      And every quality check on it reads duplicate-scn-code
      And that account is out of balance

    @unit @integration @SCN-STG-015
    Scenario: Scenarios sharing a code but naming disjoint quality checks still never balance
      Given two scenarios sharing one @SCN, one naming a unit check and the other an integration check, each with passing evidence at its own check
      When the ledger reconciles that corpus into accounts
      Then the corpus holds one account for that code
      And that account carries both the unit and the integration check, each reading duplicate-scn-code
      And that account is out of balance

    @unit @integration @SCN-STG-016
    Scenario: Every credit citing a duplicated code posts to its one account, none dropped, none doubled, none attributed by position
      Given two scenarios sharing one @SCN and three credits citing it, one passing, one failing, and one at a check neither names
      When the ledger reconciles that corpus into accounts
      Then each of the three credits posts to that one account exactly once
      And no other account carries any of them
      And none of them satisfies a quality check on that account

    @unit @integration @SCN-STG-018
    Scenario: A duplicated code is exit 1 with the rest of the report complete, never a refused corpus
      Given a target whose corpus carries one @SCN on two scenarios beside a scenario of its own, every scenario cited by passing evidence
      When the target runs balance over it
      Then the run fails as out of balance, not as an input it cannot read
      And the report reconciles the scenario of its own exactly as it does in the same corpus without the duplicate
      And nothing says the corpus was refused

    @unit @integration @SCN-STG-017
    Scenario: The report states that the corpus holds more scenarios than accounts, and names the scenarios sharing each code
      Given a target whose corpus carries one @SCN on two scenarios in two feature files, beside a scenario of its own
      When the target runs balance over it
      Then the report states that the corpus holds three scenarios in two accounts
      And it names the shared code with the file and the name of each scenario carrying it
      And the report saved as JSON re-renders the same statement
