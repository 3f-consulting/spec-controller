import { describe, it, expect } from "vitest";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { renderMarkdown } from "./markdown.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder, cells } from "./renderedSection.test-utils.js";
import { stepAccountingCi as ci, reconcileStepAccounting as reconcile } from "../evidenceReconciliation.test-utils.js";

const heading = CORE_MESSAGES[CoreMessage.StepAccountingHeading];

const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

describe("[SCN-USG-018] candidates, runners, the reconciler and the excluded sum to the steps read", () => {
  it("tables each count the assembler computed under its header, then states that every step read is accounted for", () => {
    const reconciliation = reconcile([ci]);
    const accounting = reconciliation.summary.stepAccounting;
    expect(accounting).toStrictEqual({
      stepsRead: 10,
      candidates: 4,
      runners: 1,
      reconciler: 2,
      excluded: 3,
      accountedFor: 10,
    });
    const lines = section(renderMarkdown(reconciliation, ctx).split("\n"));
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe(heading);
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
    expect(lines[3]).toBe("| --- | --- | --- | --- | --- | --- |");
    expect(lines[4]).toBe("| 10 | 4 | 1 | 2 | 3 | 10 |");
    expect(cells(lines[4]!)).toStrictEqual(
      [
        accounting!.stepsRead,
        accounting!.candidates,
        accounting!.runners,
        accounting!.reconciler,
        accounting!.excluded,
        accounting!.accountedFor,
      ].map(String)
    );
    expect(cells(lines[2]!)).toHaveLength(6);
    expect(lines[5]).toBe("");
    expect(lines[6]).toBe(`- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`);
    expect(lines[7]).toBe("");
    expect(lines).toStrictEqual([
      "### Step accounting",
      "",
      "| Steps read | Candidates | Runners | Reconciler | Excluded | Accounted for |",
      "| --- | --- | --- | --- | --- | --- |",
      "| 10 | 4 | 1 | 2 | 3 | 10 |",
      "",
      "- every step this run read is accounted for.",
      "",
    ]);
  });

  it("renders no section, and nothing in its place, where the run read no CI configuration", () => {
    const lines = renderMarkdown(reconcile([]), ctx).split("\n");
    expect(lines).not.toContain(heading);
    expect(lines).not.toContain(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
    expect(lines).not.toContain(`- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
