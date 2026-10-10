import { describe, it, expect, beforeEach } from "vitest";

import { staticObservationTally } from "./ledger.js";
import { reconcile } from "./evidenceReconciliation.js";
import { runningStaticChecks } from "../parse/runningStaticChecks.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { ScriptCitation } from "../parse/fitnessCitations.js";
import type {
  EvidenceObservation,
  Ledger,
  Scenario,
  ScenarioReconciliation,
} from "../model.js";

const SUITE_RUNNERS: Readonly<Record<string, string | null>> = {
  unit: "vitest",
  integration: "cucumber-js",
};

describe("[SCN-USG-001] staticObservationTally folds the posted static-check credits, filtered to what ran", () => {
  const scenarios: Scenario[] = [
    { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "fitness" }] },
    { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "fitness" }] },
    { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-A", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "fitness", staticCheck: "lint:water", scnId: "SCN-C", exists: true, enforcedOverRealSource: false },
    { qualityCheck: "fitness", staticCheck: "lint:absent", scnId: "SCN-D", exists: false, enforcedOverRealSource: false },
    { qualityCheck: "fitness", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
  ];
  let tally: ReturnType<typeof staticObservationTally>;
  beforeEach(() => {
    tally = staticObservationTally(reconcile(scenarios, observations));
  });

  it("counts every check that ran, the watermelon included, and not the missing one", () => {
    expect(tally.runningStaticCheckCount).toBe(3);
  });

  it("counts the fitness credits on the SUSPENSE row as the uncited static checks", () => {
    expect(tally.uncitedStaticCheckCount).toBe(1);
  });

  it("keeps named implicit — runningStaticCheckCount − uncitedStaticCheckCount (the named checks that ran)", () => {
    expect(tally.runningStaticCheckCount - tally.uncitedStaticCheckCount).toBe(2);
  });

  it("returns EXACTLY the two-field surface (named is never materialised)", () => {
    expect(tally).toEqual({ runningStaticCheckCount: 3, uncitedStaticCheckCount: 1 });
  });

  it("counts no runtime credit, whatever fields it arrives carrying", () => {
    const runtimeCarryingGuardFields = {
      qualityCheck: "unit" as const,
      scnId: "SCN-A",
      status: "passed" as const,
      exists: true,
      enforcedOverRealSource: true,
    };
    const withRuntime = reconcile(scenarios, [...observations, runtimeCarryingGuardFields]);
    expect(staticObservationTally(withRuntime)).toEqual(tally);
  });
});

describe("[SCN-USG-001] a static check no fitness scenario cites is banked on the suspense row and counted uncited", () => {
  const rowFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  const pkg: PackageJsonScripts = {
    scripts: {
      "lint:foo": "echo foo-check",
      "lint:bar": "echo bar-check",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const ciLines = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm lint:foo",
    "      - run: pnpm lint:bar",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ];

  const fitness: Scenario[] = [
    { scnId: "SCN-TGT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];

  const citedScn = (script: string): ScriptCitation | null =>
    script === "lint:foo" ? { scnId: "SCN-TGT-001" } : null;

  let citedCredits: ReturnType<typeof runningStaticChecks>;
  let uncitedCredits: ReturnType<typeof runningStaticChecks>;
  let ledger: Ledger;
  beforeEach(() => {
    const runningCredits = runningStaticChecks([ciLines.join("\n")], pkg, SUITE_RUNNERS, citedScn);
    citedCredits = runningCredits.filter((o) => o.staticCheck === "lint:foo");
    uncitedCredits = runningCredits.filter((o) => o.staticCheck !== "lint:foo");
    ledger = reconcile(fitness, [...citedCredits, ...uncitedCredits]);
  });

  it("derives one citing credit and one uncited credit from the CI source (the corpus is real, not seeded)", () => {
    expect(citedCredits).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "lint:foo",
        exists: true,
        enforcedOverRealSource: true,
        scnId: "SCN-TGT-001",
      },
    ]);
    expect(uncitedCredits).toEqual([
      { qualityCheck: "fitness", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("posts the citing credit to the fitness scenario's row, satisfying its bare-tag obligation", () => {
    expect(rowFor(ledger, "SCN-TGT-001")?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "fitness" },
        evidenceObservation: citedCredits[0],
      },
    ]);
  });

  it("banks the uncited credit on the suspense row as cites-no-scenario, naming the handle that ran", () => {
    expect(rowFor(ledger, "(no scenario)")?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "lint:bar",
        outcome: "cites-no-scenario",
        evidenceObservation: uncitedCredits[0],
      },
    ]);
  });

  it("posts each credit to exactly one row — never dropped, never smeared", () => {
    const rowsHolding = (credit: unknown): (string | undefined)[] =>
      ledger.scenarioReconciliations
        .filter((r) => r.evidenceObservations.includes(credit as never))
        .map((r) => r.scnId);
    expect(rowsHolding(citedCredits[0])).toEqual(["SCN-TGT-001"]);
    expect(rowsHolding(uncitedCredits[0])).toEqual(["(no scenario)"]);
  });

  it("tallies both as running and exactly the uncited one as uncited", () => {
    expect(staticObservationTally(ledger)).toEqual({
      runningStaticCheckCount: 2,
      uncitedStaticCheckCount: 1,
    });
  });
});

describe("[SCN-USG-005] a cited static check under no convention of ours is attributed to its scenario, never an uncited static check", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  const guardPkg: PackageJsonScripts = {
    scripts: {
      "domain-purity": "echo domain-purity",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const guardCiLines = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm install --frozen-lockfile",
    "      - run: pnpm domain-purity",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ];

  const citedScn = (script: string): ScriptCitation | null =>
    script === "domain-purity" ? { scnId: "SCN-GRD-001" } : null;

  const fitness: Scenario[] = [
    {
      scnId: "SCN-GRD-001",
      evidenceObligations: [{ qualityCheck: "fitness" }],
    },
  ];
  let credits: ReturnType<typeof runningStaticChecks>;
  let ledger: Ledger;
  beforeEach(() => {
    credits = runningStaticChecks([guardCiLines.join("\n")], guardPkg, SUITE_RUNNERS, citedScn).filter(
      (o) => o.staticCheck === "domain-purity"
    );
    ledger = reconcile(fitness, credits);
  });

  const observation = {
    qualityCheck: "fitness",
    staticCheck: "domain-purity",
    exists: true,
    enforcedOverRealSource: true,
    scnId: "SCN-GRD-001",
  };

  it("derives the citing credit from the CI source and the scripts manifest (the corpus is real, not seeded)", () => {
    expect(credits).toEqual([observation]);
  });

  it("posts it to the citing scenario's row, satisfying its bare-tag obligation — the ATTRIBUTED half", () => {
    expect(accountFor(ledger, "SCN-GRD-001")?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "fitness" },
        evidenceObservation: observation,
      },
    ]);
    expect(accountFor(ledger, "SCN-GRD-001")?.verdict).toBe("balanced");
  });

  it("mints NO suspense row — a cited static check is never uncited, whatever it is called", () => {
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });

  it("tallies the run as 1 running static check and 0 uncited", () => {
    expect(staticObservationTally(ledger)).toEqual({
      runningStaticCheckCount: 1,
      uncitedStaticCheckCount: 0,
    });
  });
});
