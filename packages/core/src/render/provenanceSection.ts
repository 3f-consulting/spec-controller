/**
 * THE RUN-PROVENANCE HEADER (@SCN-RPT-001) — the facts about the run itself, first after the title.
 *
 * ITS OWN MODULE, AND THE SECTION ITSELF ASKED FOR THIS. It sat in `markdown.ts` behind a note
 * saying that a section which cannot be added to without reding the complexity ratchet is the
 * ratchet working, and that extracting the emitter is the standing answer — a note written while
 * paying for one new line by taking the braces off the loop below it. That is what has now been
 * done, at the first commit that needed the room. Nothing about the rendering changed in the move:
 * the lines, their order and the empty branch are byte-identical, which is what makes it a move.
 *
 * The precedent is `runVerdict.ts` and, along the discovery axis, `discoveryScope.ts`,
 * `behaviouralRunners.ts`, `reconcilerSteps.ts`, `excludedSteps.ts` and `stepAccounting.ts` —
 * every one of them a section emitter that reads the report and nothing else.
 */

import type { RenderInput } from "../assemble/renderInput.js";
import { projectProvenanceObject } from "../provenance/provenance.js";

/**
 * The Run-provenance header (@SCN-RPT-001) — stays first after the title.
 * Facts only (project design §5): the resolved target repo, the input paths/flags
 * actually used, the run-start timestamp in UTC, and the target's source SHA (a null
 * SHA rendered as an explicit "unknown (non-git target)"). Projected off the shared
 * report model's `runProvenance` object via `projectProvenanceObject`, so this
 * header and the JSON `runProvenance` object never drift and the render needs no `ctx`.
 */
export const provenanceSection = (report: RenderInput): string[] => {
  const p = projectProvenanceObject(report.runProvenance);
  const lines = ["## Run provenance", ""];
  lines.push(`- Target repo: ${p.target}`);
  if (p.inputs.length === 0) {
    lines.push("- Inputs: none specified");
  } else {
    lines.push("- Inputs:");
    // One statement, so this emitter's CODE-line count is unchanged by the absence line below.
    for (const { flag, value } of p.inputs) lines.push(`  - \`${flag} ${value}\``);
  }
  // The canonical inputs the run did NOT receive (@SCN-RPT-028, 3F-3155), on a line of their
  // own BENEATH the Inputs list. A separate line rather than a "(not supplied)" marker
  // interleaved into the list: interleaving would make the "none specified" branch above
  // unreachable and silently rewrite a rendering that already exists, where this leaves the
  // list, its order and its empty branch byte-identical.
  //
  // ONLY WHEN SOMETHING IS ABSENT. Every stream a run was handed is listed above
  // (@SCN-RPT-027), so a flag missing from the list is definitionally one the run did not get;
  // this line spares the reader holding the canonical list in their head, and a "none" on the
  // healthy path would be noise in a block whose whole discipline is facts only.
  //
  // IT ONCE COST THIS SECTION A PAIR OF BRACES, and that is why the emitter now lives here.
  // `markdown.ts` was frozen at its own code-line count, so this line was paid for by taking the
  // braces off the Inputs loop above, under a note saying the standing answer was to extract the
  // emitter. 3F-3365 needed the room next and took that answer. The loop keeps its one-statement
  // form: it renders identically either way, and rewriting it here would make a move that changed
  // nothing into a diff a reader has to check.
  if (p.absentInputs.length > 0) lines.push(`- Not supplied: ${p.absentInputs.map((flag) => `\`${flag}\``).join(", ")}`);
  lines.push(`- Run timestamp (UTC): ${p.runStartUtc}`);
  lines.push(`- Source SHA: ${p.sourceSha ?? "unknown (non-git target)"}`);
  // The TOOL's own identity (3F-1916) — which spec-controller produced this run,
  // distinct from the target's Source SHA above. A null tool SHA renders the explicit
  // "unknown (not a git checkout)" (mirroring Source SHA's null-rendering); the version
  // is always present, so a run stays attributable even with no SHA.
  lines.push(`- Tool SHA: ${p.toolSha ?? "unknown (not a git checkout)"}`);
  lines.push(`- Tool version: ${p.toolVersion}`);
  lines.push("");
  return lines;
};
