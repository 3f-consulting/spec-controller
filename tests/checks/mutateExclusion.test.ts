/**
 * Unit arm for @SCN-MSG-002 — the catalogue is total over the fault codes with no empty entry, and
 * the stryker exclusion covers exactly it. `@unit`-only; the describe string carries the id, so a
 * grep of @SCN-MSG-002 returns both halves of the pair (Evidence Manifesto §9).
 *
 * TWO ARMS: ONE PLANTED FAULT, ONE REAL ARTEFACT (3F-3218). The real-artefact arm is the only place
 * either `stryker.config.json` or the catalogue is compared to anything, which is why both stay
 * (Ruling B). No mutant is raised over the catalogue — that is what the exclusion does — and
 * @SCN-MSG-001's arm reads no message at all by its own ruling, so the totality-and-parameters half
 * belongs beside the exclusion that makes it necessary rather than in a file of its own.
 *
 * THE PLANTED ARM OWNS ITS FIXTURE PATTERNS, DELIBERATELY (3F-3189). Nothing invented here copies a
 * `SANCTIONED_MUTATE_GLOB` entry, so granting a fourth sanctioned exclusion cannot red an arm about
 * DETECTION. The `missing-*` half is derived from the sanction list instead — one-sided, because
 * those two kinds report the list's own entries absent. A change to the list's CONTENTS is caught by
 * the other arm, where the real config would then disagree with it.
 *
 * NOTHING HERE READS A MESSAGE'S WORDING. That test is the wording-pin this whole feature exists to
 * make unnecessary. The non-blank probe INVOKES rather than inspects: the catalogue is a mapped type
 * over RENDERER FUNCTIONS, so every entry is truthy and only a call can judge one.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  QualityCheckFaultCode,
  type QualityCheckFault,
} from "../../packages/core/src/domain/qualityCheckFault.js";
import { QUALITY_CHECK_FAULT_MESSAGES } from "../../packages/core/src/domain/qualityCheckFaultMessages.js";
import { checkMutateSurface, mutateGlobOf, SANCTIONED_MUTATE_GLOB } from "./mutateExclusion.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The real config this guard is about — read from disk, never a copy of it written here. */
const STRYKER_CONFIG = "stryker.config.json";

/** The sanctioned patterns for one role, filtered here rather than borrowed from the check. */
function sanctionedFor(role: "include" | "exclude"): string[] {
  return [...SANCTIONED_MUTATE_GLOB].filter(([, p]) => p.role === role).map(([pattern]) => pattern);
}

/** Invented surfaces, named nowhere in the sanction list and nowhere in this repository. */
const PLANTED_INCLUDES = ["fixture/widget/**/*.ts", "fixture/gadget/**/*.ts"];
const PLANTED_EXCLUDES = ["fixture/tables/**/*.json", "fixture/generated/schema.ts"];

/**
 * A whole config TEXT, interleaved, driven through `mutateGlobOf` the way the real one is — so a
 * `partition` that lost the `!`, kept it, or reordered either side moves rows in the verdict below.
 */
const PLANTED_CONFIG = JSON.stringify({
  testRunner: "vitest",
  mutate: [
    PLANTED_INCLUDES[0],
    `!${PLANTED_EXCLUDES[0]}`,
    PLANTED_INCLUDES[1],
    `!${PLANTED_EXCLUDES[1]}`,
  ],
});

/**
 * One sample fault per code, keyed the same way the catalogue is, so a future fault arrives with its
 * message probed rather than silently unprobed. `required` and `actual` differ within each sample
 * and the two samples name different outcomes — a renderer that interpolated one side twice, or
 * hard-coded a word, fails rather than agreeing with itself.
 */
const SAMPLE_FAULTS: {
  readonly [C in QualityCheckFaultCode]: Extract<QualityCheckFault, { code: C }>;
} = {
  [QualityCheckFaultCode.ObligationSideDivergesFromCanon]: {
    code: QualityCheckFaultCode.ObligationSideDivergesFromCanon,
    outcome: "watermelon",
    required: "Exists",
    actual: "None",
  },
  [QualityCheckFaultCode.ObservationSideDivergesFromCanon]: {
    code: QualityCheckFaultCode.ObservationSideDivergesFromCanon,
    outcome: "cites-unknown-scenario",
    required: "None",
    actual: "Exists",
  },
};

/**
 * Render a fault's message the way the Error class does. The cast is the correlated-union
 * workaround `qualityCheckReconciliationFault.ts` uses for the same reason: TypeScript cannot see
 * that `MESSAGES[fault.code]` accepts this `fault`, though the mapped type guarantees it key by key.
 */
function renderedMessage(fault: QualityCheckFault): string {
  return (QUALITY_CHECK_FAULT_MESSAGES[fault.code] as (f: QualityCheckFault) => string)(fault);
}

/** Every code the enum names — the numeric members, not the reverse-mapped identifiers. */
const FAULT_CODES = Object.values(QualityCheckFaultCode).filter(
  (member) => typeof member === "number",
);

const SAMPLES: readonly QualityCheckFault[] = Object.values(SAMPLE_FAULTS);

describe("[SCN-MSG-002] the catalogue is total over the fault codes with no empty entry, and the stryker exclusion covers exactly it", () => {
  it("reports every planted violation kind, in order, over patterns the sanction list does not name", () => {
    const sanctionedExcludes = sanctionedFor("exclude");
    const sanctionedIncludes = sanctionedFor("include");
    // The derivation's anti-vacuity floor. Both `missing-*` kinds are planted by OMITTING a
    // sanctioned entry, so a sanction list emptied of either role would quietly stop planting that
    // kind and the assertion below would still agree with itself.
    expect(sanctionedExcludes.length).toBeGreaterThan(0);
    expect(sanctionedIncludes.length).toBeGreaterThan(0);

    // One assertion over the WHOLE verdict. Four separate arms each asking "was this kind
    // reported?" leave order and completeness unasserted — a checker reporting a fifth row, or the
    // same rows in another order, or the right patterns under the wrong kind, satisfies all four.
    expect(checkMutateSurface(mutateGlobOf(PLANTED_CONFIG))).toEqual([
      { kind: "unexpected-exclusion", pattern: PLANTED_EXCLUDES[0] },
      { kind: "unexpected-exclusion", pattern: PLANTED_EXCLUDES[1] },
      ...sanctionedExcludes.map((pattern) => ({ kind: "missing-exclusion", pattern })),
      { kind: "unexpected-inclusion", pattern: PLANTED_INCLUDES[0] },
      { kind: "unexpected-inclusion", pattern: PLANTED_INCLUDES[1] },
      ...sanctionedIncludes.map((pattern) => ({ kind: "missing-inclusion", pattern })),
    ]);
  });

  it("holds the REAL stryker config to the sanction list, and the REAL catalogue to every fault code", () => {
    // The dogfood green, read back off disk. This is the assertion that stops the exclusion being
    // a hole: a later edit widening it to a directory reds HERE, not on a reviewer noticing that a
    // mutation score improved for a reason nobody stated. The floor is the parser's live substitute
    // — a `mutate` key read as `[]` rather than refused arrives here as a glob of length zero.
    const glob = mutateGlobOf(readFileSync(path.join(repoRoot, STRYKER_CONFIG), "utf8"));
    expect(glob.length).toBeGreaterThan(0);
    expect(checkMutateSurface(glob)).toEqual([]);

    // The other half of the same real artefact, and the reason the exclusion above is affordable.
    // The mapped type forces this at compile time; the runtime pin catches what the type cannot
    // see — a spread or a computed key putting an entry in the table that no code claims, and an
    // enum member the type-checker was never asked about. No mutant is raised over the catalogue,
    // so these three lines are the whole of what holds it.
    expect(FAULT_CODES.length).toBeGreaterThan(0);
    expect(Object.keys(QUALITY_CHECK_FAULT_MESSAGES)).toHaveLength(FAULT_CODES.length);
    expect(SAMPLES).toHaveLength(FAULT_CODES.length);

    // Invoked, not inspected. A reader meeting one of these messages must be able to recover WHICH
    // outcome was consulted, what its canon row required, and what the fields carried — the whole
    // disagreement, without opening the code. Wording is free to change; these are not.
    for (const fault of SAMPLES) {
      const message = renderedMessage(fault);
      expect(message.trim()).not.toBe("");
      expect(message).toContain(fault.outcome);
      expect(message).toContain(fault.required);
      expect(message).toContain(fault.actual);
    }
  });
});
