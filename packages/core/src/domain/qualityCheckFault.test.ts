import { describe, it, expect } from "vitest";
import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
import { QUALITY_CHECK_FAULT_MESSAGES } from "../render/messages.js";
import {
  makeQualityCheckReconciliation,
  OUTCOME_SIDE_PROFILE,
} from "./qualityCheckReconciliation.js";
import type { Outcome, ReconciledEvidenceObservation } from "./qualityCheckReconciliation.js";
import type { EvidenceObligation } from "./journal.js";

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

function expectCodedFaultWordedByTheCatalogue(refusal: Refusal): void {
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

  expect(refusal.message).toBe(QualityCheckFaultCode[fault.code]);
  expect(refusal.message).not.toBe(rendered);

  const fieldsAlone = JSON.parse(JSON.stringify(fault)) as QualityCheckFault;
  expect(catalogueMessage(fieldsAlone)).toBe(rendered);
  expect(rendered.trim()).not.toBe("");
  for (const parameter of [fault.outcome, fault.presenceForOutcome, fault.presenceFound]) {
    expect(rendered).toContain(parameter);
  }
}

describe("[SCN-MSG-001] an Evidence Obligation or Evidence Observation that diverges from its outcome is refused with a coded fault that carries its parameters, and the report catalogue words that fault from its parameters alone", () => {
  const sampleObligation: EvidenceObligation = { qualityCheckKind: "unit" };
  const sampleObservation: ReconciledEvidenceObservation = {
    qualityCheckKind: "unit",
    scnId: "SCN-MSG-001",
    status: "passed",
    outcome: "satisfied",
  };

  for (const [outcomeKey, profile] of Object.entries(OUTCOME_SIDE_PROFILE)) {
    const outcome = outcomeKey as Outcome;
    const obligationExists = profile.obligation === "Exists";
    const observationExists = profile.observation === "Exists";

    it(`${outcome}: an Evidence Obligation that diverges from the outcome is refused with a coded fault carrying its parameters, which the catalogue words from its parameters alone`, () => {
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? {} : { evidenceObligation: sampleObligation }),
          ...(observationExists ? { evidenceObservations: [sampleObservation] } : {}),
        }),
      );

      expectCodedFaultWordedByTheCatalogue(refusal);
    });

    it(`${outcome}: an Evidence Observation that diverges from the outcome is refused with a coded fault carrying its parameters, which the catalogue words from its parameters alone`, () => {
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? { evidenceObligation: sampleObligation } : {}),
          ...(observationExists ? {} : { evidenceObservations: [sampleObservation] }),
        }),
      );

      expectCodedFaultWordedByTheCatalogue(refusal);
    });
  }
});
