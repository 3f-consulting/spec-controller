import type { BehaviouralQualityCheck, EvidenceObservation, EvidenceStatus, ObservationNote } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";
import { SCN_ID_SOURCE } from "../domain/featureCode.js";
import { attributionOf } from "../domain/attribution.js";
import { qualityChecksPostedAt } from "../domain/journal.js";

export type CucumberJsonReport = ReadonlyArray<{
  readonly uri?: string;
  readonly name?: string;
  readonly elements?: ReadonlyArray<{
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

const SCN_TAG = new RegExp(`^@?(${SCN_ID_SOURCE})$`);

function ambiguousNote(step: { keyword?: string; name?: string }): ObservationNote {
  const text = `${(step.keyword ?? "").trim()} ${step.name ?? ""}`.trim();
  return text.length > 0 ? { kind: "ambiguous-step", step: text } : { kind: "ambiguous-step" };
}

export function parseCucumberEvidenceObservations(
  report: CucumberJsonReport,
  fallbackQualityCheck: BehaviouralQualityCheck,
  root?: string
): EvidenceObservation[] {
  const results: EvidenceObservation[] = [];
  for (const feature of report) {
    const named = feature.uri ?? feature.name;
    const locator = named && relativizeToRoot(named, root);
    for (const scenario of feature.elements ?? []) {
      results.push(...scenarioObservations(scenario, locator, fallbackQualityCheck));
    }
  }
  return results;
}

type CucumberScenario = NonNullable<CucumberJsonReport[number]["elements"]>[number];

function citedCodesOf(tags: readonly { readonly name?: string }[]): string[] {
  return tags
    .map((t) => SCN_TAG.exec(t.name ?? ""))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m[1]!);
}

function scenarioObservations(
  scenario: CucumberScenario,
  locator: string | undefined,
  fallbackQualityCheck: BehaviouralQualityCheck
): EvidenceObservation[] {
  const tags = scenario.tags ?? [];
  const tagNames = tags.map((t) => t.name ?? "");
  const { scnId, severalCodes } = attributionOf(citedCodesOf(tags));
  const severalNotes: ObservationNote[] = severalCodes ? [{ kind: "several-scn-codes", codes: severalCodes }] : [];
  const steps = scenario.steps ?? [];
  const ambiguous = steps.find((s) => s.result?.status === "ambiguous");
  if (ambiguous) {
    return [{
      qualityCheck: qualityChecksPostedAt(tagNames, fallbackQualityCheck)[0]!,
      scnId,
      status: "failed",
      locator,
      broken: true,
      notes: [ambiguousNote(ambiguous), ...severalNotes],
    }];
  }
  const anyFailed = steps.some((s) => s.result?.status === "failed");
  const allPassed = steps.length > 0 && steps.every((s) => s.result?.status === "passed");
  if (!anyFailed && !allPassed) return [];
  const status: EvidenceStatus = anyFailed ? "failed" : "passed";
  return qualityChecksPostedAt(tagNames, fallbackQualityCheck).map((level) => ({
    qualityCheck: level,
    scnId,
    status,
    locator,
    testName: scenario.name,
    ...(severalNotes.length > 0 ? { notes: severalNotes } : {}),
  }));
}
