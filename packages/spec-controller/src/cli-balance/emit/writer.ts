/**
 * The output WRITER — the impure app-layer that realises an `OutputPlan` (the
 * three-layer split). For each planned output it renders
 * the payload via the PURE renderers (`renderMarkdown` / `renderJson` in `src/render/`)
 * and performs the IO: stdout, or a file.
 *
 * This is the ONLY layer that performs IO — the renderers stay pure (`model → string`)
 * and `planOutput` stays pure (parse+validate). So the writer carries the `@integration`
 * evidence: its real stdout/file effect is asserted directly (the anti-watermelon rule),
 * never a re-run of the `planOutput` `@unit`.
 *
 * FMT-001 (`@SCN-FMT-001`) writes markdown to stdout. The `json` format (FMT-002) and the
 * file destination (FMT-002/003) are wired on the same `render` + `dest` switch below as
 * later sub-issues plan them.
 *
 * Parent: @SCN-FMT-001 — the output-dispatch rework.
 */

import { writeFileSync } from "node:fs";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import { renderJson } from "@3f-consulting/spec-controller-core";
import type { FeatureNames } from "@3f-consulting/spec-controller-core";
import type { OutputFormat, OutputPlan } from "./format.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import type { EvidenceObligations } from "@3f-consulting/spec-controller-core";
import type { RuntimeEvidenceObservationKindCounts } from "@3f-consulting/spec-controller-core";
import type { StaticEvidenceObservationKindCounts } from "@3f-consulting/spec-controller-core";
import type { EvidenceReconciliation } from "@3f-consulting/spec-controller-core";

/**
 * The reconciliation payloads the writer renders — the balance plus its sibling reads
 * (ctx / corpus / evidenceObservations / guards / featureNames), exactly the arguments the pure
 * renderers take. Threaded from `cli.ts` (built once, rendered per planned output).
 */
export interface OutputPayloads {
  readonly balance: EvidenceReconciliation;
  readonly ctx: RunContext;
  readonly evidenceObligations?: EvidenceObligations;
  readonly evidenceObservations?: RuntimeEvidenceObservationKindCounts;
  readonly guards?: StaticEvidenceObservationKindCounts;
  readonly featureNames?: FeatureNames;
}

/** Render one format from the payloads via the matching pure renderer. */
function render(fmt: OutputFormat, p: OutputPayloads): string {
  return fmt === "json"
    ? renderJson(p.balance, p.ctx, p.evidenceObligations, p.evidenceObservations, p.guards, p.featureNames)
    : renderMarkdown(p.balance, p.ctx, p.evidenceObligations, p.evidenceObservations, p.featureNames, p.guards);
}

/**
 * Realise the plan: render each planned output and write it to its destination. The only
 * IO in the pipeline. FMT-001 exercises the markdown→stdout path.
 */
export function writeOutputs(plan: OutputPlan, payloads: OutputPayloads): void {
  for (const output of plan.outputs) {
    const rendered = render(output.fmt, payloads);
    switch (output.dest.kind) {
      case "stdout":
        // Trailing newline so the report ends cleanly on a terminal — FMT-001's path.
        process.stdout.write(rendered + "\n");
        break;
      case "file":
        // The file destination (FMT-002/003) — same rendered bytes, to a caller path.
        writeFileSync(output.dest.path, rendered + "\n", "utf8");
        break;
    }
  }
}
