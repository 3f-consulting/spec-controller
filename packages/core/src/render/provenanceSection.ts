import type { RenderInput } from "../domain/renderInput.js";
import { projectProvenanceObject } from "./provenanceFacts.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

export const provenanceSection = (report: RenderInput): string[] => {
  const p = projectProvenanceObject(report.runProvenance);
  const lines = [CORE_MESSAGES[CoreMessage.RunProvenanceHeading], ""];
  const targetRepo = p.targetOrigin === undefined
    ? CORE_MESSAGES[CoreMessage.ProvenanceTargetRepo](p.target)
    : CORE_MESSAGES[CoreMessage.ProvenanceTargetRepoUntargeted](p.target, p.targetOrigin);
  lines.push(`- ${targetRepo}`);
  if (p.inputs.length === 0) {
    lines.push(`- ${CORE_MESSAGES[CoreMessage.ProvenanceNoInputs]}`);
  } else {
    lines.push(`- ${CORE_MESSAGES[CoreMessage.ProvenanceInputs]}`);
    for (const { flag, value } of p.inputs) lines.push(`  - \`${flag} ${value}\``);
  }
  if (p.absentInputs.length > 0) lines.push(`- ${CORE_MESSAGES[CoreMessage.ProvenanceNotSupplied](p.absentInputs.map((flag) => `\`${flag}\``).join(", "))}`);
  lines.push(`- ${CORE_MESSAGES[CoreMessage.ProvenanceRunTimestamp](p.runStartUtc)}`);
  lines.push(`- ${CORE_MESSAGES[CoreMessage.ProvenanceSourceSha](p.sourceSha ?? CORE_MESSAGES[CoreMessage.ProvenanceSourceShaUnknown])}`);
  lines.push(`- ${CORE_MESSAGES[CoreMessage.ProvenanceToolSha](p.toolSha ?? CORE_MESSAGES[CoreMessage.ProvenanceToolShaUnknown])}`);
  lines.push(`- ${CORE_MESSAGES[CoreMessage.ProvenanceToolVersion](p.toolVersion)}`);
  lines.push("");
  return lines;
};
