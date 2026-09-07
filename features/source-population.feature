@SRC
Feature: A check's population is the tree it was told about

  Every scope-dependent check in this repository asks the same question first — which
  files am I about? — and until 3F-3207 nothing answered it. The source enumerator took
  no argument: the roots were frozen from the working directory at import, so the
  population each check walked was inherited from wherever the process happened to be
  standing rather than stated by the caller.

  That is silent almost everywhere, because the process is almost always standing in the
  repository. It stops being silent under a mutation runner. Stryker copies the tree into
  an instrumented sandbox and runs the suite from inside it, so the working directory IS
  the sandbox — and the engine-purity guard, asked nothing and inheriting that, scanned
  the instrumented copy and reported the runner's own injected scaffolding as engine code.
  Measured on the same check with the same call: the real tree, 38 files, no violations;
  the sandbox, 38 files, eleven io-global violations. The check was never confused about
  what it forbids. It was handed the wrong tree.

  Three faults in three weeks came out of that one function — a population narrowed
  (3F-3118), a population inflated (3F-3205), and this one, a population that was the
  wrong tree entirely — and not one of them was caught by a check. A subject that arrives
  as an argument cannot be inherited by accident, which is what makes "does it walk the
  tree it was told about" a question that can be asked at all.

  Rule: the enumerator walks the tree it is given, not the directory the process is standing in

    @unit @SCN-SRC-001
    Scenario: a check scans the tree it was asked about, not the instrumented copy beside it
      Given a copy of the engine's source carrying the preamble a mutation runner injects
      When the engine-purity guard is asked about the REPOSITORY, and then about the COPY
      Then asked about the repository it reports the engine clean, because the copy is not what it was asked about
      And asked about the copy it reports the injected process references, so the named subject is the only thing that decides

    @unit @SCN-SRC-002
    Scenario: a named root beats the environment, and the environment beats the working directory
      Given a root named by the caller, a root named only by the environment, and neither
      When the repository root is resolved for each
      Then the caller's root wins over the environment, and the environment wins over the working directory
      And a variable set to the empty string is an absent one, never a root that resolves back inside the working tree

  Rule: the population is this repository's implementation files

    @unit @SCN-SRC-003
    Scenario: a declaration file is not production source
      Given a scanned root holding an implementation file and a .d.ts declaration beside it
      When the source walk collects the root
      Then only the implementation file is in the population, because a declaration carries no implementation for a check to read
