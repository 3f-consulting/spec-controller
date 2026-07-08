/**
 * Unit test for the --package-json cross-repo guard-read seam (@SCN-LNT-005).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it carry the
 * @SCN-LNT-005 id matching features/lint-reconciliation.feature, so a grep of the
 * id returns both halves of the pair.
 *
 * It drives the CLI read/reconcile core `runReconcile` over a PLANTED EXTERNAL repo
 * fixture (tests/fixtures/scn-lnt-005/): an external feature declaring `@lint=lint:vocab-check`,
 * an external package.json where that guard EXISTS, and an external ci.yml that does
 * NOT run it. The guard's `exists` MUST be read from the EXTERNAL package.json (via
 * --package-json), NOT the tool's own cwd package.json (which has no
 * `lint:vocab-check` script). So the scenario reconciles as the WATERMELON
 * (watermelon).
 *
 * Teeth: until --package-json is threaded, `runReconcile` reads the tool's own
 * package.json, where `lint:vocab-check` is absent → missing, not the
 * watermelon. So this REDS on the un-threaded seam (the genuine red→green).
 *
 * Parent: @SCN-LNT-005 — the live ledger.
 */

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { runReconcile } from "./ingestQualityChecks.js";

const FIXTURE = join(process.cwd(), "tests/fixtures/scn-lnt-005");
const EXTERNAL_GUARD = "lint:vocab-check";

describe("[SCN-LNT-005] guard enforcement is read from an externally-specified package.json", () => {
  it("reconciles the external guard as the watermelon — its existence read from the EXTERNAL package.json, not spec-controller's own cwd", () => {
    const balance = runReconcile({
      features: join(FIXTURE, "features"),
      ci: join(FIXTURE, "ci.yml"),
      packageJson: join(FIXTURE, "package.json"),
    });

    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-EXT-001");

    // The watermelon: out-of-balance, carrying exactly the present-but-not-enforced
    // -over-real-source static item for the external guard. This is only reachable
    // when `exists` was read from the EXTERNAL package.json (the guard is absent
    // from the tool's own, where it would be missing instead).
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      {
        qualityCheck: "lint", guard: EXTERNAL_GUARD,
        outcome: "watermelon",
      },
    ]);
  });
});
