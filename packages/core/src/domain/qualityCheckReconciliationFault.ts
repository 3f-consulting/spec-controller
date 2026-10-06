import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
import { QUALITY_CHECK_FAULT_MESSAGES } from "./messages.js";

export class QualityCheckReconciliationFault extends Error {
  constructor(readonly fault: QualityCheckFault) {
    super((QUALITY_CHECK_FAULT_MESSAGES[fault.code] as (f: QualityCheckFault) => string)(fault));
    this.name = QualityCheckReconciliationFault.name;
  }

  get code(): QualityCheckFaultCode {
    return this.fault.code;
  }
}
