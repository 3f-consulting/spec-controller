import {
  claimReconciliationOf,
  evidenceObservationsOf,
  executableClaimsOf,
  featureAsWrittenFrom,
  markdownReportOf,
  observationsFiledUnder,
  resultsByFileFrom,
  runVerdictOf,
} from "@3f-consulting/spec-controller-core";
import { featureSourcesIn, jsonAt } from "../inputs/readFiles.js";
import { writeToStandardOutput } from "../output/standardOutput.js";
import { endRunOn } from "../runEnding/exitCode.js";
import type { InputRequest } from "../runRequest/runRequest.js";

const pathOf = (inputs: readonly InputRequest[], kind: InputRequest["kind"]): string | undefined => inputs.find((input) => input.kind === kind)?.path;

export function balance(inputs: readonly InputRequest[]): void {
  const corpus = pathOf(inputs, "features");
  const vitest = pathOf(inputs, "vitest");
  const features = corpus === undefined ? [] : featureSourcesIn(corpus).map(({ file, source }) => featureAsWrittenFrom(file, source));
  const observations = evidenceObservationsOf(vitest === undefined ? [] : resultsByFileFrom(jsonAt(vitest)));
  const claimReconciliations = executableClaimsOf(features).map((claim) => claimReconciliationOf(claim, observationsFiledUnder(claim, observations)));
  const runVerdict = runVerdictOf(claimReconciliations);
  writeToStandardOutput(markdownReportOf(runVerdict));
  endRunOn(runVerdict);
}
