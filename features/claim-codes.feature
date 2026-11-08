@STG
Feature: The claim code scheme polices itself — the rules a target runs from the package it installed

  The claim code scheme is the mechanism the whole tool turns on, and every rule policing it ships in
  the package a target installs, so a target that gets the codes inherits the policing. The
  Rules here are `balance`'s: the command a target already runs is the one that polices its codes.

  A CLAIM CODE IS AN ACCOUNT NUMBER, AND A FEATURE FILE IS ITS ACCOUNT CLASS. A code
  two scenarios carry makes that account unreconcilable, so it is reported on the account's rows.
  A code filed under the wrong class leaves every account reconciling but falsifies the by-feature
  cut, so it is listed as a claim code error and reds the run.

  WHAT THE LEDGER ALREADY SAYS IS NOT SAID TWICE. An unparked scenario with a claim code and no evidence tag reconciles
  both-missing and is named by id in the report's own cut, and a tag the tool does not
  read is a consumer's own tag, not a fault (the `unrecognised-tag` diagnosis left). The
  `tags` command that ran the older Rules here left the tool with them.

  Rule: a code filed under the wrong class, a class with no number, or two classes with one number is a claim code error, listed in its own section

    THE CLAIM CODE IS THE ACCOUNT NUMBER AND THE FEATURE FILE IS ITS ACCOUNT CLASS. A misfiled code
    leaves every posting unambiguous — the account still reconciles exactly as it would if it
    were filed correctly — but the report's by-feature cut groups on the code, so a misfiled one
    makes that cut say something false. So `balance` lists each misfiling under
    `### Claim code errors` (`errorsInTheInputs.claimCodeErrors` in the JSON), and any one of them reds the
    run. A duplicated claim code is not one of these: it makes its account unreconcilable, and it is
    reported on that account's rows.

    THE CODE ARRIVES AND THE GRAMMAR IS READ ONCE. The file's header comes from the ingest edge,
    the reading the by-feature cut groups on; a scenario's `<FFF>` comes off its id through the
    one helper that owns that grammar, and every reader takes the same grammar. An id
    whose feature part is longer than five characters is no claim code, so there is no code for
    these rules to judge — it is the one-grammar Rule below that says so.

    @unit @CLM-STG-011
    Scenario: A scenario whose feature part is another file's header code is listed as foreign-claim-code, naming that file as where the by-feature cut counts it, and the run reds

    @unit @CLM-STG-022
    Scenario: A scenario whose feature part no file's header carries is listed as foreign-claim-code, saying its by-feature row has no file behind it, and it offers no move to a file the corpus lacks

    @unit @CLM-STG-010
    Scenario: Two feature files carrying one header code are listed as duplicate-feature-code, and the run reds

    @unit @CLM-STG-019
    Scenario: A feature file with no header code whose scenarios carry codes is listed as no-feature-code, and the run reds

  Rule: a claim code is one account number, and two scenarios carrying it are two claims that cannot reconcile

    Each scenario is a claim. Two scenarios carrying one code are two claims, each its own Claim
    Reconciliation under the code, and every kind of quality check each one raises reads `duplicate-claim-code`.
    No evidence observation citing that code can be attributed to either of them, so it credits
    neither and posts to the unnamed claim. Each `duplicate-claim-code` is a reconciling item, so each
    claim is out of balance by the ordinary rule: no new verdict, no precedence. It is not `broken` —
    the proofs ran; what fails is the attribution.

    `balance` does not refuse such a corpus as unreadable, so one bad code does not blank the
    whole report. Reported on its account, it reds the run and leaves every other account
    reconciling exactly as it would without it.

    @unit @CLM-STG-013
    Scenario: two scenarios in one file sharing a claim code are two claims, each reading duplicate-claim-code at every kind of quality check it raises

    @unit @CLM-STG-014
    Scenario: two scenarios in different files sharing a claim code are two claims, each reading duplicate-claim-code at every kind of quality check it raises

    @unit @CLM-STG-015
    Scenario: scenarios sharing a code but naming disjoint kinds of quality check still never balance, on either claim

    @unit @CLM-STG-035
    Scenario: the Evidence Obligation a scenario sharing its claim code raises is never deferred, whatever pending or deferral tag it carries

  Rule: a claim code is read by one grammar in every role — a feature part of two to five characters, and a number of any width

    A claim code is CLM-<FFF>-<NNN>, the feature part two to five
    characters and the number any width. Every place the tool reads an id — a scenario's tag, a
    Vitest title's citation, a Cucumber scenario's tag, a CI step's id and a prose mention — takes
    that one grammar, so an id that grammar says is not a claim code is not one anywhere, and no account,
    citation or finding rests on it. Each scenario holds the bound from both sides in one
    target: a feature part of two and of five characters is read, one of one and of six is not.

    @unit @CLM-STG-024
    Scenario: A claim code has a feature part of two to five characters and a number of any width, so a part of one or of six characters makes no code

    @integration @CLM-STG-025
    Scenario: A Vitest title citing a feature part outside two to five characters cites no scenario, beside citations of two and five characters that are read
      Given a target with one scenario of its own, and a Vitest report whose passing titles cite feature parts of one, two, five and six characters that no scenario carries
      When balance reconciles that grammar target
      Then the two- and five-character citations open phantom claims
      And the one- and six-character titles cite no scenario, so both evidence observations post to the unnamed claim
      And the grammar target lists no claim code error

    @integration @CLM-STG-026
    Scenario: A Cucumber scenario tagged with a feature part outside two to five characters cites no scenario, beside tags of two and five characters that are read
      Given a target with one scenario of its own, and a Cucumber report whose passing scenarios are tagged with feature parts of one, two, five and six characters that no scenario carries
      When balance reconciles that grammar target
      Then the two- and five-character citations open phantom claims
      And the one- and six-character Cucumber scenarios cite no scenario, so both evidence observations post to the unnamed claim
      And the grammar target lists no claim code error

    @integration @CLM-STG-027
    Scenario: A CI step whose id is a feature part outside two to five characters is no fitness evidence observation's citation, beside step ids of two and five characters that are
      Given a target with one scenario of its own, and a CI step record whose successful steps are keyed by feature parts of one, two, five and six characters that no scenario carries
      When balance reconciles that grammar target
      Then the two- and five-character citations open phantom claims
      And the one- and six-character step ids post no evidence observation at all
      And the grammar target lists no claim code error

  Rule: a scenario carrying more than one claim code raises its obligations under none of them, and is a claim code error naming each

    ONE SCENARIO, ONE ACCOUNT NUMBER, ON THE DEBIT SIDE AS ON THE CREDIT SIDE. An evidence
    observation that cites more than one scenario credits none of them, naming each code, so no
    reader picks one ([ubiquitous-language.md → Posting](../docs/ubiquitous-language.md#posting)). A scenario carrying more than
    one claim code is the same fault from the other side: no reader picks one either, so it raises no
    evidence obligation under any of its codes and opens no account under any of them. It is not
    untagged, since it carries codes, so `balance` lists it under `### Claim code errors`
    (`errorsInTheInputs.claimCodeErrors` in the JSON) as several-claim-codes, naming the file, the scenario and every
    code it carries, and the run reds. A test citing one of those codes cites a code no scenario
    carries, as any such citation does.

    @unit @CLM-STG-029
    Scenario: a scenario tagged with two claim codes raises no evidence obligation under either, and is listed as a claim code error naming both

    @unit @CLM-STG-030
    Scenario Outline: a code a scenario inherits from its <ancestor> is one of its codes, so a different code of its own makes two, and the same code makes one

      Examples:
        | ancestor |
        | Rule     |
        | Feature  |

  Rule: the claim codes are judged over a counted corpus, every feature file and each header code once

    The claim codes are judged over every feature file the corpus holds, so each file is
    counted, a file with no header code among them. A header code is counted once however many
    files carry it, so two files carrying one code add one feature code, not two. The report
    states clean claim codes with these two counts.

    @unit @CLM-STG-034
    Scenario: A corpus's feature files are each counted, and a header code is counted once however many files carry it

  Rule: a claim code is written under CLM

    @unit @CLM-STG-036
    Scenario: a test citing a code under CLM answers the scenario tagged with it
