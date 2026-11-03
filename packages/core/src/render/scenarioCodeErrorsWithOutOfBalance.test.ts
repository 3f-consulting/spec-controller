import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { codeErrorsCtx as ctx, FOREIGN } from "./scenarioCodeError.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

describe("[SCN-CLI-055] an out-of-balance account and a scenario code error in one run: exit 1, both reported", () => {
  let outOfBalance: EvidenceReconciliation;
  let md: string;
  let headline: string;
  beforeEach(() => {
    outOfBalance = {
      ...evidenceReconciliationOf(
        [
          { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
          { scnId: "SCN-ONE-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        ],
        [{ qualityCheckKind: "unit", scnId: "SCN-ONE-001", status: "passed" }],
        []
      ),
      scenarioCodeErrors: [FOREIGN],
    };
    md = renderMarkdown(outOfBalance, ctx, publishedExitCodeOf);
    headline = md.split("\n").find((line) => line.startsWith(CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeadline])) ?? "";
  });

  it("heads the verdict with the scenario code error, and names the accounts out of balance too", () => {
    expect(headline).toContain(CORE_MESSAGES[CoreMessage.AlsoOutOfBalance]);
    expect(headline).toMatch(/\(exit 1\)$/);
  });
});
