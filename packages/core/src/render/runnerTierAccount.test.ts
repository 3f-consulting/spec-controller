import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder } from "./renderedSection.test-utils.js";
import { unitTestsCi as ci, feature } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

function reconcile(runners?: Record<string, string | null>) {
  const specController = runners === undefined ? {} : { runners };
  const packageJson = { scripts: { test: "vitest run" }, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    untaggedScenarios: [],
    packageJson,
    ciWorkflows: parsedWorkflows([ci]),
    ciSourceNames: ["ci.yml"],
    behaviouralObservations: [],
    deferralTags: [],
  });
}

const heading = CORE_MESSAGES[CoreMessage.BehaviouralRunnersHeading];

function reportLines(runners?: Record<string, string | null>): string[] {
  return renderMarkdown(reconcile(runners), ctx).split("\n");
}

const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

const accountLines = (lines: readonly string[]): string[] => lines.filter((line) => line.startsWith("- "));

const namesNone = (tier: string): string => `- ${CORE_MESSAGES[CoreMessage.RunnerTierNamesNone](tier)}`;
const unnamed = (tier: string): string => `- ${CORE_MESSAGES[CoreMessage.RunnerTierUnnamed](tier)}`;

describe("[SCN-RPT-051] a null runner reports the tier as having none, and an absent key reports it as unnamed", () => {
  it("accounts for the null tier as having none and the omitted tier as unnamed, and for no named tier", () => {
    const lines = section(reportLines({ unit: "vitest", integration: "cucumber-js", performance: null }));
    const account = accountLines(lines);

    expect(account.filter((line) => line === namesNone("performance"))).toHaveLength(1);
    expect(account.filter((line) => line === unnamed("e2e"))).toHaveLength(1);
    expect(account).toStrictEqual([unnamed("e2e"), namesNone("performance")]);
    for (const tier of ["unit", "integration"]) {
      expect(account.some((line) => line.includes(tier))).toBe(false);
    }
  });

  it("follows the account with exactly one blank line before the next section", () => {
    const lines = section(reportLines({ unit: "vitest", integration: "cucumber-js", performance: null }));
    const last = lines.lastIndexOf(namesNone("performance"));
    expect(lines.slice(last)).toStrictEqual([namesNone("performance"), ""]);
  });

  it("accounts for a null tier even when no runner the target names is recognised", () => {
    const lines = section(reportLines({ unit: "jest", performance: null }));
    expect(lines.slice(0, 2)).toStrictEqual([heading, ""]);
    expect(lines.some((line) => line.startsWith("| "))).toBe(false);
    expect(accountLines(lines)).toStrictEqual([unnamed("integration"), unnamed("e2e"), namesNone("performance")]);
    expect(accountLines(lines)).toStrictEqual([
      "- integration — unnamed: the target has not said.",
      "- e2e — unnamed: the target has not said.",
      "- performance — no runner: the target names none.",
    ]);
  });

  it("renders no section, and nothing in its place, for a target naming all four tiers when no runner is recognised", () => {
    const lines = reportLines({ unit: "jest", integration: "cucumber-js", e2e: "playwright", performance: "k6" });
    expect(lines).not.toContain(heading);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });

  it("leaves no account line and no trailing blank after the table when every tier is named", () => {
    const lines = section(
      reportLines({ unit: "vitest", integration: "cucumber-js", e2e: "playwright", performance: "k6" })
    );
    expect(accountLines(lines)).toStrictEqual([]);
    expect(lines.at(-1)).toBe("");
    expect(lines.at(-2)).not.toBe("");
  });

  it("renders no account lines for a target with no runners block", () => {
    const lines = reportLines();
    expect(lines).not.toContain(heading);
    for (const tier of ["unit", "integration", "e2e", "performance"]) {
      expect(lines).not.toContain(namesNone(tier));
      expect(lines).not.toContain(unnamed(tier));
    }
  });
});
