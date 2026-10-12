import type { BehaviouralQualityCheck, EvidenceObservation, EvidenceStatus } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";
import { SCN_ID_SOURCE } from "../domain/featureCode.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

export type CucumberJsonReport = ReadonlyArray<{
  readonly uri?: string;
  readonly name?: string;
  readonly elements?: ReadonlyArray<{
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

const TIER_TAG = /^@?(integration|e2e|performance)$/;

function deriveLevels(
  tags: readonly { readonly name?: string }[],
  fallbackQualityCheck: BehaviouralQualityCheck
): BehaviouralQualityCheck[] {
  const levels: BehaviouralQualityCheck[] = [];
  for (const t of tags) {
    const m = TIER_TAG.exec(t.name ?? "");
    if (m) {
      const level = m[1] as BehaviouralQualityCheck;
      if (!levels.includes(level)) levels.push(level);
    }
  }
  return levels.length > 0 ? levels : [fallbackQualityCheck];
}

function ambiguousMessage(step: { keyword?: string; name?: string }): string {
  const text = `${(step.keyword ?? "").trim()} ${step.name ?? ""}`.trim();
  return text.length > 0
    ? CORE_MESSAGES[CoreMessage.AmbiguousNamedStep](text)
    : CORE_MESSAGES[CoreMessage.AmbiguousUnnamedStep];
}

export function parseCucumberEvidenceObservations(
  report: CucumberJsonReport,
  fallbackQualityCheck: BehaviouralQualityCheck,
  root?: string
): EvidenceObservation[] {
  const results: EvidenceObservation[] = [];
  for (const feature of report) {
    const locator = relativizeToRoot(feature.uri ?? feature.name ?? CORE_MESSAGES[CoreMessage.UnknownFeature], root);
    for (const scenario of feature.elements ?? []) {
      results.push(...scenarioObservations(scenario, locator, fallbackQualityCheck));
    }
  }
  return results;
}

type CucumberScenario = NonNullable<CucumberJsonReport[number]["elements"]>[number];

function citedScnIdOf(tags: readonly { readonly name?: string }[]): string | null {
  const scnTag = tags
    .map((t) => SCN_TAG.exec(t.name ?? ""))
    .find((m): m is RegExpExecArray => m !== null);
  return scnTag ? scnTag[1]! : null;
}

function scenarioObservations(
  scenario: CucumberScenario,
  locator: string,
  fallbackQualityCheck: BehaviouralQualityCheck
): EvidenceObservation[] {
  const tags = scenario.tags ?? [];
  const scnId = citedScnIdOf(tags);
  const steps = scenario.steps ?? [];
  const ambiguous = steps.find((s) => s.result?.status === "ambiguous");
  if (ambiguous) {
    return [{
      qualityCheck: deriveLevels(tags, fallbackQualityCheck)[0]!,
      scnId,
      status: "failed",
      locator,
      broken: true,
      message: ambiguousMessage(ambiguous),
    }];
  }
  const anyFailed = steps.some((s) => s.result?.status === "failed");
  const allPassed = steps.length > 0 && steps.every((s) => s.result?.status === "passed");
  if (!anyFailed && !allPassed) return [];
  const status: EvidenceStatus = anyFailed ? "failed" : "passed";
  return deriveLevels(tags, fallbackQualityCheck).map((level) => ({
    qualityCheck: level,
    scnId,
    status,
    locator,
  }));
}
