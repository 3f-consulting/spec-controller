import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

function rowOf(md: string, rowName: string): string {
  const row = md.split("\n").find((line) => line.startsWith(`| ${rowName} |`));
  if (row === undefined) throw new Error(`no ${rowName} row in:\n${md}`);
  return row;
}

function suspenseRowOf(md: string): string {
  return rowOf(md, "(no scenario)");
}

describe("[SCN-RPT-033] a test that cites no scenario shows on the suspense row as failed or passed, as it ran", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [{ scnId: "SCN-SST-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-SST-001", status: "passed", locator: "src/proven.test.ts" },
        { qualityCheck: "unit", scnId: null, status: "failed", locator: "src/broken-spawn.test.ts" },
        { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/sound.test.ts" },
        { qualityCheck: "fitness", fitnessFunction: "lint:uncited", exists: true, enforcedOverRealSource: true },
      ]
    );
  });

  it("shows the test that failed as failed", () => {
    const row = suspenseRowOf(renderMarkdown(__er(ledger), ctx));
    expect(row).toContain("unit ❓ Evidence Observation cites no Scenario (src/broken-spawn.test.ts) — failed");
  });

  it("shows the test that passed as passed", () => {
    const row = suspenseRowOf(renderMarkdown(__er(ledger), ctx));
    expect(row).toContain("unit ❓ Evidence Observation cites no Scenario (src/sound.test.ts) — passed");
  });

  it("lists an observation that holds no result as before, with no result beside it", () => {
    const row = suspenseRowOf(renderMarkdown(__er(ledger), ctx));
    expect(row).toMatch(/fitness ❓ Evidence Observation cites no Scenario \(lint:uncited\)(;| \|)/);
  });
});

describe("[SCN-RPT-034] a test that cites a scenario no feature carries shows on its phantom row as failed or passed, as it ran", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [{ scnId: "SCN-PST-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-PST-001", status: "passed", locator: "src/proven.test.ts" },
        { qualityCheck: "unit", scnId: "SCN-PST-901", status: "failed", locator: "src/broken-spawn.test.ts" },
        { qualityCheck: "unit", scnId: "SCN-PST-901", status: "passed", locator: "src/sound.test.ts" },
      ]
    );
  });

  it("shows the test that failed as failed", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx), "SCN-PST-901");
    expect(row).toContain("unit 👻 Evidence Observation cites an unknown Scenario (src/broken-spawn.test.ts) — failed");
  });

  it("shows the test that passed as passed", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx), "SCN-PST-901");
    expect(row).toContain("unit 👻 Evidence Observation cites an unknown Scenario (src/sound.test.ts) — passed");
  });
});

describe("[SCN-RPT-035] a test observed at a check its scenario holds no obligation for shows as failed or passed, as it ran", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [{ scnId: "SCN-NOS-001", evidenceObligations: [{ qualityCheck: "integration" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-NOS-001", status: "failed", locator: "src/broken-spawn.test.ts" },
        { qualityCheck: "unit", scnId: "SCN-NOS-001", status: "passed", locator: "src/sound.test.ts" },
      ]
    );
  });

  it("shows the test that failed as failed", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx), "SCN-NOS-001");
    expect(row).toContain("unit ◇ Evidence Observation cites a Scenario with no matching Evidence Obligation (src/broken-spawn.test.ts) — failed");
  });

  it("shows the test that passed as passed", () => {
    const row = rowOf(renderMarkdown(__er(ledger), ctx), "SCN-NOS-001");
    expect(row).toContain("unit ◇ Evidence Observation cites a Scenario with no matching Evidence Obligation (src/sound.test.ts) — passed");
  });
});
