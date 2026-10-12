import { describe, it, expect } from "vitest";
import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
import { QUALITY_CHECK_FAULT_MESSAGES } from "./messages.js";
import {
  makeQualityCheckReconciliation,
  OUTCOME_SIDE_PROFILE,
} from "./qualityCheckReconciliation.js";
import type { Outcome } from "./qualityCheckReconciliation.js";
import type { EvidenceObligation, EvidenceObservation } from "./journal.js";

interface Refusal {
  refused: boolean;
  code: QualityCheckFaultCode | undefined;
  fault: QualityCheckFault | undefined;
  message: string | undefined;
}

function attemptMint(mint: () => unknown): Refusal {
  try {
    mint();
    return { refused: false, code: undefined, fault: undefined, message: undefined };
  } catch (thrown) {
    const refusal = thrown as { code?: QualityCheckFaultCode; fault?: QualityCheckFault; message?: string };
    return { refused: true, code: refusal.code, fault: refusal.fault, message: refusal.message };
  }
}

function catalogueMessage(fault: QualityCheckFault): string {
  return (QUALITY_CHECK_FAULT_MESSAGES[fault.code] as (f: QualityCheckFault) => string)(fault);
}

function expectCodedFaultWithCatalogueMessage(refusal: Refusal): void {
  expect(refusal.refused).toBe(true);
  const fault = refusal.fault as QualityCheckFault;

  expect(Object.values(QualityCheckFaultCode)).toContain(refusal.code);
  expect(refusal.code).toBe(fault.code);

  const rendered = catalogueMessage(fault);
  expect(Object.keys(fault)).not.toContain("message");
  const strings = Object.values(fault).filter((value): value is string => typeof value === "string");
  for (const value of strings) {
    expect(value).not.toBe(rendered);
    expect(value).not.toContain("invariant");
  }

  expect(refusal.message).toBe(rendered);
}

describe("[SCN-MSG-001] an Evidence Obligation or Evidence Observation that diverges from its outcome is refused with a coded fault that carries its parameters, and its message is the catalogue's entry for that code", () => {
  const sampleObligation: EvidenceObligation = { qualityCheck: "unit" };
  const sampleObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-MSG-001",
    status: "passed",
  };

  for (const [outcomeKey, profile] of Object.entries(OUTCOME_SIDE_PROFILE)) {
    const outcome = outcomeKey as Outcome;
    const obligationExists = profile.obligation === "Exists";
    const observationExists = profile.observation === "Exists";

    it(`${outcome}: an Evidence Obligation that diverges from the outcome is refused with a coded fault carrying its parameters, whose message is the catalogue's entry for the code`, () => {
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? {} : { evidenceObligation: sampleObligation }),
          ...(observationExists ? { evidenceObservation: sampleObservation } : {}),
        }),
      );

      expectCodedFaultWithCatalogueMessage(refusal);
    });

    it(`${outcome}: an Evidence Observation that diverges from the outcome is refused with a coded fault carrying its parameters, whose message is the catalogue's entry for the code`, () => {
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? { evidenceObligation: sampleObligation } : {}),
          ...(observationExists ? {} : { evidenceObservation: sampleObservation }),
        }),
      );

      expectCodedFaultWithCatalogueMessage(refusal);
    });
  }
});
