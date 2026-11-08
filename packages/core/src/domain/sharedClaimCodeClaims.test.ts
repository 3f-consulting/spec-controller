import { describe, it, expect } from "vitest";
import { linesOf, UNNAMED_CLAIM_ID } from "./claimReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import { postingOf } from "./posting.js";
import type { ClaimReconciliation, EvidenceObservation, Scenario } from "../model.js";

const CODE = "CLM-DUP-001";

const letIn: Scenario = {
  claimCode: CODE,
  evidenceObligations: [{ qualityCheckKind: "unit" }],
  feature: "features/login.feature",
  title: "a user with the right password is let in",
};
const turnedAway: Scenario = {
  claimCode: CODE,
  evidenceObligations: [{ qualityCheckKind: "unit" }],
  feature: "features/login.feature",
  title: "a user with the wrong password is turned away",
};
const lockedOut: Scenario = {
  claimCode: CODE,
  evidenceObligations: [{ qualityCheckKind: "unit" }],
  feature: "features/lockout.feature",
  title: "a user who fails three times is locked out",
};

const passing: EvidenceObservation = { qualityCheckKind: "unit", claimCode: CODE, status: "passed", locator: "tests/login.test.ts" };
const broken: EvidenceObservation = {
  qualityCheckKind: "unit", claimCode: CODE, status: "failed", broken: true, locator: "tests/login-broken.test.ts",
};

const rowsFor = (rows: readonly ClaimReconciliation[], claim: string) => rows.filter((row) => row.claim === claim);

describe("[CLM-LDG-046] two scenarios sharing one claim code are two claims, and evidence citing the code posts to the unnamed claim", () => {
  it("gives each of two sharers its own row under the shared code", () => {
    const rows = reconcile([letIn, turnedAway], []).claimReconciliations;
    expect(rowsFor(rows, CODE).map((row) => [row.claim, row.kind])).toEqual([
      [CODE, "scenario"],
      [CODE, "scenario"],
    ]);
  });

  it("reconciles each sharer's own obligation duplicate-claim-code, naming the scenario that row reconciles", () => {
    const rows = reconcile([letIn, turnedAway], []).claimReconciliations;
    expect(rowsFor(rows, CODE).map((row) => row.qualityCheckReconciliations)).toEqual([
      [{ qualityCheckKind: "unit", outcome: "duplicate-claim-code", evidenceObligation: { qualityCheckKind: "unit" }, scenario: { feature: "features/login.feature", title: "a user with the right password is let in" } }],
      [{ qualityCheckKind: "unit", outcome: "duplicate-claim-code", evidenceObligation: { qualityCheckKind: "unit" }, scenario: { feature: "features/login.feature", title: "a user with the wrong password is turned away" } }],
    ]);
  });

  it("gives three sharers three rows", () => {
    const rows = reconcile([letIn, turnedAway, lockedOut], []).claimReconciliations;
    expect(rowsFor(rows, CODE).map((row) => row.qualityCheckReconciliations.map((reconciliation) => reconciliation.scenario?.title))).toEqual([
      ["a user with the right password is let in"],
      ["a user with the wrong password is turned away"],
      ["a user who fails three times is locked out"],
    ]);
  });

  it("posts a passing and a broken observation citing the code to the unnamed claim, each naming the code, and to neither sharer", () => {
    const rows = reconcile([letIn, turnedAway], [passing, broken]).claimReconciliations;
    const unnamed = rowsFor(rows, UNNAMED_CLAIM_ID);
    expect(unnamed.flatMap((row) => row.qualityCheckReconciliations.flatMap(linesOf))).toEqual([
      {
        qualityCheckKind: "unit",
        outcome: "broken",
        evidenceObservation: { ...broken, notes: [{ kind: "shared-claim-code", code: CODE }], outcome: "broken" },
      },
      {
        qualityCheckKind: "unit",
        outcome: "cites-no-scenario",
        evidenceObservation: { ...passing, notes: [{ kind: "shared-claim-code", code: CODE }], outcome: "cites-no-scenario" },
      },
    ]);
    expect(
      rowsFor(rows, CODE).flatMap((row) => row.qualityCheckReconciliations.flatMap(linesOf)).filter((line) => line.evidenceObservation !== undefined)
    ).toEqual([]);
  });

  it("routes an observation citing a shared code to the unnamed claim, a broken one as broken", () => {
    const carriedClaimCodes = new Set([CODE]);
    const sharedClaimCodes = new Set([CODE]);
    expect(postingOf(passing, carriedClaimCodes, sharedClaimCodes)).toEqual({ kind: "unnamed-claim", posted: "cites-shared-code" });
    expect(postingOf(broken, carriedClaimCodes, sharedClaimCodes)).toEqual({ kind: "unnamed-claim", posted: "broken" });
  });
});
