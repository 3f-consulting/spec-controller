import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder, cells } from "./renderedSection.test-utils.js";
import { unitTestsCi as ci, nightly, feature, discoveryScopePackageJson as packageJson } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

function reconcile(
  workflowSources: readonly string[],
  files?: readonly string[]
): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows(workflowSources, files),
    behaviouralObservations: [],
    deferralTags: [],
  });
}

const heading = CORE_MESSAGES[CoreMessage.DiscoveryScopeHeading];
const tableHeader = CORE_MESSAGES[CoreMessage.DiscoveryScopeTableHeader];

const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

function rendered(reconciliation: EvidenceReconciliation): string[] {
  return section(renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n"));
}

describe("[SCN-RPT-047] the report names the workflows, the jobs and the step count discovery ranged over", () => {
  it("tables each workflow and job it read from the step accounting's rows, with its steps and candidates, one row each in the settled order", () => {
    const reconciliation = reconcile([nightly, ci], ["nightly.yml", "ci.yml"]);
    const rows = reconciliation.summary.stepAccounting?.byJob;
    expect(rows).toHaveLength(3);
    const lines = rendered(reconciliation);
    expect(lines).toHaveLength(8);
    expect(lines.slice(0, 3)).toStrictEqual([
      "### Discovery scope",
      "",
      "| Workflow | Job | Steps read | Candidates |",
    ]);
    expect(lines[0]).toBe(heading);
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe(tableHeader);
    expect(cells(lines[2]!)).toHaveLength(4);
    expect(lines[3]).toBe("| --- | --- | --- | --- |");
    expect(lines.slice(4, 7)).toStrictEqual([
      "| ci.yml | quality | 3 | 1 |",
      "| nightly.yml | audit | 1 | 1 |",
      "| nightly.yml | sweep | 2 | 2 |",
    ]);
    expect(lines.slice(4, 7).map(cells)).toStrictEqual(
      rows!.map(({ workflow, job, stepsRead, candidates }) => [workflow, job, String(stepsRead), String(candidates)])
    );
    expect(lines.at(-1)).toBe("");
  });

  it("renders no section, and nothing in its place, for a target with no pipeline", () => {
    const reconciliation = reconcile([], []);
    expect(reconciliation.summary).not.toHaveProperty("stepAccounting");
    const lines = renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");
    expect(lines).not.toContain(heading);
    expect(lines).not.toContain(tableHeader);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
