/**
 * @SCN-CHR-004 (3F-2996) — the @unit arm of the RATCHET on the mint route.
 *
 * A SEPARATE FILE FROM `characteristicRoster.test.ts`, and for the reason that file's siblings
 * already split on: the roster module's test file is within a few lines of the 400-line ceiling
 * `max-lines` holds test scopes to, so appending here would red `lint:complexity` — an earlier
 * rung than the assertions, which is a red at the wrong gate rather than this scenario's red. The
 * split is per-rule, not arbitrary: everything below asks one question the file beside it never
 * asks — not *is this word legal* but *is this mint still what makes anything legal*.
 *
 * WHY THE ROSTER IS INJECTED HERE TOO. spec-controller mints nothing at all, so the staleness rule
 * is green over the real tree by construction and a passing build says nothing about whether it
 * works. It is proven against a constructed roster and constructed named entries instead —
 * `exemptionFaults`' stance (@SCN-VOC-016), for its reason. The @integration arm plants two target
 * trees for the same reason.
 */

import { describe, it, expect } from "vitest";

import {
  characteristicFaults,
  type MintedCharacteristics,
  type NamedCharacteristic,
} from "./characteristicRoster.js";

/** A constructed roster, so each case says exactly which words it is judging against. */
const ROSTER = ["complexity", "vocab", "typecheck"] as const;

/** One characteristic named by a registry entry, as `registryCharacteristics` produces it. */
const namedInRegistry = (characteristic: string, entry: string): NamedCharacteristic => ({
  characteristic,
  key: "specController.checkRegistry",
  entry,
});

/** One characteristic named by a threshold entry, as `thresholdCharacteristics` produces it. */
const namedInThresholds = (characteristic: string, entry: string): NamedCharacteristic => ({
  characteristic,
  key: "specController.thresholds",
  entry,
});

/** One mint, stated as `resolveMintedCharacteristics` hands it over. */
const minting = (characteristic: string, reason: string | null): MintedCharacteristics =>
  new Map([[characteristic, reason]]);

/** The whole reason of a mint that is properly stated — long enough to be a sentence, as canon asks. */
const REASON = "no roster word names order-dependence, and this target reruns its suite to find it";

describe("[SCN-CHR-004] a mint no entry of the target's own names", () => {
  it("reds as stale, keyed to the mint entry rather than to whatever else the manifest holds", () => {
    // AN EXCEPTION COVERING NOTHING IS LICENCE FOR THE NEXT THING THAT MATCHES IT. The reason is
    // stated in full, so @SCN-CHR-003's arm cannot be what fires: what is left is an entry that
    // reds nothing by construction, sitting on as standing permission.
    const faults = characteristicFaults(
      [namedInRegistry("complexity", "lint:complexity")],
      [...ROSTER],
      minting("flakiness", REASON),
    );

    expect(faults).toHaveLength(1);
    expect(faults[0]?.characteristic).toBe("flakiness");
    expect(faults[0]?.key).toBe("specController.mintedCharacteristics");
    expect(faults[0]?.entry).toBe("flakiness");
  });

  it("says which of the two ways it went stale, and not the other", () => {
    // ONE REMEDY, TWO DIAGNOSES. Told only "delete it", an author cannot tell whether their check
    // went away or their word arrived — and those are different things to have happened.
    const [fault] = characteristicFaults([], [...ROSTER], minting("flakiness", REASON));

    expect(fault?.message).toContain("names it any more");
    expect(fault?.message).not.toContain("roster now carries the word itself");
  });

  it("leaves a mint alone while a registry entry still names its word", () => {
    expect(
      characteristicFaults(
        [namedInRegistry("flakiness", "lint:flakiness")],
        [...ROSTER],
        minting("flakiness", REASON),
      ),
    ).toEqual([]);
  });

  it("leaves a mint alone while a THRESHOLD entry still names its word", () => {
    // BOTH SOURCES, as everywhere else in this rule (@SCN-CHR-002). A staleness reading that saw
    // only the registry would red every measured mint the moment it was made — the route closed
    // for exactly the checks that have no script handle to be named by.
    expect(
      characteristicFaults(
        [namedInThresholds("flakiness", "SCN-TGT-003")],
        [...ROSTER],
        minting("flakiness", REASON),
      ),
    ).toEqual([]);
  });
});

describe("[SCN-CHR-004] a mint the portfolio roster has since carried", () => {
  it("reds as stale even while an entry still names the word", () => {
    // THE SECOND WAY, AND IT IS NOT THE FIRST WEARING A DIFFERENT COAT. `complexity` is named
    // right there by the registry entry, so nothing about this mint is unused; what has changed
    // is that the roster carries the word, so the mint licenses nothing it did not already have.
    const faults = characteristicFaults(
      [namedInRegistry("complexity", "lint:complexity")],
      [...ROSTER],
      minting("complexity", "minted before the roster carried it"),
    );

    expect(faults.map((fault) => [fault.key, fault.entry])).toEqual([
      ["specController.mintedCharacteristics", "complexity"],
    ]);
    expect(faults[0]?.message).toContain("roster now carries the word itself");
    expect(faults[0]?.message).not.toContain("names it any more");
  });

  it("is the diagnosis given where the mint is both overtaken and named by nothing", () => {
    // Both descriptions are true and only one can be printed, so the stronger one is: a word the
    // roster carries could never need this mint again, whereas an unused one might be named
    // tomorrow by the check being written this afternoon.
    const [fault] = characteristicFaults(
      [],
      [...ROSTER],
      minting("complexity", "minted before the roster carried it"),
    );

    expect(fault?.message).toContain("roster now carries the word itself");
    expect(fault?.message).not.toContain("names it any more");
  });
});

describe("[SCN-CHR-004] one fault per mint entry, whatever is wrong with it", () => {
  it("reds a reasonless mint on its reason, never twice for being stale as well", () => {
    // A REASONLESS ENTRY IS NOT A MINT AT ALL — it admits nothing, so asking whether it still
    // licenses something is asking a question about a thing that never licensed anything. And the
    // module's own rule is one fault per ENTRY: two findings on one line would name one remedy
    // twice and make the count of faults a count of readings rather than of edits.
    const faults = characteristicFaults([], [...ROSTER], minting("flakiness", ""));

    expect(faults).toHaveLength(1);
    expect(faults[0]?.message).toContain("no reason stated");
  });

  it("holds a mint whose reason this reader could not take to the same single fault", () => {
    expect(characteristicFaults([], [...ROSTER], minting("flakiness", null))).toHaveLength(1);
  });

  it("stands beside an unrelated off-roster fault without absorbing it", () => {
    // The stale mint and the uncovered word are two entries, two edits and two findings — and the
    // off-roster entries come first, as they did before this rule existed.
    const faults = characteristicFaults(
      [namedInRegistry("anemic-domain", "lint:anemic-domain")],
      [...ROSTER],
      minting("flakiness", REASON),
    );

    expect(faults.map((fault) => [fault.key, fault.entry])).toEqual([
      ["specController.checkRegistry", "lint:anemic-domain"],
      ["specController.mintedCharacteristics", "flakiness"],
    ]);
  });

  it("states no fault at all where the target minted nothing, which is the default", () => {
    expect(
      characteristicFaults([namedInRegistry("complexity", "lint:complexity")], [...ROSTER]),
    ).toEqual([]);
  });
});
