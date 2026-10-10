import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger, ScenarioReconciliation } from "../model.js";
import { OUTCOME_DESCRIPTION, makeQualityCheckReconciliation, OUTCOME_SIDE_PROFILE } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario, RuntimeQualityCheck } from "../model.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

function qcr(
  fields: Parameters<typeof makeQualityCheckReconciliation>[0],
): ReturnType<typeof makeQualityCheckReconciliation> {
  const profile = OUTCOME_SIDE_PROFILE[fields.outcome];
  return makeQualityCheckReconciliation({
    ...fields,
    ...(profile.obligation === "Exists" && fields.evidenceObligation === undefined
      ? { evidenceObligation: { qualityCheck: "unit" } }
      : {}),
    ...(profile.observation === "Exists" && fields.evidenceObservation === undefined
      ? { evidenceObservation: { qualityCheck: "unit", scnId: "SCN-FIX-001", status: "passed" } }
      : {}),
  });
}

describe("[SCN-RPT-021] the markdown names the broken evidence and its error, stamped unsound", () => {
  const VITEST_LOCATOR = "tests/harness/cucumber.trigger.test.ts";
  const VITEST_MESSAGE =
    "Error: Cannot find package '@cucumber/tag-expressions' imported from " +
    `${VITEST_LOCATOR}\n    at packageResolve (node:internal/modules/esm/resolve:catch)\n    at moduleResolve (node:internal/modules/esm/resolve)`;

  const CUCUMBER_LOCATOR = "features/handover.feature";
  const CUCUMBER_MESSAGE =
    'The step "When the handover is accepted" is ambiguous — two or more step definitions match ' +
    "it, so the step never ran.";

  const rowFor = (md: string, scnId: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
    expect(row, `expected a rendered row for ${scnId}`).toBeTruthy();
    return row!;
  };

  const balanceWithBroken = (
    item: ScenarioReconciliation["reconcilingItems"][number]
  ): Ledger => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-HNS-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observations: EvidenceObservation[] = [
      {
        qualityCheck: item.qualityCheck as RuntimeQualityCheck,
        scnId: null,
        status: "passed",
        broken: true,
        ...(item.locator !== undefined ? { locator: item.locator } : {}),
        ...(item.message !== undefined ? { message: item.message } : {}),
      },
    ];
    return reconcile(scenarios, observations);
  };

  let vitestBroken: Ledger;
  let cucumberBroken: Ledger;
  beforeEach(() => {
    vitestBroken = balanceWithBroken(
      qcr({
        qualityCheck: "unit",
        outcome: "broken",
        locator: VITEST_LOCATOR,
        message: VITEST_MESSAGE,
      }),
    );
    cucumberBroken = balanceWithBroken(
      qcr({
        qualityCheck: "integration",
        outcome: "broken",
        locator: CUCUMBER_LOCATOR,
        message: CUCUMBER_MESSAGE,
      }),
    );
  });

  const integrityOf = (md: string): string => md.slice(md.indexOf("## Run integrity"));

  const stampOf = (md: string): string =>
    md.slice(md.indexOf("## Run integrity"), md.indexOf("## Summary views"));

  it("stamps each run unsound, above the summary views", () => {
    for (const balance of [vitestBroken, cucumberBroken]) {
      const md = renderMarkdown(__er(balance), ctx);
      expect(md).toContain("## Run integrity: unsound");
      const iProvenance = md.indexOf("## Run provenance");
      const iStamp = md.indexOf("## Run integrity: unsound");
      const iSummary = md.indexOf("## Summary views");
      expect(iProvenance).toBeLessThan(iStamp);
      expect(iStamp).toBeLessThan(iSummary);
      expect(md).toMatch(/unsound[\s\S]{0,400}missing/i);
    }
  });

  it("names each run's own broken evidence — the file or the feature — and neither miscalls the other's failure a collection failure", () => {
    const vitestMd = renderMarkdown(__er(vitestBroken), ctx);
    const cucumberMd = renderMarkdown(__er(cucumberBroken), ctx);

    expect(vitestMd).toContain(VITEST_LOCATOR);
    expect(cucumberMd).toContain(CUCUMBER_LOCATOR);

    expect(stampOf(cucumberMd)).not.toMatch(/collection|collect|proving suite/i);

    expect(vitestMd).not.toMatch(/ambiguous|step definition/i);
  });

  it("prints the runner's error verbatim where the runner gives one, and states the diagnosis itself where it does not", () => {
    const vitestIntegrity = integrityOf(renderMarkdown(__er(vitestBroken), ctx));
    expect(vitestIntegrity).toContain(VITEST_MESSAGE);
    expect(vitestIntegrity).toMatch(/```[\s\S]*Cannot find package[\s\S]*```/);

    const cucumberIntegrity = integrityOf(renderMarkdown(__er(cucumberBroken), ctx));
    expect(cucumberIntegrity).toContain(CUCUMBER_MESSAGE);
    expect(cucumberIntegrity).toMatch(/```[\s\S]*is ambiguous[\s\S]*```/);
  });

  it("sends the reader to fix the harness and regenerate — prescribing no cure for the error itself", () => {
    for (const balance of [vitestBroken, cucumberBroken]) {
      const md = renderMarkdown(__er(balance), ctx);
      expect(md).toMatch(/fix the harness and regenerate/i);
      expect(md).not.toMatch(/pnpm install|npm install|yarn install|--frozen-lockfile/i);
      expect(md).not.toMatch(/delete |remove |rename |narrow |disambiguate/i);
    }
  });

  it("carries the locator on the suspense row's broken item — a broken proof, not an absent one", () => {
    const vitestMd = renderMarkdown(__er(vitestBroken), ctx);
    const suspense = rowFor(vitestMd, "(no scenario)");
    expect(suspense).toContain(`💥 ${OUTCOME_DESCRIPTION.broken}`);
    expect(suspense).toContain(VITEST_LOCATOR);
    expect(suspense).toContain("Cannot find package '@cucumber/tag-expressions'");
    expect(suspense).not.toContain("at packageResolve");
    const namedRow = rowFor(vitestMd, "SCN-HNS-002");
    expect(namedRow).toContain(`∅ ${OUTCOME_DESCRIPTION.missing}`);
    expect(namedRow).not.toContain("💥");

    const cucumberSuspense = rowFor(renderMarkdown(__er(cucumberBroken), ctx), "(no scenario)");
    expect(cucumberSuspense).toContain(`💥 ${OUTCOME_DESCRIPTION.broken}`);
    expect(cucumberSuspense).toContain(CUCUMBER_LOCATOR);
    expect(cucumberSuspense).toContain("is ambiguous");
  });

  it("omits the stamp entirely when the run carries no broken evidence (byte-identical regression)", () => {
    const sound: Ledger = reconcile(
      [{ scnId: "SCN-SND-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      []
    );
    const md = renderMarkdown(__er(sound), ctx);
    expect(md).not.toContain("Run integrity");
    expect(md).not.toContain("unsound");
    expect(md).not.toContain("💥");
    expect(md).toContain(`unit ∅ ${OUTCOME_DESCRIPTION.missing}`);
  });
});

describe("[SCN-RPT-022] the summary opens with the run verdict and the exit code it maps to", () => {
  const summaryOpening = (md: string): string =>
    md.slice(md.indexOf("## Summary views"), md.indexOf("### Evidence reconciliation"));

  const balancedScenario: Scenario = {
    scnId: "SCN-VRD-001",
    evidenceObligations: [{ qualityCheck: "unit" }],
  };
  const balancedObs: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-VRD-001",
    status: "passed",
  };

  let balanced: Ledger;
  let outOfBalance: Ledger;
  let broken: Ledger;
  let balancedWithPending: Ledger;
  beforeEach(() => {
    balanced = reconcile([balancedScenario], [balancedObs]);
    outOfBalance = reconcile(
      [balancedScenario],
      [balancedObs, { qualityCheck: "unit", scnId: null, status: "passed", locator: "x.test.ts" }]
    );
    broken = reconcile(
      [balancedScenario],
      [
        balancedObs,
        {
          qualityCheck: "unit",
          scnId: null,
          status: "passed",
          broken: true,
          locator: "tests/harness/x.test.ts",
          message: "Error: boom",
        },
      ]
    );
    balancedWithPending = reconcile(
      [
        {
          scnId: "SCN-VRD-001",
          evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
        },
      ],
      [balancedObs]
    );
  });

  it("opens the summary with the verdict, before any cut of the reconciliation", () => {
    const opening = summaryOpening(renderMarkdown(__er(balanced), ctx));
    expect(opening).toContain("### Run verdict");
    expect(opening).toMatch(/BALANCED/);
  });

  it("reads BALANCED and exit 0 when every Scenario Reconciliation balances", () => {
    const md = renderMarkdown(__er(balanced), ctx);
    expect(summaryOpening(md)).toContain("**BALANCED**");
    expect(summaryOpening(md)).toContain("exit 0");
    expect(summaryOpening(md)).toContain(
      "every Scenario Reconciliation balances: scenario, phantom and suspense alike."
    );
  });

  it("reads OUT-OF-BALANCE and exit 1 — never as a pass — when a row does not balance", () => {
    const opening = summaryOpening(renderMarkdown(__er(outOfBalance), ctx));
    expect(opening).toContain("**OUT-OF-BALANCE**");
    expect(opening).toContain("exit 1");
    expect(opening).not.toContain("**BALANCED**");
  });

  it("reads UNSOUND and exit 4 when the run carries broken evidence, pre-empting the balance verdict", () => {
    const opening = summaryOpening(renderMarkdown(__er(broken), ctx));
    expect(opening).toContain("**UNSOUND**");
    expect(opening).toContain("exit 4");
    expect(opening).not.toContain("exit 1");
  });

  it("glosses UNSOUND in reader-agnostic terms — a proof that never ran, not a vitest suite that failed to collect", () => {
    const opening = summaryOpening(renderMarkdown(__er(broken), ctx));

    expect(opening).toContain("could not be TRUSTED to reconcile");
    expect(opening).toContain("A proof never ran");

    expect(opening).not.toMatch(/suite/i);
    expect(opening).not.toMatch(/collect/i);
  });

  it("notes exit 3 under --strict conditionally when a balanced run carries Pending Items — and never asserts it", () => {
    const opening = summaryOpening(renderMarkdown(__er(balancedWithPending), ctx));
    expect(opening).toContain("**BALANCED**");
    expect(opening).toContain("exit 0");
    expect(opening).toMatch(/exit 3 under `--strict`/);
    expect(summaryOpening(renderMarkdown(__er(balanced), ctx))).not.toContain("exit 3");
  });
});

describe('[SCN-RPT-024] the reconciliation collection is named "Scenario Reconciliation(s)", never "scenario(s)"', () => {
  let namedPhantomSuspense: Ledger;
  beforeEach(() => {
    namedPhantomSuspense = reconcile(
      [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
        { qualityCheck: "unit", scnId: "SCN-PHM-999", status: "passed" },
        { qualityCheck: "fitness", fitnessFunction: "guard:static", exists: true, enforcedOverRealSource: true },
      ],
    );
  });

  it('names the collection "Scenario Reconciliation" in the Evidence-reconciliation table Subject cell', () => {
    const md = renderMarkdown(__er(namedPhantomSuspense), ctx);
    expect(md).toContain("| Scenario Reconciliation |");
  });

  it('names the collection "Scenario Reconciliation(s)" in the headline verdict tally, never "scenario(s)"', () => {
    const md = renderMarkdown(__er(namedPhantomSuspense), ctx);
    expect(md).toContain("- 3 Scenario Reconciliation(s): 1 balanced, 2 out-of-balance.");
    expect(md).not.toContain("- 3 scenario(s):");
  });
});
