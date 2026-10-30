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
  readonly readsCiSteps: boolean;
  readonly runners?: Record<string, string | null>;
}

function reportOf({ readsCiSteps, runners }: Target) {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: {
      scripts: { test: "vitest run", lint: "eslint ." },
      specController: {
        notChecks: ["ci.yml:quality:Deploy"],
        ...(runners === undefined ? {} : { runners }),
      },
    },
    ciWorkflows: readsCiSteps ? parsedWorkflows([ci], ["ci.yml"]) : [],
    behaviouralObservations: [],
    deferralTags: [],
  });
  return { reconciliation, lines: renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n") };
}

const heading = CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading];
const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

const matchesNoStep = (): string => `- ${CORE_MESSAGES[CoreMessage.NotChecksEntryMatchesNoStep]("ci.yml:quality:Deploy")}`;
const notATier = (): string => `- ${CORE_MESSAGES[CoreMessage.RunnerKeyNotATier]("`specController.runners.lint`")}`;

describe("[SCN-RPT-078] a notChecks entry that matches no step is named under Configuration not read, whether or not the run read any CI step", () => {
  it.each([
    { readsCiSteps: true, stepAccounting: "present" },
    { readsCiSteps: false, stepAccounting: "absent" },
  ])("gives an entry that matches no step, alone, the whole part, with step accounting $stepAccounting", ({ readsCiSteps }) => {
    const { reconciliation, lines } = reportOf({ readsCiSteps });

    expect(reconciliation.summary.stepAccounting !== undefined).toBe(readsCiSteps);
    expect(section(lines)).toStrictEqual([
      heading,
      "",
      CORE_MESSAGES[CoreMessage.ConfigurationNotReadIntro],
      "",
      matchesNoStep(),
      "",
    ]);
  });

  it.each([true, false])("names the entry last, after a runners key outside the four tiers (reads CI steps: %s)", (readsCiSteps) => {
    const { lines } = reportOf({ readsCiSteps, runners: { unit: "vitest", lint: "eslint" } });

    expect(section(lines).filter((line) => line.startsWith("- "))).toStrictEqual([notATier(), matchesNoStep()]);
  });
});
