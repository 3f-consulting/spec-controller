import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";

export const sampleReportCtx: RunContext = {
  target: "sample-target",
  inputs: [{ ...FEATURES, path: "../sample-target/features" }, { ...VITEST, path: "../sample-target/vitest-report.json" }, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "../sample-target/features",
  runStart: new Date("2026-06-27T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

export const specsFeaturesInputs: Pick<RunContext, "inputs" | "corpus"> = {
  inputs: [{ ...FEATURES, path: "specs/features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "specs/features",
};

export const sectionCtx: RunContext = {
  target: "fixture",
  inputs: [{ ...FEATURES, path: "features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "features",
  runStart: new Date("2026-10-04T12:00:00.000Z"),
  sourceSha: null,
  toolSha: null,
  toolVersion: "0.0.0",
};

export const sectionCtxNextDay: RunContext = {
  target: "fixture",
  inputs: [{ ...FEATURES, path: "features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "features",
  runStart: new Date("2026-10-05T12:00:00.000Z"),
  sourceSha: null,
  toolSha: null,
  toolVersion: "0.0.0",
};
