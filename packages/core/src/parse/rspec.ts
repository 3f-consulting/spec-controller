import type { BehaviouralQualityCheck, EvidenceObservation } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";
import { scnCitationsOf } from "../lib/scnCitation.js";
import { attributionOf } from "../domain/attribution.js";
import { evidenceOfRunResult, fallbackQualityCheckOf, type RunResult } from "../domain/journal.js";

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
  const qualityCheck = fallbackQualityCheckOf("test-results");
  const results: EvidenceObservation[] = [];
  for (const example of report.examples ?? []) {
    const evidence = evidenceOfRunResult(runResultOf(example.status));
    if (evidence === undefined) continue;
    const { scnId, severalCodes } = attributionOf(citingCodesOf(example));
    results.push({
      qualityCheck,
      scnId,
      status: evidence.status,
      locator: example.file_path && locatorOf(example.file_path, root),
      testName: example.full_description,
      ...(severalCodes ? { notes: [{ kind: "several-scn-codes" as const, codes: severalCodes }] } : {}),
    });
  }
  return [...results, ...loadErrorsOf(report, qualityCheck, root)];
}

const LOADED_FILE = /^\s*(?:While loading (.+?) a |An error occurred while loading (.+?)\.(?:\n|$))/;

function loadErrorsOf(report: RspecJsonReport, qualityCheck: BehaviouralQualityCheck, root?: string): EvidenceObservation[] {
  const count = report.summary?.errors_outside_of_examples_count ?? 0;
  if (count === 0) return [];
  const evidence = evidenceOfRunResult("never-reached-its-assertions")!;
  const broken: EvidenceObservation[] = [];
  const unnamed: string[] = [];
  for (const message of report.messages ?? []) {
    const file = LOADED_FILE.exec(message);
    const path = file?.[1] ?? file?.[2];
    if (path === undefined) unnamed.push(message);
    else broken.push({ qualityCheck, scnId: null, status: evidence.status, locator: locatorOf(path, root), broken: evidence.broken, message });
  }
  if (count > broken.length) {
    broken.push({ qualityCheck, scnId: null, status: evidence.status, broken: evidence.broken, message: unnamed.length > 0 ? unnamed.join("\n") : undefined });
  }
  return broken;
}

function locatorOf(filePath: string, root?: string): string {
  return relativizeToRoot(filePath.replace(/^\.\//, ""), root);
}

function citingCodesOf(example: { readonly description?: string; readonly full_description?: string }): string[] {
  const ownCodes = scnCitationsOf(example.description ?? "");
  return ownCodes.length > 0 ? ownCodes : scnCitationsOf(example.full_description ?? "");
}

function runResultOf(status: string | undefined): RunResult {
  return status === "passed" || status === "failed" ? status : "inconclusive";
}
