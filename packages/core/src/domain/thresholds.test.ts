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
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
  });

  it("keeps two scenarios' ceilings for ONE check apart", () => {
    // The shape canon asks of this axis, and the reason the outer key is the @SCN: several checks
    // of one characteristic are several stepless scenarios sharing the tag, told apart by @SCN.
    const registry = thresholdsOf({
      "SCN-MSD-001": { "ci-run-time": 75 },
      "SCN-MSD-002": { "ci-run-time": 150 },
    });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
    expect(thresholdFor(registry, "SCN-MSD-002", "ci-run-time")).toStrictEqual({ threshold: 150 });
  });

  it("keeps two checks' ceilings on ONE scenario apart", () => {
    // The debit-side twin of @SCN-LNT-012. A stepless scenario may carry more than one bare check,
    // so one @SCN can owe two measured obligations; a flat number under the @SCN would answer for
    // both, and whichever was read first would silently set the other's bar.
    const registry = thresholdsOf({ "SCN-MSD-001": { "ci-run-time": 75, coverage: 90 } });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
    expect(thresholdFor(registry, "SCN-MSD-001", "coverage")).toStrictEqual({ threshold: 90 });
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
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
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
    expect(thresholdFor(registry, "SCN-MSD-004", "ci-run-time")).toStrictEqual({ threshold: 75 });
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
    expect(thresholdFor(registry, "SCN-MSD-001", "complexity")).toStrictEqual({ threshold: 0 });
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

/**
 * @unit for @SCN-MUT-001 — what the registry hands back once a bar can carry the comparison it is
 * read with, and what a BARE-NUMBER entry therefore says.
 *
 * Bidirectional evidence: the describe carries @SCN-MUT-001, matching features/mutation-score.feature
 * and tests/steps/mutationScore.steps.ts. The obligation-side consequence is pinned in
 * parse/measuredObligations.test.ts; this file pins the reading the obligation rule is handed.
 *
 * Its own describe rather than a further `it` above: @SCN-CIP-001's block is about WHICH pair a
 * ceiling is found for, and this one is about what the found thing IS. The two would read as one
 * claim in a shared block, and the bare form's whole promise is that it did not change.
 */
describe("[SCN-MUT-001] a bare-number threshold reads as a bar naming no comparison of its own", () => {
  it("hands back a bar holding that number", () => {
    // The widening. A number cannot carry a comparison, so the registry's value stops being one —
    // and the bare entry, which is every measured entry this repository has authored so far, still
    // has to arrive saying exactly what it said before.
    const registry = thresholdsOf({ "SCN-MSD-001": { mutation: 91.87 } });
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toStrictEqual({ threshold: 91.87 });
  });

  it("names no comparison on it, which is what makes the bare form mean at-most", () => {
    // Asserted on the KEY SET, because the direction rides the bar SPARSELY: absent is at-most.
    // A bar that carried `atLeast: false` would satisfy every read of the flag and still be a term
    // the two live @ci-run-time rows would have to start carrying.
    const registry = thresholdsOf({ "SCN-MSD-001": { mutation: 91.87 } });
    expect(Object.keys(thresholdFor(registry, "SCN-MSD-001", "mutation") ?? {})).toStrictEqual([
      "threshold",
    ]);
  });

  it("still answers null for a pair the manifest does not name", () => {
    // The absence stays an absence rather than becoming an empty bar. An empty bar would be an
    // obligation holding a comparison and no number, which is a different sentence from "nobody
    // authored one" and reaches a different arm (@SCN-CIP-002).
    const registry = thresholdsOf({ "SCN-MSD-001": { mutation: 91.87 } });
    expect(thresholdFor(registry, "SCN-MSD-002", "mutation")).toBeNull();
  });
});

/**
 * @unit for @SCN-MUT-002 — the OBJECT form: an entry that names the comparison its number is read
 * with, and the bar the registry therefore hands back.
 *
 * Bidirectional evidence: the describe carries @SCN-MUT-002, matching features/mutation-score.feature
 * and tests/steps/mutationScore.steps.ts. The obligation-side consequence is pinned in
 * ../parse/measuredObligations.test.ts; this file pins the reading the obligation rule is handed.
 *
 * THE `atMost` ARM IS HERE RATHER THAN IN A SCENARIO OF ITS OWN. It names no new behaviour — it is
 * the same entry shape saying what a bare number already says — but it is half of the RECOGNISED
 * set the endorsed design authors, and @SCN-MUT-003's "naming no comparison it recognises" is
 * incoherent against a set of one.
 */
describe("[SCN-MUT-002] an at-least entry reads as a bar naming the comparison it is held to", () => {
  it("hands back a bar holding the number and the floor it names", () => {
    // Both halves from ONE entry. "91.87" says nothing until somebody says which side of it
    // passes, so the side is authored where the number is and cannot be edited away from it.
    const registry = thresholdsOf({ "SCN-MSD-001": { mutation: { atLeast: 91.87 } } });
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toStrictEqual({
      threshold: 91.87,
      atLeast: true,
    });
  });

  it("names the object form's check as measured, exactly as the bare form's is", () => {
    // The tag set is what makes the obligation raised at all — a measured check has no script
    // handle, so `checkRegistry` cannot see it. A form that parsed into a bar but left its tag out
    // of this set would be a threshold nothing ever reads: silent, which is worse than wrong.
    const registry = thresholdsOf({
      "SCN-MSD-001": { mutation: { atLeast: 91.87 }, "ci-run-time": 75 },
    });
    expect(measuredCheckTags(registry)).toEqual(["ci-run-time", "mutation"]);
  });

  it("reads an at-most entry as the explicit long form of the bare number, naming no comparison", () => {
    // The other recognised key, and the reason the comparison is named by the KEY rather than by a
    // `direction` value: an entry cannot be written in this form without saying which way it reads,
    // and there is no third value anybody has to validate.
    const registry = thresholdsOf({ "SCN-MSD-001": { "ci-run-time": { atMost: 75 } } });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
  });

  it("keeps a floor and a ceiling apart on ONE scenario", () => {
    // The two forms coexist in one manifest — which is the whole of what "extension" means here.
    const registry = thresholdsOf({
      "SCN-MSD-001": { mutation: { atLeast: 91.87 }, "ci-run-time": 75 },
    });
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toStrictEqual({
      threshold: 91.87,
      atLeast: true,
    });
    expect(thresholdFor(registry, "SCN-MSD-001", "ci-run-time")).toStrictEqual({ threshold: 75 });
  });

  it("drops a bar whose number is not a finite, non-negative one, in either direction", () => {
    // The object form reaches the SAME number-reading the bare form does; a recognised key is not
    // a licence for the value beside it. NaN stays the dangerous one in the new direction too —
    // `measured >= NaN` is false, so a floor of NaN reds every suite and blames the suite.
    const registry = thresholdsOf({
      "SCN-MSD-001": {
        mutation: { atLeast: Number.NaN },
        coverage: { atLeast: "90" },
        complexity: { atMost: -1 },
      },
    });
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-001", "coverage")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-001", "complexity")).toBeNull();
  });
});

/**
 * @unit for @SCN-MUT-003 — an entry the registry cannot read a comparison from: what it costs the
 * bar, and what it does NOT cost the check.
 *
 * Bidirectional evidence: the describe carries @SCN-MUT-003, matching features/mutation-score.feature
 * and tests/steps/mutationScore.steps.ts. The obligation-side consequence is pinned in
 * ../parse/measuredObligations.test.ts; this file pins the reading the obligation rule is handed.
 *
 * THE ENTRY AND THE BAR ARE TWO CLAIMS, and the drop is only ever about the second. A manifest
 * entry names a (scenario, check) pair, and naming it is what makes the check measured; whether the
 * value beside it reads as a bar is a separate question with its own answer. Read as one claim, an
 * unreadable bar takes the tag down with it, the stepless scenario carrying that tag raises nothing,
 * and the loudest thing left is the tag grammar complaining about a check nobody wrote — the wrong
 * fault, in the wrong place, about the wrong artefact.
 */
describe("[SCN-MUT-003] an entry naming no comparison the registry recognises hands back no bar", () => {
  it("keeps the check measured, so the obligation is still raised", () => {
    const registry = thresholdsOf({ "SCN-MSD-001": { mutation: { direction: "up", value: 91.87 } } });
    expect(measuredCheckTags(registry)).toEqual(["mutation"]);
  });

  it("hands back no bar for it, rather than the number with a direction picked for it", () => {
    // The reading that must not be reachable. `{ threshold: 91.87 }` here would be the engine
    // supplying the half of the bar the target failed to author, and supplying it as a CEILING —
    // greening every mutation run below the number the manifest actually names.
    const registry = thresholdsOf({ "SCN-MSD-001": { mutation: { direction: "up", value: 91.87 } } });
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toBeNull();
  });

  it("reads an entry naming BOTH comparisons as naming neither", () => {
    // Two directions is not more information than one, it is a contradiction: whichever key were
    // read first would silently settle it, and the entry would mean whatever this function's
    // property order happens to be.
    const registry = thresholdsOf({
      "SCN-MSD-001": { mutation: { atLeast: 91.87, atMost: 95 } },
    });
    expect(measuredCheckTags(registry)).toEqual(["mutation"]);
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toBeNull();
  });

  it("keeps the check measured however the entry is malformed, not only for a mis-named comparison", () => {
    // The rule is about the ENTRY, not about which way it failed to read. A bar of NaN and a bar
    // spelled `direction` are the same fact on the ledger — the target named this check and
    // authored no bar this can hold it to — so they read the same, and the arm that reports it
    // (@SCN-CIP-002) does not have to know which kind of malformed it met.
    const registry = thresholdsOf({
      "SCN-MSD-001": { mutation: Number.NaN, coverage: "90", complexity: { atLeast: null } },
    });
    expect(measuredCheckTags(registry)).toEqual(["complexity", "coverage", "mutation"]);
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-001", "coverage")).toBeNull();
    expect(thresholdFor(registry, "SCN-MSD-001", "complexity")).toBeNull();
  });

  it("still drops an entry that names no check at all", () => {
    // The boundary of the above. An empty check tag names no pair, so there is nothing to hold
    // measured and nothing to report a missing bar against — a key, not a value, and dropped whole.
    const registry = thresholdsOf({ "SCN-MSD-001": { "": { direction: "up" }, "@": 75 } });
    expect(measuredCheckTags(registry)).toEqual([]);
  });
});
