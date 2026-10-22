import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder } from "./renderedSection.test-utils.js";
import { reconcilerCi as ci, ciWithoutReconciler, feature, reconcilerPackageJson as packageJson } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

function reportLines(ciSource: string): string[] {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    untaggedScenarios: [],
    packageJson,
    ciWorkflows: parsedWorkflows([ciSource]),
    reconcilerInvocation: "spec-controller balance",
    behaviouralObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");
}

const heading = CORE_MESSAGES[CoreMessage.ReconcilerHeading];
const reconciles = CORE_MESSAGES[CoreMessage.ReconcilerReconciles];
const records = CORE_MESSAGES[CoreMessage.ReconcilerRecords];
const stepLine = (step: string, whatItIs: string): string =>
  `- ${CORE_MESSAGES[CoreMessage.ReconcilerStep](step, whatItIs)}`;

const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

describe("[SCN-RPT-050] the balance step and its step-record dump are not candidates, and no configuration says so", () => {
  it("names each reconciler step on its own list line, with what that step does, under a heading and a blank line", () => {
    const lines = section(reportLines(ci));
    const dump = "ci.yml:ci:Dump this run's step record";
    const balance = "ci.yml:ci:Self-reconciliation balance";

    expect(reconciles).not.toBe(records);
    expect(lines.slice(0, 2)).toStrictEqual([heading, ""]);
    expect(lines.slice(2, 4)).toStrictEqual([stepLine(dump, records), stepLine(balance, reconciles)]);
    expect(lines.filter((line) => line.startsWith("- "))).toHaveLength(2);
    expect(lines[2]).toContain(dump);
    expect(lines[3]).toContain(balance);
    expect(reportLines(ci)).not.toContain(CORE_MESSAGES[CoreMessage.ExcludedStepsHeading]);
  });

  it("follows the list with exactly one blank line before the next section", () => {
    const lines = section(reportLines(ci));
    expect(lines).toHaveLength(5);
    expect(lines.at(-1)).toBe("");
    expect(lines.at(-2)).not.toBe("");
  });

  it("renders no section, and nothing in its place, for a pipeline that runs no reconciliation", () => {
    const lines = reportLines(ciWithoutReconciler);
    expect(lines).not.toContain(heading);
    expect(lines.some((line) => line.includes(reconciles) || line.includes(records))).toBe(false);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
