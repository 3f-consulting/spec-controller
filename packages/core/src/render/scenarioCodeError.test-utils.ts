import type { ScenarioCodeError } from "../domain/scenarioCodeError.js";
import type { RunContext } from "../domain/runProvenance.js";

export const codeErrorsCtx: RunContext = {
  target: "scenario-code-errors-target",
  inputs: { features: "features" },
  runStart: new Date("2026-09-24T09:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

export const FOREIGN: ScenarioCodeError = {
  kind: "foreign-scn-code",
  files: ["two.feature"],
  featureCode: "TWO",
  scnId: "SCN-ONE-002",
  namedFeatureCode: "ONE",
  namedFeatureFiles: ["one.feature"],
};
