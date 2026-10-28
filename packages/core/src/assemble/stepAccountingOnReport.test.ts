import { describe, it, expect } from "vitest";
import { renderJson, renderMarkdown } from "./composers.js";
import { everyStepAccountedFor } from "../domain/uncitedFitnessFunctions.js";
import type { RenderInput } from "../domain/renderInput.js";
import { stepAccountingCi as ci, reconcileStepAccounting as reconcile } from "../evidenceReconciliation.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "../render/messages.js";
import { publishedExitCodeOf } from "../render/publishedExitCodes.test-utils.js";
import { sectionUnder } from "../render/renderedSection.test-utils.js";
import { sectionCtx as ctx } from "../render/runContext.test-utils.js";

const heading = CORE_MESSAGES[CoreMessage.StepAccountingHeading];

describe("[SCN-RMD-018] the JSON report's step accounting states whether every step the run read is accounted for, as the Markdown's step accounting does", () => {
  it("a run that read CI configuration states the domain's conclusion over its counts, and the Markdown's step accounting agrees", () => {
    const reconciliation = reconcile([ci]);
    const report = JSON.parse(renderJson(reconciliation, ctx)) as RenderInput;
    const md = renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");

    const accounting = report.summary.stepAccounting;
    expect(accounting).toBeDefined();
    expect(accounting!.everyStepAccountedFor).toBe(everyStepAccountedFor(reconciliation.summary.stepAccounting!));
    expect(accounting!.everyStepAccountedFor).toBe(true);
    expect(sectionUnder(heading)(md)[6]).toBe(`- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`);
  });

  it("a run that read no CI configuration carries no step accounting", () => {
    const reconciliation = reconcile([]);
    const report = JSON.parse(renderJson(reconciliation, ctx)) as RenderInput;
    const md = renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");

    expect(report.summary).not.toHaveProperty("stepAccounting");
    expect(md).not.toContain(heading);
  });
});
