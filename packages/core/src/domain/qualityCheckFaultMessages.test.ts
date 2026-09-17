/**
 * Unit arm for @SCN-MSG-002 — the catalogue is total over the fault codes with no empty entry.
 * `@unit`-only; the describe string carries the id, so a grep of @SCN-MSG-002 returns both halves
 * of the pair (Evidence Manifesto §9).
 *
 * BESIDE THE CATALOGUE IT IS ABOUT, SINCE 3F-3490. This arm was born under `tests/checks/` sharing
 * ONE `it` with a check over this repository's own Stryker `mutate` glob — the two were filed
 * together at 3F-2873, because the exclusion is what makes the totality-and-parameters half
 * necessary in the first place. That check has gone: its subject was our configuration and not the
 * product, and a scenario about it, in the corpus a consumer copies, teaches a local convention
 * rather than a behaviour. What survived is an ordinary unit test about a domain table, so it now
 * sits beside the table — which is also where a consumer would have put it.
 *
 * NOTHING HERE READS A CONFIG FILE. No `node:fs`, no `import` of `stryker.config.mjs`, nothing that
 * knows where the repository root is. A surviving config read in a domain test would be the same
 * scenario in a new house, and the exclusion's residual is now stated in the feature's own preamble
 * rather than asserted here.
 *
 * NOTHING HERE READS A MESSAGE'S WORDING. That test is the wording-pin this whole feature exists to
 * make unnecessary. The non-blank probe INVOKES rather than inspects: the catalogue is a mapped type
 * over RENDERER FUNCTIONS, so every entry is truthy and only a call can judge one.
 */

import { describe, it, expect } from "vitest";

import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
import { QUALITY_CHECK_FAULT_MESSAGES } from "./qualityCheckFaultMessages.js";

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

describe("[SCN-MSG-002] the catalogue is total over the fault codes with no empty entry", () => {
  it("holds the REAL catalogue to every fault code, and every rendered message to its own fault's parameters", () => {
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
