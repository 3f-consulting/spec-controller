import type { Outcome, SidePresence } from "./outcome.js";

export enum QualityCheckFaultCode {
  EvidenceDivergesFromOutcome,
}

interface EvidenceDivergesFromOutcomeFault {
  readonly code: QualityCheckFaultCode.EvidenceDivergesFromOutcome;
  readonly evidence: "evidence-obligation" | "evidence-observation";
  readonly outcome: Outcome;
  readonly presenceForOutcome: SidePresence;
  readonly presenceFound: SidePresence;
}

export type QualityCheckFault = EvidenceDivergesFromOutcomeFault;
