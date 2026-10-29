import type { RenderInput } from "../domain/renderInput.js";
import { concludedSummary, type UnconcludedSummary } from "./renderInput.js";

export type SavedReport = Omit<RenderInput, "summary"> & { readonly summary: UnconcludedSummary };

// Worked out afresh, not read: an older save has neither, and --strict at re-render can make it pending.
export function assembleSavedReport(saved: SavedReport, strictGiven: boolean): RenderInput {
  const strict = saved.runProvenance.strict === true || strictGiven;
  return {
    ...saved,
    runProvenance: { ...saved.runProvenance, strict },
    summary: concludedSummary(saved.summary, { ledger: saved.ledger, scenarioCodeErrors: saved.errors?.scenarioCodes, strict }),
  };
}
