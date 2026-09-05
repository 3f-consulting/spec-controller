/**
 * @SCN-CHR-005 (3F-3138) — the @unit arm of the THIRD source, and of the reading that reaches it.
 *
 * A SEPARATE FILE FROM `characteristicRoster.test.ts`, for the reason `characteristicRoster.staleMints.test.ts`
 * already split on: that file is within a few lines of the 400-line ceiling `max-lines` holds test
 * scopes to, so appending would red the complexity check — a red at a different gate rather than
 * this scenario's red.
 *
 * WHY THE @unit ARM IS THE ONE THAT CAN PROVE THIS. @SCN-CHR-005's other half — every characteristic
 * this repository names is a portfolio word — is the property the CI step holds over the real
 * `package.json` on every push. The EXHAUSTIVENESS half it cannot hold, and could not hold when this
 * was written: this repository configured no fitness rows until 3F-3151 converted the first check, so
 * a reading that skipped the third source entirely would have greened that step every day until the
 * conversion landed. It now holds ONE row, which is a population a rule can pass over by accident, so
 * the arms below stay proven over planted manifests — the stance every Rule in this feature file
 * already takes.
 *
 * THE ROSTER IS INJECTED IN EVERY FAULT ASSERTION, as it is in both sibling files: spec-controller's
 * own characteristics are all portfolio words, so the rule is green over the real tree by
 * construction and a passing build says nothing about whether it works.
 *
 * AND THE ROWS ARE BUILT THROUGH THE ENGINE'S OWN READER, never hand-keyed. `fitnessChecksOf` is
 * what the obligation side reads a row's characteristic with (@SCN-LNT-018); a second reader here
 * deciding independently what word a row names would hold a different string to the roster from the
 * one the ledger raises the Evidence Obligation against — one row, two words, and loud nowhere.
 */

import { describe, it, expect } from "vitest";
import {
  checkRegistryOf,
  fitnessChecksOf,
  thresholdsOf,
} from "@3f-consulting/spec-controller-core/internal";

import {
  CHARACTERISTIC_SOURCE_KEYS,
  characteristicFaults,
  fitnessCheckCharacteristics,
  namedCharacteristics,
  type MintedCharacteristics,
  type NamedCharacteristic,
} from "./characteristicRoster.js";
import { targetNamedCharacteristics } from "./lintCheckCharacteristicsCli.js";

/** A constructed roster, so each case says exactly which words it is judging against. */
const ROSTER = ["complexity", "vocab", "typecheck"] as const;

/** One characteristic named by a configured fitness row, as `fitnessCheckCharacteristics` produces it. */
const namedInRow = (characteristic: string, entry: string): NamedCharacteristic => ({
  characteristic,
  key: "specController.fitnessChecks",
  entry,
});

/** One mint, stated as `resolveMintedCharacteristics` hands it over. */
const minting = (characteristic: string, reason: string | null): MintedCharacteristics =>
  new Map([[characteristic, reason]]);

/** A reason long enough to be a sentence, as canon asks of a mint. */
const REASON = "no roster word names order-dependence, and this target reruns its suite to find it";

describe("[SCN-CHR-005] the characteristics a target's configured fitness rows name", () => {
  it("reads through the engine's own row registry, one per row, keyed by the @SCN the author edits", () => {
    // The @SCN is the ENTRY on this side, as the script handle is on the registry's and the @SCN is
    // on the thresholds': it is the manifest LINE an author has to change, and a message naming
    // only the word leaves them to find which of their rows carried it.
    expect(
      fitnessCheckCharacteristics(
        fitnessChecksOf([
          { scn: "SCN-CPX-005", characteristic: "complexity", command: "eslint" },
          { scn: "SCN-MUT-011", characteristic: "mutation", command: "pnpm mutation:score" },
        ]),
      ),
    ).toEqual([namedInRow("complexity", "SCN-CPX-005"), namedInRow("mutation", "SCN-MUT-011")]);
  });

  it("names a MEASURED row's characteristic exactly as it names a static one's", () => {
    // The bar is what makes a row measured (@SCN-LNT-019), and it says nothing about whether the
    // word the row names is a portfolio word. A reading that saw only the static rows would leave
    // every converted MEASURED check mintable at will — @SCN-CHR-002's fault, one key over.
    expect(
      fitnessCheckCharacteristics(
        fitnessChecksOf([
          { scn: "SCN-MUT-011", characteristic: "mutation", atLeast: { mutationGate: "domain" } },
        ]),
      ),
    ).toEqual([namedInRow("mutation", "SCN-MUT-011")]);
  });

  it("inherits the engine's bare-term reading rather than restating it", () => {
    // `@SCN-CPX-005` and `@complexity` in a hand-authored manifest name the same pair as the bare
    // spellings (3F-2976). `fitnessChecksOf` stores both terms bare, so this reader gets it free.
    expect(
      fitnessCheckCharacteristics(
        fitnessChecksOf([{ scn: " @SCN-CPX-005 ", characteristic: " @complexity " }]),
      ),
    ).toEqual([namedInRow("complexity", "SCN-CPX-005")]);
  });

  it("names nothing where the target has converted nothing at all", () => {
    // Which is this repository's own manifest until 3F-3151 lands, and is why the CI step cannot
    // be what proves any of this.
    expect(fitnessCheckCharacteristics(fitnessChecksOf(undefined))).toEqual([]);
  });
});

describe("[SCN-CHR-005] a configured fitness row naming a characteristic outside the roster", () => {
  it("reds, naming the word, the fitness-rows key and the @SCN of the row that carried it", () => {
    // A TYPO IN A ROW IS NOT SILENTLY A NEW CHARACTERISTIC. That is the fault 3F-2996 closed, and
    // moving the word to a new key in the same manifest re-opens it unless the reading follows.
    const faults = characteristicFaults([namedInRow("complexty", "SCN-CPX-005")], [...ROSTER]);

    expect(faults).toHaveLength(1);
    expect(faults[0]?.characteristic).toBe("complexty");
    expect(faults[0]?.key).toBe("specController.fitnessChecks");
    expect(faults[0]?.entry).toBe("SCN-CPX-005");
    expect(faults[0]?.message).toContain("complexty");
    expect(faults[0]?.message).toContain("specController.fitnessChecks");
    expect(faults[0]?.message).toContain("SCN-CPX-005");
    // Not resolved to the roster word it resembles, here as anywhere else: the mint is the act
    // being surfaced, and reading it as something else hides what this exists to make visible.
    expect(faults[0]?.message).not.toMatch(/\bcomplexity\b/);
  });

  it("leaves a row naming a roster word alone", () => {
    expect(characteristicFaults([namedInRow("complexity", "SCN-CPX-005")], [...ROSTER])).toEqual([]);
  });

  it("holds all three sources to ONE roster, so a target minting in each reds three times", () => {
    // The sources stay THREE and neither answers for the others — a clean registry does not
    // absolve the rows, and a clean set of rows does not absolve the thresholds.
    const faults = characteristicFaults(
      [
        { characteristic: "anemic-domain", key: "specController.checkRegistry", entry: "lint:anemic-domain" },
        { characteristic: "flakiness", key: "specController.thresholds", entry: "SCN-TGT-003" },
        namedInRow("complexty", "SCN-CPX-005"),
      ],
      [...ROSTER],
    );

    expect(faults.map((fault) => [fault.key, fault.entry])).toEqual([
      ["specController.checkRegistry", "lint:anemic-domain"],
      ["specController.thresholds", "SCN-TGT-003"],
      ["specController.fitnessChecks", "SCN-CPX-005"],
    ]);
  });

  it("admits a row's word where the target mints it with a reason, as it admits a registered one", () => {
    // A converted check must have the same way out as an unconverted one, or conversion becomes a
    // gate on a consumer's own legitimate vocabulary.
    expect(
      characteristicFaults(
        [namedInRow("flakiness", "SCN-TGT-004")],
        [...ROSTER],
        minting("flakiness", REASON),
      ),
    ).toEqual([]);
  });

  it("counts a row as naming a word, so a mint a row alone keeps alive is not stale", () => {
    // The staleness arm (@SCN-CHR-004) asks whether anything this target names still relies on the
    // mint. A reading blind to the rows would answer no for every converted check and red the mint
    // that is doing its job — the route closed for exactly the checks that moved.
    expect(
      characteristicFaults(
        [namedInRow("flakiness", "SCN-TGT-004")],
        [...ROSTER],
        minting("flakiness", REASON),
      ).map((fault) => fault.message),
    ).toEqual([]);
  });
});

describe("[SCN-CHR-005] the read set — every place a target may name a characteristic", () => {
  it("reaches all three, one entry per source, in the order the verdict reports them", () => {
    expect(
      namedCharacteristics(
        checkRegistryOf({ "lint:complexity": "complexity" }),
        thresholdsOf({ "SCN-TGT-002": { "ci-run-time": 75 } }),
        fitnessChecksOf([{ scn: "SCN-CPX-005", characteristic: "typecheck" }]),
      ),
    ).toEqual([
      { characteristic: "complexity", key: "specController.checkRegistry", entry: "lint:complexity" },
      { characteristic: "ci-run-time", key: "specController.thresholds", entry: "SCN-TGT-002" },
      namedInRow("typecheck", "SCN-CPX-005"),
    ]);
  });

  it("reaches every key the source list names, so a place cannot be listed and left unread", () => {
    // THE ASSERTION THIS SCENARIO'S UPDATE EXISTS FOR. Every other fault this module reports is
    // loud; a source nobody reads reds nothing anywhere, so the only thing that can catch it is a
    // pin holding the READER to the LIST. It has teeth in both directions — a key added to the
    // list with no reader behind it reds here, and a reader producing a key the list does not
    // carry reds here too.
    const reached = namedCharacteristics(
      checkRegistryOf({ "lint:complexity": "complexity" }),
      thresholdsOf({ "SCN-TGT-002": { "ci-run-time": 75 } }),
      fitnessChecksOf([{ scn: "SCN-CPX-005", characteristic: "typecheck" }]),
    ).map((one) => one.key);

    expect([...new Set(reached)].sort()).toEqual([...CHARACTERISTIC_SOURCE_KEYS].sort());
  });

  it("names nothing where the target names nothing anywhere", () => {
    expect(
      namedCharacteristics(checkRegistryOf({}), thresholdsOf({}), fitnessChecksOf(undefined)),
    ).toEqual([]);
  });
});

describe("[SCN-CHR-005] the reading the check itself does over a target's manifest", () => {
  /** A planted manifest naming one word in each of the three places, as a target spells them. */
  const MANIFEST = {
    specController: {
      checkRegistry: { "lint:complexity": "complexity" },
      thresholds: { "SCN-TGT-002": { "ci-run-time": 75 } },
      fitnessChecks: [{ scn: "SCN-CPX-005", characteristic: "typecheck", command: "eslint" }],
    },
  };

  it("gathers the rows beside the registry and the thresholds, through the engine's own resolvers", () => {
    // THE PIN ON THE CHECK RATHER THAN ON THE RULE. `namedCharacteristics` reaching all three is
    // worth nothing if what the check hands it is still the old pair — one call site, and the
    // whole Update is inert in exactly the way it exists to prevent.
    expect(targetNamedCharacteristics(MANIFEST)).toEqual([
      { characteristic: "complexity", key: "specController.checkRegistry", entry: "lint:complexity" },
      { characteristic: "ci-run-time", key: "specController.thresholds", entry: "SCN-TGT-002" },
      namedInRow("typecheck", "SCN-CPX-005"),
    ]);
  });

  it("holds a row's word to the portfolio roster, so a mistyped row reds rather than mints", () => {
    // The whole reason this Update is sequenced ahead of the two conversions: on the commit the
    // first check converts, its characteristic must face the roster like every other word.
    const faults = characteristicFaults(
      targetNamedCharacteristics({
        specController: {
          fitnessChecks: [{ scn: "SCN-CPX-005", characteristic: "complexty", command: "eslint" }],
        },
      }),
      [...ROSTER],
    );

    expect(faults.map((fault) => [fault.key, fault.entry])).toEqual([
      ["specController.fitnessChecks", "SCN-CPX-005"],
    ]);
  });

  it("names nothing for a target that has converted nothing, which is this repository today", () => {
    expect(
      targetNamedCharacteristics({
        specController: { checkRegistry: { "lint:complexity": "complexity" } },
      }),
    ).toEqual([
      { characteristic: "complexity", key: "specController.checkRegistry", entry: "lint:complexity" },
    ]);
  });
});
