import type { ExitCodeOf } from "../domain/renderInput.js";
import type { RunVerdict } from "../domain/runVerdict.js";

// The codes docs/user-guide.md publishes, so core's tests read the verdict line without importing the app's map.
const PUBLISHED: Readonly<Record<RunVerdict, number>> = {
  balanced: 0,
  "out-of-balance": 1,
  "scenario-code-errors": 1,
  pending: 3,
  unsound: 4,
  "nothing-to-reconcile": 5,
};

export const publishedExitCodeOf: ExitCodeOf = (verdict) => PUBLISHED[verdict];
