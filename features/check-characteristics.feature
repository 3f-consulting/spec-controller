@CHR
Feature: A check characteristic is legal because the portfolio names it, never because this product does

  THE FAULT THIS CLOSES. The words that may name a characteristic were read out of the
  target's own `specController.checkRegistry` and `specController.thresholds` — so adding a
  registry entry was simultaneously the act that minted a characteristic and the act that
  certified it. Fourteen tags for seven characteristics were built over a month in a
  repository that reconciles its own tree on every push, and nothing redded once. That is
  an absent check, not a lapse of discipline (3F-2994 restored the tree; this stops the
  next one).

  THE ROSTER IS THE PORTFOLIO'S AND ARRIVES BY VERSION. `spec-controller-core` exports the
  characteristics `fitness-functions.md` → *Static checks* names, and every reconciled
  product already installs that package to run `balance`. A product derives its legal set
  from its pinned version and refreshes it on a bump — which is exactly what a product
  cannot do with a list it writes itself.

  THE SECOND HOP IS NOT BUILT HERE, and that is the same arrangement `blockedVocabulary.md`
  already runs under. Canon lives in the `strategy` repository, which this repository's CI
  never checks out and a public consumer of an MIT-licensed tool would not have. Code ↔ the
  vendored roster is dissolved (the roster IS the export); vendored roster ↔ canon belongs
  to the maintainers' private repository's CI, where every product is visible (operator ruling
  2026-08-03, 3F-2296).

  WHAT A GREEN HERE DOES NOT ESTABLISH. That a characteristic was EARNED. Canon's admission
  test — a characteristic earns a tag when no existing characteristic names the property the
  check asserts — asks whether an existing word already covers this property, and no check
  can answer that. This one asks the answerable half: is every characteristic this target
  names a word the portfolio carries. The check says so in its own output rather than
  letting a green be read as more than it is.

  Rule: a characteristic a target names is legal only where the portfolio roster carries it

    THE REGISTRY IS THE CREDIT SIDE and it is where a static check's characteristic is
    written down. An entry naming a word the roster does not carry has minted a
    characteristic, and the check names both the word and the manifest key that carried it —
    an author who has just added a check needs to be told which of their two edits is the
    one at fault.

    NOT A NEAR-MATCH COURTESY. A word the roster does not carry is not resolved to the
    roster word it resembles. The mint is the act being surfaced, and quietly reading it as
    something else would hide exactly the act this exists to make visible.

    @unit @integration @SCN-CHR-001
    Scenario: a registry entry naming a characteristic outside the roster reds, naming the word and the key that carried it
      Given the check-characteristics guard
      When it runs over a target whose registry names a characteristic the portfolio roster does not carry
      Then it reds, naming that characteristic and the manifest key that carried it
      When it runs over a target whose registry names a characteristic that merely resembles a roster word
      Then it reds too, naming the word as the manifest wrote it and never the roster word it resembles
      When it runs over a target every one of whose registry entries names a roster characteristic
      Then it is admitted, and says it holds the words to the roster and does not judge whether a characteristic was earned

    @unit @integration @SCN-CHR-002
    Scenario: a threshold naming a characteristic outside the roster reds too, so the measured side is held as well
      THE MEASURED SIDE IS NAMED SOMEWHERE ELSE, AND IS NAMED ALL THE SAME. A measured check
      has no runnable script handle — nothing invokes it — so the registry can never carry it
      and the only place it appears is the target's thresholds. A check reading the registry
      alone would leave `@ci-run-time` and `@mutation` mintable at will, which is the fault
      surviving in the half of the config nobody looked at. The two sources stay two, exactly
      as the obligation rule reads them (@SCN-STG-009); what is added is that both are held to
      the same roster.

      Given the check-characteristics guard
      When it runs over a target whose thresholds name a characteristic the portfolio roster does not carry, and whose registry names roster words only
      Then it reds, naming that characteristic and the thresholds key that carried it
      When it runs over a target whose thresholds name only characteristics the roster carries
      Then it is admitted, and the characteristics its thresholds name are counted among the ones held

  Rule: minting a characteristic the roster does not carry is a separate, reasoned act

    A PRODUCT MUST BE ABLE TO MINT, or the roster stops being a shared vocabulary and starts
    being a gate on delivery: a consumer whose legitimate characteristic canon has not yet
    named would have to choose between minting silently and waiting for a canon change.
    Neither is acceptable, so a third route is named.

    WHAT MAKES IT A ROUTE RATHER THAN THE SAME HOLE. It is a SECOND act, in a key whose only
    purpose is to say a portfolio word is being minted — never the same line that adds the
    check. It carries a REASON, because an entry with nothing written against it is a config
    line again, which is the fault. And every mint is NAMED ON EVERY RUN, green included: a
    quiet exception is how fourteen tags grew over a month without one red.

    @unit @integration @SCN-CHR-003
    Scenario: a minted characteristic carrying its reason is admitted and named on every run, and the same mint with no reason reds
      Given the check-characteristics guard
      When it runs over a target that mints a characteristic the portfolio roster does not carry, stating why it needs the word
      Then it is admitted, and the mint is named with the reason stated for it
      When it runs over a target whose mint of that same characteristic states no reason
      Then it reds, naming the mint that states none and the manifest key that carried it
      When it runs over a target that mints one characteristic with a reason while naming a second the roster does not carry and no mint covers
      Then it reds on the uncovered word alone, and names the mint with its reason all the same

  Rule: a mint that licenses nothing reds as stale, so the route can only shrink

    AN EXCEPTION COVERING NOTHING IS LICENCE FOR THE NEXT THING THAT MATCHES IT. Two ways a
    mint stops licensing anything: no registry or threshold entry names it any more, and the
    roster has since carried the word itself. Both leave an entry that reds nothing, sitting
    on as standing permission — the fault `@SCN-VOC-017` already closes for the exempt list,
    reached here by the same route.

    ONE FAULT, ONE REMEDY, WHICH IS WHY IT IS ONE SCENARIO. Both arms mean *this mint is not
    what makes anything legal*, and both are answered by deleting the entry. The distinction
    an author needs is in the message, not in a second rule.

    @unit @integration @SCN-CHR-004
    Scenario: a mint no entry names, and a mint the roster has since carried, both red as stale
      Given the check-characteristics guard
      When it runs over a target whose mint states a reason for a word no registry or threshold entry of its own names
      Then it reds, and the mint is named as one nothing this target names is relying on
      When it runs over a target whose mint states a reason for a word the portfolio roster now carries
      Then it reds too, and the mint is named as one the roster has overtaken, in words the other arm does not use

  Rule: spec-controller's own named characteristics are portfolio words

    THE CHECK, TURNED ON ITS AUTHOR. Every Rule above is an EXAMPLE of the check deciding
    over a planted manifest; this is the property held over this repository's own
    `package.json`, which is the claim the CI step actually makes on every push. Eight
    characteristics today — traceability, complexity, vocab, typecheck, tech-conformance,
    self-balance, ci-run-time, mutation — every one a word `fitness-functions.md` carries.

    ITS OWN CHARACTERISTIC IS `vocab`, AND THAT IS THE ADMISSION TEST APPLIED TO ITSELF. The
    property asserted is that every word this product uses to name a characteristic is a
    portfolio word — a shared-vocabulary property, which `@vocab` already names. Minting a
    tag for the check that exists to stop tags being minted would be the fault delivered as
    its own cure.

    AND THE PLACES A TARGET MAY NAME ONE ARE NOW THREE (3F-3138). A CONVERTED check names its
    characteristic on its own configured row — not in the check registry, which answers which
    check a runnable script handle is, and not in the thresholds, which is where a BAR lives.
    So the word moves to a third key, and on the commit the first check converts it would face
    nothing at all. That is this file's own fault re-opened by moving the word one key sideways
    in the same manifest: a mistyped row would mint a characteristic in silence, and a
    vocabulary a product can extend by editing its own manifest is a per-product roster wearing
    a shared one.

    SO THIS SCENARIO IS ABOUT THE READING AS WELL AS THE WORDS, and that is what its Update
    added. A green here says every characteristic this repository names is a portfolio word,
    and that sentence is worth exactly what the reading behind it is worth: a source nobody
    reads makes this green a report about words nobody looked at. So the places are gathered
    from ONE list and the reading is held to reaching every one of them. That half is the
    `@unit` arm's to prove and the CI step's to miss — over this repository's own manifest the
    third source is empty until the first check converts, so the step would green either way.

    @unit @vocab @SCN-CHR-005
    Scenario: every characteristic this repository names is one the portfolio roster carries, and no place it may name one goes unread
      Given the places a target may name a characteristic — its check registry, its thresholds and its configured fitness rows
      When the characteristics this repository names are gathered for the portfolio roster to judge
      Then every one of those places is reached, so none of them can go silently unread
      And every characteristic gathered from any of them is one the portfolio roster carries
