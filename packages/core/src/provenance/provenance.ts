import { relativizeToRoot } from "../lib/portablePath.js";
import { type ProvenanceObject, type RunContext, type RunInput, type RunInputs } from "../domain/runProvenance.js";

function formatUtc(instant: Date): string {
  return instant.toISOString().replace(/\.\d+Z/, "Z");
}

function presentInputs(inputs: readonly RunInput[], root: string | undefined): RunInputs {
  return Object.fromEntries(
    inputs.flatMap(({ name, path }) =>
      typeof path === "string" && path.trim() !== "" ? [[name, relativizeToRoot(path, root)]] : []
    )
  );
}

export function provenanceObject(ctx: RunContext): ProvenanceObject {
  return {
    target: ctx.target,
    ...(ctx.targetOrigin ? { targetOrigin: ctx.targetOrigin } : {}),
    sourceSha: ctx.sourceSha,
    toolSha: ctx.toolSha ?? null,
    toolVersion: ctx.toolVersion ?? "unknown",
    runTimestamp: formatUtc(ctx.runStart),
    inputs: presentInputs(ctx.inputs, ctx.root),
    corpus: relativizeToRoot(ctx.corpus, ctx.root),
    strict: ctx.strict === true,
  };
}
