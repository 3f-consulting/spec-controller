import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the spec-controller workspace.
 *
 * spec-controller is a pure-transform reconciler (an obligation-vs-observation file join)
 * — no database substrate — so the default fast Vitest setup applies with no
 * raised timeouts or global setup. The @unit suite stays well under the evidence
 * thresholds (per-test < 100ms; full suite < 30s local).
 *
 * Test files live alongside the source they prove: the pure core under
 * packages/core/src and the app layer under packages/spec-controller/src.
 */
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts"],
  },
});
