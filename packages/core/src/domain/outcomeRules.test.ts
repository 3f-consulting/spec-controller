import { describe, it, expect, beforeEach } from "vitest";

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
    expect(items[0]!.outcome).toBe("no-evidence-obligation");
    expect(items[0]!.locator).toBe("tests/a.e2e.ts");
    expect(items[0]!.evidenceObligation).toBeUndefined();
    expect(items[0]!.evidenceObservation).toBeDefined();
  });
});

describe("[SCN-LDG-008] a no-evidence-obligation item omits the keys its evidence observation has no value for", () => {
  const pairs = new Set(["SCN-AAA-001 unit"]);

  it("omits BOTH the fitnessFunction and the locator key on a behavioural evidence observation from no test file", () => {
    const anonymous = observation("e2e", "SCN-AAA-001");
    const [item] = noEvidenceObligationReconciliationsOf("SCN-AAA-001", [anonymous], pairs);
    expect(item).toStrictEqual({
      qualityCheck: "e2e",
      outcome: "no-evidence-obligation",
      evidenceObservation: anonymous,
    });
    expect(item).not.toHaveProperty("fitnessFunction");
    expect(item).not.toHaveProperty("locator");
  });

  it("names an untagged fitness function by its runnable handle, and carries no locator key", () => {
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
      fitnessFunction: "lint:nobody-asked",
      outcome: "no-evidence-obligation",
      evidenceObservation: untagged,
    });
    expect(item).not.toHaveProperty("locator");
  });
});

describe("[SCN-LDG-001] citesUnknownScenarioReconciliationsOf builds a phantom claim's row's items", () => {
  it("posts one cites-unknown-scenario item, with an evidence observation and no obligation, per citing evidence observation, in citation order", () => {
    const items = citesUnknownScenarioReconciliationsOf([
      observation("unit", "SCN-ZZZ-009", { locator: "tests/z1.test.ts" }),
      observation("integration", "SCN-ZZZ-009", { locator: "features/z2.feature" }),
    ]);
    expect(items.map((i) => i.outcome)).toEqual([
      "cites-unknown-scenario",
      "cites-unknown-scenario",
    ]);
    expect(items.map((i) => i.locator)).toEqual(["tests/z1.test.ts", "features/z2.feature"]);
    expect(items[0]!.evidenceObligation).toBeUndefined();
  });
});

describe("[SCN-LDG-006] the items on a phantom claim's row carry only the fields the evidence observation has", () => {
  it("carries neither a locator nor a fitnessFunction key when the behavioural evidence observation has no locator", () => {
    const noLocator = observation("unit", "SCN-ZZZ-009");
    const [item] = citesUnknownScenarioReconciliationsOf([noLocator]);
    expect(item).toStrictEqual({
      qualityCheck: "unit",
      outcome: "cites-unknown-scenario",
      evidenceObservation: noLocator,
    });
    expect(item).not.toHaveProperty("locator");
    expect(item).not.toHaveProperty("fitnessFunction");
  });
});

describe("[SCN-LDG-034] a fitness evidence observation's item carries no locator, even when the evidence observation carries one", () => {
  it("drops a locator a citing fitness evidence observation arrived with rather than stamping it on the item", () => {
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
      fitnessFunction: "lint:complexity",
      outcome: "cites-unknown-scenario",
      evidenceObservation: guardWithLocator,
    });
    expect(item).not.toHaveProperty("locator");
    expect(item!.evidenceObservation).toHaveProperty("locator");
  });
});

describe("[SCN-LDG-001] unnamedClaimReconciliationsOf orders the unnamed claim's row's items", () => {
  let broken: ReturnType<typeof observation>;
  let uncited: ReturnType<typeof observation>;
  beforeEach(() => {
    broken = observation("unit", "SCN-AAA-001", {
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

  it("lists broken FIRST, then the uncited behavioural evidence observations, then the uncited fitness functions", () => {
    const items = unnamedClaimReconciliationsOf([broken], [uncited], [guard]);
    expect(items.map((i) => i.outcome)).toEqual(["broken", "cites-no-scenario", "cites-no-scenario"]);
    expect(items[2]!.fitnessFunction).toBe("lint:nobody-asked");
  });

  it("carries locator + message on a broken item, and no evidence observation", () => {
    const [item] = unnamedClaimReconciliationsOf([broken], [], []);
    expect(item!.locator).toBe("tests/broken.test.ts");
    expect(item!.message).toBe("Failed to collect");
    expect(item!.evidenceObservation).toBeUndefined();
  });
});

describe("[SCN-LDG-007] an item on the unnamed claim's row omits the payload keys its observation has no value for", () => {
  it("omits BOTH the locator and the message key on a broken item that carries neither", () => {
    const silent = observation("unit", null, { broken: true, status: "failed" });
    const [item] = unnamedClaimReconciliationsOf([silent], [], []);
    expect(item).toStrictEqual({ qualityCheck: "unit", outcome: "broken" });
    expect(item).not.toHaveProperty("locator");
    expect(item).not.toHaveProperty("message");
  });

  it("omits the locator key on an uncited behavioural evidence observation that came from no test file", () => {
    const anonymous = observation("integration", null);
    const [item] = unnamedClaimReconciliationsOf([], [anonymous], []);
    expect(item).toStrictEqual({
      qualityCheck: "integration",
      outcome: "cites-no-scenario",
      evidenceObservation: anonymous,
    });
    expect(item).not.toHaveProperty("locator");
  });
});
