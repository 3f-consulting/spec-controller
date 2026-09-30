import { describe, it, expect } from "vitest";

import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
import { QUALITY_CHECK_FAULT_MESSAGES } from "./qualityCheckFaultMessages.js";

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

function renderedMessage(fault: QualityCheckFault): string {
  return (QUALITY_CHECK_FAULT_MESSAGES[fault.code] as (f: QualityCheckFault) => string)(fault);
}

const FAULT_CODES = Object.values(QualityCheckFaultCode).filter(
  (member) => typeof member === "number",
);

const SAMPLES: readonly QualityCheckFault[] = Object.values(SAMPLE_FAULTS);

describe("[SCN-MSG-002] the catalogue is total over the fault codes with no empty entry", () => {
  it("holds the REAL catalogue to every fault code, and every rendered message to its own fault's parameters", () => {
    expect(FAULT_CODES.length).toBeGreaterThan(0);
    expect(Object.keys(QUALITY_CHECK_FAULT_MESSAGES)).toHaveLength(FAULT_CODES.length);
    expect(SAMPLES).toHaveLength(FAULT_CODES.length);

    for (const fault of SAMPLES) {
      const message = renderedMessage(fault);
      expect(message.trim()).not.toBe("");
      expect(message).toContain(fault.outcome);
      expect(message).toContain(fault.required);
      expect(message).toContain(fault.actual);
    }
  });
});
