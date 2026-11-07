import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import { entryOf } from "./inputErrorEntry.test-utils.js";
import { codeSpan } from "./codeSpan.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder } from "./renderedSection.test-utils.js";
import { unitTestsAndLintCi as ci, feature } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

interface Target {
  readonly entry: string;
  readonly workflowsRead: readonly string[];
  readonly runners?: Record<string, string | null>;
}

function reportOf({ entry, workflowsRead, runners }: Target) {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: {
      scripts: { test: "vitest run", lint: "eslint ." },
      specController: { notChecks: [entry], ...(runners === undefined ? {} : { runners }) },
    },
    ciWorkflows: parsedWorkflows(workflowsRead.map(() => ci), workflowsRead),
    behaviouralObservations: [],
    deferralTags: [],
  });
  return { reconciliation, lines: renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n") };
}

const heading = (): string => markdownHeading(3, coreMessage(CoreMessage.ConfigurationNotReadHeading));
const section = (lines: readonly string[]): string[] | undefined => (lines.includes(heading()) ? sectionUnder(heading())(lines) : undefined);

const named = (entry: string): string => entryOf(coreMessage(CoreMessage.NotChecksEntryMatchesNoStep, { key: "`specController.notChecks`", entry: `\`${entry}\`` }));
const notAStepName = (entry: string): string =>
  entryOf(coreMessage(CoreMessage.NotChecksEntryNotAStepName, { key: "`specController.notChecks`", entry: codeSpan(entry) }));
const notALayer = (): string => entryOf(coreMessage(CoreMessage.RunnerKeyNotALayer, { key: "`specController.runners.lint`" }));

describe("[CLM-RPT-078] a notChecks entry that matches no step of a workflow the run read is named by its key under Configuration not read, and an entry naming a workflow the run did not read is not, whatever its workflow file's name holds", () => {
  it.each([
    { entry: "ci.yml:quality:Deploy", workflowsRead: ["ci.yml"], judged: ["ci.yml:quality:Deploy"] },
    { entry: "ci.yml:quality:Deploy", workflowsRead: [], judged: undefined },
    { entry: "ci.yml:quality:Deploy", workflowsRead: ["release.yml"], judged: undefined },
    { entry: "a:b.yml:quality:Deploy", workflowsRead: ["a:b.yml"], judged: ["a:b.yml:quality:Deploy"] },
  ])("judges $entry, reading $workflowsRead, as $judged", ({ entry, workflowsRead, judged }) => {
    const { reconciliation, lines } = reportOf({ entry, workflowsRead });

    expect(reconciliation.summary.nonChecksMatchingNoStep).toStrictEqual(judged);
    expect(section(lines)).toStrictEqual(
      judged && [heading(), "", coreMessage(CoreMessage.ConfigurationNotReadIntro), "", ...judged.map(named), ""]
    );
  });

  it("names the entry last, after a runners key outside the four layers", () => {
    const { lines } = reportOf({ entry: "ci.yml:quality:Deploy", workflowsRead: ["ci.yml"], runners: { unit: "vitest", lint: "eslint" } });

    expect(section(lines)?.filter((line) => line.startsWith("- "))).toStrictEqual([notALayer(), named("ci.yml:quality:Deploy")]);
  });
});

describe("[CLM-RPT-087] a notChecks entry that does not name a workflow, a job and a step is named under Configuration not read as not naming a step", () => {
  it.each([
    { entry: "Deploy", workflowsRead: [] },
    { entry: "Deploy", workflowsRead: ["ci.yml"] },
    { entry: "quality:Deploy", workflowsRead: [] },
    { entry: "quality:Deploy", workflowsRead: ["ci.yml"] },
    { entry: "quality:Run: tests", workflowsRead: ["ci.yml"] },
    { entry: "a:b.yml:Deploy", workflowsRead: ["a:b.yml"] },
    { entry: "Makefile:build:x", workflowsRead: ["ci.yml"] },
    { entry: "", workflowsRead: ["ci.yml"] },
    { entry: "ci.yml::Test", workflowsRead: ["ci.yml"] },
    { entry: "ci.yml:build:", workflowsRead: ["ci.yml"] },
    { entry: "other.yml:build", workflowsRead: ["ci.yml"] },
    { entry: "a.yml:b.yml:quality", workflowsRead: ["a.yml", "a.yml:b.yml"] },
  ])("names $entry, reading $workflowsRead, as not naming a step", ({ entry, workflowsRead }) => {
    const { reconciliation, lines } = reportOf({ entry, workflowsRead });
    const { nonChecksNotAStepName, nonChecksMatchingNoStep, stepAccounting } = reconciliation.summary;

    expect([nonChecksNotAStepName, nonChecksMatchingNoStep, stepAccounting?.nonChecksNamingAWorkflowNotRead]).toStrictEqual([[entry], undefined, undefined]);
    expect(section(lines)).toStrictEqual([heading(), "", coreMessage(CoreMessage.ConfigurationNotReadIntro), "", notAStepName(entry), ""]);
  });

  it.each([
    { entry: "ci.yml:build:Test:", workflowsRead: ["ci.yml"], lands: { matchingNoStep: ["ci.yml:build:Test:"], notApplied: undefined } },
    { entry: "ci.yml:build::", workflowsRead: ["ci.yml"], lands: { matchingNoStep: ["ci.yml:build::"], notApplied: undefined } },
    { entry: "ci.yml:build:Run: lint", workflowsRead: ["ci.yml"], lands: { matchingNoStep: ["ci.yml:build:Run: lint"], notApplied: undefined } },
    { entry: "x.yaml:build:Test", workflowsRead: ["ci.yml"], lands: { matchingNoStep: undefined, notApplied: ["x.yaml:build:Test"] } },
    { entry: "x.yml:b:Test", workflowsRead: ["ci.yml"], lands: { matchingNoStep: undefined, notApplied: ["x.yml:b:Test"] } },
    { entry: "a.yml:b.yml:job:step", workflowsRead: ["a.yml"], lands: { matchingNoStep: ["a.yml:b.yml:job:step"], notApplied: undefined } },
  ])("does not name $entry, reading $workflowsRead, as not naming a step", ({ entry, workflowsRead, lands }) => {
    const { reconciliation, lines } = reportOf({ entry, workflowsRead });
    const { nonChecksNotAStepName, nonChecksMatchingNoStep, stepAccounting } = reconciliation.summary;

    expect({
      notAStepName: nonChecksNotAStepName,
      matchingNoStep: nonChecksMatchingNoStep,
      notApplied: stepAccounting?.nonChecksNamingAWorkflowNotRead,
    }).toStrictEqual({ notAStepName: undefined, ...lands });
    expect(section(lines) ?? []).not.toContain(notAStepName(entry));
  });
});
