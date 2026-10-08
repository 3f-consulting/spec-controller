import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { OUTCOME_DESCRIPTION } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { isBalanced } from "../domain/ledger.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

const balance: Ledger = reconcile(
  [{ scnId: "SCN-RPT-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
  [{ qualityCheck: "unit", scnId: "SCN-RPT-001", status: "passed" }],
);

describe("[SCN-RPT-001] the markdown report opens with a Run provenance header", () => {
  it("renders all four provenance facts: target repo, inputs used, UTC timestamp, source SHA", () => {
    const md = renderMarkdown(__er(balance), ctx);

    expect(md).toContain("## Run provenance");
    expect(md).toContain("an-adopters-repository");
    expect(md).toContain("--features");
    expect(md).toContain("../an-adopters-repository/features");
    expect(md).toContain("--vitest");
    expect(md).toContain("2026-06-27T08:17:53Z");
    expect(md).toContain("905a987c0ffeeba110000000000000000deadbeef");
    expect(md).toContain("- Tool SHA: 13ee47f271ace511efdb2511276284b4cb50c247");
    expect(md).toContain("- Tool version: 0.1.0");
  });

  it("renders a null source SHA as an explicit unknown (non-git target)", () => {
    const md = renderMarkdown(__er(balance), { ...ctx, sourceSha: null });
    expect(md).toContain("unknown (non-git target)");
    expect(md).not.toContain("Source SHA: null");
  });

  it("renders a null tool SHA as an explicit unknown (not a git checkout), version still shown", () => {
    const md = renderMarkdown(__er(balance), { ...ctx, toolSha: null });
    expect(md).toContain("- Tool SHA: unknown (not a git checkout)");
    expect(md).not.toContain("Tool SHA: null");
    expect(md).toContain("- Tool version: 0.1.0");
  });

  it("positions the provenance header above the per-scenario table (sectioned-renderer order)", () => {
    const md = renderMarkdown(__er(balance), ctx);
    expect(md.indexOf("# Evidence Reconciliation")).toBeLessThan(md.indexOf("## Run provenance"));
    expect(md.indexOf("## Run provenance")).toBeLessThan(md.indexOf("| Scenario | Verdict | Reconciling items |"));
  });

  it("keeps the existing scenario table byte-green (the Scenario-CRUD Read regression guard)", () => {
    const md = renderMarkdown(__er(balance), ctx);
    expect(md).toContain("| Scenario | Verdict | Reconciling items |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md).toContain("| SCN-RPT-001 | ✓ balanced | — |");
  });
});

describe("[SCN-RPT-004] the markdown report tallies evidenceObligations by reconciliation outcome", () => {
  const spanning: Ledger = reconcile(
    [
      { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
      { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
      { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
      { qualityCheck: "integration", scnId: "SCN-A", status: "failed" },
      { qualityCheck: "unit", scnId: "SCN-C", status: "passed" },
    ]
  );

  it("renders a '### Evidence reconciliation' table with subjects as rows and balanced / out-of-balance as columns", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).toContain("### Evidence reconciliation");
    expect(md).toContain("| Subject | Total | Balanced | Out-of-balance | Detail |");
    expect(md).toContain("| --- | --- | --- | --- | --- |");
    expect(md).toContain("| Scenario Reconciliation | 3 | 1 | 2 |");
    expect(md).toContain("| Evidence obligation | 5 | 2 | 3 |");
  });

  it("decomposes the evidence-obligation out-of-balance into its nested reconciling-item causes, with the level split as Detail", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).toContain("| ↳ Evidence Observation is missing |");
    expect(md).toContain("1 unit + 1 integration");
    expect(md).toContain("| ↳ Evidence Observation is failing |");
    expect(md).toContain("| ↳ Evidence Observation is passing but fabricated |");
  });

  it("reads the scenario / evidence-obligation out-of-balance divergence as a granularity fact (causes reconcile to the evidenceObligation out-of-balance)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const scenOutOfBalance = Number(
      /\| Scenario Reconciliation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]
    );
    const oblOutOfBalance = Number(/\| Evidence \S+ \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]);
    const rbm = Number(/↳ Evidence Observation is missing \|[^\d]*(\d+) \|/.exec(md)?.[1]);
    const pbf = Number(/↳ Evidence Observation is failing \|[^\d]*(\d+) \|/.exec(md)?.[1]);
    const wm = Number(
      /↳ Evidence Observation is passing but fabricated \|[^\d]*(\d+) \|/.exec(md)?.[1]
    );
    expect(scenOutOfBalance).toBe(2);
    expect(oblOutOfBalance).toBe(3);
    expect(scenOutOfBalance).not.toBe(oblOutOfBalance);
    expect(rbm + pbf + wm).toBe(oblOutOfBalance);
  });

  it("always renders the watermelon cause even at zero (a zero watermelon is itself a fact)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(/↳ Evidence Observation is passing but fabricated \|[^\d]*0 \|/.test(md)).toBe(true);
  });

  it("renders the nested causes in the fixed order missing → failing → watermelon", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iMissing = md.indexOf("| ↳ Evidence Observation is missing |");
    const iFailing = md.indexOf("| ↳ Evidence Observation is failing |");
    const iWatermelon = md.indexOf("| ↳ Evidence Observation is passing but fabricated |");
    expect(iMissing).toBeGreaterThanOrEqual(0);
    expect(iMissing).toBeLessThan(iFailing);
    expect(iFailing).toBeLessThan(iWatermelon);
  });

  it("counts qualityCheckReconciliations (the full breakdown), not reconcilingItems (which excludes balanced)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).toContain("| Evidence obligation | 5 | 2 | 3 |");
  });

  it("retires the Axis / Verdict / evidenceObligation-outcome vocabulary (both subjects report into the same binary columns)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).not.toContain("| Axis | Count |");
    expect(md).not.toContain("Verdict —");
    expect(md).not.toContain("Evidence obligation-outcome —");
  });

  it("splits missing by evidenceObligation subject — counting evidenceObligations, not scenarios, in canonical order", () => {
    const multiMissing: Ledger = reconcile(
      [
        { scnId: "SCN-PST-035", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
        { scnId: "SCN-OTH-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      []
    );
    const md = renderMarkdown(__er(multiMissing), ctx);
    expect(md).toContain("| Scenario Reconciliation | 2 | 0 | 2 |");
    expect(md).toContain("| Evidence obligation | 3 | 0 | 3 |");
    expect(md).toContain("2 unit + 1 integration");
    expect(/↳ Evidence Observation is missing \|[^\d]*3 \|/.test(md)).toBe(true);
  });

  it("renders a missing static evidenceObligation as the bare 'fitness' bucket, fitness-first in the split", () => {
    const lintAndRuntime: Ledger = reconcile(
      [
        {
          scnId: "SCN-LNT-099",
          evidenceObligations: [{ qualityCheck: "integration" }, { qualityCheck: "fitness" }],
        },
      ],
      []
    );
    const md = renderMarkdown(__er(lintAndRuntime), ctx);
    expect(md).toContain("1 fitness + 1 integration");
    expect(/↳ Evidence Observation is missing \|[^\d]*2 \|/.test(md)).toBe(true);
  });

  it("renders the evidence reconciliation under the Summary views heading, before the ledger", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iSummary = md.indexOf("## Summary views");
    const iHeadline = md.indexOf("### Evidence reconciliation");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iSummary).toBeGreaterThanOrEqual(0);
    expect(iSummary).toBeLessThan(iHeadline);
    expect(iHeadline).toBeLessThan(iLedger);
  });

  const threeNamedPlusSuspense: Ledger = reconcile(
    [
      { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-B", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-C", status: "passed" },
      { qualityCheck: "unit", scnId: null, status: "passed" },
      { qualityCheck: "integration", scnId: null, status: "passed" },
    ]
  );

  it("counts the suspense reconciliation in the evidence reconciliation's out-of-balance column (N+1 | N | 1, never N | N | 0)", () => {
    const md = renderMarkdown(__er(threeNamedPlusSuspense), ctx);
    expect(md).toContain("| Scenario Reconciliation | 4 | 3 | 1 |");
    expect(md).not.toContain("| Scenario Reconciliation | 3 | 3 | 0 |");
  });

  it("agrees with isBalanced and with the evidence-obligation row's own out-of-balance count", () => {
    const md = renderMarkdown(__er(threeNamedPlusSuspense), ctx);
    const scenOutOfBalance = Number(
      /\| Scenario Reconciliation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]
    );
    const oblOutOfBalance = Number(/\| Evidence obligation \| \d+ \| \d+ \| (\d+) \|/.exec(md)?.[1]);
    expect(isBalanced(threeNamedPlusSuspense)).toBe(false);
    expect(scenOutOfBalance).toBe(1);
    expect(oblOutOfBalance).toBe(2);
    expect(scenOutOfBalance).toBeGreaterThan(0);
    expect(oblOutOfBalance).toBeGreaterThan(0);
    const citesNoScenario = OUTCOME_DESCRIPTION["cites-no-scenario"];
    expect(
      new RegExp(`↳ ${citesNoScenario} \\|[^\\d]*2 \\|`).test(md)
    ).toBe(true);
  });
});

describe("[SCN-RPT-005] the markdown report lists the fitness evidence obligations as their own section", () => {
  const spanning: Ledger = reconcile(
    [
      {
        scnId: "SCN-A",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "fitness" },
          { qualityCheck: "integration" },
        ],
      },
      {
        scnId: "SCN-B",
        evidenceObligations: [{ qualityCheck: "fitness" }, { qualityCheck: "e2e" }],
      },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
      { qualityCheck: "integration", scnId: "SCN-A", status: "failed" },
      { qualityCheck: "fitness", staticCheck: "lint:guard-typecheck", scnId: "SCN-A", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "fitness", staticCheck: "lint:guard-lint", scnId: "SCN-B", exists: true, enforcedOverRealSource: false },
    ]
  );

  it("renders a '### Fitness evidence obligations' table with each fitness row's scenario and glyphed outcome — including the watermelon", () => {
    const md = renderMarkdown(__er(spanning), ctx);

    expect(md).toContain("### Fitness evidence obligations");
    expect(md).toContain("1 of 2 fitness evidence obligations reconcile satisfied.");
    expect(md).toContain("| Scenario | Outcome |");
    expect(md).not.toContain("| Scenario | Static check | Outcome |");
    expect(md).toContain("| SCN-A | ✓ Evidence Observation satisfies its Evidence Obligation |");
    expect(md).toContain("| SCN-B | 🍉 Evidence Observation is passing but fabricated |");
  });

  it("excludes the runtime evidenceObligations (the fitness slice on its own)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iSection = md.indexOf("### Fitness evidence obligations");
    const rest = md.slice(iSection + 1);
    const nextHeading = rest.search(/\n##/);
    const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
    expect(section).not.toContain("runtime");
    expect(section).not.toContain("integration");
    expect(section).not.toContain("e2e");
  });

  it("renders the fitness evidenceObligations in document order", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const section = md.slice(md.indexOf("### Fitness evidence obligations"), md.indexOf("## Scenario Reconciliations"));
    const iA = section.indexOf("| SCN-A |");
    const iB = section.indexOf("| SCN-B |");
    expect(iA).toBeGreaterThanOrEqual(0);
    expect(iB).toBeGreaterThanOrEqual(0);
    expect(iA).toBeLessThan(iB);
  });

  it("omits the section entirely (total line and all) when no scenario names a fitness evidenceObligation", () => {
    const runtimeOnly: Ledger = reconcile(
      [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }]
    );
    const md = renderMarkdown(__er(runtimeOnly), ctx);
    expect(md).not.toContain("### Fitness evidence obligations");
    expect(md).not.toContain("fitness evidence obligations reconcile satisfied");
  });

  it("slots the fitness section after the evidence reconciliation and before the ledger (no warnings section)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iHeadline = md.indexOf("### Evidence reconciliation");
    const iStatic = md.indexOf("### Fitness evidence obligations");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iHeadline).toBeGreaterThanOrEqual(0);
    expect(iStatic).toBeGreaterThanOrEqual(0);
    expect(iLedger).toBeGreaterThanOrEqual(0);
    expect(iHeadline).toBeLessThan(iStatic);
    expect(iStatic).toBeLessThan(iLedger);
    expect(md).not.toContain("## Warnings");
  });
});
