import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { entryOf } from "./inputErrorEntry.test-utils.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder } from "./renderedSection.test-utils.js";
import { unitTestsAndLintCi as ci, feature } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

function reportLines(runners: Record<string, string | null>, otherKeys: Record<string, unknown> = {}): string[] {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: {
      scripts: { test: "vitest run", lint: "eslint ." },
      specController: {
        runners,
        notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install"],
        ...otherKeys,
      },
    },
    ciWorkflows: parsedWorkflows([ci], ["ci.yml"]),
    behaviouralObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");
}

const heading = CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading];
const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

const notALayer = (key: string): string =>
  entryOf(coreMessage(CoreMessage.RunnerKeyNotALayer, { key: `\`specController.runners.${key}\`` }));

const notRead = (key: string): string =>
  entryOf(coreMessage(CoreMessage.ConfigurationUnknownKey, { key: `\`specController.${key}\`` }));

describe("[SCN-RPT-053] each runners key outside the four layers is named under Configuration not read, after the keys the specController block does not read", () => {
  it("gives a target whose only unread configuration is a key outside the four layers the whole section, naming that key", () => {
    const lines = reportLines({ unit: "jest", integration: "cucumber-js", e2e: "playwright", performance: "k6", lint: "eslint" });

    expect(section(lines)).toStrictEqual([
      heading,
      "",
      coreMessage(CoreMessage.ConfigurationNotReadIntro),
      "",
      notALayer("lint"),
      "",
    ]);
  });

  it("names the key after the keys the specController block does not read", () => {
    const lines = reportLines({ unit: "vitest", lint: "eslint" }, { fitnessChecks: [] });

    expect(section(lines).filter((line) => line.startsWith("- "))).toStrictEqual([
      notRead("fitnessChecks"),
      notALayer("lint"),
    ]);
  });

  it("prints no Behavioural runners section", () => {
    const lines = reportLines({ unit: "vitest", lint: "eslint" });

    expect(lines.some((line) => line.includes("Behavioural runners"))).toBe(false);
  });
});
