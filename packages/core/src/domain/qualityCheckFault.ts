import type { Outcome, SidePresence } from "./outcome.js";

export enum QualityCheckFaultCode {
  ObligationSideDivergesFromCanon,
  ObservationSideDivergesFromCanon,
}

interface SideDivergence {
  readonly outcome: Outcome;
  readonly required: SidePresence;
  readonly actual: SidePresence;
}

export interface ObligationSideDivergesFromCanonFault extends SideDivergence {
  readonly code: QualityCheckFaultCode.ObligationSideDivergesFromCanon;
}

export interface ObservationSideDivergesFromCanonFault extends SideDivergence {
  readonly code: QualityCheckFaultCode.ObservationSideDivergesFromCanon;
}

export type QualityCheckFault =
  | ObligationSideDivergesFromCanonFault
  | ObservationSideDivergesFromCanonFault;
