/**
 * Unit test for the complexity + module-size thresholds (@SCN-CPX-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * @SCN-CPX-001 id matching features/complexity-threshold.feature, so a grep of the id returns both
 * halves of the pair.
 *
 * FIX-TO-CANON, NOT A ROUTINE UPDATE (3F-2316, under 3F-2286). This file previously pinned four
 * assertions that 3F-2286 makes FALSE by superseding 3F-2177's seeding rule:
 *
 *   - "the production thresholds are seeded at the tree's measured maximum"
 *   - "the test thresholds are seeded separately, at the test tree's own maximum"
 *   - "every threshold records a ratchet target strictly below its seed"
 *   - "the ratchet targets are the measured p90s, not arbitrary round numbers"
 *
 * A fifth went with them — "the two scopes differ in BOTH directions" — which was true only while both
 * scopes were measurements of their own populations. Under one external standard the two scopes agree
 * by construction, so that assertion inverts into this file's strongest provenance pin (below).
 *
 * Every one of the five asserted the SEED-AT-MEASURED-MAXIMUM rule, which is precisely what 3F-2286
 * retires: a threshold derived from the tree it judges certifies whatever that tree already does.
 * Changing a shipped assertion is normally the tell of green-by-erosion; the one legitimate exception
 * is a superseded contract, and this is it. The replacements below are STRICTLY STRONGER — they pin
 * PROVENANCE (each number matches its cited source outside this tree, and no threshold still carries a
 * number this tree produced), which the retired assertions could not express at all.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT. The reding itself is eslint's behaviour, not ours — it is
 * proven by PLANT on the PR and by the @integration arm, because a third party's rule engine is not
 * something a unit test should re-implement. What IS ours, and what this file pins, is the THRESHOLD
 * TABLE and the DEBT LIST: the numbers, their provenance, the scope split, and the shape of every
 * exception. Those are the values a future edit could silently loosen with nothing else noticing.
 *
 * Both are read from the REAL modules the eslint config consumes, never re-declared here. A copy would
 * agree by coincidence and drift the moment either side is retuned.
 *
 * Parent: @SCN-CPX-001 (3F-2316) — the complexity/module-size fitness function (3F-2286).
 */

import { describe, it, expect } from "vitest";
import {
  PRODUCTION_THRESHOLD,
  RETIRED_TREE_DERIVED_SEEDS,
  STANDARD_SOURCES,
  TEST_THRESHOLD,
  type ComplexityThreshold,
} from "./complexityThresholds.mjs";
import { COMPLEXITY_EXCEPTIONS } from "./complexityExceptions.mjs";

/**
 * The external standard, written out here as the literal numbers the sources state.
 *
 * This is a PIN, not a second implementation: the whole point of 3F-2286 is that these three numbers
 * are fixed by bodies outside this repository, so a test that re-states them is asserting the claim
 * the ticket makes. Contrast the retired `SEEDED_*` constants, which re-stated measurements of this
 * tree — those went stale the moment anyone refactored, which is exactly why they were the wrong pin.
 */
const EXTERNAL_STANDARD = {
  /** NIST 500-235 / McCabe — above 10, refactor. */
  complexity: 10,
  /** Google engineering practices — past ~40 lines, break it up. */
  maxLinesPerFunction: 40,
  /** A chosen ceiling: no industry body publishes a hard file cap, and the config says so. */
  maxLines: 400,
} as const;

const RULES = ["complexity", "maxLines", "maxLinesPerFunction"] as const;

/** eslint rule id → the threshold key that holds its ceiling. */
const RULE_TO_KEY = {
  complexity: "complexity",
  "max-lines": "maxLines",
  "max-lines-per-function": "maxLinesPerFunction",
} as const;

/** The scope an exception's file falls in — the same `**\/*.test.ts` split the eslint config uses. */
const scopeOf = (path: string): ComplexityThreshold =>
  path.endsWith(".test.ts") ? TEST_THRESHOLD : PRODUCTION_THRESHOLD;

describe("[SCN-CPX-001] a function or module over the external standard reds the build", () => {
  it("[SCN-CPX-001] every production threshold is the cited external number, not a measurement of this tree", () => {
    // The provenance pin. Each number is what its source states — NIST/McCabe 10, Google 40 — so a
    // later edit toward "what the code currently does" has to argue with the standard, not with a
    // measurement that goes stale on the next refactor.
    expect(PRODUCTION_THRESHOLD.complexity).toBe(EXTERNAL_STANDARD.complexity);
    expect(PRODUCTION_THRESHOLD.maxLinesPerFunction).toBe(EXTERNAL_STANDARD.maxLinesPerFunction);
    expect(PRODUCTION_THRESHOLD.maxLines).toBe(EXTERNAL_STANDARD.maxLines);
  });

  it("[SCN-CPX-001] the test scope is held to the SAME numbers — a standard does not bend to the population it judges", () => {
    // This is the load-bearing provenance assertion, and it is the INVERSE of the one it replaces.
    // The two populations differ by 2.4x at the file level and 3.5x at the function level, so two
    // MEASURED thresholds could not possibly coincide. That they are identical is the proof neither
    // was measured off this tree.
    expect(TEST_THRESHOLD.complexity).toBe(EXTERNAL_STANDARD.complexity);
    expect(TEST_THRESHOLD.maxLines).toBe(EXTERNAL_STANDARD.maxLines);
    expect(TEST_THRESHOLD.complexity).toBe(PRODUCTION_THRESHOLD.complexity);
    expect(TEST_THRESHOLD.maxLines).toBe(PRODUCTION_THRESHOLD.maxLines);
  });

  it("[SCN-CPX-001] max-lines-per-function is explicitly off for tests — never a number seeded off the test tree", () => {
    // The one asymmetry, and it is an ABSTENTION rather than a looser number. The rule measures
    // production-function tractability; a describe/it callback is a container, not that. No external
    // source states a container length, so none is invented — reinstating the retired 221 would be
    // the self-certification 3F-2286 exists to remove.
    expect(TEST_THRESHOLD.maxLinesPerFunction).toBe("off");
  });

  it("[SCN-CPX-001] no threshold still carries a number this tree produced", () => {
    // Negative provenance. The retired seeds are enumerated by the module itself, so this cannot pass
    // by the test forgetting one — and a future edit that quietly reinstated 1024 or 221 reds here
    // even if it also updated EXTERNAL_STANDARD to match.
    expect(RETIRED_TREE_DERIVED_SEEDS.length).toBeGreaterThan(0);
    for (const threshold of [PRODUCTION_THRESHOLD, TEST_THRESHOLD]) {
      for (const rule of RULES) {
        expect(RETIRED_TREE_DERIVED_SEEDS).not.toContain(threshold[rule]);
      }
    }
  });

  it("[SCN-CPX-001] every rule names where its number came from", () => {
    // A cited number and an uncited one are indistinguishable once shipped, so the citation is part of
    // the contract rather than a comment. maxLines is held to a HIGHER bar than the other two: it has
    // no external source, and the config has to say so rather than imply one.
    for (const rule of RULES) {
      expect(STANDARD_SOURCES[rule].trim().length).toBeGreaterThan(0);
    }
    expect(STANDARD_SOURCES.complexity).toMatch(/McCabe|NIST/);
    expect(STANDARD_SOURCES.maxLinesPerFunction).toMatch(/Google/);
    expect(STANDARD_SOURCES.maxLines).toMatch(/chosen|choice/i);
  });

  it("[SCN-CPX-001] no threshold records a ratchet target — the seed it descended from is retired", () => {
    // `ratchet` recorded the measured p90 as a destination BELOW a measured seed. With no seed there is
    // nothing to descend from; the debt that gap used to imply is enumerated in the exception list.
    for (const threshold of [PRODUCTION_THRESHOLD, TEST_THRESHOLD]) {
      expect(Object.keys(threshold)).not.toContain("ratchet");
    }
  });

  it("[SCN-CPX-001] both scopes declare all three rules — no rule is silently unheld", () => {
    // An absent key is indistinguishable from an oversight. A declared "off" had to be written on
    // purpose, so the two are held apart rather than collapsed into "not a number".
    for (const threshold of [PRODUCTION_THRESHOLD, TEST_THRESHOLD] as ComplexityThreshold[]) {
      for (const rule of RULES) {
        const value = threshold[rule];
        expect(value === "off" || (typeof value === "number" && value > 0)).toBe(true);
      }
    }
  });
});

describe("[SCN-CPX-001] the exception list records today's exceedances as dated debt", () => {
  it("[SCN-CPX-001] the list is not empty — the tree's debt is enumerated, not implied", () => {
    // The vacuity floor. An empty list would make every assertion below pass over nothing, and would
    // also make `lint:complexity` green for the wrong reason — no exceedance recorded rather than none
    // existing. Measured 2026-08-02; it moves with every merge, so this pins non-emptiness, not a count.
    expect(COMPLEXITY_EXCEPTIONS.length).toBeGreaterThan(0);
  });

  it("[SCN-CPX-001] every entry carries a path, a rule, a measured value and the date it was measured", () => {
    for (const entry of COMPLEXITY_EXCEPTIONS) {
      expect(entry.path.length).toBeGreaterThan(0);
      expect(Object.keys(RULE_TO_KEY)).toContain(entry.rule);
      expect(Number.isInteger(entry.value)).toBe(true);
      expect(entry.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("[SCN-CPX-001] every recorded value actually exceeds the standard — an exception that exempts nothing is noise", () => {
    // A list entry whose value sits UNDER the standard would suspend a rule over a file that never
    // breached it: headroom bought with no debt to show for it, and invisible because the tree stays
    // green either way. Held here so it cannot be added.
    for (const entry of COMPLEXITY_EXCEPTIONS) {
      const ceiling = scopeOf(entry.path)[RULE_TO_KEY[entry.rule]];
      expect(typeof ceiling).toBe("number");
      expect(entry.value).toBeGreaterThan(ceiling as number);
    }
  });

  it("[SCN-CPX-001] no file exempts the same rule twice — one entry is one file's worst offender", () => {
    // Two entries for one path+rule would leave which value is enforced ambiguous, and @SCN-CPX-002
    // freezes a file at exactly ONE number. Uniqueness is what makes that number well-defined.
    const keys = COMPLEXITY_EXCEPTIONS.map((entry) => `${entry.path} ${entry.rule}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("[SCN-CPX-001] no entry exempts a rule its scope does not hold at all", () => {
    // max-lines-per-function is off for test files, so a test-scope entry for it would record debt
    // against a rule that never fires — a debt list padded with entries nobody can ever pay down.
    const deadEntries = COMPLEXITY_EXCEPTIONS.filter(
      (entry) => scopeOf(entry.path)[RULE_TO_KEY[entry.rule]] === "off",
    );
    expect(deadEntries).toEqual([]);
  });
});
