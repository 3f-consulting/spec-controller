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
    // Off by default, so a local run and Stryker's runner pay nothing for it;
    // CI's unit step turns it on, and the CRAP step reads what it writes. The
    // CRAP tool reads `coverage/coverage-final.json` and has no flag to look
    // elsewhere, so the directory is fixed and gitignored. JSON only: an HTML
    // reporter would write `.js` files the boundary lint over `.` would read.
    // `reportOnFailure` keeps the report when a test reds, so the CRAP step
    // still has coverage to score rather than running the suite itself.
    coverage: {
      enabled: false,
      provider: "v8",
      include: ["packages/*/src/**"],
      reporter: ["json"],
      reportOnFailure: true,
    },
  },
});
