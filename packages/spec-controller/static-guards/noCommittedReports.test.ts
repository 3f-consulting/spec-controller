/**
 * Unit tests for the no-committed-reports static guard logic (the @unit arm of
 * @SCN-NCR-001). The tracked-file LIST is injected — no git shell — so the rule
 * is proven in isolation: a report path under runs/ reds (and is named); a clean
 * list passes.
 *
 * Bidirectional evidence (the discipline): the describe string carries the
 * @SCN-NCR-001 id matching features/no-committed-reports.feature.
 */

import { describe, it, expect } from "vitest";
import { findCommittedReports } from "./noCommittedReports.js";

describe("[SCN-NCR-001] the no-committed-reports guard logic over a tracked-file list", () => {
  it("flags a tracked file under runs/ and names the offending path", () => {
    const tracked = [
      "src/cli.ts",
      "package.json",
      "runs/an-adopters-repository/2026-06-27T07-28-51Z/spec-reconciliation.md",
    ];
    const offenders = findCommittedReports(tracked);
    expect(offenders).toEqual([
      "runs/an-adopters-repository/2026-06-27T07-28-51Z/spec-reconciliation.md",
    ]);
  });

  it("names every offending path when several report artefacts are tracked", () => {
    const tracked = [
      "src/cli.ts",
      "runs/README.md",
      "runs/an-adopters-repository/2026-06-28T13-03-24Z/spec-reconciliation.json",
      "features/no-committed-reports.feature",
    ];
    expect(findCommittedReports(tracked)).toEqual([
      "runs/README.md",
      "runs/an-adopters-repository/2026-06-28T13-03-24Z/spec-reconciliation.json",
    ]);
  });

  it("passes (no offenders) over a clean list with nothing tracked under runs/", () => {
    const tracked = [
      "src/cli.ts",
      "package.json",
      "features/no-committed-reports.feature",
      "docs/guide.md",
    ];
    expect(findCommittedReports(tracked)).toEqual([]);
  });
});
