import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";

export const reportCtx: RunContext = {
  target: "sample-target",
  inputs: [{ ...FEATURES, path: "../sample-target/features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "../sample-target/features",
  runStart: new Date("2026-07-02T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
};
