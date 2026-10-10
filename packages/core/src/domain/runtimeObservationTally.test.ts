import { describe, it, expect, beforeEach } from "vitest";

import { tallyOfEveryCreditKind } from "./runtimeObservationTally.testkit.js";

describe("[SCN-RMD-003] runtimeObservationTally folds the posted credits by scenario-kind and quality-check", () => {
  let tally: ReturnType<typeof tallyOfEveryCreditKind>;
  beforeEach(() => {
    tally = tallyOfEveryCreditKind();
  });

  it("counts credits on a scenario's account as onScenario (matched-attributed AND no-evidence-obligation)", () => {
    expect(tally.onScenario).toBe(3);
  });

  it("holds the completeness identity BY CONSTRUCTION: Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario", () => {
    const raw = Object.values(tally.rawByRuntimeQualityCheck).reduce((a, b) => a + b, 0);
    expect(raw).toBe(6);
    expect(raw).toBe(tally.onScenario + tally.onPhantomScenario + tally.onSuspenseScenario);
  });

  it("returns the total, equal to both sides of the identity", () => {
    expect(tally.total).toBe(6);
    expect(tally.total).toBe(
      Object.values(tally.rawByRuntimeQualityCheck).reduce((a, b) => a + b, 0)
    );
    expect(tally.total).toBe(
      tally.onScenario + tally.onPhantomScenario + tally.onSuspenseScenario
    );
  });
});
