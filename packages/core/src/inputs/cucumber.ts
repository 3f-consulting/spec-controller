import type { ClaimCodesAt, EvidenceObservation, ScenarioRunAsWritten } from "../domain/postEvidenceObservation.js";
import { scenarioRunObservationsOf } from "../domain/postEvidenceObservation.js";
import { withoutSigil } from "./tags.js";

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
      readonly result: { readonly status?: string; readonly duration?: number };
    }>;
  }>;
}>;

// Each scenario run as the report wrote it: its feature's uri and name, its line, name and tags, and each step's
// keyword, text and status.
function scenarioRunsOf(report: CucumberJsonReport): ScenarioRunAsWritten[] {
  return report.flatMap((feature) =>
    (feature.elements ?? []).map((scenario) => ({
      featurePath: feature.uri,
      featureName: feature.name,
      line: scenario.line,
      name: scenario.name,
      tags: (scenario.tags ?? []).map((tag) => withoutSigil(tag.name ?? "")),
      steps: (scenario.steps ?? []).map((step) => ({ keyword: step.keyword, text: step.name, status: step.result.status })),
    })),
  );
}

export function parseCucumberEvidenceObservations(
  report: CucumberJsonReport,
  root: string | undefined,
  claimCodesAt: ClaimCodesAt,
): EvidenceObservation[] {
  return scenarioRunObservationsOf(scenarioRunsOf(report), root, claimCodesAt);
}
