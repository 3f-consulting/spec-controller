/**
 * @SCN-STG-009 (3F-2737) — the @unit arm of the tier floor's CHECK-TAG SET.
 *
 * The floor's decision is `scnTags.ts`'s and is already proven there over injected tags. What
 * is proven here is the one thing that module cannot see: WHICH tags this edge resolves and
 * hands it. A measured check has no runnable script handle, so the registry can never carry it
 * and a set read from the registry alone reds the very tag the obligation rule raises against.
 */

import { describe, it, expect } from "vitest";

import { FITNESS_AXIS_TAG } from "@3f-consulting/spec-controller-core/internal";

import { floorCheckTags } from "./lintScnTagsCli.js";

describe("[SCN-STG-009] the tier floor's check tags are the registry's and the thresholds' together", () => {
  it("admits a measured check, which no registry can name", () => {
    expect(
      floorCheckTags({
        specController: { thresholds: { "SCN-TGT-001": { "ci-run-time": 75 } } },
      })
    ).toContain("ci-run-time");
  });

  it("unions the two sets rather than choosing between them", () => {
    // Swapping one set for the other passes an arm that only ever looks at one of them.
    expect(
      floorCheckTags({
        specController: {
          checkRegistry: { "lint:complexity": "complexity" },
          thresholds: { "SCN-TGT-001": { "ci-run-time": 75 } },
        },
      })
    ).toEqual(expect.arrayContaining(["complexity", "ci-run-time"]));
  });

  it("names nothing OF THE TARGET'S for a target that configures neither", () => {
    // The floor then behaves exactly as it did before either key existed — the defensive
    // stance lives in the two resolvers, and this pins that reading it twice cannot invent a tag.
    //
    // THE AXIS WORD IS SUBTRACTED RATHER THAN THE ASSERTION LOOSENED (3F-3149). This read
    // `toEqual([])` until the converted route joined the set, and `toContain`-ing nothing would
    // have been no assertion at all; what @SCN-STG-009 is about is what the two RESOLVERS
    // yielded, so the constant this edge adds for every target is taken off and the exact
    // equality kept.
    expect(floorCheckTags({}).filter((tag) => tag !== FITNESS_AXIS_TAG)).toEqual([]);
  });
});

/**
 * @SCN-STG-005's CONVERTED route (3F-3149) — the THIRD source of what names a check here, and
 * the only one that is not the target's.
 *
 * A converted check carries one word for the whole axis and its CHARACTERISTIC moves to a
 * configured row, so `checkRegistry` names it nowhere and never will: that registry answers
 * "which check is this runnable script handle", and a converted check is not discovered as a
 * handle at all. The floor's own decision is `scnTags.ts`'s and is proven there over injected
 * sets — which is exactly why the new arm belongs HERE. That module needs no edit at all for
 * this route, so a `@unit` case over a set someone spelled the word into would be green on
 * first run and prove nothing about which words this edge actually hands it.
 */
describe("[SCN-STG-005] the check-tag set carries the converted axis word, whatever the manifest holds", () => {
  it("names the axis word for a target that configures nothing at all", () => {
    // NOT GATED ON `specController.fitnessChecks`, and that is a ruling rather than an omission.
    // The engine reads this word with no such gate — `convertedFitnessObligationsOf` and
    // `unconfiguredFitnessScenarios` both test it against the scenario's tags alone — so a floor
    // that asked the manifest first would disagree with the obligation rule on precisely the
    // corpus that matters: a converted scenario no row names. Which words name a CHECK is the
    // target's answer; which axis a scenario is ON is the model's, as `unit` is.
    expect(floorCheckTags({})).toContain(FITNESS_AXIS_TAG);
  });

  it("names it BESIDE the target's own two sets rather than instead of them", () => {
    // The third source joins the union; it does not replace it. Dropping either resolver would
    // pass an arm that only asserted the new word.
    expect(
      floorCheckTags({
        specController: {
          checkRegistry: { "lint:complexity": "complexity" },
          thresholds: { "SCN-TGT-001": { "ci-run-time": 75 } },
        },
      })
    ).toEqual(expect.arrayContaining(["complexity", "ci-run-time", FITNESS_AXIS_TAG]));
  });
});
