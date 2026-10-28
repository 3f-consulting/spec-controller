import { describe, it, expect } from "vitest";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { renderMarkdown } from "../assemble/composers.js";
import { renderReportFromJson } from "../assemble/composers.js";
import { assembleRenderInput } from "../assemble/renderInput.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder, cells } from "./renderedSection.test-utils.js";
import { stepAccountingCi as ci, reconcileStepAccounting as reconcile } from "../evidenceReconciliation.test-utils.js";
import { HANDED_INPUT_NAMES } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const heading = CORE_MESSAGES[CoreMessage.StepAccountingHeading];

const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

describe("[SCN-RPT-052] candidates, runners, the reconciler, the excluded and GitHub's plumbing sum to the steps read", () => {
  it("tables each count the assembler computed under its header, then states that every step read is accounted for", () => {
    const reconciliation = reconcile([ci]);
    const accounting = reconciliation.summary.stepAccounting;
    expect(accounting).toStrictEqual({
      stepsRead: 15,
      candidates: 4,
      runners: 1,
      reconciler: 2,
      excluded: 3,
      plumbing: 5,
      accountedFor: 15,
    });
    const lines = section(renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n"));
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe(heading);
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
    expect(lines[3]).toBe("| --- | --- | --- | --- | --- | --- | --- |");
    expect(lines[4]).toBe("| 15 | 4 | 1 | 2 | 3 | 5 | 15 |");
    expect(cells(lines[4]!)).toStrictEqual(
      [
        accounting!.stepsRead,
        accounting!.candidates,
        accounting!.runners,
        accounting!.reconciler,
        accounting!.excluded,
        accounting!.plumbing,
        accounting!.accountedFor,
      ].map(String)
    );
    expect(cells(lines[2]!)).toHaveLength(7);
    expect(lines[5]).toBe("");
    expect(lines[6]).toBe(`- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`);
    expect(lines[7]).toBe("");
    expect(lines).toStrictEqual([
      "### Step accounting",
      "",
      "| Steps read | Candidates | Runners | Reconciler | Excluded | GitHub plumbing | Accounted for |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      "| 15 | 4 | 1 | 2 | 3 | 5 | 15 |",
      "",
      "- every step this run read is accounted for.",
      "",
    ]);
  });

  it("re-renders a saved run whose accounting predates the plumbing count with nought in that cell", () => {
    const report = assembleRenderInput(reconcile([ci]), ctx);
    const saved = JSON.stringify({
      ...report,
      summary: {
        ...report.summary,
        stepAccounting: { stepsRead: 10, candidates: 4, runners: 1, reconciler: 2, excluded: 3, accountedFor: 10 },
      },
    });
    expect(section(renderReportFromJson(saved, HANDED_INPUT_NAMES, publishedExitCodeOf).split("\n"))).toStrictEqual([
      "### Step accounting",
      "",
      "| Steps read | Candidates | Runners | Reconciler | Excluded | GitHub plumbing | Accounted for |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      "| 10 | 4 | 1 | 2 | 3 | 0 | 10 |",
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
