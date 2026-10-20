import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder } from "./renderedSection.test-utils.js";
import { unitTestsAndTypesCi as ci, feature } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

const scripts = { test: "vitest run", typecheck: "tsc --noEmit" };

const excludedStep = "ci.yml:quality:Types";
const strayEntry = "ci.yml:quality:Lint";

function reportLines(notChecks?: readonly string[]): string[] {
  const specController = notChecks === undefined ? {} : { notChecks };
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    untaggedScenarios: [],
    packageJson,
    ciWorkflows: parsedWorkflows([ci]),
    ciSourceNames: ["ci.yml"],
    behaviouralObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx).split("\n");
}

const heading = CORE_MESSAGES[CoreMessage.ExcludedStepsHeading];
const excludedLine = (step: string): string => `- ${CORE_MESSAGES[CoreMessage.StepExcluded](step)}`;
const unmatchedLine = (entry: string): string =>
  `- ${CORE_MESSAGES[CoreMessage.NotChecksEntryMatchesNoStep](entry)}`;

const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

describe("[SCN-RPT-048] a step named in `notChecks` is not a candidate, and is reported as excluded rather than dropped", () => {
  it("lists the excluded step on one line with its reason, under a heading and a blank line, then one blank line", () => {
    const lines = section(reportLines([excludedStep]));
    expect(lines).toStrictEqual([heading, "", excludedLine(excludedStep), ""]);
    expect(lines[2]).toContain(excludedStep);
  });

  it("lists an entry that names no step on its own line, when it is the only account", () => {
    const lines = section(reportLines([strayEntry]));
    expect(lines).toStrictEqual([heading, "", unmatchedLine(strayEntry), ""]);
    expect(lines[2]).toContain(strayEntry);
  });

  it("renders no section, and nothing in its place, for a target that names no step a non-check", () => {
    const lines = reportLines();
    expect(lines).not.toContain(heading);
    expect(lines.some((line) => line.includes(excludedStep) && line.startsWith("- "))).toBe(false);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
