import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { type Ledger } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

let balance: Ledger;
beforeEach(() => {
  balance = reconcile(
    [{ scnId: "SCN-RPT-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [{ qualityCheck: "unit", scnId: "SCN-RPT-001", status: "passed" }],
  );
});

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

  it("names the target's git origin beside unknown-target when the run read one, and the bare target when it read none", () => {
    const targetRepo = (md: string) => md.split("\n").find((line) => line.startsWith("- Target repo:"));
    const untargeted = { ...ctx, target: "unknown-target" };
    expect(targetRepo(renderMarkdown(__er(balance), { ...untargeted, targetOrigin: "git@github.com:ekino/veggies.git" })))
      .toBe("- Target repo: unknown-target (no --target given; origin is ekino/veggies)");
    expect(targetRepo(renderMarkdown(__er(balance), untargeted))).toBe("- Target repo: unknown-target");
  });

  it("positions the provenance header above the claim table (sectioned-renderer order)", () => {
    const md = renderMarkdown(__er(balance), ctx);
    expect(md.indexOf("# Evidence Reconciliation")).toBeLessThan(md.indexOf("## Run provenance"));
    expect(md.indexOf("## Run provenance")).toBeLessThan(md.indexOf("| Claim | Verdict | Reconciling items |"));
  });

  it("keeps the existing claim table byte-green (the Scenario-CRUD Read regression guard)", () => {
    const md = renderMarkdown(__er(balance), ctx);
    expect(md).toContain("| Claim | Verdict | Reconciling items |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md).toContain("| SCN-RPT-001 | balanced | — |");
  });
});

describe("[SCN-RPT-004] the markdown report tallies Quality Check Reconciliations by reconciliation outcome", () => {
  let spanning: Ledger;
  beforeEach(() => {
    spanning = reconcile(
      [
        { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
        { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
        { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [
        { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
        { qualityCheck: "integration", scnId: "SCN-A", status: "failed" },
        { qualityCheck: "unit", scnId: "SCN-C", status: "passed" },
        { qualityCheck: "integration", scnId: "SCN-C", status: "passed" },
      ]
    );
  });

  it("renders a '### Evidence reconciliation' table with subjects as rows and balanced / out-of-balance as columns", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).toContain("### Evidence reconciliation");
    expect(md).toContain("| Subject | Total | Balanced | Out-of-balance | Detail |");
    expect(md).toContain("| --- | --- | --- | --- | --- |");
    expect(md).toContain("| Claim Reconciliation | 3 | 0 | 3 |");
    expect(md).toContain("| Quality Check Reconciliation | 6 | 2 | 4 |");
  });

  it("decomposes the Quality Check Reconciliation out-of-balance into cause rows, each its outcome's sentence alone, with the level split as Detail", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).toContain(`\n| ${OUTCOME_DESCRIPTION.missing} |`);
    expect(md).toContain("1 unit + 1 integration");
    expect(md).toContain(`\n| ${OUTCOME_DESCRIPTION.failing} |`);
    expect(md).toContain(`\n| ${OUTCOME_DESCRIPTION.watermelon} |`);
  });

  it("renders a missing fitness-function evidenceObligation as the bare 'fitness' bucket, fitness-first in the split", () => {
    const lintAndBehavioural: Ledger = reconcile(
      [
        {
          scnId: "SCN-LNT-099",
          evidenceObligations: [{ qualityCheck: "integration" }, { qualityCheck: "fitness" }],
        },
      ],
      []
    );
    const md = renderMarkdown(__er(lintAndBehavioural), ctx);
    expect(md).toContain("1 fitness + 1 integration");
    const missingCause = `\n| ${OUTCOME_DESCRIPTION.missing} |`;
    const afterMissingCause = md.slice(md.indexOf(missingCause) + missingCause.length);
    expect(md).toContain(missingCause);
    expect(afterMissingCause).toMatch(/^[^\d]*2 \|/);
  });

  let threeScenarioRowsPlusUnnamedClaimRow: Ledger;
  beforeEach(() => {
    threeScenarioRowsPlusUnnamedClaimRow = reconcile(
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
  });

  it("counts the unnamed claim's reconciliation in the evidence reconciliation's out-of-balance column (N+1 | N | 1, never N | N | 0)", () => {
    const md = renderMarkdown(__er(threeScenarioRowsPlusUnnamedClaimRow), ctx);
    expect(md).toContain("| Claim Reconciliation | 4 | 3 | 1 |");
    expect(md).not.toContain("| Claim Reconciliation | 3 | 3 | 0 |");
  });
});

describe("[SCN-RPT-005] the markdown report lists the fitness evidence obligations as their own section", () => {
  let spanning: Ledger;
  beforeEach(() => {
    spanning = reconcile(
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
        { qualityCheck: "fitness", fitnessFunction: "lint:guard-typecheck", scnId: "SCN-A", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "fitness", fitnessFunction: "lint:guard-lint", scnId: "SCN-B", exists: true, enforcedOverRealSource: false },
      ]
    );
  });

  it("renders a '### Fitness evidence obligations' table with each fitness row's scenario and its outcome's sentence — including the watermelon", () => {
    const md = renderMarkdown(__er(spanning), ctx);

    expect(md).toContain("### Fitness evidence obligations");
    expect(md).toContain("1 of 2 fitness evidence obligations reconcile satisfied.");
    expect(md).toContain("| Scenario | Outcome |");
    expect(md).not.toContain("| Scenario | Fitness function | Outcome |");
    expect(md).toContain(`| SCN-A | ${OUTCOME_DESCRIPTION.satisfied} |`);
    expect(md).toContain(`| SCN-B | ${OUTCOME_DESCRIPTION.watermelon} |`);
  });

  it("omits the section entirely (total line and all) when no scenario names a fitness evidenceObligation", () => {
    const behaviouralOnly: Ledger = reconcile(
      [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }]
    );
    const md = renderMarkdown(__er(behaviouralOnly), ctx);
    expect(md).not.toContain("### Fitness evidence obligations");
    expect(md).not.toContain("fitness evidence obligations reconcile satisfied");
  });
});
