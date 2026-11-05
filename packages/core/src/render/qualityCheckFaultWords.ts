import type { QualityCheckFault } from "../domain/qualityCheckFault.js";
import { coreMessage } from "./coreText.js";
import { CoreMessage } from "./messages.js";

const FAULT_MESSAGE_BY_EVIDENCE: Readonly<
  Record<
    QualityCheckFault["evidence"],
    CoreMessage.EvidenceObligationDivergesFromOutcome | CoreMessage.EvidenceObservationDivergesFromOutcome
  >
> = {
  "evidence-obligation": CoreMessage.EvidenceObligationDivergesFromOutcome,
  "evidence-observation": CoreMessage.EvidenceObservationDivergesFromOutcome,
};

export function qualityCheckFaultWords(fault: QualityCheckFault): string {
  const { outcome, presenceForOutcome, presenceFound } = fault;
  return coreMessage(FAULT_MESSAGE_BY_EVIDENCE[fault.evidence], { outcome, presenceForOutcome, presenceFound });
}
