import type { Provenance } from "../domain/evidenceReconciliation.js";
import { coreText } from "./coreText.js";
import { heading } from "./heading.js";
import { labelled } from "./labelled.js";
import { quoted } from "./quoted.js";

const inputOf = ({ name, path }: Provenance["inputs"][number]): string =>
  `${quoted(name)} (${path === undefined ? coreText("input-not-given") : quoted(path)})`;

export function provenanceSection({ target, sourceSha, toolSha, toolVersion, inputs }: Provenance): string[] {
  return [
    heading(2, "provenance-heading"),
    [
      labelled("target-label", quoted(target)),
      labelled("source-sha-label", quoted(sourceSha)),
      ...(toolSha === undefined ? [] : [labelled("tool-sha-label", quoted(toolSha))]),
      labelled("tool-version-label", quoted(toolVersion)),
      labelled("inputs-label", inputs.map(inputOf).join(", ")),
    ].join("\n"),
  ];
}
