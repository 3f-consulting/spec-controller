import { claimCodeErrorsOf } from "../domain/claimCodes.js";
import { claimReconciliationsOf } from "../domain/claimReconciliation.js";
import type { ConfigurationError } from "../domain/configuration.js";
import { evidenceReconciliationOf, stepAccountOf, type EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { executableClaimsOf } from "../domain/postEvidenceObligation.js";
import type { EvidenceObservation, Result } from "../domain/postEvidenceObservation.js";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";

const PROVENANCE = { target: "acme/web", sourceSha: "abc1234", toolVersion: "0.1.256", runTime: "2026-11-12T07:08:14Z", inputs: [] };

// What a run has, as literals: its feature files' scenario tags, its unit tests, and anything else it has.
export interface RunHas {
  readonly scenarios: readonly string[];
  readonly unitTests: readonly (readonly [Result, string?])[];
  readonly configurationErrors?: readonly ConfigurationError[];
  readonly stepsRead?: boolean;
}

const unitTestOf = ([result, code]: readonly [Result, string?]): EvidenceObservation => ({
  cites: code === undefined ? [] : [{ featureCode: code.split("-")[0]!, number: code.split("-")[1]! }],
  result,
  kind: "unit",
  place: "one.test.ts",
  name: "a test",
  notes: [],
});

// The run read and reconciled as balance does, from one.feature, its feature code ONE.
export function reconciled({ scenarios, unitTests, configurationErrors = [], stepsRead = false }: RunHas): EvidenceReconciliation {
  const source = `@ONE\nFeature: one\n${scenarios.map((tags, at) => `\n  ${tags}\n  Scenario: scenario ${at}\n    Given a step\n`).join("")}`;
  const features = scenarios.length === 0 ? [] : [featureAsWrittenFrom("one.feature", source)];
  const claimReconciliations = claimReconciliationsOf(executableClaimsOf(features, { deferralTags: [], strict: false }), unitTests.map(unitTestOf));
  const step = { workflow: "ci.yml", job: "build", plumbing: false, writesStepRecord: false, run: "pnpm lint" };
  return evidenceReconciliationOf({
    claimReconciliations,
    claimCodeErrors: claimCodeErrorsOf(features),
    configurationErrors,
    features,
    ...(stepsRead && { stepAccount: stepAccountOf([{ step, disposition: "candidate" }]) }),
    provenance: PROVENANCE,
  });
}


// A feature file as literals: its name, its feature code, and each scenario's tags and title.
export type FileHas = readonly [string, string, readonly (readonly [string, string])[]];

// Evidence as literals: its kind, result, the code it cites if any, where it is and its name, what it said and the notes
// balance added, when given.
export type EvidenceHas = readonly [EvidenceObservation["kind"], Result, string?, string?, string?, string?, ...string[]];

const evidenceOf = ([kind, result, code, place = "one.test.ts", name = "a test", message, ...notes]: EvidenceHas): EvidenceObservation => ({
  ...unitTestOf([result, code]),
  kind,
  place,
  name,
  ...(message === undefined ? {} : { message }),
  notes,
});

// A run of the feature files and evidence given, read and reconciled as balance does.
export function reconciledFrom(files: readonly FileHas[], evidence: readonly EvidenceHas[]): EvidenceReconciliation {
  const features = files.map(([file, featureCode, scenarios]) =>
    featureAsWrittenFrom(file, `@${featureCode}\nFeature: ${file}\n${scenarios.map(([tags, title]) => `\n  ${tags}\n  Scenario: ${title}\n    Given a step\n`).join("")}`),
  );
  const claimReconciliations = claimReconciliationsOf(executableClaimsOf(features, { deferralTags: [], strict: false }), evidence.map(evidenceOf));
  return evidenceReconciliationOf({ claimReconciliations, claimCodeErrors: [], configurationErrors: [], features, provenance: PROVENANCE });
}
