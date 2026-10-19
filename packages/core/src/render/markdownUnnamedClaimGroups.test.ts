import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { EvidenceObservation, BehaviouralEvidenceObservation, FitnessEvidenceObservation } from "../domain/journal.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

const UNCITED = "❓ Evidence Observation cites no Scenario";

function reportOf(observations: readonly EvidenceObservation[]): string {
  const ledger = reconcile(
    [{ scnId: "SCN-SGR-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [{ qualityCheck: "unit", scnId: "SCN-SGR-001", status: "passed", locator: "src/proven.test.ts" }, ...observations]
  );
  return renderMarkdown(__er(ledger), ctx);
}

function rowCells(md: string, rowName: string): string[] {
  const row = md.split("\n").find((line) => line.startsWith(`| ${rowName} |`));
  if (row === undefined) throw new Error(`no ${rowName} row in:\n${md}`);
  return row.split(" | ").map((cell) => cell.replace(/^\| | \|$/g, ""));
}

function suspenseItemsOf(md: string): string[] {
  return rowCells(md, "(unnamed claim)").at(-1)!.split("; ");
}

function unit(status: "passed" | "failed", locator: string | undefined, message?: string): BehaviouralEvidenceObservation {
  return { qualityCheck: "unit", scnId: null, status, locator, ...(message === undefined ? {} : { message }) };
}

function named(status: "passed" | "failed", testName: string | undefined): BehaviouralEvidenceObservation {
  return { ...unit(status, "src/a.test.ts"), ...(testName === undefined ? {} : { testName }) };
}

describe("[SCN-RPT-033] tests that cite no scenario are grouped on the suspense row by the file they ran in, each group counting how many ran, passed and failed", () => {
  const mixedReport = (): string =>
    reportOf([unit("passed", "src/b.test.ts"), unit("failed", "src/a.test.ts"), unit("passed", "src/a.test.ts")]);

  it("lists each file once, in file order, counting how many of its tests ran, passed and failed", () => {
    expect(suspenseItemsOf(mixedReport())).toEqual([
      `unit ${UNCITED} (src/a.test.ts) — 2 ran, 1 passed, 1 failed`,
      `unit ${UNCITED} (src/b.test.ts) — 1 ran, 1 passed, 0 failed`,
    ]);
  });

  it("counts tests that ran adding up to the count of evidence observations that cite no scenario", () => {
    const md = mixedReport();
    const ran = suspenseItemsOf(md).map((item) => Number(/ — (\d+) ran,/.exec(item)![1]));
    const uncited = Number(rowCells(md, "↳ Evidence Observation cites no Scenario")[3]);
    expect(ran.reduce((a, b) => a + b, 0)).toBe(uncited);
    expect(uncited).toBe(3);
  });

  it("groups by check as well as file", () => {
    const items = suspenseItemsOf(reportOf([unit("failed", "src/a.test.ts"), { ...unit("passed", "src/a.test.ts"), qualityCheck: "integration" }]));
    expect(items).toEqual([
      `unit ${UNCITED} (src/a.test.ts) — 1 ran, 0 passed, 1 failed`,
      `integration ${UNCITED} (src/a.test.ts) — 1 ran, 1 passed, 0 failed`,
    ]);
  });

  it("keeps each distinct message once, after the file", () => {
    const several = "2 scn properties cite SCN-A, SCN-B — a test cites exactly one scenario.\nmore detail";
    const items = suspenseItemsOf(reportOf([
      unit("failed", "tests/p.py::test_x", several),
      unit("failed", "tests/p.py::test_x", several),
      unit("passed", "tests/p.py::test_x", "a | piped note"),
    ]));
    expect(items).toEqual([
      `unit ${UNCITED} (tests/p.py::test_x: 2 scn properties cite SCN-A, SCN-B — a test cites exactly one scenario. / a \\| piped note) — 3 ran, 1 passed, 2 failed`,
    ]);
  });

  it("gives a group with no file its counts alone", () => {
    expect(suspenseItemsOf(reportOf([unit("passed", undefined)]))).toEqual([`unit ${UNCITED} — 1 ran, 1 passed, 0 failed`]);
  });

  it("lists a broken item before the groups, as before", () => {
    const cell = rowCells(reportOf([
      unit("passed", "src/a.test.ts"),
      { ...unit("failed", "src/broken.test.ts", "Cannot find module"), broken: true },
    ]), "(unnamed claim)").at(-1);
    expect(cell).toBe(
      `unit 💥 ${OUTCOME_DESCRIPTION.broken} (src/broken.test.ts: Cannot find module); ` +
        `unit ${UNCITED} (src/a.test.ts) — 1 ran, 1 passed, 0 failed`
    );
  });
});

describe("[SCN-RPT-036] a failed test that cites no scenario is named on the suspense row by its test title", () => {
  it("names the test that failed by its title, and not the test that passed", () => {
    expect(suspenseItemsOf(reportOf([named("failed", "spawns yarn"), named("passed", "reads the lockfile")]))).toEqual([
      `unit ${UNCITED} (src/a.test.ts) — 2 ran, 1 passed, 1 failed (failed: spawns yarn)`,
    ]);
  });

  it("names every test that failed in the file, in evidence order, each made safe for the cell", () => {
    expect(suspenseItemsOf(reportOf([named("failed", "b | piped"), named("passed", "p"), named("failed", "a\n  wrapped")]))).toEqual([
      `unit ${UNCITED} (src/a.test.ts) — 3 ran, 1 passed, 2 failed (failed: a wrapped / b \\| piped)`,
    ]);
  });

  it("counts a failed test with no name or an empty name without naming it", () => {
    const items = (tests: BehaviouralEvidenceObservation[]): string[] => suspenseItemsOf(reportOf(tests));
    expect(items([named("failed", undefined), named("failed", " ")])).toEqual([`unit ${UNCITED} (src/a.test.ts) — 2 ran, 0 passed, 2 failed`]);
    expect(items([named("failed", ""), named("failed", "z")])).toEqual([`unit ${UNCITED} (src/a.test.ts) — 2 ran, 0 passed, 2 failed (failed: z)`]);
  });
});

function step(fitnessFunction: string): FitnessEvidenceObservation {
  return { qualityCheck: "fitness", fitnessFunction, exists: true, enforcedOverRealSource: true };
}

describe("[SCN-RPT-038] the CI steps that cite no scenario are grouped together on the suspense row, each named", () => {
  it("lists the CI steps once, after the file groups, naming each", () => {
    expect(suspenseItemsOf(reportOf([step("lint:bar"), step("lint:foo"), unit("passed", "src/a.test.ts")]))).toEqual([
      `unit ${UNCITED} (src/a.test.ts) — 1 ran, 1 passed, 0 failed`,
      `fitness ${UNCITED} — 2 CI steps: lint:bar, lint:foo`,
    ]);
  });

  it("lists the CI steps after a broken item and the file groups", () => {
    const cell = rowCells(reportOf([
      step("lint:uncited"),
      unit("passed", "src/a.test.ts"),
      { ...unit("failed", "src/broken.test.ts", "Cannot find module"), broken: true },
    ]), "(unnamed claim)").at(-1);
    expect(cell).toBe(
      `unit 💥 ${OUTCOME_DESCRIPTION.broken} (src/broken.test.ts: Cannot find module); ` +
        `unit ${UNCITED} (src/a.test.ts) — 1 ran, 1 passed, 0 failed; fitness ${UNCITED} — 1 CI step: lint:uncited`
    );
  });

  it("names a lone CI step as one step", () => {
    expect(suspenseItemsOf(reportOf([step("lint:solo")]))).toEqual([`fitness ${UNCITED} — 1 CI step: lint:solo`]);
  });

  it("counts what ran adding up to the count of evidence observations that cite no scenario", () => {
    const md = reportOf([step("lint:bar"), step("lint:foo"), unit("failed", "src/a.test.ts"), unit("passed", "src/b.test.ts")]);
    const counted = suspenseItemsOf(md).map((item) => Number(/ — (\d+) (?:ran,|CI steps?:)/.exec(item)![1]));
    const uncited = Number(rowCells(md, "↳ Evidence Observation cites no Scenario")[3]);
    expect(counted.reduce((a, b) => a + b, 0)).toBe(uncited);
    expect(uncited).toBe(4);
  });
});
