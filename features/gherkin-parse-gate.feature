@GPG
Feature: The Gherkin parse gate — no check reports on a corpus the parser rejects

  A check that reads .feature files line by line answers "is there an offending line?", and a
  reader hears "this is a feature file". Twice now the two have come apart: 3F-2792 put scenario
  prose between a scenario's last step and the next tag line, and 3F-2962 opened a Rule preamble
  line with SCN-MUT-015's id, which Gherkin reads as a tag line. Both files were syntactically
  invalid; every line-scanning lint reported green; only pnpm cucumber saw it. Both faults were in
  Rule/scenario PROSE — the practice that makes these files good is the practice that makes them
  fragile.

  The parser is not new here. SCN-CLI-016 already refuses an unreadable corpus at the balance CLI
  (exit 2, the parser's own words), because the corpus is the ledger's debit side and a corpus
  that is a fiction cannot be reconciled. What this feature adds is REACH, not a second parser:
  the checkpoint moves into the shared feature-file discovery every corpus reader already goes
  through, so a reader INHERITS the refusal instead of restating it. One answer to "what is a
  feature file", as the adopted-vocabulary gate already has one answer to "what is the project".

  Rule: a reader of the feature corpus refuses a corpus the Gherkin parser rejects

    WHY @unit ALONE, POSITIVELY. The observation is a function call over files on disk — discover
    a directory, read each file, hand it to the parser, refuse — and Vitest proves that whole
    path, temp directory included. A Cucumber arm would stand up the same directory and call the
    same function through a second harness, proving the harness rather than the property. That is
    the ruling SCN-MUT-015, -016 and -017 each took for this shape. The process boundary is
    crossed by `balance` itself, which refuses an unreadable corpus at exit 2 (SCN-CLI-016).

    @unit @SCN-GPG-001
    Scenario: the shared feature-file discovery refuses a corpus the parser rejects, naming every unreadable file and the parser's own words
      Given a feature corpus holding one well-formed file and two files the Gherkin parser rejects
      When a reader discovers that corpus
      Then the discovery refuses the corpus instead of returning it
      And the refusal names both unreadable files, not only the first
      And it carries each file's parse failure in the parser's own words
      And nothing of the corpus is handed back, so the well-formed file cannot be read past the refusal
