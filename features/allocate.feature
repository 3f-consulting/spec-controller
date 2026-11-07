@ALC
Feature: Allocate the next claim code for a feature part

  An author asks the installed tool for the next claim code instead of inventing one. The code is
  one past the highest the repository has ever carried for that feature part, so a code that was
  retired is never handed out again: a reissued code would make every old reference to it, in
  history, in a chat, in a stale document, resolve silently to a different capability.

  Parts come from the corpus's feature-file headers. Numbers come from every text file in the tree
  and from the diff lines of reachable history. The answer is the code alone, so an agent or a
  script can consume it. What the repository's shape leaves unread, having no repository or being a
  shallow clone, is said beside the answer, never inside it; what the tool is prevented from reading
  is refused.

  Rule: the next code is one past the highest the tree has ever carried

    @CLM-ALC-001 @unit @e2e
    Scenario: A feature part whose highest live code is below a deleted one is offered one past the deleted code
      Given a repository whose feature file headed ONE carries the claim codes CLM-ONE-001 and CLM-ONE-005
      And a later commit deletes the scenario coded CLM-ONE-005
      When the author asks for the next code for ONE
      Then the answer is a claim code ending ONE-006, and nothing else

    @CLM-ALC-002 @unit @e2e
    Scenario: A code carried only on a CI step id is never offered again
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-001
      And the repository's CI workflow has a step whose id is CLM-ONE-007
      When the author asks for the next code for ONE
      Then the answer is a claim code ending ONE-008, and nothing else

    @CLM-ALC-003 @unit @e2e
    Scenario: A code carried only in a test title is never offered again
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-001
      And the repository has a test whose title cites CLM-ONE-007
      When the author asks for the next code for ONE
      Then the answer is a claim code ending ONE-008, and nothing else

    @CLM-ALC-015 @unit @e2e
    Scenario: A code that appears only in a commit message is not retired
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-001
      And a later commit, whose message mentions CLM-ONE-900, retags the scenario coded CLM-ONE-001
      When the author asks for the next code for ONE
      Then the answer is a claim code ending ONE-002, and nothing else

    @CLM-ALC-005 @unit @e2e
    Scenario Outline: stderr names where the highest code was seen — <where>
      Given a repository whose highest ONE code, CLM-ONE-005, is <carried>
      When the author asks for the next code for ONE
      Then beside the answer it names where CLM-ONE-005 was seen: <place>

      Examples:
        | where                                  | carried                           | place                                                        |
        | a file and line in the tree            | still carried by its feature file | the file and line that carry it                              |
        | a file, line and commit only in history | deleted by a later commit         | the file and line that carried it, and the commit that did so |

    @CLM-ALC-004 @unit @e2e
    Scenario Outline: With no history to read, a code is still offered and the boundary is stated on stderr — <tree>
      Given a repository whose feature file headed ONE carries CLM-ONE-001, and whose history once carried CLM-ONE-005
      And the author's copy of it is <copy>
      When the author asks for the next code for ONE in that copy
      Then the answer is a claim code ending ONE-002, and nothing else
      And beside the answer it states that <boundary>

      Examples:
        | tree                     | copy                                                                                 | boundary                                              |
        | not a git repository     | a copy without git, whose packages and hidden directories mention CLM-ONE-900 | no history was read, because the copy is not a git repository |
        | a shallow clone          | a clone one commit deep                                                               | history before the clone's first commit was not read  |

    @CLM-ALC-006 @e2e
    Scenario: Run from a subdirectory, the whole repository is read
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-001
      And the author has since tagged a new scenario CLM-ONE-007 in that file, not yet committed
      When the author asks for the next code for ONE from a subdirectory holding no code
      Then the answer is a claim code ending ONE-008, and nothing else

    @CLM-ALC-007 @e2e
    Scenario: A code written into a file not yet added to git is never offered again
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-001
      And the author has written CLM-ONE-007 into a new file not yet added to git
      And a file the repository ignores mentions CLM-ONE-900
      When the author asks for the next code for ONE
      Then the answer is a claim code ending ONE-008, and nothing else

    @CLM-ALC-025 @unit
    Scenario Outline: allocate counts the highest number wherever a code appears, under either prefix

  Rule: the code is printed alone, in the claim-code form, and the number never runs out

    @CLM-ALC-008 @unit @e2e
    Scenario: The code is printed alone on stdout, zero-padded to three digits
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-7
      When the author asks for the next code for ONE
      Then the answer is a claim code ending ONE-008, and nothing else

    @CLM-ALC-009 @unit @e2e
    Scenario: A part whose highest code is 999 is offered 1000
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-999
      When the author asks for the next code for ONE
      Then the answer is a claim code ending ONE-1000, and nothing else

  Rule: allocate writes its answer under CLM

    @CLM-ALC-026 @unit
    Scenario: allocate writes the next code under CLM, even when the repository holds only SCN codes

  Rule: parts come from the tree's feature-file headers; a malformed request is a usage error

    A part is a feature of the corpus when a feature file in its features directory, at any depth, is
    headed with it.
    History and test fixtures say which numbers a part has used, never whether the part exists.
    A host modifier before allocate is refused, because allocate keeps no run; a request for
    allocate's help is answered first, whatever stands before it.

    @CLM-ALC-010 @unit @e2e
    Scenario Outline: A part no feature file's header carries is refused as an unknown part, listing the header codes and nothing else — <part>
      Given a repository whose feature files are headed ONE and TWO, where <where>
      When the author asks for the next code for ZZZ
      Then it is refused as an unknown part, and no code is given
      And the refusal lists ONE and TWO as the parts the corpus carries, and no other part

      Examples:
        | part                           | where                                                                    |
        | carried nowhere                | no file mentions ZZZ                                                     |
        | carried only in a test fixture | a test fixture's feature file is headed ZZZ and carries CLM-ZZZ-004      |
        | carried only in history        | a feature file headed ZZZ was deleted by a later commit                  |

    @CLM-ALC-011 @unit @e2e
    Scenario Outline: --new admits a part no feature file's header carries, and on a part a header does carry it answers as usual with a note on stderr — <part>
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
      When the author asks for the next code for <part>, as a new part
      Then the answer is <answer>, and nothing else
      And beside the answer <note>

      Examples:
        | part | answer                      | note                                                       |
        | ZZ   | a claim code ending ZZ-001  | it says nothing of the part being carried already          |
        | ONE  | a claim code ending ONE-004 | it notes that a feature file's header already carries ONE  |

    @CLM-ALC-023 @unit @e2e
    Scenario: A part headed only by a feature file in a subdirectory of features, at any depth, is a known part and is offered its next code
      Given a repository whose only feature file headed NEST lies two subdirectories down in its features directory and carries the claim code CLM-NEST-004
      When the author asks for the next code for NEST
      Then the answer is a claim code ending NEST-005, and nothing else

    @CLM-ALC-012 @unit @e2e
    Scenario Outline: A request not in the claim-code form is refused as a usage error, never as an unknown part — <request>
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
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

    @CLM-ALC-013 @unit @e2e
    Scenario Outline: allocate --help answers first, listing <FFF> and --new, and exits 0 whatever else is given — <request>
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
      When the author asks allocate for its help <request>
      Then it answers with allocate's help, naming the feature part it takes and the new-part option, and gives no code

      Examples:
        | request                                    |
        | alone                                      |
        | by its short name, alone                   |
        | after a part                               |
        | after a part not in the claim-code form |
        | beside a flag the command does not take    |

    @CLM-ALC-014 @unit @e2e
    Scenario Outline: A host modifier before allocate is refused, and nothing is stored — <modifiers>
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
      When the author asks for the next code for ONE with <modifiers> before the command
      Then it is refused as a usage error naming <modifiers>, and no code is given
      And nothing is stored, in the run store or the repository

      Examples:
        | modifiers                                    |
        | the store modifier                           |
        | the run-name modifier                        |
        | the store modifier and the run-name modifier |

    @CLM-ALC-016 @unit @e2e
    Scenario Outline: a host modifier before allocate does not stop a request for allocate's help, which answers as it does alone, at exit 0, and stores nothing — <modifiers> <request>
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
      When the author gives <modifiers> before allocate and asks it for its help <request>
      Then it answers with allocate's help, exactly as it does with nothing before it, and gives no code
      And nothing is stored, in the run store or the repository

      Examples:
        | modifiers                                    | request                                                    |
        | the store modifier                           | alone                                                      |
        | the store modifier                           | by its short name, alone                                   |
        | the store modifier                           | after a part                                               |
        | the store modifier                           | by its short name, beside a flag the command does not take |
        | the run-name modifier                        | alone                                                      |
        | the run-name modifier                        | by its short name, alone                                   |
        | the run-name modifier                        | after a part                                               |
        | the run-name modifier                        | by its short name, beside a flag the command does not take |
        | the store modifier and the run-name modifier | alone                                                      |
        | the store modifier and the run-name modifier | by its short name, alone                                   |
        | the store modifier and the run-name modifier | after a part                                               |
        | the store modifier and the run-name modifier | by its short name, beside a flag the command does not take |

  Rule: a file allocate cannot read is a usage error, never a crash and never an answer without it

    A file, a directory or a repository that allocate is meant to read and cannot is the invocation
    being wrong, the same as a malformed request: it is refused, naming the path and the reason, and
    no code is given. An answer computed without it could hand out a code the unread file carries.

    @CLM-ALC-017 @unit @e2e
    Scenario Outline: a path allocate reads that is not the kind it reads is refused, naming the path — <path>
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
      And in that repository <path> is <kind>
      When the author asks for the next code for ONE
      Then it is refused as a path allocate cannot read, and no code is given
      And allocate's refusal names <path>

      Examples:
        | path                 | kind                               |
        | features             | a regular file                     |
        | features/two.feature | a directory                        |
        | features/two.feature | a link to a file that is not there |

    @CLM-ALC-018 @unit @e2e
    Scenario Outline: a path allocate is not permitted to read is refused, naming the path and saying it was not permitted — <path>
      Given a <copy> whose feature file headed ONE carries the claim code CLM-ONE-003, and whose <path> allocate is not permitted to read
      When the author asks for the next code for ONE
      Then it is refused as a path allocate cannot read, and no code is given
      And allocate's refusal names <path> and says allocate was not permitted to read it

      Examples:
        | copy             | path                 |
        | repository       | features/one.feature |
        | repository       | features             |
        | repository       | features/nested      |
        | copy without git | docs/notes.md        |
        | copy without git | docs                 |
        | copy without git | working directory    |

    @CLM-ALC-019 @unit @e2e
    Scenario: asked from a working directory that no longer exists, allocate is refused as a usage error
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
      When the author asks for the next code for ONE from a working directory that has since been removed
      Then it is refused as a path allocate cannot read, and no code is given
      And allocate's refusal says the working directory could not be read

    @CLM-ALC-020 @unit @e2e
    Scenario Outline: a file in the repository git cannot read is refused, never left out of the answer — <file>
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
      And in it, <file> carries CLM-ONE-016, and <unreadable>
      When the author asks for the next code for ONE, standing in <where>
      Then it is refused as a path allocate cannot read, and no code is given
      And allocate's refusal names <named> and says allocate was not permitted to read it

      Examples:
        | file                                                         | unreadable                                             | named                | where          |
        | an untracked file, drafts/new.md                             | allocate is not permitted to read it                   | drafts/new.md        | its top        |
        | an untracked file, drafts/new.md                             | allocate is not permitted to list its directory        | drafts               | its top        |
        | an untracked file, drafts/new.md                             | allocate may list its directory but not enter it       | drafts               | its top        |
        | a tracked file with an edit not yet committed, docs/notes.md | allocate is not permitted to read it                   | docs/notes.md        | its top        |
        | the feature file, with an edit not yet committed             | allocate is not permitted to list the repository's top | the repository's top | a subdirectory |

    @CLM-ALC-021 @unit @e2e
    Scenario Outline: history git cannot read is refused, never answered below a code it carries — <history>
      Given a repository whose feature file headed ONE carries the claim codes CLM-ONE-001 and CLM-ONE-005
      And a later commit deletes the scenario coded CLM-ONE-005
      And <history>
      When the author asks for the next code for ONE
      Then it is refused as a path allocate cannot read, and no code is given
      And allocate's refusal says the repository's history could not be read

      Examples:
        | history                                                                                   |
        | its loose objects are not permitted to be read                                            |
        | its objects are packed, and the pack is not permitted to be read                          |
        | its branch refs are not permitted to be read                                              |
        | it is cloned one commit deep, and the clone's shallow record is not permitted to be read |

    @CLM-ALC-022 @unit @e2e
    Scenario Outline: a repository git cannot open is refused, never read as no repository — <git directory>
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
      And <git directory>
      When the author asks for the next code for ONE
      Then it is refused as a path allocate cannot read, and no code is given
      And allocate's refusal names the repository's .git and says git could not open it

      Examples:
        | git directory                                                |
        | its .git directory is not permitted to be read               |
        | its object store is not permitted to be read                 |
        | its HEAD is not permitted to be read                         |
        | its .git is a file pointing to a directory that is not there |

    @CLM-ALC-024 @unit @e2e
    Scenario: a feature file the Gherkin parser rejects is refused, naming the file and the parser's words, and no code is given
      Given a repository whose feature file headed ONE carries the claim code CLM-ONE-003
      And in that repository features/two.feature is a feature file the Gherkin parser rejects
      When the author asks for the next code for ONE
      Then it is refused as a usage error, never as an unknown part, and no code is given
      And allocate's refusal names features/two.feature and the parser's own words
