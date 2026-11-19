import { claimCodeErrorsOf } from "../domain/claimCodes.js";
import { claimReconciliationsOf } from "../domain/claimReconciliation.js";
import type { ConfigurationError } from "../domain/configuration.js";
import { evidenceReconciliationOf, stepAccountOf, type EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { executableClaimsOf } from "../domain/postEvidenceObligation.js";
import type { Provenance } from "../domain/provenance.js";
import type { EvidenceObservation, Result } from "../domain/postEvidenceObservation.js";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";

export const PROVENANCE: Provenance = { target: "acme/web", sourceSha: "abc1234", toolVersion: "0.1.256", runTime: "2026-11-12T07:08:14Z", inputs: [] };

// What a run has, as literals: its feature files' scenario tags, its unit tests, and anything else it has.
export interface RunHas {
  readonly scenarios: readonly string[];
  readonly unitTests: readonly (readonly [Result, string?])[];
  readonly configurationErrors?: readonly ConfigurationError[];
  readonly stepsRead?: boolean;
  readonly provenance?: Partial<Provenance>;
}

const unitTestOf = ([result, code]: readonly [Result, string?]): EvidenceObservation => ({
  cites: code === undefined ? [] : [{ featureCode: code.split("-")[0]!, number: code.split("-")[1]! }],
  result,
  kind: "unit",
  place: "one.test.ts",
  name: "a test",
});

// The run read and reconciled from its parts, from one.feature, its feature code ONE.
export function reconciled({ scenarios, unitTests, configurationErrors = [], stepsRead = false, provenance = {} }: RunHas): EvidenceReconciliation {
  const source = `@ONE\nFeature: one\n${scenarios.map((tags, at) => `\n  ${tags}\n  Scenario: scenario ${at}\n    Given a step\n`).join("")}`;
  const features = scenarios.length === 0 ? [] : [featureAsWrittenFrom("one.feature", source)];
  const claimReading = { deferralTags: [], strict: false };
  const claimReconciliations = claimReconciliationsOf(executableClaimsOf(features, claimReading), unitTests.map(unitTestOf));
  const step = { workflow: "ci.yml", job: "build", plumbing: false, writesStepRecord: false, command: "pnpm lint", identity: "pnpm lint" };
  return evidenceReconciliationOf({
    claimReconciliations,
    claimCodeErrors: claimCodeErrorsOf(features),
    configurationErrors,
    features,
    claimReading,
    stepAccount: stepAccountOf(stepsRead ? [{ step, disposition: "fitnessFunction" }] : []),
    provenance: { ...PROVENANCE, ...provenance },
  });
}


// A feature file as literals: its name, its feature code, and each scenario's tags and title.
export type FileHas = readonly [string, string, readonly (readonly [string, string])[]];

// Evidence as literals: its kind, result, the code it cites if any, where it is and its name, and what it said, when given.
export type EvidenceHas = readonly [EvidenceObservation["kind"], Result, string?, string?, string?, string?];

// A fitness function is a CI step, which has no name.
const evidenceOf = ([kind, result, code, place = "one.test.ts", name = "a test", message]: EvidenceHas): EvidenceObservation => {
  const { name: _testName, ...unitTest } = unitTestOf([result, code]);
  return { ...unitTest, kind, place, ...(kind === "fitness" ? {} : { name }), ...(message === undefined ? {} : { message }) };
};

// A run of the feature files and evidence given, read and reconciled from its parts.
export function reconciledFrom(files: readonly FileHas[], evidence: readonly EvidenceHas[]): EvidenceReconciliation {
  const sources = files.map(([file, featureCode, scenarios]) => [file, `@${featureCode}\nFeature: ${file}\n${scenarios.map(([tags, title]) => `\n  ${tags}\n  Scenario: ${title}\n    Given a step\n`).join("")}`] as const);
  return reconciledFromSources(sources, [], evidence);
}

// A run of the feature files given as written, and the configuration errors and evidence given.
export function reconciledFromSources(sources: readonly (readonly [string, string])[], configurationErrors: readonly ConfigurationError[] = [], evidence: readonly EvidenceHas[] = []): EvidenceReconciliation {
  const features = sources.map(([file, source]) => featureAsWrittenFrom(file, source));
  const claimReading = { deferralTags: [], strict: false };
  const claimReconciliations = claimReconciliationsOf(executableClaimsOf(features, claimReading), evidence.map(evidenceOf));
  return evidenceReconciliationOf({ claimReconciliations, claimCodeErrors: claimCodeErrorsOf(features), configurationErrors, features, claimReading, stepAccount: stepAccountOf([]), provenance: PROVENANCE });
}
