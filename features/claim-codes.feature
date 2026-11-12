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

  @unit
  Scenario Outline: a feature code is two to five uppercase letters or digits
    given there was the id <code>
    when it is checked against the feature code form
    then it will <result>

    Examples:
        | clm         | code   | result                |
        | CLM-STG-037 | AB     | be a feature code     |
        | CLM-STG-038 | ABCDE  | be a feature code     |
        | CLM-STG-039 | A1     | be a feature code     |
        | CLM-STG-040 | A      | not be a feature code |
        | CLM-STG-041 | ABCDEF | not be a feature code |
        | CLM-STG-042 | abc    | not be a feature code |

  @unit
  Scenario Outline: a claim code is CLM, a feature code and a number
    given there was the id <id>
    when it is checked against the claim code form
    then it will <result>

    Examples:
        | clm         | id           | result              |
        | CLM-STG-044 | CLM-ONE-001  | be a claim code     |
        | CLM-STG-045 | CLM-ONE-7    | be a claim code     |
        | CLM-STG-046 | CLM-ONE-1000 | be a claim code     |
        | CLM-STG-047 | CLM-A-001    | not be a claim code |
        | CLM-STG-048 | CLM-ONE-     | not be a claim code |

  @unit
  Scenario Outline: a retired scenario code is SCN, a feature code and a number
    given there was the id <id>
    when it is checked against the retired scenario code form
    then it will <result>

    Examples:
      | clm         | id           | result                         |
      | CLM-STG-049 | SCN-ONE-001  | be a retired scenario code     |
      | CLM-STG-050 | SCN-ONE-7    | be a retired scenario code     |
      | CLM-STG-051 | SCN-ONE-1000 | be a retired scenario code     |
      | CLM-STG-052 | SCN-A-001    | not be a retired scenario code |
      | CLM-STG-053 | SCN-ONE-     | not be a retired scenario code |

  @unit @CLM-STG-043
  Scenario: a tag above Feature: will be the feature code of that file
    given a feature file had the tag @ONE above Feature:
    when balance reads it
    then ONE will be the feature code of that file

  Rule: balance checks where each claim code is written before it reconciles

    @unit @CLM-STG-091
    Scenario: balance finds no claim code error in a feature file with no feature code and no claim code
      given three.feature had no feature code, and contained a scenario with no claim code
      when balance reads it
      then it will find no claim code error

    @unit
    Scenario Outline: a misplaced or clashing claim code will be a claim code error
      given <files>
      when balance reads them
      then it will find <error>, about <facts>

      Examples:
        | clm         | files                                                                                             | error                        | facts                                                             |
        | CLM-STG-054 | one.feature, tagged @ONE, contains a scenario tagged @CLM-TWO-001, and two.feature is tagged @TWO | foreign-claim-code           | CLM-TWO-001, one.feature, and two.feature as the file tagged @TWO |
        | CLM-STG-055 | one.feature, tagged @ONE, contains a scenario tagged @CLM-ZZZ-001, and no file is tagged @ZZZ     | foreign-claim-code           | CLM-ZZZ-001, one.feature, and no file tagged @ZZZ                 |
        | CLM-STG-056 | three.feature has no feature code, and contains a scenario tagged @CLM-ONE-002                    | no-feature-code              | three.feature                                                     |
        | CLM-STG-057 | one.feature and uno.feature are both tagged @ONE                                                  | duplicate-feature-code       | @ONE, one.feature and uno.feature                                 |
        | CLM-STG-058 | one.feature contains a scenario tagged both @CLM-ONE-001 and @CLM-ONE-002                         | several-claim-codes          | one.feature, that scenario, CLM-ONE-001 and CLM-ONE-002           |
        | CLM-STG-059 | one.feature contains an Outline tagged @CLM-ONE-009 with a clm column                             | claim-code-beside-clm-column | one.feature, that Outline, CLM-ONE-009                            |
        | CLM-STG-060 | one.feature contains an Outline with a clm column and an Examples block tagged @CLM-ONE-009       | claim-code-beside-clm-column | one.feature, that Outline, CLM-ONE-009                            |

  Rule: allocate's next code is one past the highest code that has ever been in the repository

    allocate asks git which files the repository has and reads each for codes, and asks git for
    every line its history has contained. It counts a code written under CLM or the retired SCN, and
    writes its answer under CLM, so no number a code has had is handed out again.

    @unit
    Scenario Outline: the answer is one past the highest code the repository has contained
      given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @<in the file>
      and <elsewhere>
      when the developer asks for the next code for ONE
      then the answer will be <answer>, and nothing else
      and it will note the highest code it saw, and where: <seen>

      Examples:
        | clm         | in the file | elsewhere                                                                                                          | answer       | seen                                        |
        | CLM-STG-061 | CLM-ONE-001 | a file git tracks, such as a workflow or a test, contained CLM-ONE-005                                             | CLM-ONE-006  | that file and line                          |
        | CLM-STG-066 | CLM-ONE-001 | a new file git does not ignore contained CLM-ONE-005                                                               | CLM-ONE-006  | that file and line                          |
        | CLM-STG-067 | CLM-ONE-001 | a file at the repository's top contained CLM-ONE-005, and the developer stood in a subdirectory containing no code | CLM-ONE-006  | that file and line                          |
        | CLM-STG-062 | CLM-ONE-001 | a line in git history, since deleted, had CLM-ONE-005                                                              | CLM-ONE-006  | the file and line it was in, and the commit |
        | CLM-STG-063 | CLM-ONE-001 | a file git tracks contained SCN-ONE-005                                                                            | CLM-ONE-006  | that file and line                          |
        | CLM-STG-064 | CLM-ONE-001 | a line in git history, since deleted, had SCN-ONE-005                                                              | CLM-ONE-006  | the file and line it was in, and the commit |
        | CLM-STG-065 | CLM-ONE-001 | a file git tracks contained SCN-ONE-                                                                               | CLM-ONE-002  | the feature file and line                   |
        | CLM-STG-068 | CLM-ONE-001 | only a commit's message contained CLM-ONE-900                                                                      | CLM-ONE-002  | the feature file and line                   |
        | CLM-STG-069 | CLM-ONE-001 | only a file git ignores contained CLM-ONE-900                                                                      | CLM-ONE-002  | the feature file and line                   |
        | CLM-STG-070 | CLM-ONE-7   | nothing else contained a ONE code                                                                                  | CLM-ONE-008  | the feature file and line                   |
        | CLM-STG-071 | CLM-ONE-999 | nothing else contained a ONE code                                                                                  | CLM-ONE-1000 | the feature file and line                   |

  Rule: allocate takes only a feature code a feature file has

    @unit @CLM-STG-083
    Scenario: a feature code on a feature file in a subdirectory is found
      given the repository's features folder contained, two folders down, the only feature file tagged @NEST, with a scenario tagged @CLM-NEST-004
      when the developer asks for the next code for NEST
      then the answer will be CLM-NEST-005, and nothing else

    @unit
    Scenario Outline: a feature code no feature file has stops it, listing those that do
      given the repository's features folder contained feature files tagged @ONE and @TWO, where <where>
      when the developer asks for the next code for ZZZ
      then it will stop as an unknown feature code, and give no code
      and it will list ONE and TWO

      Examples:
        | clm         | where                                                    |
        | CLM-STG-077 | no file mentions ZZZ                                     |
        | CLM-STG-078 | a test fixture's feature file is tagged @ZZZ             |
        | CLM-STG-079 | a feature file tagged @ZZZ was deleted by a later commit |

    @unit @CLM-STG-084
    Scenario: a request that is not a feature code stops as a usage error
      given the repository's features folder contained a feature file tagged @ONE
      when the developer asks for the next code giving something that is not a feature code
      then it will stop as a usage error, and give no code

    @unit
    Scenario Outline: --new gives the next code for any well-formed feature code
      given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @CLM-ONE-003
      and its git history once contained CLM-OLD-007
      when the developer asks for the next code for <code>, as a new feature code
      then the answer will be <answer>, and nothing else
      and <note>

      Examples:
        | clm         | code | answer      | note                                             |
        | CLM-STG-080 | ZZ   | CLM-ZZ-001  | it will say nothing more                         |
        | CLM-STG-081 | ONE  | CLM-ONE-004 | it will note that a feature file already has ONE |
        | CLM-STG-082 | OLD  | CLM-OLD-008 | it will say nothing more                         |

    @unit @CLM-STG-086
    Scenario: --new in a repository with no features folder gives the feature code's first claim code
      given the repository had no features folder
      when the developer asks for the next code for ZZ, as a new feature code
      then the answer will be CLM-ZZ-001, and nothing else

  Rule: allocate says what history it did not read

    @unit
    Scenario Outline: with no history to read, it answers and says what it did not read
      given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @CLM-ONE-001
      and its git history once contained CLM-ONE-005
      and the developer's copy of it is <copy>
      when the developer asks for the next code for ONE in that copy
      then the answer will be CLM-ONE-002, and nothing else
      and it will note that <boundary>

      Examples:
        | clm         | copy                                 | boundary                                             |
        | CLM-STG-075 | not a git repository                 | no history was read                                  |
        | CLM-STG-076 | a shallow clone from after that line | history before the clone's first commit was not read |

    @unit
    Scenario Outline: with no history to read and no code seen, it answers and says what it did not read
      given the repository's features folder contained a feature file tagged @ONE
      and the developer's copy of it is <copy>
      when the developer asks for the next code for ZZ, as a new feature code
      then the answer will be CLM-ZZ-001
      and it will note that <boundary>

      Examples:
        | clm         | copy                 | boundary                                             |
        | CLM-STG-087 | not a git repository | no history was read                                  |
        | CLM-STG-088 | a shallow clone      | history before the clone's first commit was not read |

  Rule: allocate stops when something it must read cannot be read

    @unit
    Scenario Outline: allocate names what it could not read, and gives no code
      given there was <what>
      when the developer asks for the next code
      then it will stop as a usage error, naming what it could not read
      and it will give no code

      Examples:
        | clm         | what                                |
        | CLM-STG-072 | a file git cannot read              |
        | CLM-STG-073 | history git failed to read          |
        | CLM-STG-074 | a damaged repository                |
        | CLM-STG-085 | a folder in the tree it cannot read |
        | CLM-STG-089 | a feature file that does not parse  |

    @unit @CLM-STG-090
    Scenario: allocate still answers when a nested checkout holds a folder it cannot read
      given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @CLM-ONE-001
      and the repository contained a nested checkout, such as a submodule, holding a folder allocate could not read
      when the developer asks for the next code for ONE
      then the answer will be CLM-ONE-002, and nothing else
