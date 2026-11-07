import type { EvidenceObservation, ObservationNote } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";
import { withoutSigil } from "../lib/bareTerm.js";
import { CLAIM_CODE_SOURCE } from "../domain/featureCode.js";
import { attributionOf } from "../domain/attribution.js";
import type { ClaimCodesAt } from "./scenarios.js";
import { evidenceOfRunResult, fallbackLayerOf, layersPostedAt, type RunResult } from "../domain/journal.js";

export type CucumberJsonReport = ReadonlyArray<{
  readonly uri?: string;
  readonly name?: string;
  readonly elements?: ReadonlyArray<{
    readonly line?: number;
    readonly name?: string;
    readonly tags?: ReadonlyArray<{ readonly name?: string }>;
    readonly steps?: ReadonlyArray<{
      readonly keyword?: string;
      readonly name?: string;
      readonly hidden?: boolean;
      readonly result?: { readonly status?: string; readonly duration?: number };
    }>;
  }>;
}>;

const CLAIM_CODE_TAG = new RegExp(`^(${CLAIM_CODE_SOURCE})$`);

function ambiguousNote(step: { keyword?: string; name?: string }): ObservationNote {
  const text = `${(step.keyword ?? "").trim()} ${step.name ?? ""}`.trim();
  return text.length > 0 ? { kind: "ambiguous-step", step: text } : { kind: "ambiguous-step" };
}

export function parseCucumberEvidenceObservations(
  report: CucumberJsonReport,
  root?: string,
  claimCodesAt: ClaimCodesAt = () => [],
): EvidenceObservation[] {
  const results: EvidenceObservation[] = [];
  for (const feature of report) {
    const named = feature.uri ?? feature.name;
    const locator = named && relativizeToRoot(named, root);
    for (const scenario of feature.elements ?? []) {
      const rowCodes = locator === undefined || scenario.line === undefined ? [] : claimCodesAt(locator, scenario.line);
      results.push(...scenarioObservations(scenario, locator, rowCodes));
    }
  }
  return results;
}

type CucumberScenario = NonNullable<CucumberJsonReport[number]["elements"]>[number];

function citedCodesOf(tagNames: readonly string[]): string[] {
  return tagNames
    .map((name) => CLAIM_CODE_TAG.exec(name))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m[1]!);
}

function scenarioObservations(
  scenario: CucumberScenario,
  locator: string | undefined,
  rowCodes: readonly string[],
): EvidenceObservation[] {
  const tagNames = (scenario.tags ?? []).map((t) => withoutSigil(t.name ?? ""));
  const layers = layersPostedAt(tagNames, fallbackLayerOf("scenario-runs"));
  const { claimCode, severalCodes } = attributionOf([...citedCodesOf(tagNames), ...rowCodes]);
  const severalNotes: ObservationNote[] = severalCodes ? [{ kind: "several-claim-codes", codes: severalCodes }] : [];
  const steps = scenario.steps ?? [];
  const evidence = evidenceOfRunResult(runResultOf(steps));
  if (evidence === undefined) return [];
  if (evidence.broken) {
    const ambiguous = steps.find(isAmbiguous)!;
    return [{
      qualityCheckKind: layers[0]!,
      claimCode,
      status: evidence.status,
      locator,
      broken: evidence.broken,
      notes: [ambiguousNote(ambiguous), ...severalNotes],
    }];
  }
  return layers.map((layer) => ({
    qualityCheckKind: layer,
    claimCode,
    status: evidence.status,
    locator,
    testName: scenario.name,
    ...(severalNotes.length > 0 ? { notes: severalNotes } : {}),
  }));
}

type CucumberStep = NonNullable<CucumberScenario["steps"]>[number];

function isAmbiguous(step: CucumberStep): boolean {
  return step.result?.status === "ambiguous";
}

function runResultOf(steps: readonly CucumberStep[]): RunResult {
  if (steps.some(isAmbiguous)) return "never-reached-its-assertions";
  if (steps.some((s) => s.result?.status === "failed")) return "failed";
  if (steps.length > 0 && steps.every((s) => s.result?.status === "passed")) return "passed";
  return "inconclusive";
}
