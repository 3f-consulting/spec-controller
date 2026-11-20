import type { Layer } from "../domain/configuration.js";
import type { Provenance, ProvenanceRunner } from "../domain/provenance.js";
import { coreText } from "../messages/catalogue.js";
import { quoted } from "./quoted.js";

const item = (label: string, value: string): string => `- ${coreText(`provenance-${label}`)}: ${quoted(value)}`;

const LAYERS = ["unit", "integration", "e2e", "performance"] as const satisfies readonly Layer[];

const runnerNamed = ({ name, found }: ProvenanceRunner): string => (found ? `${quoted(name)} (${coreText("provenance-runner-found")})` : quoted(name));

const runnersLine = (layer: Layer, runners: readonly ProvenanceRunner[]): string =>
  `- ${coreText(`provenance-runners-${layer}`)}: ${runners.length === 0 ? coreText("provenance-runners-none") : runners.map(runnerNamed).join(", ")}`;

// The tool's commit only when it ran from its own checkout; an input on a line of its own only when the run read it.
export function provenanceSection({ target, sourceSha, toolSha, toolVersion, runTime, countedOnlyExecutableClaims, runners, inputs }: Provenance): string[] {
  return [
    `## ${coreText("provenance-heading")}`,
    "",
    item("target", target),
    item("source-sha", sourceSha),
    ...(toolSha === undefined ? [] : [item("tool-sha", toolSha)]),
    item("tool-version", toolVersion),
    item("run-time", runTime),
    ...(countedOnlyExecutableClaims ? [`- ${coreText("provenance-counted-only-executable-claims")}`] : []),
    ...LAYERS.map((layer) => runnersLine(layer, runners[layer])),
    `- ${coreText("provenance-inputs")}:`,
    ...inputs.flatMap(({ name, path }) => (path === undefined ? [] : [`  ${item(`input-${name}`, path)}`])),
  ];
}
