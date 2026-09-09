@CMP
Feature: The compatibility page's own examples are held to the tree that publishes it

  `doc/compatibility.md` is a COMMITMENT — it names the configuration mechanisms a consumer may
  build on, for how long, and what would break them. It shipped on 2026-09-05 and was falsified the
  same day: two of its worked examples named scenarios this repository had deleted the previous
  afternoon, and one promise about a mechanism with "no replacement designed" outlived the
  replacement shipping. A commitment page with nothing reconciling it to the tree is the
  single-entry fault this product is named for, one level up.

  TWO QUESTIONS, AND THE SECOND ONE ONLY EXISTS BECAUSE THE FIRST WAS MEASURED VACUOUS. The obvious
  form of this check — every manifest key the page names exists in our own package.json — is wrong,
  and would have redded on the migration that caused the staleness: the page correctly documents
  `checkRegistry` as supported for consumers who have not moved, while our manifest no longer uses
  it. So the honest replacement was asked instead — does the READER still accept this shape — and it
  came back clean over exactly the stale page it was built for, because the resolvers read a
  consumer's manifest and have no opinion about whose scenarios it cites. Both questions ship: the
  shape question is what fails the day a documented mechanism stops being read, and the citation
  question is what fails today.

  THE FEATURE CODE IS WHAT SAYS WHOSE SCENARIO A CITATION IS. A page written for consumers must be
  able to show a configuration in the reader's own terms, so a code under a feature code this
  repository has never allocated is theirs and is left alone. A code under one this repository HAS
  allocated is a claim about THIS tree, and a claim about this tree is what can go stale. The
  allocation registry rather than the corpus is the source, because a code stays allocated after its
  feature file is deleted — reading the corpus for both halves would quietly stop checking a whole
  feature's citations the moment that feature retired.

  WHAT THIS CHECK DOES NOT ESTABLISH. It reads CODES and SHAPES, never meaning. A worked example
  can cite a scenario that exists and still illustrate the wrong thing about it, and a paragraph of
  prose can be wholly false while naming nothing at all. The page's accuracy stays the author's; what
  this removes is the class of staleness that arrives without anybody editing the page.

  IT IS @unit AND NOT @integration, deliberately, which is the choice @DPG and @EPG already made.
  The disk-reading half — find the page, read the corpus, set an exit code — is exercised over the
  REAL page on every push by `@SCN-FIT-015`, whose configured row runs the command itself. A second
  arm spawning the same command over a planted tree would assert what the fitness pass already
  asserts against the live one.

  Rule: the page's configuration examples are read by the reader that page says supports them
