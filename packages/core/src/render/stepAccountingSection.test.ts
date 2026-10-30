import { describe, it, expect } from "vitest";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder } from "./renderedSection.test-utils.js";
import {
  stepAccountingCi as ci,
  nightly,
  reconcileStepAccounting as reconcile,
} from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const heading = CORE_MESSAGES[CoreMessage.StepAccountingHeading];

const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

describe("[SCN-RPT-052] the step-accounting section tables a row per workflow and job read, a total row when more than one job was read, and states that every step read is accounted for", () => {
  const throughVerdict = (reconciliation: ReturnType<typeof reconcile>): string[] => {
    const lines = section(renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n"));
    const verdict = lines.indexOf(`- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`);
    expect(verdict).toBeGreaterThan(0);
    return lines.slice(0, verdict + 2);
  };

  it("tables the one job read as one row, with no total row, then states that every step read is accounted for", () => {
    expect(throughVerdict(reconcile([ci]))).toStrictEqual([
      "### Step accounting",
      "",
      "| Workflow | Job | Steps read | Candidates | Runners | Reconciler | Excluded | GitHub plumbing | Accounted for |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      "| ci.yml | ci | 15 | 4 | 1 | 2 | 3 | 5 | 15 |",
      "",
      "- every step this run read is accounted for.",
      "",
    ]);
  });

  it("tables each job read as a row, by workflow then job, then a total row, then states that every step read is accounted for", () => {
    expect(throughVerdict(reconcile([nightly, ci], ["nightly.yml", "ci.yml"]))).toStrictEqual([
      "### Step accounting",
      "",
      "| Workflow | Job | Steps read | Candidates | Runners | Reconciler | Excluded | GitHub plumbing | Accounted for |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      "| ci.yml | ci | 15 | 4 | 1 | 2 | 3 | 5 | 15 |",
      "| nightly.yml | audit | 1 | 1 | 0 | 0 | 0 | 0 | 1 |",
      "| nightly.yml | sweep | 2 | 2 | 0 | 0 | 0 | 0 | 2 |",
      "| Total | | 18 | 7 | 1 | 2 | 3 | 5 | 18 |",
      "",
      "- every step this run read is accounted for.",
      "",
    ]);
  });

  it("renders no section, and nothing in its place, where the run read no CI configuration", () => {
    const lines = renderMarkdown(reconcile([]), ctx, publishedExitCodeOf).split("\n");
    expect(lines).not.toContain(heading);
    expect(lines).not.toContain(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
    expect(lines).not.toContain(`- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
