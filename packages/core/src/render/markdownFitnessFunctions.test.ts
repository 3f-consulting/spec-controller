import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

describe("[SCN-USG-001] the markdown report renders the Fitness functions section", () => {
  let emptyBalance: Ledger;
  let twoRunningOneUncited: Ledger;
  let oneRunningNoneUncited: Ledger;
  beforeEach(() => {
    emptyBalance = reconcile([], []);
    twoRunningOneUncited = reconcile(
      [{ scnId: "SCN-USG-001", evidenceObligations: [{ qualityCheck: "fitness" }] }],
      [
        { qualityCheck: "fitness", fitnessFunction: "lint:foo", scnId: "SCN-USG-001", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "fitness", fitnessFunction: "lint:bar", exists: true, enforcedOverRealSource: true },
      ]
    );
    oneRunningNoneUncited = reconcile(
      [{ scnId: "SCN-USG-001", evidenceObligations: [{ qualityCheck: "fitness" }] }],
      [{ qualityCheck: "fitness", fitnessFunction: "lint:foo", scnId: "SCN-USG-001", exists: true, enforcedOverRealSource: true }]
    );
  });

  it("renders '### Fitness functions' with the counts line ONLY — the per-guard detail dissolved to the suspense row", () => {
    const md = renderMarkdown(__er(twoRunningOneUncited, false, true), ctx);
    expect(md).toContain("### Fitness functions");
    expect(md).toContain("2 fitness function(s) run, 1 uncited fitness function(s).");
    expect(md).not.toContain("- lint:bar");
  });

  it("shows the counts line but omits the list when every running guard is named", () => {
    const md = renderMarkdown(__er(oneRunningNoneUncited, false, true), ctx);
    expect(md).toContain("1 fitness function(s) run, 0 uncited fitness function(s).");
    expect(md).not.toContain("- lint:foo");
  });

  it("omits the Fitness functions section when the fitness-function axis is not in play (back-compat)", () => {
    const md = renderMarkdown(__er(emptyBalance), ctx);
    expect(md).not.toContain("### Fitness functions");
  });
});
