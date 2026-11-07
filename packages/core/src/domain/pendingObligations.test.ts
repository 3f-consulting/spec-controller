import { describe, it, expect } from "vitest";
import { obligationsRaisedBy } from "./scenarioObligations.js";
import { reconcile } from "./evidenceReconciliation.js";

describe("[SCN-PND-001] a <quality-check-kind>pending tag raises a pending obligation of its kind of quality check", () => {
  it.each([
    ["fitnesspending", "fitness"],
    ["unitpending", "unit"],
    ["integrationpending", "integration"],
    ["e2epending", "e2e"],
    ["performancepending", "performance"],
  ] as const)("%s raises a pending %s obligation", (tag, qualityCheckKind) => {
    expect(obligationsRaisedBy([tag], [])).toEqual([{ qualityCheckKind, pending: true }]);
  });

  it("a <x>pending tag naming no kind of quality check raises nothing", () => {
    expect(obligationsRaisedBy(["lintpending"], [])).toEqual([]);
  });
});

describe("[SCN-PND-002] the pending suffix is significant — @integrationpending is not read as @integration", () => {
  it("a bare integration tag raises a plain integration obligation", () => {
    expect(obligationsRaisedBy(["integration"], [])).toEqual([{ qualityCheckKind: "integration" }]);
  });

  it("an integrationpending tag raises a pending integration obligation", () => {
    expect(obligationsRaisedBy(["integrationpending"], [])).toEqual([{ qualityCheckKind: "integration", pending: true }]);
  });
});

describe("[SCN-PND-003] an unrecognised <x>pending tag is passed through, ignored like any unknown tag", () => {
  it("an unknown <x>pending alongside a recognised tag leaves the recognised obligation intact", () => {
    expect(obligationsRaisedBy(["unit", "foopending"], [])).toEqual([{ qualityCheckKind: "unit" }]);
  });
});

describe("[SCN-PND-016] a recognised community deferral tag defers every named obligation on its scenario", () => {
  const DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];
  const COMMUNITY_TAGS = ["wip", "ignore", "skip", "todo", "pending"] as const;

  it.each(COMMUNITY_TAGS)("%s marks both the unit and integration obligation pending", (tag) => {
    expect(obligationsRaisedBy([tag, "unit", "integration"], DEFERRAL_TAGS)).toEqual([
      { qualityCheckKind: "unit", pending: true },
      { qualityCheckKind: "integration", pending: true },
    ]);
  });
});

describe("[SCN-PND-017] `@integrationpending` defers only its own obligation (obligation-scope), not the whole scenario", () => {
  const DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

  it("defers only the integration obligation — the unit obligation stays owed", () => {
    expect(obligationsRaisedBy(["unit", "integrationpending"], DEFERRAL_TAGS)).toEqual([
      { qualityCheckKind: "unit" },
      { qualityCheckKind: "integration", pending: true },
    ]);
  });

  it("contrasts with the scenario-scope community tag — adding wip defers the unit obligation too", () => {
    expect(obligationsRaisedBy(["wip", "unit", "integrationpending"], DEFERRAL_TAGS)).toEqual([
      { qualityCheckKind: "unit", pending: true },
      { qualityCheckKind: "integration", pending: true },
    ]);
  });
});

describe("[SCN-PND-018] a scenario-scope `@wip` and an obligation-scope `@integrationpending` compose — both obligations pending", () => {
  const DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

  it("defers the bare unit by the scenario-scope wip and the integration by the obligation-scope integrationpending — both pending", () => {
    expect(obligationsRaisedBy(["wip", "unit", "integrationpending"], DEFERRAL_TAGS)).toEqual([
      { qualityCheckKind: "unit", pending: true },
      { qualityCheckKind: "integration", pending: true },
    ]);
  });
});

describe("[SCN-PND-020] an unrecognised tag is given no special meaning — it defers nothing", () => {
  const DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

  it("an unrecognised tag derives exactly what no extra tag would — the tag buys no special treatment", () => {
    const withFoo = obligationsRaisedBy(["foo", "unit"], DEFERRAL_TAGS);
    expect(withFoo).toEqual(obligationsRaisedBy(["unit"], DEFERRAL_TAGS));
    expect(withFoo).toEqual([{ qualityCheckKind: "unit" }]);
  });
});

describe("[SCN-PND-022] a deferred scenario naming no obligations synthesises one scenario-scope pending obligation", () => {
  const DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

  it("a bare wip scenario (no evidence tag) derives ONE scenario-scope pending obligation with no qualityCheckKind", () => {
    expect(obligationsRaisedBy(["wip"], DEFERRAL_TAGS)).toEqual([{ pending: true }]);
  });

  it("a bare wip scenario reconciled raises one Pending Item whose qualityCheckKind is null", () => {
    const balance = reconcile([{ claimCode: "SCN-PND-022", evidenceObligations: obligationsRaisedBy(["wip"], DEFERRAL_TAGS) }], []);
    expect(balance.claimReconciliations.find((row) => row.claim === "SCN-PND-022")?.pendingItems).toEqual([{ qualityCheckKind: null }]);
  });
});
