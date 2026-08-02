/**
 * Unit test for the complexity + module-size thresholds (@SCN-CPX-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * @SCN-CPX-001 id matching features/complexity-threshold.feature, so a grep of the id returns both
 * halves of the pair.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT. The reding itself is eslint's behaviour, not ours — it is
 * proven by PLANT on the PR (an over-threshold function reds; reverting greens), because a third
 * party's rule engine is not something a unit test should re-implement. What IS ours, and what this
 * file pins, is the THRESHOLD TABLE: the six numbers, the two scopes, and the direction of the ratchet.
 * Those are the values a future edit could silently loosen, and nothing else in the repo would
 * notice — the same class of vacuous-green the anti-vacuity floors exist to catch.
 *
 * The thresholds are read from the REAL module the eslint config consumes (`complexityThresholds.mjs`),
 * never re-declared here. A copy would agree by coincidence and drift the moment either side is
 * retuned — the agreeing-by-copy this codebase has spent several slices removing.
 *
 * Parent: @SCN-CPX-001 (3F-2284) — the complexity/module-size gate slice (3F-2177).
 */

import { describe, it, expect } from "vitest";
import { PRODUCTION_THRESHOLD, TEST_THRESHOLD, type ComplexityThreshold } from "./complexityThresholds.mjs";

/**
 * The measured maxima the thresholds were seeded at (Discovery, 3F-2177) — asserted, not assumed.
 *
 * These are the values that make the seed HONEST: each is the real tree's maximum for that rule and
 * scope, so the threshold is the strictest one that leaves the tree green. Pinning them here means a
 * later "just bump it a bit" edit has to argue with a test instead of sliding through.
 */
const SEEDED_PRODUCTION = { complexity: 25, maxLines: 1024, maxLinesPerFunction: 261 } as const;
const SEEDED_TEST = { complexity: 7, maxLines: 2419, maxLinesPerFunction: 221 } as const;

/** The p90 ratchet targets recorded alongside each seed (Discovery, 3F-2177). */
const RATCHET_PRODUCTION = { complexity: 8, maxLines: 540, maxLinesPerFunction: 35 } as const;
const RATCHET_TEST = { complexity: 2, maxLines: 821, maxLinesPerFunction: 41 } as const;

const RULES = ["complexity", "maxLines", "maxLinesPerFunction"] as const;

describe("[SCN-CPX-001] a function or module over its complexity or size threshold reds the build", () => {
  it("[SCN-CPX-001] the production thresholds are seeded at the tree's measured maximum", () => {
    // The seed is the whole argument for "catches regression without reddening the tree": at the
    // measured max there is zero headroom, so today is green and any growth reds.
    expect(PRODUCTION_THRESHOLD.complexity).toBe(SEEDED_PRODUCTION.complexity);
    expect(PRODUCTION_THRESHOLD.maxLines).toBe(SEEDED_PRODUCTION.maxLines);
    expect(PRODUCTION_THRESHOLD.maxLinesPerFunction).toBe(SEEDED_PRODUCTION.maxLinesPerFunction);
  });

  it("[SCN-CPX-001] the test thresholds are seeded separately, at the test tree's own maximum", () => {
    // Two scopes, not one. Tests are LONGER at the file level and SIMPLER at the function level, so
    // a shared threshold would be vacuous at one end and slack at the other.
    expect(TEST_THRESHOLD.complexity).toBe(SEEDED_TEST.complexity);
    expect(TEST_THRESHOLD.maxLines).toBe(SEEDED_TEST.maxLines);
    expect(TEST_THRESHOLD.maxLinesPerFunction).toBe(SEEDED_TEST.maxLinesPerFunction);
  });

  it("[SCN-CPX-001] the two scopes differ in BOTH directions — a shared threshold could not be honest", () => {
    // The asymmetry is the reason two scopes exist, so it is asserted rather than left as prose: a
    // future edit that collapsed them would have to delete this.
    expect(TEST_THRESHOLD.maxLines).toBeGreaterThan(PRODUCTION_THRESHOLD.maxLines);
    expect(TEST_THRESHOLD.complexity).toBeLessThan(PRODUCTION_THRESHOLD.complexity);
  });

  it("[SCN-CPX-001] every threshold records a ratchet target strictly below its seed", () => {
    // ratchet-down-later is only meaningful if the target actually points DOWN. A target at or above
    // the seed is a silent ceiling wearing a ratchet's name — this is what stops that shipping.
    for (const rule of RULES) {
      expect(PRODUCTION_THRESHOLD.ratchet[rule]).toBeLessThan(PRODUCTION_THRESHOLD[rule]);
      expect(TEST_THRESHOLD.ratchet[rule]).toBeLessThan(TEST_THRESHOLD[rule]);
    }
  });

  it("[SCN-CPX-001] the ratchet targets are the measured p90s, not arbitrary round numbers", () => {
    expect(PRODUCTION_THRESHOLD.ratchet).toEqual(RATCHET_PRODUCTION);
    expect(TEST_THRESHOLD.ratchet).toEqual(RATCHET_TEST);
  });

  it("[SCN-CPX-001] both scopes declare all three rules — no threshold is silently absent", () => {
    // An absent threshold is an unguarded rule that LOOKS guarded from the config's shape. Enumerated
    // from the declared rule set rather than from the properties that happen to be present.
    for (const threshold of [PRODUCTION_THRESHOLD, TEST_THRESHOLD] as ComplexityThreshold[]) {
      for (const rule of RULES) {
        expect(typeof threshold[rule]).toBe("number");
        expect(threshold[rule]).toBeGreaterThan(0);
      }
    }
  });
});
