import { describe, it, expect } from "vitest";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
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

const spanStepsCi = `name: fixture CI
jobs:
  ci:
    steps:
      - name: "Checkout \`tools\`"
        uses: actions/checkout@v4
      - name: "Two\\nlines"
        uses: actions/setup-node@v4
      - name: Unit tests
        run: pnpm test
`;

const stepAccounting = (workflow: string): string[] =>
  sectionUnder(markdownHeading(3, coreMessage(CoreMessage.StepAccountingHeading)))(
    linesOf(reconcileStepAccounting([workflow]))
  );

describe("[CLM-RPT-073] the step-accounting section lists each GitHub plumbing step beneath its table, and lists none when no step is plumbing", () => {
  it("lists each GitHub plumbing step by its name under a GitHub plumbing label after the Non-checks list, in the order the steps were read", () => {
    const section = stepAccounting(stepAccountingCi);
    const nonChecks = section.indexOf("Non-checks:");
    const start = section.indexOf(label);

    expect(nonChecks).toBeGreaterThanOrEqual(0);
    expect(start).toBeGreaterThan(nonChecks);
    expect(section.slice(start)).toStrictEqual([
      "GitHub plumbing:",
      "- `ci.yml:ci:Checkout tools`",
      "- `ci.yml:ci:Setup Node`",
      "- `ci.yml:ci:Cache store`",
      "- `ci.yml:ci:Download build`",
      "- `ci.yml:ci:Upload report`",
      "",
    ]);
  });

  it.each([
    { step: "ci.yml:ci:Checkout `tools`", item: "- `` ci.yml:ci:Checkout `tools` ``" },
    { step: "ci.yml:ci:Two\nlines", item: '- `"ci.yml:ci:Two\\nlines"`' },
  ])("lists the GitHub plumbing step $step whole in its code span, as $item", ({ item }) => {
    const section = stepAccounting(spanStepsCi);
    const start = section.indexOf(label);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(section.slice(start)).toContain(item);
  });

  it("prints no GitHub plumbing label, and lists no plumbing step, for a pipeline with no plumbing step", () => {
    const section = stepAccounting(noPlumbingCi);
    expect(section.length).toBeGreaterThan(0);
    expect(section).not.toContain(label);
  });
});
