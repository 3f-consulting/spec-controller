import type { Layer, EvidenceObservation } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";
import { claimCodeCitationsOf } from "../lib/claimCodeCitation.js";
import { attributionOf } from "../domain/attribution.js";
import { evidenceOfRunResult, fallbackLayerOf, type RunResult } from "../domain/journal.js";

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

export function parseRspecEvidenceObservations(report: RspecJsonReport, root?: string): EvidenceObservation[] {
  const layer = fallbackLayerOf("test-results");
  const results: EvidenceObservation[] = [];
  for (const example of report.examples ?? []) {
    const evidence = evidenceOfRunResult(runResultOf(example.status));
    if (evidence === undefined) continue;
    const { claimCode, severalCodes } = attributionOf(citingCodesOf(example));
    results.push({
      qualityCheckKind: layer,
      claimCode,
      status: evidence.status,
      locator: example.file_path && locatorOf(example.file_path, root),
      testName: example.full_description,
      ...(severalCodes ? { notes: [{ kind: "several-claim-codes" as const, codes: severalCodes }] } : {}),
    });
  }
  return [...results, ...loadErrorsOf(report, layer, root)];
}

const LOADED_FILE = /^\s*(?:While loading (.+?) a |An error occurred while loading (.+?)\.(?:\n|$))/;

function loadErrorsOf(report: RspecJsonReport, layer: Layer, root?: string): EvidenceObservation[] {
  const count = report.summary?.errors_outside_of_examples_count ?? 0;
  if (count === 0) return [];
  const evidence = evidenceOfRunResult("never-reached-its-assertions")!;
  const neverRan: EvidenceObservation[] = [];
  const unnamed: string[] = [];
  for (const message of report.messages ?? []) {
    const file = LOADED_FILE.exec(message);
    const path = file?.[1] ?? file?.[2];
    if (path === undefined) unnamed.push(message);
    else neverRan.push({ qualityCheckKind: layer, claimCode: null, status: evidence.status, locator: locatorOf(path, root), neverRan: evidence.neverRan, message });
  }
  if (count > neverRan.length) {
    neverRan.push({ qualityCheckKind: layer, claimCode: null, status: evidence.status, neverRan: evidence.neverRan, message: unnamed.length > 0 ? unnamed.join("\n") : undefined });
  }
  return neverRan;
}

function locatorOf(filePath: string, root?: string): string {
  return relativizeToRoot(filePath.replace(/^\.\//, ""), root);
}

function citingCodesOf(example: { readonly description?: string; readonly full_description?: string }): string[] {
  const ownCodes = claimCodeCitationsOf(example.description ?? "");
  return ownCodes.length > 0 ? ownCodes : claimCodeCitationsOf(example.full_description ?? "");
}

function runResultOf(status: string | undefined): RunResult {
  return status === "passed" || status === "failed" ? status : "inconclusive";
}
