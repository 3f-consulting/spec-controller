import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";

export class QualityCheckReconciliationFault extends Error {
  constructor(readonly fault: QualityCheckFault) {
    super(QualityCheckFaultCode[fault.code]);
    this.name = QualityCheckReconciliationFault.name;
  }

  get code(): QualityCheckFaultCode {
    return this.fault.code;
  }
}
