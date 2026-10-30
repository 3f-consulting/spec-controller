import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
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

const heading = CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading];
const section = (lines: readonly string[]): string[] | undefined => (lines.includes(heading) ? sectionUnder(heading)(lines) : undefined);

const named = (entry: string): string =>
  `- \`specController.notChecks\` entry \`${entry}\` matches no step of the workflows this run read, so it excludes nothing.`;
const notATier = (): string => `- ${CORE_MESSAGES[CoreMessage.RunnerKeyNotATier]("`specController.runners.lint`")}`;

describe("[SCN-RPT-078] a notChecks entry that matches no step of a workflow the run read is named by its key under Configuration not read, and an entry naming a workflow the run did not read is not", () => {
  it.each([
    { entry: "ci.yml:quality:Deploy", workflowsRead: ["ci.yml"], judged: ["ci.yml:quality:Deploy"] },
    { entry: "ci.yml:quality:Deploy", workflowsRead: [], judged: undefined },
    { entry: "ci.yml:quality:Deploy", workflowsRead: ["release.yml"], judged: undefined },
    { entry: "Deploy", workflowsRead: [], judged: ["Deploy"] },
  ])("judges $entry, reading $workflowsRead, as $judged", ({ entry, workflowsRead, judged }) => {
    const { reconciliation, lines } = reportOf({ entry, workflowsRead });

    expect(reconciliation.summary.nonChecksMatchingNoStep).toStrictEqual(judged);
    expect(section(lines)).toStrictEqual(
      judged && [heading, "", CORE_MESSAGES[CoreMessage.ConfigurationNotReadIntro], "", ...judged.map(named), ""]
    );
  });

  it("names the entry last, after a runners key outside the four tiers", () => {
    const { lines } = reportOf({ entry: "ci.yml:quality:Deploy", workflowsRead: ["ci.yml"], runners: { unit: "vitest", lint: "eslint" } });

    expect(section(lines)?.filter((line) => line.startsWith("- "))).toStrictEqual([notATier(), named("ci.yml:quality:Deploy")]);
  });
});
