import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { reconcilingItemsOf } from "./claimReconciliationsTable.test-utils.js";

const CITES_NO_SCENARIO = OUTCOME_DESCRIPTION["cites-no-scenario"];

const sharers: Scenario[] = [
  { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheck: "fitness" }], feature: "features/ci.feature", title: "the build has no lint errors" },
  { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheck: "fitness" }], feature: "features/ci.feature", title: "the build has no type errors" },
  { scnId: "SCN-DUP-002", evidenceObligations: [{ qualityCheck: "fitness" }], feature: "features/deps.feature", title: "no dependency is unpinned" },
  { scnId: "SCN-DUP-002", evidenceObligations: [{ qualityCheck: "fitness" }], feature: "features/deps.feature", title: "no dependency is unused" },
];

function step(fitnessFunction: string, scnId?: string): EvidenceObservation {
  return {
    qualityCheck: "fitness",
    fitnessFunction,
    ...(scnId !== undefined ? { scnId } : {}),
    exists: true,
    enforcedOverRealSource: true,
    status: "passed",
  };
}

const uncitedTest: EvidenceObservation = { qualityCheck: "unit", scnId: null, status: "passed", locator: "tests/x.test.ts", testName: "reads the config" };

function unnamedClaimItemsOf(observations: EvidenceObservation[]): string[] {
  return reconcilingItemsOf(renderMarkdown(__er(reconcile(sharers, observations)), ctx, publishedExitCodeOf), "(unnamed claim)");
}

describe("[SCN-RPT-076] a CI step citing a code more than one scenario carries is listed apart from the CI steps citing no scenario, and its entry names the code", () => {
  it("lists the CI steps citing nothing as one entry and the CI steps citing each shared code as an entry of their own naming the code, after the file entries", () => {
    const remark = (code: string): string => CORE_MESSAGES[CoreMessage.SharedScnCode](code);
    const observations = [
      step("guard-lint", "SCN-DUP-001"),
      step("guard-none"),
      step("guard-pins", "SCN-DUP-002"),
      uncitedTest,
      step("guard-types", "SCN-DUP-001"),
      step("guard-other"),
    ];
    expect(unnamedClaimItemsOf(observations)).toEqual([
      `unit: ${CITES_NO_SCENARIO} (tests/x.test.ts) — 1 ran, 1 passed, 0 failed`,
      `fitness: ${CITES_NO_SCENARIO} — 2 CI steps: guard-none, guard-other`,
      `fitness: ${CITES_NO_SCENARIO} (${remark("SCN-DUP-001")}) — 2 CI steps: guard-lint, guard-types`,
      `fitness: ${CITES_NO_SCENARIO} (${remark("SCN-DUP-002")}) — 1 CI step: guard-pins`,
    ]);
  });

  it("reads as one entry, with no remark, when no CI step cites a shared code", () => {
    expect(unnamedClaimItemsOf([step("guard-none"), step("guard-other")])).toEqual([
      `fitness: ${CITES_NO_SCENARIO} — 2 CI steps: guard-none, guard-other`,
    ]);
  });
});
