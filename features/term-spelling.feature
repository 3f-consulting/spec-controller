@TRM
Feature: Term spelling — a term names the same pair however its author spelled it

  A target adopting this tool hand-types terms into five places: the two key levels of
  specController.thresholds, a configured fitness row's scn and characteristic, a check step's
  id:, a deferral tag, and the two terms on a measurement row. Every one of them is stored bare
  and looked up bare, because a hand writes a tag the way a feature file does — and every one of
  them was stripping the sigil BEFORE trimming, so a term padded in front of its @ was stored
  still carrying it and no bare lookup ever found it again. Nothing red. thresholdFor answered
  null, a measurement row was dropped, a configured row went unmatched — and all three are
  legitimate readings of a key the manifest never named, which is what made the miss silent
  instead of loud.

  IT NEVER FIRED HERE AND WOULD FIRE THERE, WHICH IS THE WHOLE OF ITS REACH. Both routes are
  hand-typed and this repository generates neither: a generated artefact carries no stray space.
  The consumer typing a threshold key into their own package.json is the one who gets a bar that
  silently does not apply, and they get it through the published binary.

  ONE RULE, SPELLED SEVEN TIMES, SO ONE BUG BECAME SEVEN. The correction is not the reordering;
  it is that a rule this small was hand-copied at all. dry's "a rule stated twice is a rule
  obeyed in its laxest form" with the laxest form being all of them — the shape @SCN-API-004
  ruled on for hand-transcribed lists and 3F-2960's Ruling 2 ruled on again. NOTHING MECHANICAL
  HOLDS THE COUNT AT ONE, AND IT IS SAID HERE RATHER THAN LEFT TO BE FOUND (3F-3491). A scan over
  this repository's own source used to, filed as part of this Rule's @unit evidence (3F-2988 stated
  it as a Rule of its own; 3F-3226 retired that Rule and kept the scan). Its subject was our tree
  rather than the product, so a target adopting this axis inherited no such scan and a consumer's
  behaviour was being evidenced by a walk over the vendor's own files — which is what took it, and
  its walker with it. An eighth hand-copy is now one paste away and review is the whole of what
  catches it: an accepted residual, not an oversight.

  WHAT THIS DOES NOT CLAIM. It does not make the terms a sanitiser. A doubled sigil, an @ inside
  a term, whitespace inside a term, and case are each left exactly as they are and named here so
  the omissions are not silent: only a leading sigil is a sigil, and only whitespace AROUND a
  term is not part of it.

  Rule: a term names the same pair however its author spaced it around the sigil

    WHY BOTH TIERS, POSITIVELY. @unit proves the reading at each port that stores a term as a
    key — pure functions, provable in isolation, and the only place the empty, doubled-sigil
    and interior-@ boundaries can be held cheaply. @integration proves the SEAM that
    composes them: a target's manifest read into a threshold registry and a configured
    fitness-check index, a deferral set and a measurement row, the corpus read against all
    four, a check step's citation read against that same index, and the reconciler handed the
    result. That is the boundary this defect actually lived on — the readings each correct in
    isolation, every one of them wired to a lookup that asks bare — and it reads green at unit
    and wrong on the ledger. Neither arm subsumes the other.

    @unit @integration @SCN-TRM-001
    Scenario: a term is the same term however its author spaced it around the sigil, wherever a target hand-authors one
      Given a target that hand-authors its terms — a threshold's two key levels, a configured row's scn and characteristic, a check step's id:, a deferral tag, and a measurement row's two terms
      And every one of them is spelled with whitespace in front of its sigil, the one spelling nothing in this repository generates
      When the corpus is reconciled against that target
      Then each term names exactly the pair its bare spelling names, so nothing the target plainly authored is dormant
      And a term carrying an @ inside itself keeps it, because only a LEADING sigil is a sigil
      And a term that is nothing but whitespace and a sigil names no pair at all, and is dropped as an empty one is
