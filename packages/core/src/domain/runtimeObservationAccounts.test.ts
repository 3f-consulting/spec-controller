import { describe, it, expect, beforeEach } from "vitest";

import { tallyOfEveryCreditKind } from "./runtimeObservationTally.testkit.js";

describe("the runtime-observation tally reports the raw counts and the invented accounts", () => {
  let tally: ReturnType<typeof tallyOfEveryCreditKind>;
  beforeEach(() => {
    tally = tallyOfEveryCreditKind();
  });

  it("[SCN-RPT-017] counts raw per quality-check over ALL runtime credits, SKIPPING the fitness credit", () => {
    expect(tally.rawByRuntimeQualityCheck).toEqual({ unit: 3, integration: 2, e2e: 1, performance: 0 });
  });

  it("[SCN-RPT-023] counts the phantom and suspense (incl. broken) credits on their invented accounts", () => {
    expect(tally.onPhantomScenario).toBe(1);
    expect(tally.onSuspenseScenario).toBe(2);
  });
});
