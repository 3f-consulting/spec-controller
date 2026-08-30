/**
 * Unit arm for @SCN-MSG-002 — the catalogue is total over the fault codes with no empty entry, and
 * the stryker exclusion covers exactly it.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the @SCN-MSG-002 id
 * matching features/message-catalogue.feature, so a grep of the id returns both halves of the pair.
 * `@unit`-only — Cucumber skips it; this Vitest arm IS the observed evidence, as @SCN-MSG-001's is.
 *
 * ONE ARM, TWO HALVES, AND THEY BELONG TOGETHER. The exclusion takes coverage AWAY from the
 * catalogue; the totality half puts back the only property that coverage was ever going to give.
 * Split across two files they could drift apart — one deleted, the other left reading as though the
 * pair still held. The scenario is the pair, so the arm is the pair.
 *
 * NOTHING HERE READS A MESSAGE'S WORDING, AND THAT IS THE POINT. The catalogue half asserts that a
 * message is not blank and that it carries its own fault's PARAMETERS. It never asserts a sentence,
 * a fragment of one, or a regex over one: that test is the wording-pin this whole feature exists to
 * make unnecessary, and it would turn every copy-edit red. Parameters are a different thing from
 * prose — they are what the diagnostic actually promises, and the one thing the excluded file could
 * get wrong that matters.
 *
 * THE NON-BLANK PROBE INVOKES, IT DOES NOT INSPECT. The catalogue is a mapped type over RENDERER
 * FUNCTIONS, not a `Record<Code, string>`, because the messages interpolate. So "no empty entry"
 * cannot be a string check over the table — every entry is a function and every function is
 * truthy. Each renderer is CALLED with a sample fault and the result is what is judged.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  QualityCheckFaultCode,
  type QualityCheckFault,
} from "../../core/src/domain/qualityCheckFault.js";
import { QUALITY_CHECK_FAULT_MESSAGES } from "../../core/src/domain/qualityCheckFaultMessages.js";
import { checkMutateSurface, mutateGlobOf } from "./mutateExclusion.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** The real config this guard is about — read from disk, never a copy of it written here. */
const STRYKER_CONFIG = "stryker.config.json";

/**
 * One sample fault per code, keyed the same way the catalogue is.
 *
 * The mapped type is what makes this total: a code cannot join the union without a sample here, so
 * a future fault arrives with its message probed rather than silently unprobed. `Extract` narrows
 * per key, so a sample cannot be filed under the wrong code either.
 *
 * The values are chosen to make the parameter assertion MEAN something: `required` and `actual`
 * differ within each sample, and the two samples name different outcomes. A renderer that
 * interpolated `required` twice and dropped `actual` — or hard-coded one side's word — fails.
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
 * Render a fault's message the way the Error class does.
 *
 * The cast is the standard correlated-union workaround, identical to the one in
 * `qualityCheckReconciliationFault.ts`: TypeScript cannot see that `MESSAGES[fault.code]` accepts
 * this `fault`, though the mapped type guarantees it key by key.
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
  it("holds exactly one entry per fault code the enum names, and one sample per entry", () => {
    // The mapped type already forces this at compile time; the runtime pin catches what the type
    // cannot see — a spread or a computed key putting an entry in the table that no code claims,
    // and an enum member the type-checker was never asked about. Without it, "every entry renders"
    // could be true of an EMPTY table, the empty-vs-empty green that reads as a pass.
    expect(FAULT_CODES.length).toBeGreaterThan(0);
    expect(Object.keys(QUALITY_CHECK_FAULT_MESSAGES)).toHaveLength(FAULT_CODES.length);
    expect(SAMPLES).toHaveLength(FAULT_CODES.length);
  });

  it("renders a message that is not blank for every fault code", () => {
    // Invoked, not inspected: every entry is a function, so a string check over the table would
    // pass over an entry that renders nothing at all.
    for (const fault of SAMPLES) {
      expect(renderedMessage(fault).trim()).not.toBe("");
    }
  });

  it("carries every parameter its own fault supplied into the message", () => {
    // The property the diagnostic promises. A reader meeting this message must be able to recover
    // WHICH outcome was consulted, what its canon row required, and what the fields carried — the
    // whole disagreement, without opening the code. Wording is free to change; these are not.
    for (const fault of SAMPLES) {
      const message = renderedMessage(fault);
      expect(message).toContain(fault.outcome);
      expect(message).toContain(fault.required);
      expect(message).toContain(fault.actual);
    }
  });

  it("names the catalogue and nothing wider in the REAL stryker config", () => {
    // The dogfood green, read back off disk. This is the assertion that stops the exclusion being
    // a hole: a later edit widening it to a directory reds HERE, not on a reviewer noticing that a
    // mutation score improved for a reason nobody stated.
    const glob = mutateGlobOf(readFileSync(path.join(repoRoot, STRYKER_CONFIG), "utf8"));
    expect(glob.length).toBeGreaterThan(0);
    expect(checkMutateSurface(glob)).toEqual([]);
  });

  it("flags an exclusion widened past the single catalogue file", () => {
    // Teeth (unexpected-exclusion arm): the two edits that would actually happen — a directory
    // glob over the whole domain, and a suffix glob that quietly covers every future *Messages.ts.
    const widened = [
      "packages/core/src/domain/**/*.ts",
      "!packages/core/src/domain/**/*.test.ts",
      "!packages/core/src/domain/**/*Messages.ts",
      "!packages/core/src/domain/**",
    ];
    expect(checkMutateSurface(widened)).toEqual([
      { kind: "unexpected-exclusion", pattern: "packages/core/src/domain/**/*Messages.ts" },
      { kind: "unexpected-exclusion", pattern: "packages/core/src/domain/**" },
      { kind: "missing-exclusion", pattern: "packages/core/src/domain/qualityCheckFaultMessages.ts" },
    ]);
  });

  it("flags the catalogue's exclusion going missing, and the mutated surface being narrowed", () => {
    // Teeth (the other two arms). A DELETED exclusion is as silent as a widened one — the prose
    // returns to the mutated surface and the score falls for a reason that reads as unrelated. A
    // narrowed INCLUDE is the same hole entered from the other side: exclude nothing, mutate less.
    const narrowed = ["packages/core/src/domain/qualityCheck*.ts", "!packages/core/src/domain/**/*.test.ts"];
    expect(checkMutateSurface(narrowed)).toEqual([
      { kind: "missing-exclusion", pattern: "packages/core/src/domain/qualityCheckFaultMessages.ts" },
      { kind: "unexpected-inclusion", pattern: "packages/core/src/domain/qualityCheck*.ts" },
      { kind: "missing-inclusion", pattern: "packages/core/src/domain/**/*.ts" },
    ]);
  });

  it("refuses a config whose mutate glob is absent or is not a list of patterns", () => {
    // The empty-vs-empty guard. A parser that read a missing key as `[]` would report a config
    // with no exclusions at all as one whose exclusions all match — a check that never ran,
    // indistinguishable from a check that passed.
    expect(() => mutateGlobOf(`{"testRunner":"vitest"}`)).toThrow(/mutate/);
    expect(() => mutateGlobOf(`{"mutate":"packages/core/src/domain/**/*.ts"}`)).toThrow(/mutate/);
    expect(() => mutateGlobOf(`{"mutate":[1,2]}`)).toThrow(/mutate/);
  });
});
