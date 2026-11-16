import type { Provenance } from "../domain/provenance.js";
import { coreText } from "../messages/catalogue.js";
import { quoted } from "./quoted.js";

const item = (label: string, value: string): string => `- ${coreText(`provenance-${label}`)}: ${quoted(value)}`;

// The tool's commit only when it ran from its own checkout; an input on a line of its own only when the run read it.
export function provenanceSection({ target, sourceSha, toolSha, toolVersion, runTime, inputs }: Provenance): string[] {
  return [
    `## ${coreText("provenance-heading")}`,
    "",
    item("target", target),
    item("source-sha", sourceSha),
    ...(toolSha === undefined ? [] : [item("tool-sha", toolSha)]),
    item("tool-version", toolVersion),
    item("run-time", runTime),
    `- ${coreText("provenance-inputs")}:`,
    ...inputs.flatMap(({ name, path }) => (path === undefined ? [] : [`  ${item(`input-${name}`, path)}`])),
  ];
}
