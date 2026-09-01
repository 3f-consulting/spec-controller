@TRM
Feature: Term spelling — a term names the same pair however its author spelled it

  A target adopting this tool hand-types terms into four places: the two key levels of
  specController.thresholds, a check-registry tag, a deferral tag, and the two terms on a
  measurement row. Every one of them is stored bare and looked up bare, because a hand writes a
  tag the way a feature file does — and every one of them was stripping the sigil BEFORE
  trimming, so a term padded in front of its @ was stored still carrying it and no bare lookup
  ever found it again. Nothing red. thresholdFor answered null, a measurement row was dropped, a
  registry entry was absent — and all three are legitimate readings of a key the manifest never
  named, which is what made the miss silent instead of loud.

  IT NEVER FIRED HERE AND WOULD FIRE THERE, WHICH IS THE WHOLE OF ITS REACH. Both routes are
  hand-typed and this repository generates neither: a generated artefact carries no stray space.
  The consumer typing a threshold key into their own package.json is the one who gets a bar that
  silently does not apply, and they get it through the published binary.

  ONE RULE, SPELLED SEVEN TIMES, SO ONE BUG BECAME SEVEN. The correction is not the reordering;
  it is that a rule this small was hand-copied at all. dry's "a rule stated twice is a rule
  obeyed in its laxest form" with the laxest form being all of them — the shape @SCN-API-004
  ruled on for hand-transcribed lists and 3F-2960's Ruling 2 ruled on again. The second Rule
  that keeps the count at one is 3F-2988's.

  WHAT THIS DOES NOT CLAIM. It does not make the terms a sanitiser. A doubled sigil, an @ inside
  a term, whitespace inside a term, and case are each left exactly as they are and named here so
  the omissions are not silent: only a leading sigil is a sigil, and only whitespace AROUND a
  term is not part of it.

  Rule: a term names the same pair however its author spaced it around the sigil

    WHY BOTH TIERS, POSITIVELY. @unit proves the reading at each port that stores a term as a
    key — pure functions, provable in isolation, and the only place the empty, doubled-sigil
    and interior-@ boundaries can be held cheaply. @integration proves the SEAM that
    composes them: a target's manifest read into a threshold registry, a registry, a deferral
    set and a measurement row, the corpus read against all four, and the reconciler handed the
    result. That is the boundary this defect actually lived on — the readings each correct in
    isolation, every one of them wired to a lookup that asks bare — and it reads green at unit
    and wrong on the ledger. Neither arm subsumes the other.

    @unit @integration @SCN-TRM-001
    Scenario: a term is the same term however its author spaced it around the sigil, wherever a target hand-authors one
      Given a target that hand-authors its terms — a threshold's two key levels, a check-registry tag, a deferral tag, and a measurement row's two terms
      And every one of them is spelled with whitespace in front of its sigil, the one spelling nothing in this repository generates
      When the corpus is reconciled against that target
      Then each term names exactly the pair its bare spelling names, so nothing the target plainly authored is dormant
      And a term carrying an @ inside itself keeps it, because only a LEADING sigil is a sigil
      And a term that is nothing but whitespace and a sigil names no pair at all, and is dropped as an empty one is

  Rule: there is one reading of what a term bare is, and a second cannot be added silently

    WHY @unit ALONE, POSITIVELY. The observation is a scan over this repository's own source —
    read the files, count the readings — and Vitest proves that whole path. A Cucumber arm would
    read the same files through a second harness and prove the harness. That is the ruling already
    taken by @SCN-GPG-001, for exactly this shape.

    A SCAN, NOT A LIST. The static check counts readings and names where they are; it does not
    carry an enumeration of the files allowed to hold one, because a hand-written exception list is
    the instrument 3F-2960's Ruling 2 barred and is the same fault one level up. That is why the
    seventh copy — a reading no whitespace can reach, and so never a defect — adopted the shared
    one anyway: an exception-free scan is worth more than a copy left alone. Excluding the test
    files is the SCOPE and not an exception: the claim is about this repository's source, a test may
    spell the pattern as a fixture, and the scan is itself a test.

    WHAT THE SCAN DOES NOT REACH, NAMED HERE RATHER THAN DISCOVERED LATER. It reads the .ts files
    under each package's src and static-checks, tests aside, and it matches a reading spelled as a
    replace call whose pattern anchors the sigil at the start of the string. An eighth copy written
    into one of the .mjs data modules beside those checks, or spelled without a replace call at all,
    is not reached — and @SCN-VOC-022 has already ruled that a module is source whatever extension
    carries it, so this .ts population is a narrower reading of "this repository's source" than that
    ruling would give. Filed as 3F-2989, which owns closing it. Said out loud rather than left in a
    ticket alone, because a scan trusted for more than it reaches is how a copy comes back.

    @unit @SCN-TRM-002
    Scenario: a second reading of what a term bare is cannot be added to this repository without redding
      Given this repository's own TypeScript source, its tests aside
      When it is scanned for a reading of what a term bare is
      Then exactly one such reading exists, and every reader of a hand-authored term takes it
      And a second reading planted beside one of those readers reds this scan, naming the file that carries it
