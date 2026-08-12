/**
 * @unit for @SCN-CIP-001 — the THRESHOLD REGISTRY's own reading: what a target's manifest says a
 * measured check's ceiling is, and which bare tags are measured at all.
 *
 * Bidirectional evidence: the describes carry @SCN-CIP-001, matching features/ci-run-time.feature
 * and tests/steps/ciRunTime.steps.ts. The obligation-side consequence is pinned in
 * parse/measuredObligations.test.ts; this file pins the reading the obligation rule is handed.
 *
 * The defensive arms are not decoration. This module sits in the mutated scope
 * (packages/core/src/domain/**), and every dropped-entry branch below is a mutant that would
 * otherwise survive — a registry that trusted a malformed entry would hand the reconciler a
 * ceiling of NaN, against which every comparison is false and every measurement therefore fails.
 */

import { describe, it, expect } from "vitest";

import { measuredCheckTags, thresholdFor, thresholdsOf } from "./thresholds.js";

describe("[SCN-CIP-001] the threshold registry reads a target's ceilings, keyed by @SCN then by check", () => {
  it("reads a ceiling for the (scenario, check) pair the manifest names", () => {
    const registry = thresholdsOf({ "SCN-MSD-001": { "ci-run-time": 75 } });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toBe(75);
  });

  it("keeps two scenarios' ceilings for ONE check apart", () => {
    // The shape canon asks of this axis, and the reason the outer key is the @SCN: several checks
    // of one characteristic are several stepless scenarios sharing the tag, told apart by @SCN.
    const registry = thresholdsOf({
      "SCN-MSD-001": { "ci-run-time": 75 },
      "SCN-MSD-002": { "ci-run-time": 150 },
    });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toBe(75);
    expect(thresholdFor(registry, "SCN-MSD-002", "ci-run-time")).toBe(150);
  });

  it("keeps two checks' ceilings on ONE scenario apart", () => {
    // The debit-side twin of @SCN-LNT-012. A stepless scenario may carry more than one bare check,
    // so one @SCN can owe two measured obligations; a flat number under the @SCN would answer for
    // both, and whichever was read first would silently set the other's bar.
    const registry = thresholdsOf({ "SCN-MSD-001": { "ci-run-time": 75, coverage: 90 } });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toBe(75);
    expect(thresholdFor(registry, "SCN-MSD-001", "coverage")).toBe(90);
  });

  it("answers null for a pair the manifest does not name", () => {
    // Not zero, and not Infinity. Zero is a ceiling of zero — a far louder claim than "nobody set
    // one" — and Infinity is the silent green @SCN-CIP-002 exists to make unreachable.
    const registry = thresholdsOf({ "SCN-MSD-001": { "ci-run-time": 75 } });
    expect(thresholdFor(registry, "SCN-MSD-002", "ci-run-time")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-001", "coverage")).toBeNull();
  });

  it("strips a leading @ from the scenario id and from the check tag", () => {
    // A manifest written by hand will sooner or later spell either the way a feature file does.
    // Normalising here rather than at each lookup is the stance `checkRegistryOf` already takes:
    // one reader forgets, and the miss is silent.
    const registry = thresholdsOf({ "@SCN-MSD-001": { "@ci-run-time": 75 } });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toBe(75);
  });

  it("names the measured check tags, unique and sorted", () => {
    // The obligation rule needs the tag SET to know which of a scenario's tags name a measured
    // check at all — the measured twin of `registeredCheckTags`.
    const registry = thresholdsOf({
      "SCN-MSD-002": { coverage: 90 },
      "SCN-MSD-001": { "ci-run-time": 75, coverage: 85 },
    });
    expect(measuredCheckTags(registry)).toEqual(["ci-run-time", "coverage"]);
  });

  it("drops an entry whose value is not an object of numbers", () => {
    // Config is data from outside. A registry that threw on a typo would turn one bad character
    // into a run that produces no verdict at all, which is a worse answer than a missing ceiling —
    // the missing ceiling is loud on the ledger (@SCN-CIP-002), the absent verdict is loud nowhere.
    const registry = thresholdsOf({
      "SCN-MSD-001": 75,
      "SCN-MSD-002": null,
      "SCN-MSD-003": { "ci-run-time": "75" },
      "SCN-MSD-004": { "ci-run-time": 75 },
    });
    expect(measuredCheckTags(registry)).toEqual(["ci-run-time"]);
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-002", "ci-run-time")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-003", "ci-run-time")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-004", "ci-run-time")).toBe(75);
  });

  it("drops a ceiling that is not a finite, non-negative number", () => {
    // NaN is the dangerous one: every comparison against it is false, so `measured <= NaN` is
    // false and a measurement of any size reads failing — a ledger that reds honestly-fast suites
    // and blames the suite rather than the manifest. Negative and infinite ceilings are nonsense
    // of the same family.
    const registry = thresholdsOf({
      "SCN-MSD-001": {
        "ci-run-time": Number.NaN,
        coverage: Number.POSITIVE_INFINITY,
        mutation: -1,
        complexity: 0,
      },
    });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-001", "coverage")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toBeNull();
    // Zero IS a legal ceiling — the binary fitness function canon names (zero forbidden terms).
    expect(thresholdFor(registry, "SCN-MSD-001", "complexity")).toBe(0);
  });

  it("drops an empty scenario id and an empty check tag", () => {
    const registry = thresholdsOf({ "": { "ci-run-time": 75 }, "SCN-MSD-001": { "": 75, "@": 75 } });
    expect(measuredCheckTags(registry)).toEqual([]);
  });

  it("is inert on a manifest that names no thresholds at all", () => {
    // A target that has authored none raises no measured obligations, so the whole axis is
    // dormant until something supplies one — the same inertness `checkRegistryOf` has.
    const registry = thresholdsOf({});
    expect(measuredCheckTags(registry)).toEqual([]);
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toBeNull();
  });
});
