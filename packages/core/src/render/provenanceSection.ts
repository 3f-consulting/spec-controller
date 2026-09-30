import type { RenderInput } from "../assemble/renderInput.js";
import { projectProvenanceObject } from "../provenance/provenance.js";

export const provenanceSection = (report: RenderInput): string[] => {
  const p = projectProvenanceObject(report.runProvenance);
  const lines = ["## Run provenance", ""];
  lines.push(`- Target repo: ${p.target}`);
  if (p.inputs.length === 0) {
    lines.push("- Inputs: none specified");
  } else {
    lines.push("- Inputs:");
    for (const { flag, value } of p.inputs) lines.push(`  - \`${flag} ${value}\``);
  }
  if (p.absentInputs.length > 0) lines.push(`- Not supplied: ${p.absentInputs.map((flag) => `\`${flag}\``).join(", ")}`);
  lines.push(`- Run timestamp (UTC): ${p.runStartUtc}`);
  lines.push(`- Source SHA: ${p.sourceSha ?? "unknown (non-git target)"}`);
  lines.push(`- Tool SHA: ${p.toolSha ?? "unknown (not a git checkout)"}`);
  lines.push(`- Tool version: ${p.toolVersion}`);
  lines.push("");
  return lines;
};
