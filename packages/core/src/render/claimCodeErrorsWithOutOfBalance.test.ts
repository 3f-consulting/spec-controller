import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { codeErrorsCtx as ctx, FOREIGN } from "./claimCodeError.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";

describe("[SCN-CLI-055] an out-of-balance account and a claim code error in one run: exit 1, both reported", () => {
  let outOfBalance: EvidenceReconciliation;
  let md: string;
  let headline: string;
  beforeEach(() => {
    outOfBalance = {
      ...evidenceReconciliationOf(
        [
          { claimCode: "SCN-ONE-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
          { claimCode: "SCN-ONE-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        ],
        [{ qualityCheckKind: "unit", claimCode: "SCN-ONE-001", status: "passed" }],
        []
      ),
      claimCodeErrors: [FOREIGN],
    };
    md = renderMarkdown(outOfBalance, ctx, publishedExitCodeOf);
    headline = md.split("\n").find((line) => line.startsWith(coreMessage(CoreMessage.ClaimCodeErrorsHeadline))) ?? "";
  });

  it("heads the verdict with the claim code error, and names the accounts out of balance too", () => {
    expect(headline).toContain(coreMessage(CoreMessage.AlsoOutOfBalance));
    expect(headline).toMatch(/\(exit 1\)$/);
  });
});
