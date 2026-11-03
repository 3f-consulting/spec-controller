import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { BehaviouralEvidenceObservation, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { reconcilingItemsOf } from "./claimReconciliationsTable.test-utils.js";

const CITES_NO_SCENARIO = CORE_MESSAGES[CoreMessage.OutcomeCitesNoScenario];

const sharers: Scenario[] = [
  { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "features/login.feature", title: "the right password lets a user in" },
  { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "features/login.feature", title: "the wrong password turns a user away" },
  { scnId: "SCN-DUP-002", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "features/lockout.feature", title: "three failures lock a user out" },
  { scnId: "SCN-DUP-002", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "features/lockout.feature", title: "a locked user is told why" },
];

function observed(scnId: string | null, status: "passed" | "failed", testName: string, locator = "tests/x.test.ts"): BehaviouralEvidenceObservation {
  return { qualityCheckKind: "unit", scnId, status, locator, testName };
}

const mixedFile = (): BehaviouralEvidenceObservation[] => [
  observed("SCN-DUP-001", "failed", "lets the right password in"),
  observed(null, "passed", "reads the config"),
  observed("SCN-DUP-001", "passed", "turns the wrong password away"),
  observed(null, "failed", "parses the flags"),
  observed("SCN-DUP-002", "passed", "locks the user out"),
  observed(null, "passed", "loads the fixture", "tests/y.test.ts"),
];

function unnamedClaimItemsOf(observations: BehaviouralEvidenceObservation[]): string[] {
  return reconcilingItemsOf(renderMarkdown(__er(reconcile(sharers, observations)), ctx, publishedExitCodeOf), "(unnamed claim)");
}

describe("[SCN-RPT-075] in one file, the tests citing a code more than one scenario carries are grouped apart from the tests citing no scenario, and only their group names the code, once, whatever its tests' messages say, even where the runner names no file", () => {
  it("gives the file one entry per shared code and one for its tests citing nothing, each counting and naming only its own tests", () => {
    const remark = (code: string): string => CORE_MESSAGES[CoreMessage.SharedScnCode](code);
    expect(unnamedClaimItemsOf(mixedFile())).toEqual([
      `unit: ${CITES_NO_SCENARIO} (tests/x.test.ts) — 2 ran, 1 passed, 1 failed (failed: parses the flags)`,
      `unit: ${CITES_NO_SCENARIO} (tests/x.test.ts: ${remark("SCN-DUP-001")}) — 2 ran, 1 passed, 1 failed (failed: lets the right password in)`,
      `unit: ${CITES_NO_SCENARIO} (tests/x.test.ts: ${remark("SCN-DUP-002")}) — 1 ran, 1 passed, 0 failed`,
      `unit: ${CITES_NO_SCENARIO} (tests/y.test.ts) — 1 ran, 1 passed, 0 failed`,
    ]);
  });

  it("names the code once, then the first line of each different message its failing tests give", () => {
    const failing = (testName: string, message: string): BehaviouralEvidenceObservation => ({ ...observed("SCN-DUP-001", "failed", testName), message });
    const code = CORE_MESSAGES[CoreMessage.SharedScnCode]("SCN-DUP-001");
    const said = `unit: ${CITES_NO_SCENARIO} (tests/x.test.ts: ${code}`;
    const one = (o: BehaviouralEvidenceObservation): string[] => unnamedClaimItemsOf([o]).map((item) => item.replace(" — 1 ran, 0 passed, 1 failed (failed: t1)", ""));
    expect([failing("t1", ""), failing("t1", "   "), { ...failing("t1", ""), locator: "" }].map(one).flat()).toEqual([`${said})`, `${said})`, `unit: ${CITES_NO_SCENARIO} (${code})`]);
    expect(one({ qualityCheckKind: "unit", scnId: "SCN-DUP-001", status: "failed", testName: "t1" })).toEqual([`unit: ${CITES_NO_SCENARIO} (${code})`]);
    expect(unnamedClaimItemsOf([failing("t1", "expected 1 to be 2\n    at foo (x.ts:1)")])).toEqual([
      `${said} / expected 1 to be 2) — 1 ran, 0 passed, 1 failed (failed: t1)`,
    ]);
    expect(unnamedClaimItemsOf([failing("t1", "expected 1 to be 2"), failing("t2", "expected 3 to be 4")])).toEqual([
      `${said} / expected 1 to be 2 / expected 3 to be 4) — 2 ran, 0 passed, 2 failed (failed: t1 / t2)`,
    ]);
  });
});
