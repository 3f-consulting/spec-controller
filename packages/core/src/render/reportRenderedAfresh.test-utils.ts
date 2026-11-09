import type { RenderInput, ExitCodeOf } from "../domain/renderInput.js";
import type { RunInputName } from "../domain/runProvenance.js";
import { concludedSummary } from "../assemble/renderInput.js";
import { renderReport } from "./markdown.js";

// A report built by hand carries whatever verdict it was assembled with; the
// verdict is worked out again from the report's own facts before it renders.
export function renderReportAfresh(report: RenderInput, inputNames: readonly RunInputName[], exitCodeOf: ExitCodeOf): string {
  const written: RenderInput = JSON.parse(JSON.stringify(report));
  const strict = written.runProvenance.strict === true;
  const summary = concludedSummary(written.summary, {
    ledger: { claimReconciliations: written.claimReconciliations },
    claimCodeErrors: written.errorsInTheInputs?.claimCodeErrors,
    strict,
  });
  return renderReport({ ...written, runProvenance: { ...written.runProvenance, strict }, summary }, inputNames, exitCodeOf);
}
