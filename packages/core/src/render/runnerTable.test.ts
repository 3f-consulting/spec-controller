import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { renderMarkdown } from "./markdown.js";
import { sectionCtx as ctx } from "./runContext.testkit.js";
import { sectionUnder, cells } from "./renderedSection.testkit.js";
import { unitTestsCi as ci, feature } from "../evidenceReconciliation.testkit.js";

function reportLines(runners: Record<string, string | null>): string[] {
  const reconciliation = evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson: {
      scripts: { test: "vitest run" },
      specController: { runners, notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install"] },
    },
    ciSources: [ci],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx).split("\n");
}

const heading = CORE_MESSAGES[CoreMessage.BehaviouralRunnersHeading];
const tableHeader = CORE_MESSAGES[CoreMessage.BehaviouralRunnersTableHeader];
const separator = "| --- | --- | --- |";

const section = sectionUnder(heading);

const accountLines = (lines: readonly string[]): string[] => lines.filter((line) => line.startsWith("- "));

const allNamed = { unit: "vitest", integration: "cucumber-js", e2e: "playwright", performance: "k6" };

describe("[SCN-USG-011] a step running `pnpm test` is the unit runner when the manifest's `test` script runs vitest", () => {
  it("tables the unit tier, vitest and the step that runs it, under the heading, header and separator", () => {
    const lines = section(reportLines(allNamed));

    expect(lines[0]).toBe("### Behavioural runners");
    expect(lines.slice(0, 4)).toStrictEqual([heading, "", tableHeader, separator]);
    const rows = lines.slice(4).filter((line) => line.startsWith("| "));
    expect(rows).toHaveLength(1);
    expect(cells(rows[0] ?? "")).toStrictEqual(["unit", "vitest", "Unit tests"]);
    expect(lines).toStrictEqual([heading, "", tableHeader, separator, rows[0], ""]);
    expect(accountLines(lines)).toStrictEqual([]);
  });

  it("puts the table before the account of a null tier, with one blank line between", () => {
    const lines = section(reportLines({ ...allNamed, performance: null }));
    const namesNone = `- ${CORE_MESSAGES[CoreMessage.RunnerTierNamesNone]("performance")}`;

    expect(lines.slice(0, 4)).toStrictEqual([heading, "", tableHeader, separator]);
    expect(cells(lines[4] ?? "")).toStrictEqual(["unit", "vitest", "Unit tests"]);
    expect(lines.slice(5)).toStrictEqual(["", namesNone, ""]);
  });
});
