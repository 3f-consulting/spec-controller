import type { Outcome, SidePresence } from "./outcome.js";

export enum QualityCheckFaultCode {
  ObligationSideDivergesFromCanon,
  ObservationSideDivergesFromCanon,
}

interface SideDivergence {
  readonly outcome: Outcome;
  readonly canonical: SidePresence;
  readonly actual: SidePresence;
}

interface ObligationSideDivergesFromCanonFault extends SideDivergence {
  readonly code: QualityCheckFaultCode.ObligationSideDivergesFromCanon;
}

interface ObservationSideDivergesFromCanonFault extends SideDivergence {
  readonly code: QualityCheckFaultCode.ObservationSideDivergesFromCanon;
}

export type QualityCheckFault =
  | ObligationSideDivergesFromCanonFault
  | ObservationSideDivergesFromCanonFault;
