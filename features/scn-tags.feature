@STG
Feature: The @SCN scheme polices itself — the rules a target runs from the package it installed

  The @SCN scheme is the mechanism the whole tool turns on, and every rule policing it ships in
  the package a target installs, so a target that gets the codes inherits the policing. The
  Rules here are `balance`'s: the command a target already runs is the one that polices its codes.

  AN @SCN IS AN ACCOUNT NUMBER, AND A FEATURE FILE IS ITS ACCOUNT CLASS. A code
  two scenarios carry makes that account unreconcilable, so it is reported on the account's rows.
  A code filed under the wrong class leaves every account reconciling but falsifies the by-feature
  cut, so it is listed as a scenario code error and reds the run.

  WHAT THE LEDGER ALREADY SAYS IS NOT SAID TWICE. A tier-less unparked @SCN scenario reconciles
  both-missing and is named by id in the report's own cut, and a tag the tool does not
  read is a consumer's own tag, not a fault (the `unrecognised-tag` diagnosis left). The
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
    one helper that owns that grammar, and every reader takes the same grammar. An id
    whose feature part is longer than five characters is no @SCN, so it is no scenario code for
    these rules to judge — it is the one-grammar Rule below that says so.

    THE SECTION'S SENTENCES ARE CLAIMS ABOUT A POPULATION, so each is held by a corpus on which a
    false one would show. A finding says where the by-feature cut counted the scenario,
    and that depends on which files carry the code its id names: one, none or several. A clean
    statement counts files and codes, and those counts differ as soon as one file carries no code.
    A fixture where the counts agree cannot tell a true sentence from a false one.

    @unit @integration @SCN-STG-011
    Scenario: A scenario whose feature part is another file's header code is listed as foreign-scn-code, naming that file as where the by-feature cut counts it, and the run reds
      Given a target whose file headed @TWO holds an uncited scenario coded @SCN-ONE-002, beside a file headed @ONE
      When balance reconciles that target
      Then the run fails on a scenario code error
      And the scenario code errors name foreign-scn-code with the file, the offending id and the code that file carries
      And they name the file headed @ONE as where the by-feature cut counts the scenario, the row the report lists it under
      And they do not name the scenario whose code agrees with its file
      When the offending scenario is coded @SCN-ONE-1 instead
      Then the scenario code errors name foreign-scn-code for @SCN-ONE-1 in the same way
      When the offending scenario is re-coded to its own file
      Then the run balances with no scenario code error
      When a second file is also headed @ONE and the offending scenario is coded @SCN-ONE-002 again
      Then the scenario code errors name foreign-scn-code with both files headed @ONE, presenting neither as the file

    @unit @integration @SCN-STG-022
    Scenario: A scenario whose feature part no file's header carries is listed as foreign-scn-code, saying its by-feature row has no file behind it, and it offers no move to a file the corpus lacks
      Given a target whose file headed @TWO holds an uncited scenario coded @SCN-THR-002, beside a file headed @ONE and no file headed @THR
      When balance reconciles that target
      Then the run fails on a scenario code error
      And the foreign-scn-code finding names two.feature, the id @SCN-THR-002 and the code @TWO that file carries
      And it says no file carries THR, and the report's by-feature row for THR names no file
      And it offers no move to a file headed @THR
      When the only other file using THR carries no header code and holds @SCN-THR-001
      Then the foreign-scn-code finding still says no file carries THR, and offers no move to a file headed @THR

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
      When that file is headed @TOOLONGCODE, a header code of more than five characters, and its only scenario is coded @SCN-TOOLONGCODE-001
      Then the run lists no scenario code error, because neither the header nor the scenario's code is a code
      When that file's scenario is coded @SCN-FIVEC-001 instead, a feature part of five characters
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
    Scenario: Clean scenario codes are stated with the corpus's own count of feature files and of feature codes, and the section says a duplicated code is reported on the rows
      Given a target of three feature files, two each carrying a header code of its own with every scenario coded for it, and one carrying no code and no coded scenario
      When balance reconciles that target
      Then the report's scenario code errors section states the codes are clean over 3 feature files carrying 2 feature codes
      And it says a duplicated scenario code is reported on its account's rows
      And the run lists no scenario code error
      And the report saved as JSON re-renders the same section
      When the target is one feature file carrying no code and no coded scenario
      Then the report's scenario code errors section states the codes are clean over 1 feature file carrying 0 feature codes
      And the report saved as JSON re-renders the same section
      When the target is two feature files, one carrying a header code and one carrying no code and no coded scenario
      Then the report's scenario code errors section states the codes are clean over 2 feature files carrying 1 feature code
      And the report saved as JSON re-renders the same section

    @unit @integration @SCN-STG-023
    Scenario: A corpus with no feature file is never stated clean: the section says no feature file was judged, and the run still exits 5
      Given a target whose feature directory holds no feature file
      When balance reconciles that target
      Then the run has nothing to reconcile
      And the report's scenario code errors section says no feature file was judged, stating no code clean and no count
      And the report saved as JSON re-renders the same section

  Rule: an @SCN is one account number, and two scenarios carrying it make that account unreconcilable

    THE ACCOUNT IS KEYED BY THE CODE, SO TWO SCENARIOS CARRYING ONE CODE ARE ONE ACCOUNT. A phantom
    account already exists for a cited code with no scenario behind it; a code carried twice is the
    mirror, two scenarios behind one account. No credit citing that code can be attributed to either
    of them, so nothing the account says can be trusted, and every quality check on it reads
    `duplicate-scn-code`. Each is a reconciling item, so the account is out of balance by the
    ordinary rule: no new verdict, no precedence. It is not `broken` — the proofs ran; what fails is
    the attribution.

    `balance` does not refuse such a corpus as unreadable, so one bad code does not blank the
    whole report. Reported on its account, it reds the run and leaves every other account
    reconciling exactly as it would without it.

    @unit @SCN-STG-013
    Scenario: Two scenarios in one file sharing an @SCN are one account, reading duplicate-scn-code at every quality check

    @unit @SCN-STG-014
    Scenario: Two scenarios in different files sharing an @SCN are one account, reading duplicate-scn-code at every quality check

    @unit @SCN-STG-015
    Scenario: Scenarios sharing a code but naming disjoint quality checks still never balance

    @unit @SCN-STG-016
    Scenario: Every credit citing a duplicated code posts to its one account, none dropped, none doubled, none attributed by position

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

  Rule: an @SCN is read by canon's one grammar in every role — a feature part of two to five characters, and a number of any width

    Evidence-manifesto §9A fixes a scenario id as SCN-<FFF>-<NNN>, the feature part two to five
    characters and the number any width. Every place the tool reads an id — a scenario's tag, a
    Vitest title's citation, a Cucumber scenario's tag, a CI step's id and a prose mention — takes
    that one grammar, so an id canon says is not an @SCN is not one anywhere, and no account,
    citation or finding rests on it. Each scenario holds the bound from both sides in one
    target: a feature part of two and of five characters is read, one of one and of six is not.

    @unit @integration @SCN-STG-024
    Scenario: A scenario tagged with a feature part outside two to five characters carries no @SCN code, beside scenarios of two and five characters that are accounts
      Given a target whose four scenarios are tagged with feature parts of one, two, five and six characters, each in a file of its own
      When balance reconciles that grammar target
      Then the two- and five-character codes are accounts
      And the scenarios tagged with a one- and a six-character feature part carry no @SCN code, and no account is opened for either
      And the grammar target lists no scenario code error

    @unit @integration @SCN-STG-025
    Scenario: A Vitest title citing a feature part outside two to five characters cites no scenario, beside citations of two and five characters that are read
      Given a target with one scenario of its own, and a Vitest report whose passing titles cite feature parts of one, two, five and six characters that no scenario carries
      When balance reconciles that grammar target
      Then the two- and five-character citations open phantom scenarios
      And the one- and six-character titles cite no scenario, so both credits post to the suspense scenario
      And the grammar target lists no scenario code error

    @unit @integration @SCN-STG-026
    Scenario: A Cucumber scenario tagged with a feature part outside two to five characters cites no scenario, beside tags of two and five characters that are read
      Given a target with one scenario of its own, and a Cucumber report whose passing scenarios are tagged with feature parts of one, two, five and six characters that no scenario carries
      When balance reconciles that grammar target
      Then the two- and five-character citations open phantom scenarios
      And the one- and six-character Cucumber scenarios cite no scenario, so both credits post to the suspense scenario
      And the grammar target lists no scenario code error

    @unit @integration @SCN-STG-027
    Scenario: A CI step whose id is a feature part outside two to five characters is no fitness credit's citation, beside step ids of two and five characters that are
      Given a target with one scenario of its own, and a CI step record whose successful steps are keyed by feature parts of one, two, five and six characters that no scenario carries
      When balance reconciles that grammar target
      Then the two- and five-character citations open phantom scenarios
      And the one- and six-character step ids post no credit at all
      And the grammar target lists no scenario code error

    @unit @integration @SCN-STG-028
    Scenario: A prose mention of a feature part outside two to five characters is not an @SCN seen in non-tag context, beside mentions of two and five characters that are
      Given a target whose only scenario mentions, in a step and a comment, untagged ids with feature parts of one, two, five and six characters
      When balance reconciles that grammar target
      Then the report counts two @SCN ids seen in non-tag context
      And the grammar target lists no scenario code error
