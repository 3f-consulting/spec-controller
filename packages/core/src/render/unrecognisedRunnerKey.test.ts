import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { renderMarkdown } from "./markdown.js";
import { sectionCtx as ctx } from "./runContext.testkit.js";
import { sectionUnder } from "./renderedSection.testkit.js";
import { unitTestsAndLintCi as ci, feature } from "../evidenceReconciliation.testkit.js";

const tiers = ["unit", "integration", "e2e", "performance"];

function reportLines(runners: Record<string, string | null>): string[] {
  const reconciliation = evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson: {
      scripts: { test: "vitest run", lint: "eslint ." },
      specController: {
        runners,
        notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install"],
      },
    },
    ciSources: [ci],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx).split("\n");
}

const heading = CORE_MESSAGES[CoreMessage.BehaviouralRunnersHeading];

const section = sectionUnder(heading);

const notATier = (key: string): string => `- ${CORE_MESSAGES[CoreMessage.RunnerKeyNotATier](key)}`;

describe("[SCN-USG-019] a runners key that is not one of the four tiers is reported, never silently honoured", () => {
  it("renders the section for a key outside the four tiers alone, naming that key and no tier", () => {
    const lines = section(
      reportLines({ unit: "jest", integration: "cucumber-js", e2e: "playwright", performance: "k6", lint: "eslint" })
    );
    const account = lines.filter((line) => line.startsWith("- "));

    expect(account).toStrictEqual([notATier("lint")]);
    for (const tier of tiers) {
      expect(account.some((line) => line.includes(tier))).toBe(false);
    }
    expect(lines.some((line) => line.startsWith("| "))).toBe(false);
    expect(lines).toStrictEqual([heading, "", notATier("lint"), ""]);
  });

  it("names the key after the tiers the target has not said, beneath the tier it recognises", () => {
    expect(section(reportLines({ unit: "vitest", lint: "eslint" }))).toStrictEqual([
      "### Behavioural runners",
      "",
      "| Tier | Runner | Recognised at |",
      "| --- | --- | --- |",
      "| unit | vitest | Unit tests |",
      "",
      "- integration — unnamed: the target has not said.",
      "- e2e — unnamed: the target has not said.",
      "- performance — unnamed: the target has not said.",
      "- lint — not a tier: the runner block is keyed by the four canon tiers, and this key excludes nothing.",
      "",
    ]);
  });
});
