import { claimCodeFrom, type ClaimCode } from "../domain/claimCodes.js";
import type { EvidenceObservation } from "../domain/postEvidenceObservation.js";
import { kindsTheTagsName, nearestCitation, resultOfRun, type RunResult } from "../domain/postEvidenceObservation.js";
import { withoutSigil } from "./tags.js";
import { relativizeToRoot } from "../domain/targetPath.js";

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

export type ClaimCodesAt = (file: string, line: number) => readonly string[];

type CucumberScenario = NonNullable<CucumberJsonReport[number]["elements"]>[number];
type CucumberStep = NonNullable<CucumberScenario["steps"]>[number];

const statusOf = (step: CucumberStep): string | undefined => step.result?.status;

const couldNotRun = (step: CucumberStep): boolean => statusOf(step) === "ambiguous" || statusOf(step) === "undefined";

function runResultOf(steps: readonly CucumberStep[]): RunResult {
  if (steps.some((step) => statusOf(step) === "failed")) return "failed";
  if (steps.some(couldNotRun)) return "never-reached-its-assertions";
  return steps.length > 0 && steps.every((step) => statusOf(step) === "passed") ? "passed" : "inconclusive";
}

const stepText = (step: CucumberStep): string => `${(step.keyword ?? "").trim()} ${step.name ?? ""}`;

function codesIn(texts: readonly string[]): ClaimCode[] {
  return texts.flatMap((text) => claimCodeFrom(text) ?? []);
}

function observationsOfScenario(scenario: CucumberScenario, place: string, rowCodes: readonly string[]): EvidenceObservation[] {
  const tags = (scenario.tags ?? []).map((tag) => withoutSigil(tag.name ?? ""));
  const steps = scenario.steps ?? [];
  const result = resultOfRun(runResultOf(steps));
  if (result === undefined) return [];
  const [firstKind, ...otherKinds] = kindsTheTagsName(tags);
  const cites = nearestCitation([codesIn([...tags, ...rowCodes])]);
  if (result === "never-ran") {
    return [{ cites, result, kind: firstKind!, place, notes: steps.filter(couldNotRun).map(stepText) }];
  }
  const name = scenario.name;
  return [firstKind!, ...otherKinds].map((kind) => ({ cites, result, kind, place, notes: [], ...(name === undefined ? {} : { name }) }));
}

export function parseCucumberEvidenceObservations(
  report: CucumberJsonReport,
  root: string | undefined,
  claimCodesAt: ClaimCodesAt,
): EvidenceObservation[] {
  return report.flatMap((feature) => {
    const place = relativizeToRoot(feature.uri ?? feature.name ?? "", root);
    return (feature.elements ?? []).flatMap((scenario) => {
      const rowCodes = scenario.line === undefined ? [] : claimCodesAt(place, scenario.line);
      return observationsOfScenario(scenario, place, rowCodes);
    });
  });
}
