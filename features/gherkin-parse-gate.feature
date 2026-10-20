@GPG
Feature: The Gherkin parse gate — no check reports on a corpus the parser rejects

  A check that reads .feature files line by line answers "is there an offending line?", and a
  reader hears "this is a feature file". The two come apart: scenario prose between a
  scenario's last step and the next tag line, or a Rule preamble line opening with a scenario's
  id, which Gherkin reads as a tag line, leaves a file syntactically invalid while every
  line-scanning lint reports green. Both faults sit in Rule/scenario PROSE — the practice that
  makes these files good is the practice that makes them fragile.

  The balance CLI refuses an unreadable corpus (exit 2, the parser's own words), because the
  corpus is the ledger's debit side and a corpus that is a fiction cannot be reconciled. Every
  corpus reader takes its features from one shared parse, which reports each file the parser
  rejects, with the parser's own words, as data. Each reader refuses on that report, and no
  reader holds a second parser. One answer to "what is a feature file", as the adopted-vocabulary
  gate has one answer to "what is the project".

  Rule: a reader of the feature corpus refuses a corpus the Gherkin parser rejects

    The shared parse reads each file and reports every file the parser rejects, with the
    parser's own words, and never returns an empty corpus in its place. A reader that gets that
    report refuses: `balance` and `allocate` each end at exit 2, naming every unreadable file.

    @unit @SCN-GPG-001
    Scenario: the shared feature-file discovery refuses a corpus the parser rejects, naming every unreadable file and the parser's own words
