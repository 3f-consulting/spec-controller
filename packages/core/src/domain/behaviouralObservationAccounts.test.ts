import { describe, it, expect, beforeEach } from "vitest";

import { tallyOfEveryObservationKind } from "./behaviouralObservationTally.test-utils.js";

describe("the behavioural-observation tally reports the raw counts and the invented accounts", () => {
  let tally: ReturnType<typeof tallyOfEveryObservationKind>;
  beforeEach(() => {
    tally = tallyOfEveryObservationKind();
  });

  it("[SCN-RPT-017] counts raw per quality-check over ALL behavioural evidence observations, SKIPPING the fitness evidence observation", () => {
    expect(tally.rawByBehaviouralQualityCheck).toEqual({ unit: 3, integration: 2, e2e: 1, performance: 0 });
  });

  it("[SCN-RPT-023] counts the phantom and suspense (incl. broken) evidence observations on their invented accounts", () => {
    expect(tally.onPhantomScenario).toBe(1);
    expect(tally.onSuspenseScenario).toBe(2);
  });
});
