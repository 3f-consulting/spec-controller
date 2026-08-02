/**
 * Types for `complexityThresholds.mjs` (@SCN-CPX-001). The runtime module is plain ESM so eslint's own
 * loader can read it with no `jiti`; these declarations keep every TypeScript consumer — the @unit
 * pin and the Cucumber steps — fully typed against the same one source.
 */

/** The three rule thresholds a scope declares, plus the p90 targets it ratchets toward. */
export interface ComplexityThreshold {
  /** eslint `complexity` — the per-function cyclomatic ceiling. */
  complexity: number;
  /** eslint `max-lines` — the per-file ceiling. */
  maxLines: number;
  /** eslint `max-lines-per-function` — the per-function line ceiling. */
  maxLinesPerFunction: number;
  /**
   * The measured p90 for each rule — where this threshold is heading, asserted to sit strictly BELOW the
   * seed so a ratchet cannot quietly point the wrong way.
   */
  ratchet: {
    complexity: number;
    maxLines: number;
    maxLinesPerFunction: number;
  };
}

/** Production code: `packages/<pkg>/src`, `packages/<pkg>/static-guards`; excludes test files. */
export declare const PRODUCTION_THRESHOLD: ComplexityThreshold;

/** Test code: the `.test.ts` files — a separate threshold; the populations differ in both directions. */
export declare const TEST_THRESHOLD: ComplexityThreshold;
