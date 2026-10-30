import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder } from "./renderedSection.test-utils.js";
import {
  feature,
  reconcileStepAccounting,
  stepAccountingCi as ci,
} from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const label = "Runners:";

const stepAccounting = (reconciliation: EvidenceReconciliation): string[] =>
  sectionUnder(CORE_MESSAGES[CoreMessage.StepAccountingHeading])(
    renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n")
  );

const endOfTable = (section: readonly string[]): number => {
  const header = section.indexOf(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
  expect(header).toBeGreaterThanOrEqual(0);
  const end = section.indexOf("", header);
  expect(end).toBeGreaterThan(header);
  return end;
};

const withoutRunners = (): EvidenceReconciliation =>
  evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: {
      scripts: { test: "vitest run", "lint:sweep": "madge --circular" },
    } as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"],
    ciWorkflows: parsedWorkflows([ci], ["ci.yml"]),
    reconcilerInvocation: "spec-controller balance",
    behaviouralObservations: [],
    deferralTags: [],
  });

describe("[SCN-RPT-072] the step-accounting section lists each step that runs a declared runner beneath its table, and lists none when no step runs one", () => {
  it("lists the step that runs the declared runner under a Runners label beneath the table, before the Reconciler list", () => {
    const section = stepAccounting(reconcileStepAccounting([ci]));
    const tableEnd = endOfTable(section);
    const start = section.indexOf(label);

    expect(start).toBeGreaterThan(tableEnd);
    expect(section.slice(start, start + 4)).toStrictEqual([
      "Runners:",
      "- ci.yml:ci:Unit tests",
      "",
      "Reconciler:",
    ]);
  });

  it("prints no Runners label, and lists no runner step, where the target declares no runner", () => {
    const section = stepAccounting(withoutRunners());
    expect(section.length).toBeGreaterThan(0);
    expect(section).not.toContain(label);
    expect(section).not.toContain("- ci.yml:ci:Unit tests");
  });
});
