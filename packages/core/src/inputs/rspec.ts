import { claimCodeCitationsIn } from "../domain/claimCodes.js";
import type { EvidenceObservation } from "../domain/postEvidenceObservation.js";
import { nearestCitation, neverRanObservation, resultOfRun, TEST_REPORT_KIND, type RunResult } from "../domain/postEvidenceObservation.js";
import { relativizeToRoot } from "../domain/targetPath.js";

export interface RspecJsonReport {
  readonly examples?: ReadonlyArray<{
    readonly description?: string;
    readonly full_description?: string;
    readonly status?: string;
    readonly file_path?: string;
  }>;
  readonly summary?: { readonly errors_outside_of_examples_count?: number };
  readonly messages?: readonly string[];
}

function runResultOf(status: string | undefined): RunResult {
  return status === "passed" || status === "failed" ? status : "inconclusive";
}

function placeOf(filePath: string, root?: string): string {
  return relativizeToRoot(filePath.replace(/^\.\//, ""), root);
}

const LOADED_FILE = /^\s*(?:While loading (.+?) a |An error occurred while loading (.+?)\.(?:\n|$))/;

function loadErrorsOf(report: RspecJsonReport, root?: string): EvidenceObservation[] {
  const count = report.summary?.errors_outside_of_examples_count ?? 0;
  if (count === 0) return [];
  const messages = (report.messages ?? []).map((message) => ({ message, loaded: LOADED_FILE.exec(message) }));
  const named = messages.flatMap(({ message, loaded }) => {
    const path = loaded?.[1] ?? loaded?.[2];
    return path === undefined ? [] : [neverRanObservation(TEST_REPORT_KIND, placeOf(path, root), message)];
  });
  if (count <= named.length) return named;
  const unnamed = messages.filter(({ loaded }) => loaded === null).map(({ message }) => message);
  return [...named, neverRanObservation(TEST_REPORT_KIND, "", unnamed.length > 0 ? unnamed.join("\n") : undefined)];
}

export function parseRspecEvidenceObservations(report: RspecJsonReport, root?: string): EvidenceObservation[] {
  const examples = (report.examples ?? []).flatMap((example): EvidenceObservation[] => {
    const result = resultOfRun(runResultOf(example.status));
    if (result === undefined) return [];
    const cites = nearestCitation([claimCodeCitationsIn(example.description ?? ""), claimCodeCitationsIn(example.full_description ?? "")]);
    const name = example.full_description;
    return [{ cites, result, kind: TEST_REPORT_KIND, place: placeOf(example.file_path ?? "", root), notes: [], ...(name === undefined ? {} : { name }) }];
  });
  return [...examples, ...loadErrorsOf(report, root)];
}
