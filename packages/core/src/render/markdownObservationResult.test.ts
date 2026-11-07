import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";

const CITES_UNKNOWN = (): string => coreMessage(CoreMessage.OutcomeCitesUnknownScenario);
const NO_OBLIGATION = (): string => coreMessage(CoreMessage.OutcomeNoEvidenceObligation);

function rowOf(md: string, rowName: string): string {
  const row = md.split("\n").find((line) => line.startsWith(`| ${rowName} |`));
  if (row === undefined) throw new Error(`no ${rowName} row in:\n${md}`);
  return row;
}

describe("[CLM-RPT-034] a test that cites a scenario no feature carries shows on its phantom claim's row as failed or passed, as it ran", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [{ claimCode: "CLM-PST-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-PST-001", status: "passed", locator: "src/proven.test.ts" },
        { qualityCheckKind: "unit", claimCode: "CLM-PST-901", status: "failed", locator: "src/broken-spawn.test.ts" },
        { qualityCheckKind: "unit", claimCode: "CLM-PST-901", status: "passed", locator: "src/sound.test.ts" },
      ]
    );
  });

  it("shows the test that failed as failed", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx, publishedExitCodeOf), "CLM-PST-901");
    expect(row).toContain(`unit: ${CITES_UNKNOWN()} (src/broken-spawn.test.ts) — failed`);
  });

  it("shows the test that passed as passed", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx, publishedExitCodeOf), "CLM-PST-901");
    expect(row).toContain(`unit: ${CITES_UNKNOWN()} (src/sound.test.ts) — passed`);
  });
});

describe("[CLM-RPT-035] a test observed at a check its scenario holds no obligation for shows as failed or passed, as it ran", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [{ claimCode: "CLM-NOS-001", evidenceObligations: [{ qualityCheckKind: "integration" }] }],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-NOS-001", status: "failed", locator: "src/broken-spawn.test.ts" },
        { qualityCheckKind: "unit", claimCode: "CLM-NOS-001", status: "passed", locator: "src/sound.test.ts" },
      ]
    );
  });

  it("shows the test that failed as failed", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx, publishedExitCodeOf), "CLM-NOS-001");
    expect(row).toContain(`unit: ${NO_OBLIGATION()} (src/broken-spawn.test.ts) — failed`);
  });

  it("shows the test that passed as passed", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx, publishedExitCodeOf), "CLM-NOS-001");
    expect(row).toContain(`unit: ${NO_OBLIGATION()} (src/sound.test.ts) — passed`);
  });
});

describe("[CLM-RPT-086] a test that answers no evidence obligation is named by its file and its test name, so two such tests in one file read as two items", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-PST-901", status: "failed", locator: "src/x.test.ts", testName: "first" },
        { qualityCheckKind: "unit", claimCode: "CLM-PST-901", status: "failed", locator: "src/x.test.ts", testName: "second" },
      ]
    );
  });

  it("names the first test by its file and its test name", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx, publishedExitCodeOf), "CLM-PST-901");
    expect(row).toContain(`unit: ${CITES_UNKNOWN()} (src/x.test.ts: first) — failed`);
  });

  it("names the second test by its file and its test name", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx, publishedExitCodeOf), "CLM-PST-901");
    expect(row).toContain(`unit: ${CITES_UNKNOWN()} (src/x.test.ts: second) — failed`);
  });
});
