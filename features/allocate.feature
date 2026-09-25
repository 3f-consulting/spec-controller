@ALC
Feature: Allocate the next scenario code for a feature part

  An author asks the installed tool for the next scenario code instead of inventing one. The code is
  one past the highest the repository has ever carried for that feature part, so a code that was
  retired is never handed out again: a reissued code would make every old reference to it, in
  history, in a chat, in a stale document, resolve silently to a different capability.

  Parts come from the corpus's feature-file headers. Numbers come from every text file in the tree
  and from the diff lines of reachable history. The answer is the code alone, so an agent or a
  script can consume it; anything the tool could not see is said beside the answer, never inside it.

  Rule: the next code is one past the highest the tree has ever carried

    @SCN-ALC-001 @unit @e2e
    Scenario: A feature part whose highest live code is below a deleted one is offered one past the deleted code
      Given a repository whose feature file headed ONE carries the scenario codes SCN-ONE-001 and SCN-ONE-005
      And a later commit deletes the scenario coded SCN-ONE-005
      When the author asks for the next code for ONE
      Then the answer is SCN-ONE-006, and nothing else

    @SCN-ALC-002 @unit @e2e
    Scenario: A code carried only on a CI step id is never offered again
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-001
      And the repository's CI workflow has a step whose id is SCN-ONE-007
      When the author asks for the next code for ONE
      Then the answer is SCN-ONE-008, and nothing else

    @SCN-ALC-003 @unit @e2e
    Scenario: A code carried only in a test title is never offered again
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-001
      And the repository has a test whose title cites SCN-ONE-007
      When the author asks for the next code for ONE
      Then the answer is SCN-ONE-008, and nothing else

    @SCN-ALC-015 @unit @e2e
    Scenario: A code that appears only in a commit message is not retired
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-001
      And a later commit, whose message mentions SCN-ONE-900, retags the scenario coded SCN-ONE-001
      When the author asks for the next code for ONE
      Then the answer is SCN-ONE-002, and nothing else

    @SCN-ALC-005 @unit @e2e
    Scenario Outline: stderr names where the highest code was seen — <where>
      Given a repository whose highest ONE code, SCN-ONE-005, is <carried>
      When the author asks for the next code for ONE
      Then beside the answer it names where SCN-ONE-005 was seen: <place>

      Examples:
        | where                                  | carried                           | place                                                        |
        | a file and line in the tree            | still carried by its feature file | the file and line that carry it                              |
        | a file, line and commit only in history | deleted by a later commit         | the file and line that carried it, and the commit that did so |

    @SCN-ALC-004 @unit @e2e
    Scenario Outline: With no history to read, a code is still offered and the boundary is stated on stderr — <tree>
      Given a repository whose feature file headed ONE carries SCN-ONE-001, and whose history once carried SCN-ONE-005
      And the author's copy of it is <copy>
      When the author asks for the next code for ONE in that copy
      Then the answer is SCN-ONE-002, and nothing else
      And beside the answer it states that <boundary>

      Examples:
        | tree                     | copy                                                                                 | boundary                                              |
        | not a git repository     | a copy without git, whose packages and hidden directories mention SCN-ONE-900 | no history was read, because the copy is not a git repository |
        | a shallow clone          | a clone one commit deep                                                               | history before the clone's first commit was not read  |

    @SCN-ALC-006 @e2e
    Scenario: Run from a subdirectory, the whole repository is read
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-001
      And the author has since tagged a new scenario SCN-ONE-007 in that file, not yet committed
      When the author asks for the next code for ONE from a subdirectory holding no code
      Then the answer is SCN-ONE-008, and nothing else

    @SCN-ALC-007 @e2e
    Scenario: A code written into a file not yet added to git is never offered again
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-001
      And the author has written SCN-ONE-007 into a new file not yet added to git
      And a file the repository ignores mentions SCN-ONE-900
      When the author asks for the next code for ONE
      Then the answer is SCN-ONE-008, and nothing else

  Rule: the code is printed alone, in canon's form, and the number never runs out

    @SCN-ALC-008 @unit @e2e
    Scenario: The code is printed alone on stdout, zero-padded to three digits
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-7
      When the author asks for the next code for ONE
      Then the answer is SCN-ONE-008, and nothing else

    @SCN-ALC-009 @unit @e2e
    Scenario: A part whose highest code is 999 is offered 1000
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-999
      When the author asks for the next code for ONE
      Then the answer is SCN-ONE-1000, and nothing else

  Rule: parts come from the tree's feature-file headers; a malformed request is a usage error

    A part is a feature of the corpus when a feature file in its features directory is headed with it.
    History and test fixtures say which numbers a part has used, never whether the part exists.

    @SCN-ALC-010 @unit @e2e
    Scenario Outline: A part no feature file's header carries is refused as an unknown part, listing the header codes and nothing else — <part>
      Given a repository whose feature files are headed ONE and TWO, where <where>
      When the author asks for the next code for ZZZ
      Then it is refused as an unknown part, and no code is given
      And the refusal lists ONE and TWO as the parts the corpus carries, and no other part

      Examples:
        | part                           | where                                                                    |
        | carried nowhere                | no file mentions ZZZ                                                     |
        | carried only in a test fixture | a test fixture's feature file is headed ZZZ and carries SCN-ZZZ-004      |
        | carried only in history        | a feature file headed ZZZ was deleted by a later commit                  |

    @SCN-ALC-011 @unit @e2e
    Scenario Outline: --new admits a part no feature file's header carries, and on a part a header does carry it answers as usual with a note on stderr — <part>
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-003
      When the author asks for the next code for <part>, as a new part
      Then the answer is <answer>, and nothing else
      And beside the answer <note>

      Examples:
        | part | answer      | note                                                       |
        | ZZ   | SCN-ZZ-001  | it says nothing of the part being carried already          |
        | ONE  | SCN-ONE-004 | it notes that a feature file's header already carries ONE  |

    @SCN-ALC-012 @unit @e2e
    Scenario Outline: A request not in canon's form is refused as a usage error, never as an unknown part — <request>
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-003
      When the author asks for the next code giving <request>
      Then it is refused as a usage error, never as an unknown part, and no code is given

      Examples:
        | request                                 |
        | no part                                 |
        | the part fit, in lower case             |
        | the part F, one character long          |
        | the part TOOLONG, seven characters long |
        | two parts, ONE and TWO                  |
        | the part ONE and a flag it does not take |

    @SCN-ALC-013 @unit @e2e
    Scenario Outline: allocate --help answers first, listing <FFF> and --new, and exits 0 whatever else is given — <request>
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-003
      When the author asks allocate for its help <request>
      Then it answers with allocate's help, naming the feature part it takes and --new, and gives no code

      Examples:
        | request                               |
        | alone                                 |
        | by its short name, alone              |
        | after a part                          |
        | after a part not in canon's form      |
        | beside a flag the command does not take |

    @SCN-ALC-014 @unit @e2e
    Scenario Outline: A host modifier before allocate is refused, and nothing is stored — <modifiers>
      Given a repository whose feature file headed ONE carries the scenario code SCN-ONE-003
      When the author asks for the next code for ONE with <modifiers> before the command
      Then it is refused as a usage error naming <modifiers>, and no code is given
      And nothing is stored, in the store root or the repository

      Examples:
        | modifiers           |
        | --store             |
        | --run-id            |
        | --store and --run-id |
