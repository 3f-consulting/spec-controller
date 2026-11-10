@STG
Feature: every claim code is well formed, filed under its file's code, and never reused

  A feature code is two to five uppercase letters or digits. A claim code has the form
  CLM-<FFF>-<NNN>: a feature code, then a number of any width. balance reads every id by this one form.
  An id not in this form is not a claim code.

  A feature file's feature code is the class its scenarios' codes are filed under.

  The developer asks allocate for the next claim code instead of inventing one. The code is
  one past the highest inside the repository for that feature code, so a code that was
  retired is never handed out again: a reissued code would make every old reference to it, in
  history, in a chat, in a stale document, resolve silently to a different capability.

  Feature codes come from the feature files. Numbers come from every text file in the tree
  and from the diff lines of reachable history. The answer is the code alone, so an agent or a
  script can consume it. What the repository's shape leaves unread, having no repository or being a
  shallow clone, is a note, never part of the answer. What the tool is prevented from reading
  stops it, and it gives no code rather than one worked out without that file.

  Scenario Outline: a feature code is two to five uppercase letters or digits
    Given there was the id <code>
    When it is checked against the feature code form
    Then it will <result>

    Examples:
        | clm         | code   | result                |
        | CLM-CLI-098 | AB     | be a feature code     |
        | CLM-STG-NEW | ABCDE  | be a feature code     |
        | CLM-STG-NEW | A1     | be a feature code     |
        | CLM-STG-NEW | A      | not be a feature code |
        | CLM-STG-NEW | ABCDEF | not be a feature code |
        | CLM-STG-NEW | abc    | not be a feature code |

  @CLM-STG-NEW
  Scenario: a tag above Feature: will be the feature code of that file
    Given a feature file had the tag @ONE above Feature:
    When balance reads it
    Then ONE will be the feature code of that file

  Scenario Outline: a claim code is CLM, a feature code and a number
    Given there was the id <id>
    When it is checked against the claim code form
    Then it will <result>

    Examples:
        | clm         | id           | result              |
        | CLM-STG-024 | CLM-ONE-001  | be a claim code     |
        | CLM-STG-NEW | CLM-ONE-7    | be a claim code     |
        | CLM-STG-NEW | CLM-ONE-1000 | be a claim code     |
        | CLM-STG-NEW | CLM-A-001    | not be a claim code |
        | CLM-STG-NEW | CLM-ONE-     | not be a claim code |

  Scenario Outline: a retired scenario code is SCN, a feature code and a number
    Given there was the id <id>
    When it is checked against the retired scenario code form
    Then it will <result>

    Examples:
      | clm         | id           | result                         |
      | CLM-ALC-NEW | SCN-ONE-001  | be a retired scenario code     |
      | CLM-ALC-NEW | SCN-ONE-7    | be a retired scenario code     |
      | CLM-ALC-NEW | SCN-ONE-1000 | be a retired scenario code     |
      | CLM-ALC-NEW | SCN-A-001    | not be a retired scenario code |
      | CLM-ALC-NEW | SCN-ONE-     | not be a retired scenario code |

  Rule: balance checks where each claim code is written before it reconciles

    Scenario Outline: a misplaced or clashing claim code will be a claim code error
      Given <files>
      When balance reads them
      Then it will find <error>, about <facts>

      Examples:
        | clm         | files                                                                                             | error                        | facts                                                             |
        | CLM-STG-011 | one.feature, tagged @ONE, contains a scenario tagged @CLM-TWO-001, and two.feature is tagged @TWO | foreign-claim-code           | CLM-TWO-001, one.feature, and two.feature as the file tagged @TWO |
        | CLM-STG-022 | one.feature, tagged @ONE, contains a scenario tagged @CLM-ZZZ-001, and no file is tagged @ZZZ     | foreign-claim-code           | CLM-ZZZ-001, one.feature, and no file tagged @ZZZ                 |
        | CLM-STG-019 | three.feature has no feature code, and contains a scenario tagged @CLM-ONE-002                    | no-feature-code              | three.feature                                                     |
        | CLM-STG-010 | one.feature and uno.feature are both tagged @ONE                                                  | duplicate-feature-code       | @ONE, one.feature and uno.feature                                 |
        | CLM-STG-029 | one.feature contains a scenario tagged both @CLM-ONE-001 and @CLM-ONE-002                         | several-claim-codes          | one.feature, that scenario, CLM-ONE-001 and CLM-ONE-002           |
        | CLM-GRD-009 | one.feature contains an Outline tagged @CLM-ONE-009 with a clm column                             | claim-code-beside-clm-column | one.feature, that Outline, CLM-ONE-009                            |
        | CLM-GRD-NEW | one.feature contains an Outline with a clm column and an Examples block tagged @CLM-ONE-009       | claim-code-beside-clm-column | one.feature, that Outline, CLM-ONE-009                            |

  Rule: allocate's next code is one past the highest code that has ever been in the repository

    allocate asks git which files the repository has and reads each for codes, and asks git for
    every line its history has contained. It counts a code written under CLM or the retired SCN, and
    writes its answer under CLM, so no number a code has had is handed out again.

    Scenario Outline: the answer is one past the highest code the repository has contained
      Given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @<in the file>
      And <elsewhere>
      When the developer asks for the next code for ONE
      Then the answer will be <answer>, and nothing else
      And it will note the highest code it saw, and where: <seen>

      Examples:
        | clm         | in the file | elsewhere                                                                                                          | answer       | seen                                        |
        | CLM-ALC-005 | CLM-ONE-001 | a file git tracks, such as a workflow or a test, contained CLM-ONE-005                                             | CLM-ONE-006  | that file and line                          |
        | CLM-ALC-001 | CLM-ONE-001 | a line in git history, since deleted, had CLM-ONE-005                                                              | CLM-ONE-006  | the file and line it was in, and the commit |
        | CLM-ALC-NEW | CLM-ONE-001 | a file git tracks contained SCN-ONE-005                                                                            | CLM-ONE-006  | that file and line                          |
        | CLM-ALC-NEW | CLM-ONE-001 | a line in git history, since deleted, had SCN-ONE-005                                                              | CLM-ONE-006  | the file and line it was in, and the commit |
        | CLM-ALC-NEW | CLM-ONE-001 | a file git tracks contained SCN-ONE-                                                                               | CLM-ONE-002  | the feature file and line                   |
        | CLM-ALC-007 | CLM-ONE-001 | a new file git does not ignore contained CLM-ONE-005                                                               | CLM-ONE-006  | that file and line                          |
        | CLM-ALC-006 | CLM-ONE-001 | a file at the repository's top contained CLM-ONE-005, and the developer stood in a subdirectory containing no code | CLM-ONE-006  | that file and line                          |
        | CLM-ALC-015 | CLM-ONE-001 | only a commit's message contained CLM-ONE-900                                                                      | CLM-ONE-002  | the feature file and line                   |
        | CLM-ALC-NEW | CLM-ONE-001 | only a file git ignores contained CLM-ONE-900                                                                      | CLM-ONE-002  | the feature file and line                   |
        | CLM-ALC-008 | CLM-ONE-7   | nothing else contained a ONE code                                                                                  | CLM-ONE-008  | the feature file and line                   |
        | CLM-ALC-009 | CLM-ONE-999 | nothing else contained a ONE code                                                                                  | CLM-ONE-1000 | the feature file and line                   |

  Rule: allocate stops when something it must read cannot be read

    Scenario Outline: when git cannot answer, it stops and gives no code
      Given there was <what>
      When the developer asks for the next code
      Then it will stop as a usage error, naming what it could not read
      And it will give no code

      Examples:
        | clm         | what                         |
        | CLM-ALC-020 | a file git cannot read       |
        | CLM-ALC-021 | history git failed to read   |
        | CLM-ALC-022 | a damaged repository         |

  Rule: allocate says what history it did not read

    Scenario Outline: with no history to read, it answers and says what it did not read
      Given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @CLM-ONE-001
      And its git history once contained CLM-ONE-005
      And the developer's copy of it is <copy>
      When the developer asks for the next code for ONE in that copy
      Then the answer will be CLM-ONE-002, and nothing else
      And it will note that <boundary>

      Examples:
        | clm         | copy                                 | boundary                                             |
        | CLM-ALC-004 | not a git repository                 | no history was read                                  |
        | CLM-ALC-NEW | a shallow clone from after that line | history before the clone's first commit was not read |

  Rule: allocate takes only a feature code a feature file has

    Scenario Outline: a feature code no feature file has stops it, listing those that do
      Given the repository's features folder contained feature files tagged @ONE and @TWO, where <where>
      When the developer asks for the next code for ZZZ
      Then it will stop as an unknown feature code, and give no code
      And it will list ONE and TWO

      Examples:
        | clm         | where                                                    |
        | CLM-ALC-010 | no file mentions ZZZ                                     |
        | CLM-ALC-NEW | a test fixture's feature file is tagged @ZZZ             |
        | CLM-ALC-NEW | a feature file tagged @ZZZ was deleted by a later commit |

    Scenario Outline: --new gives the next code for any well-formed feature code
      Given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @CLM-ONE-003
      And its git history once contained CLM-OLD-007
      When the developer asks for the next code for <code>, as a new feature code
      Then the answer will be <answer>, and nothing else
      And <note>

      Examples:
        | clm         | code | answer      | note                                             |
        | CLM-ALC-011 | ZZ   | CLM-ZZ-001  | it will say nothing more                         |
        | CLM-ALC-NEW | ONE  | CLM-ONE-004 | it will note that a feature file already has ONE |
        | CLM-ALC-NEW | OLD  | CLM-OLD-008 | it will say nothing more                         |

    @CLM-ALC-023
    Scenario: a feature code on a feature file in a subdirectory is found
      Given the repository's features folder contained, two folders down, the only feature file tagged @NEST, with a scenario tagged @CLM-NEST-004
      When the developer asks for the next code for NEST
      Then the answer will be CLM-NEST-005, and nothing else

    @CLM-ALC-012
    Scenario: a request that is not a feature code stops as a usage error
      Given the repository's features folder contained a feature file tagged @ONE
      When the developer asks for the next code giving something that is not a feature code
      Then it will stop as a usage error, and give no code
