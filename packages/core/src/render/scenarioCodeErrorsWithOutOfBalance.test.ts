import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { codeErrorsCtx as ctx, FOREIGN } from "./scenarioCodeError.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

describe("[SCN-CLI-055] an out-of-balance account and a scenario code error in one run: exit 1, both reported", () => {
  let outOfBalance: EvidenceReconciliation;
  let md: string;
  let headline: string;
  beforeEach(() => {
    outOfBalance = {
      ...evidenceReconciliationOf(
        [
          { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
          { scnId: "SCN-ONE-002", evidenceObligations: [{ qualityCheck: "unit" }] },
        ],
        [{ qualityCheck: "unit", scnId: "SCN-ONE-001", status: "passed" }],
        [],
        true,
        false
      ),
      scenarioCodeErrors: [FOREIGN],
    };
    md = renderMarkdown(outOfBalance, ctx, publishedExitCodeOf);
    headline = md.split("\n").find((line) => line.startsWith("**SCENARIO CODE ERRORS**")) ?? "";
  });

  it("heads the verdict with the scenario code error, and names the accounts out of balance too", () => {
    expect(headline).toMatch(/accounts do not agree/);
    expect(headline).toMatch(/\(exit 1\)$/);
  });
});
