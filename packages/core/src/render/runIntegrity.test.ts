import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarios.js";
import { parseVitestEvidenceObservations } from "../parse/vitest.js";
import type { VitestJsonReport } from "../parse/vitest.js";
import { ciStepRecordObservations } from "../parse/ciStepRecord.js";
import type { StepRecord } from "../domain/stepRecord.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { RunContext } from "../domain/runProvenance.js";

const ctx: RunContext = {
  target: "run-integrity-target",
  inputs: { features: "specs/features", vitest: "vitest-report.json" },
  runStart: new Date("2026-10-05T17:00:00.000Z"),
  sourceSha: "4084f00dc0ffeeba110000000000000000deadbe",
  toolSha: "4084aaaa71ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const ROOT = "/work/target";

const FEATURE = `Feature: run integrity

  @fitness @SCN-RIN-001
  Scenario: a check the CI run never ran

  @unit @SCN-RIN-002
  Scenario: a behaviour whose suite failed to collect
`;

const COLLECTION_FAILED_LOCATOR = "src/collect.test.ts";
const COLLECTION_FAILED_MESSAGE = "  \n\t\nError:  Cannot   find | package\n    at packageResolve (node:internal)";

const collectionFailed = (name: string, message?: string): VitestJsonReport => ({
  testResults: [{ name, status: "failed", ...(message !== undefined ? { message } : {}) }],
});

const SKIPPED_CHECK: StepRecord = { "SCN-RIN-001": { outcome: "skipped" } };

function render(vitest: VitestJsonReport, ciSteps?: StepRecord): string {
  const ledger = reconcile(parseScenarios(FEATURE), [
    ...parseVitestEvidenceObservations(vitest, "unit", ROOT),
    ...ciStepRecordObservations(ciSteps),
  ]);
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false, false), ledger };
  return renderMarkdown(reconciliation, ctx);
}

function runIntegrityLines(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(CORE_MESSAGES[CoreMessage.RunIntegrityHeading]);
  const end = lines.indexOf(CORE_MESSAGES[CoreMessage.SummaryViewsHeading]);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return lines.slice(start, end);
}

function suspenseCell(md: string): string {
  const lines = md.split("\n");
  const header = lines.indexOf(CORE_MESSAGES[CoreMessage.LedgerTableHeader]);
  expect(header).toBeGreaterThanOrEqual(0);
  const rows = lines.slice(header + 2).filter((line) => line.startsWith("| (no scenario) | "));
  expect(rows).toHaveLength(1);
  return rows[0]!.slice(2, -2).split(" | ")[2]!;
}

const whatBroke = (locator: string): string =>
  `- ${CORE_MESSAGES[CoreMessage.BrokenEvidenceWhatBroke](`\`${locator}\``)}`;

const brokenCell = (qualityCheck: string, where: string): string =>
  `${qualityCheck} 💥 ${OUTCOME_DESCRIPTION.broken} (${where})`;

describe("[SCN-RPT-021] the markdown names the broken evidence and its error, and stamps the run unsound", () => {
  let checkDidNotRun: string;
  beforeEach(() => {
    checkDidNotRun = CORE_MESSAGES[CoreMessage.CheckStepSkipped]("SCN-RIN-001");
  });

  it("one broken evidence: the stamp counts one proof, then names its file and prints its error verbatim, each block followed by a blank line", () => {
    const md = render(collectionFailed(`${ROOT}/${COLLECTION_FAILED_LOCATOR}`, COLLECTION_FAILED_MESSAGE));
    expect(runIntegrityLines(md)).toEqual([
      CORE_MESSAGES[CoreMessage.RunIntegrityHeading],
      "",
      CORE_MESSAGES[CoreMessage.RunUnsound](CORE_MESSAGES[CoreMessage.OneProofNeverRan]),
      "",
      whatBroke(COLLECTION_FAILED_LOCATOR),
      "",
      "```text",
      ...COLLECTION_FAILED_MESSAGE.split("\n"),
      "```",
      "",
    ]);
  });

  it("two broken evidences: the stamp counts them in the plural, and the one the runner did not name is listed as unnamed", () => {
    const md = render(
      collectionFailed(`${ROOT}/${COLLECTION_FAILED_LOCATOR}`, COLLECTION_FAILED_MESSAGE),
      SKIPPED_CHECK,
    );
    expect(runIntegrityLines(md)).toEqual([
      CORE_MESSAGES[CoreMessage.RunIntegrityHeading],
      "",
      CORE_MESSAGES[CoreMessage.RunUnsound](CORE_MESSAGES[CoreMessage.ProofsNeverRan](2)),
      "",
      whatBroke(COLLECTION_FAILED_LOCATOR),
      "",
      "```text",
      ...COLLECTION_FAILED_MESSAGE.split("\n"),
      "```",
      "",
      whatBroke(CORE_MESSAGES[CoreMessage.BrokenEvidenceNotNamed]),
      "",
      "```text",
      checkDidNotRun,
      "```",
      "",
    ]);
  });

  it("the suspense row headlines each broken item by its error's first non-blank line, whitespace collapsed and the cell's pipe escaped", () => {
    const md = render(
      collectionFailed(`${ROOT}/${COLLECTION_FAILED_LOCATOR}`, COLLECTION_FAILED_MESSAGE),
      SKIPPED_CHECK,
    );
    expect(suspenseCell(md)).toBe(
      [
        brokenCell("unit", `${COLLECTION_FAILED_LOCATOR}: Error: Cannot find \\| package`),
        brokenCell("fitness", checkDidNotRun),
      ].join("; "),
    );
  });

  it("the suspense row trims a broken file's locator that begins with a space, when the runner reports no error", () => {
    const md = render(collectionFailed(`${ROOT}/ spaced/collect.test.ts`));
    expect(suspenseCell(md)).toBe(brokenCell("unit", "spaced/collect.test.ts"));
  });
});
