import { describe, it, expect, beforeEach } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { UNNAMED_CLAIM_ID } from "./claimReconciliation.js";

import {
  notAskedForReconciliationsOf,
  citesUnknownClaimReconciliationsOf,
  unnamedClaimReconciliationsOf,
} from "./qualityCheckReconciliation.js";
import type {
  BehaviouralEvidenceObservation,
  FitnessEvidenceObservation,
} from "../model.js";

const observation = (
  qualityCheckKind: BehaviouralEvidenceObservation["qualityCheckKind"],
  claimCode: string | null,
  extra: Partial<BehaviouralEvidenceObservation> = {}
): BehaviouralEvidenceObservation => ({ qualityCheckKind, claimCode, status: "passed", ...extra });

describe("[CLM-LDG-001] notAskedForReconciliationsOf lists evidence observations at kinds of quality check with no evidence obligation", () => {
  const pairs = new Set(["CLM-AAA-001 unit"]);

  it("skips an evidence observation at a NAMED pair — that one reconciles as a matched obligation", () => {
    expect(
      notAskedForReconciliationsOf("CLM-AAA-001", [observation("unit", "CLM-AAA-001")], pairs)
    ).toEqual([]);
  });

  it("lists an evidence observation at a kind of quality check with NO evidence obligation, evidence observation only, carrying its locator", () => {
    const items = notAskedForReconciliationsOf(
      "CLM-AAA-001",
      [observation("e2e", "CLM-AAA-001", { locator: "tests/a.e2e.ts" })],
      pairs
    );
    expect(items).toHaveLength(1);
    expect(items[0]).not.toHaveProperty("outcome");
    expect(items[0]!.evidenceObservations?.map((o) => [o.outcome, o.locator])).toEqual([["not-asked-for", "tests/a.e2e.ts"]]);
    expect(items[0]!.evidenceObligation).toBeUndefined();
  });
});

describe("[CLM-LDG-008] an evidence observation at a kind of quality check the scenario never raised is reported as not-asked-for, its payload asserted on the observation", () => {
  const pairs = new Set(["CLM-AAA-001 unit"]);

  it("holds a behavioural evidence observation from no test file with only the keys it has", () => {
    const [item] = notAskedForReconciliationsOf("CLM-AAA-001", [observation("e2e", "CLM-AAA-001")], pairs);
    expect(item).toStrictEqual({
      qualityCheckKind: "e2e",
      evidenceObservations: [{ qualityCheckKind: "e2e", claimCode: "CLM-AAA-001", status: "passed", outcome: "not-asked-for" }],
    });
  });

  it("holds an untagged fitness evidence observation named by its runnable handle, with only the keys it has", () => {
    const untagged: FitnessEvidenceObservation = {
      qualityCheckKind: "fitness",
      claimCode: "CLM-AAA-001",
      fitnessFunction: "lint:nobody-asked",
      exists: true,
      enforcedOverRealSource: true,
    };
    const [item] = notAskedForReconciliationsOf("CLM-AAA-001", [untagged], pairs);
    expect(item).toStrictEqual({
      qualityCheckKind: "fitness",
      evidenceObservations: [
        {
          qualityCheckKind: "fitness",
          claimCode: "CLM-AAA-001",
          fitnessFunction: "lint:nobody-asked",
          exists: true,
          enforcedOverRealSource: true,
          outcome: "not-asked-for",
        },
      ],
    });
  });
});

describe("[CLM-LDG-001] citesUnknownClaimReconciliationsOf builds a phantom claim's row's items", () => {
  it("posts one cites-unknown-claim item, with an evidence observation and no obligation, per citing evidence observation, in citation order", () => {
    const items = citesUnknownClaimReconciliationsOf([
      observation("unit", "CLM-ZZZ-009", { locator: "tests/z1.test.ts" }),
      observation("integration", "CLM-ZZZ-009", { locator: "features/z2.feature" }),
    ]);
    expect(items.map((i) => i.evidenceObservations?.map((o) => o.outcome))).toEqual([
      ["cites-unknown-claim"],
      ["cites-unknown-claim"],
    ]);
    expect(items.map((i) => i.evidenceObservations?.map((o) => o.locator))).toEqual([["tests/z1.test.ts"], ["features/z2.feature"]]);
    expect(items[0]!.evidenceObligation).toBeUndefined();
  });
});

describe("[CLM-LDG-006] an evidence observation citing a scenario no feature carries is reported as a phantom claim's reconciliation, out of balance, its payload asserted on the observation", () => {
  it("reconciles the cited code as a phantom claim, out of balance, its one reconciliation holding the observation with only the keys it has", () => {
    const row = reconcile([], [observation("unit", "CLM-ZZZ-009")]).claimReconciliations.find((r) => r.claim === "CLM-ZZZ-009")!;
    expect(row.kind).toBe("phantom-claim");
    expect(row.verdict).toBe("out-of-balance");
    expect(row.qualityCheckReconciliations).toStrictEqual([
      {
        qualityCheckKind: "unit",
        evidenceObservations: [{ qualityCheckKind: "unit", claimCode: "CLM-ZZZ-009", status: "passed", outcome: "cites-unknown-claim" }],
      },
    ]);
  });
});

describe("[CLM-LDG-034] an observation on a phantom claim's row carries the keys it has a value for and omits the rest", () => {
  it("carries the locator a citing fitness evidence observation arrived with", () => {
    const guardWithLocator: FitnessEvidenceObservation & { locator: string } = {
      qualityCheckKind: "fitness",
      fitnessFunction: "lint:complexity",
      claimCode: "CLM-ZZZ-009",
      exists: true,
      enforcedOverRealSource: true,
      locator: "packages/core/src/parse/fitnessCitations.ts",
    };
    const [item] = citesUnknownClaimReconciliationsOf([guardWithLocator]);
    expect(item).toStrictEqual({
      qualityCheckKind: "fitness",
      evidenceObservations: [
        {
          qualityCheckKind: "fitness",
          fitnessFunction: "lint:complexity",
          claimCode: "CLM-ZZZ-009",
          exists: true,
          enforcedOverRealSource: true,
          locator: "packages/core/src/parse/fitnessCitations.ts",
          outcome: "cites-unknown-claim",
        },
      ],
    });
  });

  it("carries no locator key when the citing fitness evidence observation has none", () => {
    const guard: FitnessEvidenceObservation = {
      qualityCheckKind: "fitness",
      fitnessFunction: "lint:complexity",
      claimCode: "CLM-ZZZ-009",
      exists: true,
      enforcedOverRealSource: true,
    };
    const [item] = citesUnknownClaimReconciliationsOf([guard]);
    expect(item).toStrictEqual({
      qualityCheckKind: "fitness",
      evidenceObservations: [
        {
          qualityCheckKind: "fitness",
          fitnessFunction: "lint:complexity",
          claimCode: "CLM-ZZZ-009",
          exists: true,
          enforcedOverRealSource: true,
          outcome: "cites-unknown-claim",
        },
      ],
    });
  });
});

describe("[CLM-LDG-001] unnamedClaimReconciliationsOf orders the unnamed claim's row's items", () => {
  let neverRan: ReturnType<typeof observation>;
  let uncited: ReturnType<typeof observation>;
  beforeEach(() => {
    neverRan = observation("unit", null, {
      status: "failed",
      neverRan: true,
      locator: "tests/never-ran.test.ts",
      message: "Failed to collect",
    });
    uncited = observation("unit", null, { locator: "tests/orphan.test.ts" });
  });
  const guard: FitnessEvidenceObservation = {
    qualityCheckKind: "fitness",
    fitnessFunction: "lint:nobody-asked",
    exists: true,
    enforcedOverRealSource: true,
  };

  it("holds the unnamed claim's evidence in one reconciliation per kind of quality check, each observation a line in evidence order, one that never ran reading never-ran", () => {
    const row = reconcile([], [guard, uncited, neverRan]).claimReconciliations.find((r) => r.claim === UNNAMED_CLAIM_ID)!;
    expect(row.qualityCheckReconciliations.map((i) => [i.qualityCheckKind, i.outcome, i.evidenceObservations?.map((o) => [o.locator, o.outcome])])).toEqual([
      ["unit", undefined, [["tests/never-ran.test.ts", "never-ran"], ["tests/orphan.test.ts", "cites-no-claim"]]],
      ["fitness", undefined, [[undefined, "cites-no-claim"]]],
    ]);
  });
});

describe("[CLM-LDG-007] an observation on the unnamed claim's row omits the payload keys it has no value for", () => {
  it("omits BOTH the locator and the message key on an observation that never ran and carries neither", () => {
    const silent = observation("unit", null, { neverRan: true, status: "failed" });
    const [item] = unnamedClaimReconciliationsOf([silent]);
    expect(item).toStrictEqual({
      qualityCheckKind: "unit",
      evidenceObservations: [{ qualityCheckKind: "unit", claimCode: null, status: "failed", neverRan: true, outcome: "never-ran" }],
    });
  });

  it("omits the locator key on an uncited behavioural evidence observation that came from no test file", () => {
    const anonymous = observation("integration", null);
    const [item] = unnamedClaimReconciliationsOf([anonymous]);
    expect(item).toStrictEqual({
      qualityCheckKind: "integration",
      evidenceObservations: [{ ...anonymous, outcome: "cites-no-claim" }],
    });
    expect(item).not.toHaveProperty("locator");
  });
});
