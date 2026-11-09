import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { BehaviouralEvidenceObservation, Scenario } from "../model.js";
import { CoreMessage } from "./messages.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { reconcilingItemsOf } from "./claimReconciliationsTable.test-utils.js";
import { coreMessage } from "./coreText.js";

const CITES_NO_CLAIM = (): string => coreMessage(CoreMessage.OutcomeCitesNoClaim);

const sharers: Scenario[] = [
  { claimCode: "CLM-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "features/login.feature", title: "the right password lets a user in" },
  { claimCode: "CLM-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "features/login.feature", title: "the wrong password turns a user away" },
  { claimCode: "CLM-DUP-002", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "features/lockout.feature", title: "three failures lock a user out" },
  { claimCode: "CLM-DUP-002", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "features/lockout.feature", title: "a locked user is told why" },
];

function observed(claimCode: string | null, status: "passed" | "failed", testName: string, locator = "tests/x.test.ts"): BehaviouralEvidenceObservation {
  return { qualityCheckKind: "unit", claimCode, status, locator, testName };
}

const mixedFile = (): BehaviouralEvidenceObservation[] => [
  observed("CLM-DUP-001", "failed", "lets the right password in"),
  observed(null, "passed", "reads the config"),
  observed("CLM-DUP-001", "passed", "turns the wrong password away"),
  observed(null, "failed", "parses the flags"),
  observed("CLM-DUP-002", "passed", "locks the user out"),
  observed(null, "passed", "loads the fixture", "tests/y.test.ts"),
];

function unnamedClaimItemsOf(observations: BehaviouralEvidenceObservation[]): string[] {
  return reconcilingItemsOf(renderMarkdown(__er(reconcile(sharers, observations)), ctx, publishedExitCodeOf), "(unnamed claim)");
}

describe("[CLM-RPT-075] in one file, the tests citing a code more than one scenario carries are grouped apart from the tests citing no claim, and only their group names the code, once, whatever its tests' messages say, even where the runner names no file", () => {
  it("gives the file one entry per shared code and one for its tests citing nothing, each counting and naming only its own tests", () => {
    const remark = (code: string): string => coreMessage(CoreMessage.SharedClaimCode, { code });
    expect(unnamedClaimItemsOf(mixedFile())).toEqual([
      `unit: ${CITES_NO_CLAIM()} (tests/x.test.ts) — 2 ran, 1 passed, 1 failed (failed: parses the flags)`,
      `unit: ${CITES_NO_CLAIM()} (tests/x.test.ts: ${remark("CLM-DUP-001")}) — 2 ran, 1 passed, 1 failed (failed: lets the right password in)`,
      `unit: ${CITES_NO_CLAIM()} (tests/x.test.ts: ${remark("CLM-DUP-002")}) — 1 ran, 1 passed, 0 failed`,
      `unit: ${CITES_NO_CLAIM()} (tests/y.test.ts) — 1 ran, 1 passed, 0 failed`,
    ]);
  });

  it("names the code once, then the first line of each different message its failing tests give", () => {
    const failing = (testName: string, message: string): BehaviouralEvidenceObservation => ({ ...observed("CLM-DUP-001", "failed", testName), message });
    const code = coreMessage(CoreMessage.SharedClaimCode, { code: "CLM-DUP-001" });
    const said = `unit: ${CITES_NO_CLAIM()} (tests/x.test.ts: ${code}`;
    const one = (o: BehaviouralEvidenceObservation): string[] => unnamedClaimItemsOf([o]).map((item) => item.replace(" — 1 ran, 0 passed, 1 failed (failed: t1)", ""));
    expect([failing("t1", ""), failing("t1", "   "), { ...failing("t1", ""), locator: "" }].map(one).flat()).toEqual([`${said})`, `${said})`, `unit: ${CITES_NO_CLAIM()} (${code})`]);
    expect(one({ qualityCheckKind: "unit", claimCode: "CLM-DUP-001", status: "failed", testName: "t1" })).toEqual([`unit: ${CITES_NO_CLAIM()} (${code})`]);
    expect(unnamedClaimItemsOf([failing("t1", "expected 1 to be 2\n    at foo (x.ts:1)")])).toEqual([
      `${said} / expected 1 to be 2) — 1 ran, 0 passed, 1 failed (failed: t1)`,
    ]);
    expect(unnamedClaimItemsOf([failing("t1", "expected 1 to be 2"), failing("t2", "expected 3 to be 4")])).toEqual([
      `${said} / expected 1 to be 2 / expected 3 to be 4) — 2 ran, 0 passed, 2 failed (failed: t1 / t2)`,
    ]);
  });
});
