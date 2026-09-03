/**
 * @SCN-CHR-003 (@unit) — the MINT route's reader, the fifth of this edge's `specController.*`
 * resolvers (3F-2996).
 *
 * THE ROUTE IT OPENS. A consumer whose legitimate characteristic canon has not yet named must be
 * able to name it, or the portfolio roster stops being a shared vocabulary and becomes a gate on
 * delivery. What makes it a route rather than the fault under another name is that it is a SECOND
 * act, in a key whose only purpose is to say a portfolio word is being minted. This file pins the
 * READING of that key; the JUDGEMENT over what it hands back — whether a stated reason is a reason,
 * and what a mint admits — is `characteristicFaults`' and is pinned in
 * `static-checks/characteristicRoster.test.ts`. Two different claims, so two different files.
 *
 * IN ITS OWN FILE RATHER THAN BESIDE ITS FOUR PEERS, and the reason is mechanical: appended to
 * `ingestQualityChecks.test.ts` it took that file to 403 code lines against a `max-lines` ceiling of
 * 400, and an exception entry for a file that had just grown would be debt bought to avoid a split.
 * `ingestQualityChecks.recordRead.test.ts` beside it is the same split for the same reason.
 */

import { describe, it, expect } from "vitest";
import { resolveMintedCharacteristics } from "@3f-consulting/spec-controller-core/internal";

describe("[SCN-CHR-003] the mints a target states", () => {
  it("reads specController.mintedCharacteristics as characteristic to reason", () => {
    expect([
      ...resolveMintedCharacteristics({
        specController: { mintedCharacteristics: { flakiness: "no roster word names it" } },
      }),
    ]).toEqual([["flakiness", "no roster word names it"]]);
  });

  it("resolves EMPTY where the target minted nothing, or minted it in the wrong shape", () => {
    // Defensive like the four resolvers above it: config is data from outside, and a check that
    // throws on a typo produces no verdict at all. There is no starter set.
    expect([...resolveMintedCharacteristics({})]).toEqual([]);
    expect([...resolveMintedCharacteristics({ specController: {} })]).toEqual([]);
    expect([
      ...resolveMintedCharacteristics({ specController: { mintedCharacteristics: "flakiness" } }),
    ]).toEqual([]);
    expect([
      ...resolveMintedCharacteristics({ specController: { mintedCharacteristics: ["flakiness"] } }),
    ]).toEqual([]);
  });

  it("keeps an entry whose reason it could not read, with nothing beside it", () => {
    // NEVER THROWN, AND NEVER DROPPED EITHER. Dropping the key would hand the author an
    // off-roster complaint about a word whose mint entry is sitting right there; keeping it
    // with `null` beside it lets the rule say the thing the author actually needs to hear. It is
    // `thresholdsOf`'s stance with a bar it cannot read (@SCN-MUT-003), for its reason.
    expect([
      ...resolveMintedCharacteristics({
        specController: { mintedCharacteristics: { flakiness: 3, ordering: null, cycles: {} } },
      }),
    ]).toEqual([
      ["flakiness", null],
      ["ordering", null],
      ["cycles", null],
    ]);
  });

  it("inherits the engine's bare-term reading rather than restating it", () => {
    // `@flakiness` in a hand-authored manifest names the same characteristic as `flakiness`
    // (3F-2976), and the reason is taken as written but for the whitespace around it.
    expect([
      ...resolveMintedCharacteristics({
        specController: { mintedCharacteristics: { " @flakiness ": "  no roster word names it  " } },
      }),
    ]).toEqual([["flakiness", "no roster word names it"]]);
  });
});
