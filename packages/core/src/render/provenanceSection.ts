import type { RenderInput } from "../domain/renderInput.js";
import type { RunInputName } from "../domain/runProvenance.js";
import { projectProvenanceObject, provenanceInputsView, type ProvenanceInputsView } from "./provenanceFacts.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";

function inputsLines(inputs: ProvenanceInputsView): string[] {
  switch (inputs.kind) {
    case "none":
      return [`- ${coreMessage(CoreMessage.ProvenanceNoInputs)}`];
    case "given":
      return [`- ${coreMessage(CoreMessage.ProvenanceInputs)}`, ...inputs.inputs.map(({ flag, value }) => `  - \`${flag} ${value}\``)];
  }
}

export const provenanceSection = (report: RenderInput, inputNames: readonly RunInputName[]): string[] => {
  const p = projectProvenanceObject(report.runProvenance, inputNames);
  const lines = [markdownHeading(2, coreMessage(CoreMessage.RunProvenanceHeading)), ""];
  const targetRepo = p.targetOrigin === undefined
    ? coreMessage(CoreMessage.ProvenanceTargetRepo, { target: p.target })
    : coreMessage(CoreMessage.ProvenanceTargetRepoUntargeted, { target: p.target, origin: p.targetOrigin });
  lines.push(`- ${targetRepo}`);
  lines.push(...inputsLines(provenanceInputsView(p.inputs)));
  if (p.absentInputs.length > 0) lines.push(`- ${coreMessage(CoreMessage.ProvenanceNotSupplied, { flags: p.absentInputs.map((flag) => `\`${flag}\``).join(", ") })}`);
  lines.push(`- ${coreMessage(CoreMessage.ProvenanceRunTimestamp, { runStartUtc: p.runStartUtc })}`);
  lines.push(`- ${coreMessage(CoreMessage.ProvenanceSourceSha, { sha: p.sourceSha ?? coreMessage(CoreMessage.ProvenanceSourceShaUnknown) })}`);
  lines.push(`- ${coreMessage(CoreMessage.ProvenanceToolSha, { sha: p.toolSha ?? coreMessage(CoreMessage.ProvenanceToolShaUnknown) })}`);
  lines.push(`- ${coreMessage(CoreMessage.ProvenanceToolVersion, { version: p.toolVersion })}`);
  lines.push("");
  return lines;
};
