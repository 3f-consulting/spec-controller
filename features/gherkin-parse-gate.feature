@GPG
Feature: The Gherkin parse gate — no check reports on a corpus the parser rejects

  A check that reads .feature files line by line answers "is there an offending line?", and a
  reader hears "this is a feature file". The two come apart: scenario prose between a
  scenario's last step and the next tag line, or a Rule preamble line opening with a scenario's
  id, which Gherkin reads as a tag line, leaves a file syntactically invalid while every
  line-scanning lint reports green. Both faults sit in Rule/scenario PROSE — the practice that
  makes these files good is the practice that makes them fragile.

  The balance CLI refuses an unreadable corpus (exit 2, the parser's own words), because the
  corpus is the ledger's debit side and a corpus that is a fiction cannot be reconciled. The
  checkpoint sits in the shared feature-file discovery every corpus reader goes through, so a
  reader INHERITS the refusal instead of restating it, and no reader holds a second parser. One
  answer to "what is a feature file", as the adopted-vocabulary gate has one answer to "what is
  the project".

  Rule: a reader of the feature corpus refuses a corpus the Gherkin parser rejects

    WHY @unit ALONE, POSITIVELY. The observation is a function call over files on disk — discover
    a directory, read each file, hand it to the parser, refuse — and Vitest proves that whole
    path, temp directory included. A Cucumber arm would stand up the same directory and call the
    same function through a second harness, proving the harness rather than the property. The process boundary is
    crossed by `balance` itself, which refuses an unreadable corpus at exit 2.

    @unit @SCN-GPG-001
    Scenario: the shared feature-file discovery refuses a corpus the parser rejects, naming every unreadable file and the parser's own words
