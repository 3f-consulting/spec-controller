import { relativizeToRoot } from "../lib/portablePath.js";
import { INPUT_FLAGS, type ProvenanceObject, type RunContext, type RunInputs } from "../domain/runProvenance.js";

function formatUtc(instant: Date): string {
  return instant.toISOString().replace(/\.\d+Z/, "Z");
}

function presentInputs(inputs: RunInputs, root: string | undefined): RunInputs {
  return Object.fromEntries(
    INPUT_FLAGS.flatMap(({ key }) => {
      const value = inputs[key];
      return typeof value === "string" && value.trim() !== "" ? [[key, relativizeToRoot(value, root)]] : [];
    })
  );
}

export function provenanceObject(ctx: RunContext): ProvenanceObject {
  return {
    target: ctx.target,
    sourceSha: ctx.sourceSha,
    toolSha: ctx.toolSha ?? null,
    toolVersion: ctx.toolVersion ?? "unknown",
    runTimestamp: formatUtc(ctx.runStart),
    inputs: presentInputs(ctx.inputs, ctx.root),
    strict: ctx.strict === true,
  };
}
