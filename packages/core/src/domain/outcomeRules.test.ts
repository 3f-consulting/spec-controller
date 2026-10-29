import { describe, it, expect, beforeEach } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { UNNAMED_CLAIM_ID } from "./claimReconciliation.js";

import {
  noEvidenceObligationReconciliationsOf,
  citesUnknownScenarioReconciliationsOf,
  unnamedClaimReconciliationsOf,
} from "./qualityCheckReconciliation.js";
import type {
  BehaviouralEvidenceObservation,
  FitnessEvidenceObservation,
} from "../model.js";

const observation = (
  qualityCheck: BehaviouralEvidenceObservation["qualityCheck"],
  scnId: string | null,
  extra: Partial<BehaviouralEvidenceObservation> = {}
): BehaviouralEvidenceObservation => ({ qualityCheck, scnId, status: "passed", ...extra });

describe("[SCN-LDG-001] noEvidenceObligationReconciliationsOf lists evidence observations at quality-checks with no evidence obligation", () => {
  const pairs = new Set(["SCN-AAA-001 unit"]);

  it("skips an evidence observation at a NAMED pair — that one reconciles as a matched obligation", () => {
    expect(
      noEvidenceObligationReconciliationsOf("SCN-AAA-001", [observation("unit", "SCN-AAA-001")], pairs)
    ).toEqual([]);
  });

  it("lists an evidence observation at a quality-check with NO evidence obligation, evidence observation only, carrying its locator", () => {
    const items = noEvidenceObligationReconciliationsOf(
      "SCN-AAA-001",
      [observation("e2e", "SCN-AAA-001", { locator: "tests/a.e2e.ts" })],
      pairs
    );
    expect(items).toHaveLength(1);
    expect(items[0]).not.toHaveProperty("outcome");
    expect(items[0]!.evidenceObservations?.map((o) => [o.outcome, o.locator])).toEqual([["no-evidence-obligation", "tests/a.e2e.ts"]]);
    expect(items[0]!.evidenceObligation).toBeUndefined();
  });
});

describe("[SCN-LDG-008] an evidence observation at a quality check the scenario never raised is reported as no-evidence-obligation, its payload asserted on the observation", () => {
  const pairs = new Set(["SCN-AAA-001 unit"]);

  it("holds a behavioural evidence observation from no test file with only the keys it has", () => {
    const [item] = noEvidenceObligationReconciliationsOf("SCN-AAA-001", [observation("e2e", "SCN-AAA-001")], pairs);
    expect(item).toStrictEqual({
      qualityCheck: "e2e",
      evidenceObservations: [{ qualityCheck: "e2e", scnId: "SCN-AAA-001", status: "passed", outcome: "no-evidence-obligation" }],
    });
  });

  it("holds an untagged fitness evidence observation named by its runnable handle, with only the keys it has", () => {
    const untagged: FitnessEvidenceObservation = {
      qualityCheck: "fitness",
      scnId: "SCN-AAA-001",
      fitnessFunction: "lint:nobody-asked",
      exists: true,
      enforcedOverRealSource: true,
    };
    const [item] = noEvidenceObligationReconciliationsOf("SCN-AAA-001", [untagged], pairs);
    expect(item).toStrictEqual({
      qualityCheck: "fitness",
      evidenceObservations: [
        {
          qualityCheck: "fitness",
          scnId: "SCN-AAA-001",
          fitnessFunction: "lint:nobody-asked",
          exists: true,
          enforcedOverRealSource: true,
          outcome: "no-evidence-obligation",
        },
      ],
    });
  });
});

describe("[SCN-LDG-001] citesUnknownScenarioReconciliationsOf builds a phantom claim's row's items", () => {
  it("posts one cites-unknown-scenario item, with an evidence observation and no obligation, per citing evidence observation, in citation order", () => {
    const items = citesUnknownScenarioReconciliationsOf([
      observation("unit", "SCN-ZZZ-009", { locator: "tests/z1.test.ts" }),
      observation("integration", "SCN-ZZZ-009", { locator: "features/z2.feature" }),
    ]);
    expect(items.map((i) => i.evidenceObservations?.map((o) => o.outcome))).toEqual([
      ["cites-unknown-scenario"],
      ["cites-unknown-scenario"],
    ]);
    expect(items.map((i) => i.evidenceObservations?.map((o) => o.locator))).toEqual([["tests/z1.test.ts"], ["features/z2.feature"]]);
    expect(items[0]!.evidenceObligation).toBeUndefined();
  });
});

describe("[SCN-LDG-006] an evidence observation citing a scenario no feature carries is reported as a phantom claim's reconciliation, out of balance, its payload asserted on the observation", () => {
  it("reconciles the cited code as a phantom claim, out of balance, its one reconciliation holding the observation with only the keys it has", () => {
    const row = reconcile([], [observation("unit", "SCN-ZZZ-009")]).claimReconciliations.find((r) => r.claim === "SCN-ZZZ-009")!;
    expect(row.kind).toBe("phantom-claim");
    expect(row.verdict).toBe("out-of-balance");
    expect(row.qualityCheckReconciliations).toStrictEqual([
      {
        qualityCheck: "unit",
        evidenceObservations: [{ qualityCheck: "unit", scnId: "SCN-ZZZ-009", status: "passed", outcome: "cites-unknown-scenario" }],
      },
    ]);
  });
});

describe("[SCN-LDG-034] an observation on a phantom claim's row carries the keys it has a value for and omits the rest", () => {
  it("carries the locator a citing fitness evidence observation arrived with", () => {
    const guardWithLocator: FitnessEvidenceObservation & { locator: string } = {
      qualityCheck: "fitness",
      fitnessFunction: "lint:complexity",
      scnId: "SCN-ZZZ-009",
      exists: true,
      enforcedOverRealSource: true,
      locator: "packages/core/src/parse/fitnessCitations.ts",
    };
    const [item] = citesUnknownScenarioReconciliationsOf([guardWithLocator]);
    expect(item).toStrictEqual({
      qualityCheck: "fitness",
      evidenceObservations: [
        {
          qualityCheck: "fitness",
          fitnessFunction: "lint:complexity",
          scnId: "SCN-ZZZ-009",
          exists: true,
          enforcedOverRealSource: true,
          locator: "packages/core/src/parse/fitnessCitations.ts",
          outcome: "cites-unknown-scenario",
        },
      ],
    });
  });

  it("carries no locator key when the citing fitness evidence observation has none", () => {
    const guard: FitnessEvidenceObservation = {
      qualityCheck: "fitness",
      fitnessFunction: "lint:complexity",
      scnId: "SCN-ZZZ-009",
      exists: true,
      enforcedOverRealSource: true,
    };
    const [item] = citesUnknownScenarioReconciliationsOf([guard]);
    expect(item).toStrictEqual({
      qualityCheck: "fitness",
      evidenceObservations: [
        {
          qualityCheck: "fitness",
          fitnessFunction: "lint:complexity",
          scnId: "SCN-ZZZ-009",
          exists: true,
          enforcedOverRealSource: true,
          outcome: "cites-unknown-scenario",
        },
      ],
    });
  });
});

describe("[SCN-LDG-001] unnamedClaimReconciliationsOf orders the unnamed claim's row's items", () => {
  let broken: ReturnType<typeof observation>;
  let uncited: ReturnType<typeof observation>;
  beforeEach(() => {
    broken = observation("unit", null, {
      status: "failed",
      broken: true,
      locator: "tests/broken.test.ts",
      message: "Failed to collect",
    });
    uncited = observation("unit", null, { locator: "tests/orphan.test.ts" });
  });
  const guard: FitnessEvidenceObservation = {
    qualityCheck: "fitness",
    fitnessFunction: "lint:nobody-asked",
    exists: true,
    enforcedOverRealSource: true,
  };

  it("holds the unnamed claim's evidence in one reconciliation per quality check, each observation a line in evidence order, a broken one reading broken", () => {
    const row = reconcile([], [guard, uncited, broken]).claimReconciliations.find((r) => r.claim === UNNAMED_CLAIM_ID)!;
    expect(row.qualityCheckReconciliations.map((i) => [i.qualityCheck, i.outcome, i.evidenceObservations?.map((o) => [o.locator, o.outcome])])).toEqual([
      ["unit", undefined, [["tests/broken.test.ts", "broken"], ["tests/orphan.test.ts", "cites-no-scenario"]]],
      ["fitness", undefined, [[undefined, "cites-no-scenario"]]],
    ]);
  });
});

describe("[SCN-LDG-007] an observation on the unnamed claim's row omits the payload keys it has no value for", () => {
  it("omits BOTH the locator and the message key on a broken observation that carries neither", () => {
    const silent = observation("unit", null, { broken: true, status: "failed" });
    const [item] = unnamedClaimReconciliationsOf([silent]);
    expect(item).toStrictEqual({
      qualityCheck: "unit",
      evidenceObservations: [{ qualityCheck: "unit", scnId: null, status: "failed", broken: true, outcome: "broken" }],
    });
  });

  it("omits the locator key on an uncited behavioural evidence observation that came from no test file", () => {
    const anonymous = observation("integration", null);
    const [item] = unnamedClaimReconciliationsOf([anonymous]);
    expect(item).toStrictEqual({
      qualityCheck: "integration",
      evidenceObservations: [{ ...anonymous, outcome: "cites-no-scenario" }],
    });
    expect(item).not.toHaveProperty("locator");
  });
});
