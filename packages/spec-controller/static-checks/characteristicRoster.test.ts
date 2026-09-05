/**
 * @SCN-CHR-001, @SCN-CHR-002, @SCN-CHR-003 (3F-2996) — the @unit arm of the check-characteristic gate.
 *
 * WHY THE ROSTER IS INJECTED IN EVERY RULE ASSERTION BELOW. spec-controller's own seven
 * characteristics are all portfolio words, so this rule is green over the real tree by
 * construction and a passing build says nothing about whether it works. The rule is therefore
 * proven against a constructed roster and constructed manifest entries — `exemptionFaults`'
 * stance (@SCN-VOC-016), for its reason.
 *
 * The vendored roster's CONTENTS are pinned separately, against the words canon names, because
 * that is a different claim from "the rule reads a roster correctly". So is the READING of
 * `specController.mintedCharacteristics`, which is the app edge's and is pinned beside the four
 * `specController.*` resolvers it is the fifth of (`src/ingest/ingestQualityChecks.test.ts`).
 */

import { describe, it, expect } from "vitest";
import { checkRegistryOf, thresholdsOf } from "@3f-consulting/spec-controller-core/internal";
import {
  PORTFOLIO_CHECK_CHARACTERISTICS,
  isPortfolioCharacteristic,
} from "@3f-consulting/spec-controller-core";

import {
  characteristicFaults,
  registryCharacteristics,
  thresholdCharacteristics,
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

describe("[SCN-CHR-001] a registry entry naming a characteristic outside the roster", () => {
  it("reds, naming the characteristic and the manifest key that carried it", () => {
    const faults = characteristicFaults(
      [namedInRegistry("anemic-domain", "lint:anemic-domain")],
      [...ROSTER],
    );

    expect(faults).toHaveLength(1);
    expect(faults[0]?.characteristic).toBe("anemic-domain");
    expect(faults[0]?.key).toBe("specController.checkRegistry");
    // The ENTRY as well as the key: an author who has just added a check made two edits, and
    // "your registry is wrong" leaves them to work out which of them is the one at fault.
    expect(faults[0]?.entry).toBe("lint:anemic-domain");
    expect(faults[0]?.message).toContain("anemic-domain");
    expect(faults[0]?.message).toContain("specController.checkRegistry");
    expect(faults[0]?.message).toContain("lint:anemic-domain");
  });

  it("leaves every entry naming a roster word alone", () => {
    expect(
      characteristicFaults(
        [
          namedInRegistry("complexity", "lint:complexity"),
          namedInRegistry("typecheck", "typecheck"),
        ],
        [...ROSTER],
      ),
    ).toEqual([]);
  });

  it("names one fault per off-roster entry, so two mints are two findings", () => {
    // Not deduplicated to the WORD: the remedy is per-entry, and a message naming a word once
    // hides the second place it has to be fixed.
    const faults = characteristicFaults(
      [
        namedInRegistry("anemic-domain", "lint:anemic-domain"),
        namedInRegistry("anemic-domain", "guard:anemic-domain"),
      ],
      [...ROSTER],
    );
    expect(faults.map((fault) => fault.entry)).toEqual([
      "lint:anemic-domain",
      "guard:anemic-domain",
    ]);
  });

  it("does not resolve a near-match to the roster word it resembles", () => {
    // THE MINT IS THE ACT BEING SURFACED. Reading `complexty` as `complexity` would admit it,
    // and quietly reading a minted word as something else hides exactly what this exists to
    // make visible. It reds, and the message says the word the manifest wrote.
    const faults = characteristicFaults([namedInRegistry("complexty", "lint:cpx")], [...ROSTER]);

    expect(faults).toHaveLength(1);
    expect(faults[0]?.characteristic).toBe("complexty");
    expect(faults[0]?.message).toContain("complexty");
    expect(faults[0]?.message).not.toMatch(/\bcomplexity\b/);
  });
});

describe("[SCN-CHR-001] the characteristics a target's check registry names", () => {
  it("reads through the engine's own registry, both manifest spellings, in registry order", () => {
    const named = registryCharacteristics(
      checkRegistryOf({
        "lint:complexity": { check: "complexity", scn: "SCN-CPX-005" },
        typecheck: "typecheck",
      }),
    );

    expect(named).toEqual([
      { characteristic: "complexity", key: "specController.checkRegistry", entry: "lint:complexity" },
      { characteristic: "typecheck", key: "specController.checkRegistry", entry: "typecheck" },
    ]);
  });

  it("inherits the engine's bare-term reading rather than restating it", () => {
    // `@complexity` in a hand-authored manifest is the same characteristic as `complexity`
    // (3F-2976). The registry stores both terms bare, so this reader gets it for free — and a
    // second reading of what a term BARE is is exactly the disagreement this slice exists to
    // stop.
    expect(
      registryCharacteristics(checkRegistryOf({ "lint:complexity": " @complexity " })),
    ).toEqual([
      { characteristic: "complexity", key: "specController.checkRegistry", entry: "lint:complexity" },
    ]);
  });
});

describe("[SCN-CHR-001] the vendored portfolio roster", () => {
  it("carries the characteristics fitness-functions.md names, static and measured", () => {
    // Transcribed from canon's own two lists, NOT from this repository's manifest — a roster
    // read off the tree it judges is the self-certification this slice closes.
    expect([...PORTFOLIO_CHECK_CHARACTERISTICS].sort()).toEqual(
      [
        // Static checks
        "complexity",
        "function-length",
        "tech-conformance",
        "vocab",
        "traceability",
        "lint",
        "flag-hygiene",
        "doc-accuracy",
        "typecheck",
        "security",
        "licence",
        "bundle-size",
        "self-balance",
        // Measured
        "ci-run-time",
        "coverage",
        "mutation",
      ].sort(),
    );
  });

  it("carries every characteristic this repository itself names", () => {
    // The claim @SCN-CHR-005 will make of the real manifest, asserted here over the seven words
    // as they stand. It is a statement about the ROSTER's coverage, not about the gate.
    //
    // `self-balance` LEFT THIS LIST AND STAYED ON THE ROSTER (3F-3113). The manifest stopped
    // naming it when the self-reconciliation's own row was retired; the word sits on
    // PORTFOLIO_CHECK_CHARACTERISTICS named by nothing, which the rule permits by construction
    // — it judges the words a manifest NAMES, and enumerates in that direction only. Left here
    // it would have gone on passing while asserting something untrue of this repository.
    for (const characteristic of [
      "traceability",
      "complexity",
      "vocab",
      "typecheck",
      "tech-conformance",
      "ci-run-time",
      "mutation",
    ]) {
      expect(isPortfolioCharacteristic(characteristic)).toBe(true);
    }
  });

  it("does not carry a word the portfolio has not named", () => {
    expect(isPortfolioCharacteristic("anemic-domain")).toBe(false);
    expect(isPortfolioCharacteristic("complexty")).toBe(false);
    expect(isPortfolioCharacteristic("")).toBe(false);
  });
});

describe("[SCN-CHR-002] a threshold entry naming a characteristic outside the roster", () => {
  it("reds too, naming the characteristic and the thresholds key that carried it", () => {
    // THE FAULT SURVIVING IN THE HALF OF THE CONFIG NOBODY LOOKED AT. A measured check has no
    // runnable script handle, so `checkRegistry` can never hold it and the thresholds are the
    // ONLY place it is named — a rule reading the registry alone leaves it mintable at will.
    const faults = characteristicFaults(
      [namedInThresholds("flakiness", "SCN-TGT-003")],
      [...ROSTER],
    );

    expect(faults).toHaveLength(1);
    expect(faults[0]?.characteristic).toBe("flakiness");
    expect(faults[0]?.key).toBe("specController.thresholds");
    // The @SCN is the entry on this side, as the script handle is on the registry's: it is the
    // manifest line the author has to change.
    expect(faults[0]?.entry).toBe("SCN-TGT-003");
    expect(faults[0]?.message).toContain("flakiness");
    expect(faults[0]?.message).toContain("specController.thresholds");
    expect(faults[0]?.message).toContain("SCN-TGT-003");
  });

  it("holds both sources to ONE roster, so a target minting in each reds twice", () => {
    // The two sources stay TWO, exactly as the obligation rule reads them (@SCN-STG-009); what
    // is added is that both are held to the same roster. Neither answers for the other, so a
    // clean registry does not absolve the thresholds and a clean thresholds does not absolve
    // the registry.
    const faults = characteristicFaults(
      [
        namedInRegistry("complexity", "lint:complexity"),
        namedInRegistry("anemic-domain", "lint:anemic-domain"),
        namedInThresholds("typecheck", "SCN-TGT-002"),
        namedInThresholds("flakiness", "SCN-TGT-003"),
      ],
      [...ROSTER],
    );

    expect(faults.map((fault) => [fault.key, fault.entry])).toEqual([
      ["specController.checkRegistry", "lint:anemic-domain"],
      ["specController.thresholds", "SCN-TGT-003"],
    ]);
  });
});

describe("[SCN-CHR-002] the characteristics a target's thresholds name", () => {
  it("reads through the engine's own threshold registry, one per @SCN and check pair", () => {
    // Keyed by @SCN and THEN by check, because a stepless scenario may carry more than one bare
    // check (@SCN-LNT-012) — so one @SCN can name two characteristics, and a reader flattening
    // to the @SCN would judge whichever it read first and green the other.
    expect(
      thresholdCharacteristics(
        thresholdsOf({
          "SCN-TGT-002": { "ci-run-time": 75, coverage: 90 },
          "SCN-TGT-003": { mutation: { atLeast: 694 } },
        }),
      ),
    ).toEqual([
      namedInThresholds("ci-run-time", "SCN-TGT-002"),
      namedInThresholds("coverage", "SCN-TGT-002"),
      namedInThresholds("mutation", "SCN-TGT-003"),
    ]);
  });

  it("inherits the engine's bare-term reading rather than restating it", () => {
    // `@SCN-TGT-003` and `@mutation` in a hand-authored manifest name the same pair as the bare
    // spellings (3F-2976). `thresholdsOf` stores both keys bare, so this reader gets it for free
    // — and a second reading of what a term BARE is is the disagreement between readers this
    // slice exists to stop.
    expect(
      thresholdCharacteristics(thresholdsOf({ "@SCN-TGT-003": { " @mutation ": 694 } })),
    ).toEqual([namedInThresholds("mutation", "SCN-TGT-003")]);
  });

  it("names the characteristic of a pair whose BAR the engine could not read", () => {
    // A malformed bar is dropped and the KEY is kept (@SCN-MUT-003): the naming is what makes a
    // check MEASURED, and the missing bar is @SCN-CIP-002's complaint. So the characteristic is
    // still one this target NAMES, and dropping it here would hand back exactly the false-green
    // an author gets by mistyping the number beside a minted word.
    expect(thresholdCharacteristics(thresholdsOf({ "SCN-TGT-003": { flakiness: "soon" } }))).toEqual(
      [namedInThresholds("flakiness", "SCN-TGT-003")],
    );
  });

  it("names nothing where the target authored no thresholds at all", () => {
    expect(thresholdCharacteristics(thresholdsOf({}))).toEqual([]);
  });
});

describe("[SCN-CHR-003] a mint of a characteristic the roster does not carry", () => {
  /** One mint, stated as `resolveMintedCharacteristics` hands it over. */
  const minting = (characteristic: string, reason: string | null): MintedCharacteristics =>
    new Map([[characteristic, reason]]);

  it("admits the word it names where the mint states a reason", () => {
    // A PRODUCT MUST BE ABLE TO MINT, or the roster stops being a shared vocabulary and becomes a
    // gate on delivery: a consumer whose legitimate characteristic canon has not yet named would
    // have to choose between minting silently and waiting for a canon change.
    expect(
      characteristicFaults(
        [namedInRegistry("flakiness", "lint:flakiness")],
        [...ROSTER],
        minting("flakiness", "no roster word names order-dependence"),
      ),
    ).toEqual([]);
  });

  it("admits the word it NAMES, never the file that mint sits in", () => {
    // The mint is per-WORD. A mint admitting every off-roster word in the manifest beside it
    // would be one config line certifying the rest of the file, which is the fault this slice
    // closes wearing the key that exists to be the way out of it.
    const faults = characteristicFaults(
      [
        namedInRegistry("flakiness", "lint:flakiness"),
        namedInRegistry("anemic-domain", "lint:anemic-domain"),
      ],
      [...ROSTER],
      minting("flakiness", "no roster word names order-dependence"),
    );

    expect(faults.map((fault) => fault.characteristic)).toEqual(["anemic-domain"]);
  });

  it("holds both sources, so a mint admits a measured word as it admits a registered one", () => {
    // A measured check is named ONLY in the thresholds (@SCN-CHR-002), so a mint route reaching
    // the registry alone would leave the measured side with no way out at all.
    expect(
      characteristicFaults(
        [namedInThresholds("flakiness", "SCN-TGT-003")],
        [...ROSTER],
        minting("flakiness", "no roster word names order-dependence"),
      ),
    ).toEqual([]);
  });

  it("reds where the mint states no reason, naming the mint key and the word as the entry", () => {
    // AN ENTRY WITH NOTHING WRITTEN AGAINST IT IS A CONFIG LINE AGAIN, which is the fault. So a
    // reasonless entry is not a mint: it admits nothing, and it says so itself rather than
    // leaving the author with an off-roster complaint about a word they believe they covered.
    const faults = characteristicFaults(
      [namedInRegistry("flakiness", "lint:flakiness")],
      [...ROSTER],
      minting("flakiness", ""),
    );

    expect(faults.map((fault) => [fault.key, fault.entry])).toEqual([
      ["specController.checkRegistry", "lint:flakiness"],
      ["specController.mintedCharacteristics", "flakiness"],
    ]);
    // TWO FINDINGS, ONE REMEDY, and the second is what stops the first being baffling: the word
    // is still off-roster AND the route the author reached for did not open.
    expect(faults[1]?.characteristic).toBe("flakiness");
    expect(faults[1]?.message).toContain("specController.mintedCharacteristics");
    expect(faults[1]?.message).toContain("flakiness");
  });

  it("reds where the reason is whitespace alone", () => {
    // A reason nobody can read is a reason nobody wrote.
    expect(
      characteristicFaults(
        [namedInRegistry("flakiness", "lint:flakiness")],
        [...ROSTER],
        minting("flakiness", "   "),
      ).map((fault) => fault.key),
    ).toEqual(["specController.checkRegistry", "specController.mintedCharacteristics"]);
  });

  it("reds where the target stated a reason this reader could not take", () => {
    // `null` is how the edge hands over an entry whose reason was not a string at all — the key
    // survives so the mint is judged, exactly as a threshold pair whose BAR could not be read
    // keeps its key (@SCN-MUT-003). Dropping it would hand back an off-roster complaint about a
    // word whose mint entry is sitting right there.
    expect(
      characteristicFaults(
        [namedInRegistry("flakiness", "lint:flakiness")],
        [...ROSTER],
        minting("flakiness", null),
      ).map((fault) => fault.key),
    ).toEqual(["specController.checkRegistry", "specController.mintedCharacteristics"]);
  });

  it("names a reasonless mint even where nothing else in the manifest names the word", () => {
    // The mint key is judged in its own right, not only as a defence raised against some other
    // entry — otherwise a reasonless line could sit in the manifest indefinitely, unread, as
    // standing permission for the next entry that matches it.
    expect(
      characteristicFaults([], [...ROSTER], minting("flakiness", "")).map((fault) => fault.entry),
    ).toEqual(["flakiness"]);
  });

  it("states no mints where the target minted nothing, which is the default", () => {
    // There is no starter set: a mint the target did not write would license a word nobody chose.
    expect(
      characteristicFaults([namedInRegistry("complexity", "lint:complexity")], [...ROSTER]),
    ).toEqual([]);
  });
});
