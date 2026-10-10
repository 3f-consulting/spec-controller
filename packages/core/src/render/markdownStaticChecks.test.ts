import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

describe("[SCN-USG-001] the markdown report renders the Static checks section", () => {
  let emptyBalance: Ledger;
  let twoRunningOneUncited: Ledger;
  let oneRunningNoneUncited: Ledger;
  beforeEach(() => {
    emptyBalance = reconcile([], []);
    twoRunningOneUncited = reconcile(
      [{ scnId: "SCN-USG-001", evidenceObligations: [{ qualityCheck: "fitness" }] }],
      [
        { qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-USG-001", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "fitness", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      ]
    );
    oneRunningNoneUncited = reconcile(
      [{ scnId: "SCN-USG-001", evidenceObligations: [{ qualityCheck: "fitness" }] }],
      [{ qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-USG-001", exists: true, enforcedOverRealSource: true }]
    );
  });

  it("renders '### Static checks' with the counts line ONLY — the per-guard detail dissolved to the suspense row", () => {
    const md = renderMarkdown(__er(twoRunningOneUncited, false, true), ctx);
    expect(md).toContain("### Static checks");
    expect(md).toContain("2 static check(s) run, 1 uncited static check(s).");
    expect(md).not.toContain("- lint:bar");
  });

  it("shows the counts line but omits the list when every running guard is named", () => {
    const md = renderMarkdown(__er(oneRunningNoneUncited, false, true), ctx);
    expect(md).toContain("1 static check(s) run, 0 uncited static check(s).");
    expect(md).not.toContain("- lint:foo");
  });

  it("omits the Static checks section when the static-check axis is not in play (back-compat)", () => {
    const md = renderMarkdown(__er(emptyBalance), ctx);
    expect(md).not.toContain("### Static checks");
  });
});
