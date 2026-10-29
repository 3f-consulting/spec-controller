import { describe, it, expect } from "vitest";
import { renderJson } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { parseVitestEvidenceObservations } from "../parse/vitest.js";
import { parseCucumberEvidenceObservations } from "../parse/cucumber.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;
const heldObservationsOf = (row: { qualityCheckReconciliations: { evidenceObservations?: { outcome: unknown }[] }[] }) =>
  row.qualityCheckReconciliations.flatMap((reconciliation) => reconciliation.evidenceObservations ?? []).map(postedOf);

describe("[SCN-RMD-010] the JSON report carries each test's name on its evidence observation, from Vitest and Cucumber alike", () => {
  it("carries a Vitest test's name and a Cucumber scenario's name on their evidence observations as testName", () => {
    const observations = [
      ...parseVitestEvidenceObservations(
        { testResults: [{ name: "/r/a.test.ts", assertionResults: [{ title: "spawns yarn", status: "failed" }] }] },
        "/r",
      ),
      ...parseCucumberEvidenceObservations(
        [{ uri: "features/checkout.feature", elements: [{ name: "an expired coupon is refused", steps: [{ result: { status: "failed" } }] }] }],
      ),
    ];
    const json = JSON.parse(renderJson(__er(reconcile([], observations)), ctx));
    const saved = json.ledger.claimReconciliations.flatMap(heldObservationsOf);

    expect(saved.map((o: { locator: string; testName?: string }) => [o.locator, o.testName])).toEqual([
      ["a.test.ts", "spawns yarn"],
      ["features/checkout.feature", "an expired coupon is refused"],
    ]);
  });
});
