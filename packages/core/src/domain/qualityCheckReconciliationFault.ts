/**
 * THE ERROR A REFUSED MINTING THROWS (@SCN-MSG-001, 3F-2872) — a code and its parameters, with the
 * prose derived rather than embedded.
 *
 * `message` is still rendered, by indexing the catalogue, so a stack trace reads as it always did;
 * what a CALLER reads is `code` and `fault`, and that is the whole contract. No test reads the
 * message, and none may: the prose is the one thing here allowed to be rewritten without a ticket.
 *
 * WHY THIS IS ITS OWN MODULE, AND NOT BESIDE THE ENUM. The catalogue must import the enum to key
 * itself, and this class must import the catalogue to render. Housing the class with the enum
 * therefore closes a RUNTIME import cycle: entering at `qualityCheckFault.ts` would evaluate the
 * catalogue while the enum was still uninitialised, and every computed key would read `undefined`.
 * Splitting the vocabulary (the enum + union), the data (the catalogue) and the behaviour (this
 * class) into three modules makes the dependency a straight line — and leaves the catalogue alone
 * in its file, which is what lets @SCN-MSG-002's exclusion name a pure-data target and nothing else.
 */

import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
import { QUALITY_CHECK_FAULT_MESSAGES } from "./qualityCheckFaultMessages.js";

export class QualityCheckReconciliationFault extends Error {
  constructor(readonly fault: QualityCheckFault) {
    // The cast is the standard correlated-union workaround: TypeScript cannot see that
    // `MESSAGES[fault.code]` accepts this `fault`, though the mapped type guarantees it key by key.
    super((QUALITY_CHECK_FAULT_MESSAGES[fault.code] as (f: QualityCheckFault) => string)(fault));
    // The identifier, never a re-typed string: a literal here would put the class's own name back
    // on the mutated surface — the exact move this feature exists to undo.
    this.name = QualityCheckReconciliationFault.name;
  }

  /** Which divergence this is — the discriminant, lifted for a caller that does not want the payload. */
  get code(): QualityCheckFaultCode {
    return this.fault.code;
  }
}
