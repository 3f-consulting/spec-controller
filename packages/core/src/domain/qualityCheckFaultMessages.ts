import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";

export type QualityCheckFaultMessages = {
  readonly [C in QualityCheckFaultCode]: (fault: Extract<QualityCheckFault, { code: C }>) => string;
};

export const QUALITY_CHECK_FAULT_MESSAGES: QualityCheckFaultMessages = {
  [QualityCheckFaultCode.ObligationSideDivergesFromCanon]: (fault) =>
    `QualityCheckReconciliation invariant (@SCN-LDG-030): outcome "${fault.outcome}" requires the ` +
    `evidence obligation (debit) side to be ${fault.required}, but it was ` +
    `${fault.actual}.`,
  [QualityCheckFaultCode.ObservationSideDivergesFromCanon]: (fault) =>
    `QualityCheckReconciliation invariant (@SCN-LDG-030): outcome "${fault.outcome}" requires the ` +
    `evidence observation (credit) side to be ${fault.required}, but it was ` +
    `${fault.actual}.`,
};
