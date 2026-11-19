@STG
Feature: every claim code is well formed, filed under its file's code, and never reused

  A feature code is two to five uppercase letters or digits. A claim code is CLM, a feature code
  and a number of any width: CLM-<FFF>-<NNN>.
  balance reads every id by this one form. An id in any other form is not a claim code.

  A feature file declares its feature code on the line above Feature:, and its scenarios' claim
  codes are filed under it. Before it reconciles, balance checks where each claim code is
  written. It finds a claim code error for a claim code that is misplaced or clashes.

  allocate gives the next claim code for a feature code. Its answer is the code alone. When there
  is no repository, or the repository is a shallow clone, allocate notes the history it did not
  read beside the answer, never in it. When something it must read cannot be read, allocate stops
  and gives no code. It never gives a code worked out without what it could not read.

  @unit
  Scenario Outline: an id is a feature code or a claim code only in that form
    given there was the id <id>
    when it is checked against the <form> form
    then it will <result>

    Examples:
      | clm         | form         | id           | result                |
      | CLM-STG-037 | feature code | AB           | be a feature code     |
      | CLM-STG-038 | feature code | ABCDE        | be a feature code     |
      | CLM-STG-039 | feature code | A1           | be a feature code     |
      | CLM-STG-040 | feature code | A            | not be a feature code |
      | CLM-STG-041 | feature code | ABCDEF       | not be a feature code |
      | CLM-STG-042 | feature code | abc          | not be a feature code |
      | CLM-STG-044 | claim code   | CLM-ONE-001  | be a claim code       |
      | CLM-STG-045 | claim code   | CLM-ONE-7    | be a claim code       |
      | CLM-STG-046 | claim code   | CLM-ONE-1000 | be a claim code       |
      | CLM-STG-047 | claim code   | CLM-A-001    | not be a claim code   |
      | CLM-STG-048 | claim code   | CLM-ONE-     | not be a claim code   |

  @unit @CLM-STG-043
  Scenario: a tag above Feature: will be the feature code of that file
    given a feature file had the tag @ONE above Feature:
    when balance reads it
    then ONE will be the feature code of that file

  Rule: balance checks where each claim code is written before it reconciles

    @unit @CLM-STG-091
    Scenario: balance finds no claim code error in feature files with no feature code and no claim code
      given three.feature and four.feature had no feature code, and each contained a scenario with no claim code
      when balance reads it
      then it will find no claim code error

    @unit
    Scenario Outline: a misplaced or clashing claim code will be a claim code error
      given <files>
      when balance reads them
      then balance will find the error <error>, naming <facts>

      Examples:
        | clm         | files                                                                                                              | error                        | facts                                                             |
        | CLM-STG-054 | one.feature, tagged @ONE, contained a scenario tagged @CLM-TWO-001, and two.feature was tagged @TWO                | foreign-claim-code           | CLM-TWO-001, one.feature, and two.feature as the file tagged @TWO |
        | CLM-STG-095 | one.feature, tagged @ONE, contained an Outline with CLM-TWO-001 in its clm column, and two.feature was tagged @TWO | foreign-claim-code           | CLM-TWO-001, one.feature, and two.feature as the file tagged @TWO |
        | CLM-STG-055 | one.feature, tagged @ONE, contained a scenario tagged @CLM-ZZZ-001, and no file was tagged @ZZZ                    | foreign-claim-code           | CLM-ZZZ-001, one.feature, and no file tagged @ZZZ                 |
        | CLM-STG-056 | three.feature had no feature code, and contained a scenario tagged @CLM-ONE-002                                    | no-feature-code              | three.feature                                                     |
        | CLM-STG-057 | one.feature and uno.feature were both tagged @ONE                                                                  | duplicate-feature-code       | @ONE, one.feature and uno.feature                                 |
        | CLM-STG-058 | one.feature contained a scenario tagged both @CLM-ONE-001 and @CLM-ONE-002                                         | several-claim-codes          | one.feature, that scenario, CLM-ONE-001 and CLM-ONE-002           |
        | CLM-STG-059 | one.feature contained an Outline tagged @CLM-ONE-009 with a clm column                                             | claim-code-beside-clm-column | one.feature, that Outline, CLM-ONE-009                            |
        | CLM-STG-060 | one.feature contained an Outline with a clm column and an Examples block tagged @CLM-ONE-009                       | claim-code-beside-clm-column | one.feature, that Outline, CLM-ONE-009                            |
        | CLM-STG-094 | one.feature contained an Outline tagged @CLM-ONE-009, with a clm column and an Examples block tagged @CLM-ONE-009  | claim-code-beside-clm-column | one.feature, that Outline, and CLM-ONE-009 once                   |

    @unit @CLM-STG-096
    Scenario: a claim code in an Examples cell of an Outline with no clm column is no claim code error
      given one.feature, tagged @ONE, had an Outline with no clm column, and an Examples cell CLM-TWO-001
      when balance reads it
      then it will find no claim code error

  Rule: allocate's next code is one past the highest code that has ever been in the repository

    allocate takes feature codes from the feature files. It takes numbers from every file git lists
    in the tree, except the files git ignores, and from every line the repository's reachable
    history has contained. It counts a code written under CLM. It never gives out again a number
    a claim code has had.

    @unit
    Scenario Outline: the answer is one past the highest code in the feature file, a tracked file or history
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
        | CLM-STG-097 | CLM-ONE-001 | a merge's resolution, and neither side, had CLM-ONE-005                                                            | CLM-ONE-006  | the file and line it was in, and the commit |
        | CLM-STG-068 | CLM-ONE-001 | only a commit's message contained CLM-ONE-900                                                                      | CLM-ONE-002  | the feature file and line                   |
        | CLM-STG-069 | CLM-ONE-001 | only a file git ignores contained CLM-ONE-900                                                                      | CLM-ONE-002  | the feature file and line                   |
        | CLM-STG-070 | CLM-ONE-7   | nothing else contained a ONE code                                                                                  | CLM-ONE-008  | the feature file and line                   |
        | CLM-STG-071 | CLM-ONE-999 | nothing else contained a ONE code                                                                                  | CLM-ONE-1000 | the feature file and line                   |

    @unit @CLM-STG-098
    Scenario: with no code seen, the answer is the feature code's first claim code
      given the repository's features folder contained a feature file tagged @ONE, with no claim code
      and nothing else contained a ONE code
      when the developer asks for the next code for ONE
      then the answer will be CLM-ONE-001, and nothing else, with no note

  Rule: allocate gives a code only under a feature code a feature file has, unless asked for a new one

    @unit @CLM-STG-083
    Scenario: allocate finds a feature code on a feature file in a subfolder
      given the repository's features folder contained, two folders down, the only feature file tagged @NEST, with a scenario tagged @CLM-NEST-004
      when the developer asks for the next code for NEST
      then the answer will be CLM-NEST-005, and nothing else

    @unit
    Scenario Outline: allocate refuses a feature code no feature file has, and lists those that have one
      given the repository's features folder contained feature files tagged @ONE and @TWO, and <where>
      when the developer asks for the next code for ZZZ
      then it will stop as an unknown feature code, and give no code
      and it will list ONE and TWO, in alphabetical order

      Examples:
        | clm         | where                                                    |
        | CLM-STG-077 | no file mentioned ZZZ                                    |
        | CLM-STG-078 | a test fixture's feature file was tagged @ZZZ            |
        | CLM-STG-079 | a feature file tagged @ZZZ was deleted by a later commit |

    @unit
    Scenario Outline: a request for a new feature code gives the next code for any well-formed one
      given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @CLM-ONE-003
      and its git history once contained CLM-OLD-007
      when the developer asks for the next code for <code>, as a new feature code
      then the answer will be <answer>, and nothing else
      and <note>

      Examples:
        | clm         | code | answer      | note                                             |
        | CLM-STG-080 | ZZ   | CLM-ZZ-001  | it will give no note                             |
        | CLM-STG-081 | ONE  | CLM-ONE-004 | it will note that a feature file already has ONE |
        | CLM-STG-082 | OLD  | CLM-OLD-008 | it will give no note                             |

    @unit @CLM-STG-086
    Scenario: a request for a new feature code, with no features folder, gives its first claim code
      given the repository had no features folder
      when the developer asks for the next code for ZZ, as a new feature code
      then the answer will be CLM-ZZ-001, and nothing else

  Rule: allocate says what history it did not read

    @unit
    Scenario Outline: with no history to read, allocate answers and notes what it did not read
      given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @CLM-ONE-001
      and its git history once contained CLM-ONE-005
      and the developer's copy of it was <copy>
      when the developer asks for <request> in that copy
      then the answer will be <answer>, and nothing else
      and it will note that <boundary>

      Examples:
        | clm         | copy                                 | request                                     | answer      | boundary                                             |
        | CLM-STG-075 | not a git repository                 | the next code for ONE                       | CLM-ONE-002 | no history was read                                  |
        | CLM-STG-076 | a shallow clone from after that line | the next code for ONE                       | CLM-ONE-002 | history before the clone's first commit was not read |
        | CLM-STG-087 | not a git repository                 | the next code for ZZ, as a new feature code | CLM-ZZ-001  | no history was read                                  |
        | CLM-STG-088 | a shallow clone                      | the next code for ZZ, as a new feature code | CLM-ZZ-001  | history before the clone's first commit was not read |

  Rule: allocate stops when something it must read cannot be read

    @unit
    Scenario Outline: allocate names what it could not read, and gives no code
      given there was <what>
      when the developer asks for the next code
      then it will stop as a usage error, naming <what it names>
      and it will give no code

      Examples:
        | clm         | what                                | what it names                             |
        | CLM-STG-072 | a file git cannot read              | what it could not read, and what git said |
        | CLM-STG-073 | history git failed to read          | what it could not read                    |
        | CLM-STG-074 | a damaged repository                | what it could not read, and what git said |
        | CLM-STG-085 | a folder in the tree it cannot read | what it could not read                    |
        | CLM-STG-093 | a file in the tree it cannot read   | what it could not read                    |
        | CLM-STG-089 | a feature file that does not parse  | what it could not read                    |

    @unit @CLM-STG-090
    Scenario: allocate still answers when a nested checkout has a folder it cannot read
      given the repository's features folder contained a feature file tagged @ONE, with a scenario tagged @CLM-ONE-001
      and the repository contained a nested checkout, such as a submodule, with a folder in it that allocate could not read
      when the developer asks for the next code for ONE
      then the answer will be CLM-ONE-002, and nothing else
