/**
 * @SCN-STG-009 (3F-2737) — the @unit arm of the tier floor's CHECK-TAG SET.
 *
 * The floor's decision is `scnTags.ts`'s and is already proven there over injected tags. What
 * is proven here is the one thing that module cannot see: WHICH tags this edge resolves and
 * hands it. A measured check has no runnable script handle, so the registry can never carry it
 * and a set read from the registry alone reds the very tag the obligation rule raises against.
 */

import { describe, it, expect } from "vitest";

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

  it("names nothing for a target that configures neither", () => {
    // The floor then behaves exactly as it did before either key existed — the defensive
    // stance lives in the two resolvers, and this pins that reading it twice cannot invent a tag.
    expect(floorCheckTags({})).toEqual([]);
  });
});
