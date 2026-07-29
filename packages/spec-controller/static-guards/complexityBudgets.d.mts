/**
 * Types for `complexityBudgets.mjs` (@SCN-CPX-001). The runtime module is plain ESM so eslint's own
 * loader can read it with no `jiti`; these declarations keep every TypeScript consumer — the @unit
 * pin and the Cucumber steps — fully typed against the same one source.
 */

/** The three rule budgets a scope declares, plus the p90 targets it ratchets toward. */
export interface ComplexityBudget {
  /** eslint `complexity` — the per-function cyclomatic ceiling. */
  complexity: number;
  /** eslint `max-lines` — the per-file ceiling. */
  maxLines: number;
  /** eslint `max-lines-per-function` — the per-function line ceiling. */
  maxLinesPerFunction: number;
  /**
   * The measured p90 for each rule — where this budget is heading, asserted to sit strictly BELOW the
   * seed so a ratchet cannot quietly point the wrong way.
   */
  ratchet: {
    complexity: number;
    maxLines: number;
    maxLinesPerFunction: number;
  };
}

/** Production code: `packages/<pkg>/src`, `packages/<pkg>/static-guards`; excludes test files. */
export declare const PRODUCTION_BUDGET: ComplexityBudget;

/** Test code: the `.test.ts` files — a separate budget; the populations differ in both directions. */
export declare const TEST_BUDGET: ComplexityBudget;
