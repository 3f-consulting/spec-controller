import { describe, it, expect } from "vitest";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { linesOf, sectionUnder } from "./renderedSection.test-utils.js";
import { reconcileStepAccounting, stepAccountingCi } from "../evidenceReconciliation.test-utils.js";

const label = "GitHub plumbing:";

const noPlumbingCi = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Reconciliation
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
`;

const stepAccounting = (workflow: string): string[] =>
  sectionUnder(CORE_MESSAGES[CoreMessage.StepAccountingHeading])(
    linesOf(reconcileStepAccounting([workflow]))
  );

describe("[SCN-RPT-073] the step-accounting section lists each GitHub plumbing step beneath its table, and lists none when no step is plumbing", () => {
  it("lists each GitHub plumbing step by its name under a GitHub plumbing label after the Excluded list, in the order the steps were read", () => {
    const section = stepAccounting(stepAccountingCi);
    const excluded = section.indexOf("Excluded:");
    const start = section.indexOf(label);

    expect(excluded).toBeGreaterThanOrEqual(0);
    expect(start).toBeGreaterThan(excluded);
    expect(section.slice(start)).toStrictEqual([
      "GitHub plumbing:",
      "- ci.yml:ci:Checkout tools",
      "- ci.yml:ci:Setup Node",
      "- ci.yml:ci:Cache store",
      "- ci.yml:ci:Download build",
      "- ci.yml:ci:Upload report",
      "",
    ]);
  });

  it("prints no GitHub plumbing label, and lists no plumbing step, for a pipeline with no plumbing step", () => {
    const section = stepAccounting(noPlumbingCi);
    expect(section.length).toBeGreaterThan(0);
    expect(section).not.toContain(label);
  });
});
