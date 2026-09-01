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

  WHAT INHERITANCE FENCES, AND WHAT IT DOES NOT — the residual, stated rather than left to be
  discovered. The scenarios below hold that the shared discovery refuses, and that the two checks
  reading through it refuse with it. They do NOT hold that every feature-file reader on the ladder
  goes through the shared discovery. A check added later that walks features/ its own way would
  scan an unparseable corpus and report green while both scenarios stay green — and it would do so
  at whatever rung it occupied, including ahead of the first reader that does inherit. Closing
  that needs a derivation over ci.yml and each check's source: its own property, its own scenario,
  and not this slice. Naming it here is what stops it being silent.

  Rule: a reader of the feature corpus refuses a corpus the Gherkin parser rejects

    WHY @unit ALONE, POSITIVELY. The observation is a function call over files on disk — discover
    a directory, read each file, hand it to the parser, refuse — and Vitest proves that whole
    path, temp directory included. A Cucumber arm would stand up the same directory and call the
    same function through a second harness, proving the harness rather than the property. That is
    the ruling SCN-MUT-015, -016 and -017 each took for this shape. The boundary this slice does
    cross is a process boundary, and it is crossed in the Rule below.

    @unit @SCN-GPG-001
    Scenario: the shared feature-file discovery refuses a corpus the parser rejects, naming every unreadable file and the parser's own words
      Given a feature corpus holding one well-formed file and two files the Gherkin parser rejects
      When a reader discovers that corpus
      Then the discovery refuses the corpus instead of returning it
      And the refusal names both unreadable files, not only the first
      And it carries each file's parse failure in the parser's own words
      And nothing of the corpus is handed back, so the well-formed file cannot be read past the refusal

  Rule: a static check that cannot read the corpus reports a refusal, never a verdict

    WHY BOTH TIERS, POSITIVELY. @unit proves the refusal RENDERS as a sentence naming each
    unreadable file and the parser's message — the shape a reader acts on, pinnable without
    spawning anything. @integration proves the real check, run as its own process, actually exits
    non-zero and prints that sentence: a process boundary the @unit arm cannot reach, and the
    exact reading — a single check run on its own — this slice exists to fix. Neither arm
    subsumes the other, which is why both are here.

    THE CORPUS THE ARMS ARE HANDED IS RIGGED TO BE ANSWERABLE. Beside the file the parser
    rejects sits one it accepts, and that second file would earn each check a finding of its own
    if the check ever read it. So "reports no verdict" is not read off a silent run: a check that
    scanned the readable half would say something specific, and the Then names it and refuses it.

    @unit @integration @SCN-GPG-002
    Scenario Outline: a feature-file static check over an unparseable corpus exits non-zero naming the file and the parse failure, not a stack trace
      Given a feature corpus holding one file the Gherkin parser rejects beside one it accepts
      When <check> is asked to check that corpus
      Then the check refuses the corpus instead of reporting on it
      And it names the unreadable file and carries the parser's own words
      And it says so as a sentence, not as a stack trace
      And it reports no verdict about the corpus it could not read, neither a clean bill nor the finding the readable file would have earned
      And the refusal is told apart from a finding, so a caller can tell an unreadable corpus from a failing one

      Examples:
        | check              |
        | lint:feature-codes |
        | lint:scn-tags      |
