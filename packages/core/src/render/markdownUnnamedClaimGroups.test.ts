import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { EvidenceObservation, BehaviouralEvidenceObservation, FitnessEvidenceObservation } from "../domain/journal.js";
import { CoreMessage } from "./messages.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { RECONCILING_ITEMS_COLUMN, claimReconciliationsTable, reconcilingItemsOf } from "./claimReconciliationsTable.test-utils.js";
import { coreMessage } from "./coreText.js";

const CITES_NO_SCENARIO = (): string => coreMessage(CoreMessage.OutcomeCitesNoScenario);

function reportOf(observations: readonly EvidenceObservation[]): string {
  const ledger = reconcile(
    [{ claimCode: "CLM-SGR-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
    [{ qualityCheckKind: "unit", claimCode: "CLM-SGR-001", status: "passed", locator: "src/proven.test.ts" }, ...observations]
  );
  return renderMarkdown(__er(ledger), ctx, publishedExitCodeOf);
}

function rowCells(md: string, rowName: string): string[] {
  const row = md.split("\n").find((line) => line.startsWith(`| ${rowName} |`));
  if (row === undefined) throw new Error(`no ${rowName} row in:\n${md}`);
  return row.split(" | ").map((cell) => cell.replace(/^\| | \|$/g, ""));
}

const UNNAMED_CLAIM = "(unnamed claim)";

function unnamedClaimItemsOf(md: string): string[] {
  return reconcilingItemsOf(md, UNNAMED_CLAIM);
}

function unnamedClaimCell(md: string): string {
  return claimReconciliationsTable(md).rowOf(UNNAMED_CLAIM).cell(RECONCILING_ITEMS_COLUMN());
}

function unit(status: "passed" | "failed", locator: string | undefined, message?: string): BehaviouralEvidenceObservation {
  return { qualityCheckKind: "unit", claimCode: null, status, locator, ...(message === undefined ? {} : { message }) };
}

function named(status: "passed" | "failed", testName: string | undefined): BehaviouralEvidenceObservation {
  return { ...unit(status, "src/a.test.ts"), ...(testName === undefined ? {} : { testName }) };
}

describe("[CLM-RPT-033] tests that cite no scenario are grouped on the unnamed claim's row by the file they ran in, each group counting how many ran, passed and failed", () => {
  const mixedReport = (): string =>
    reportOf([unit("passed", "src/b.test.ts"), unit("failed", "src/a.test.ts"), unit("passed", "src/a.test.ts")]);

  it("lists each file once, in file order, counting how many of its tests ran, passed and failed", () => {
    expect(unnamedClaimItemsOf(mixedReport())).toEqual([
      `unit: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 2 ran, 1 passed, 1 failed`,
      `unit: ${CITES_NO_SCENARIO()} (src/b.test.ts) — 1 ran, 1 passed, 0 failed`,
    ]);
  });

  it("counts tests that ran adding up to the count of evidence observations that cite no scenario", () => {
    const md = mixedReport();
    const ran = unnamedClaimItemsOf(md).map((item) => Number(/ — (\d+) ran,/.exec(item)![1]));
    const uncited = Number(rowCells(md, CITES_NO_SCENARIO())[3]);
    expect(ran.reduce((a, b) => a + b, 0)).toBe(uncited);
    expect(uncited).toBe(3);
  });

  it("groups by check as well as file", () => {
    const items = unnamedClaimItemsOf(reportOf([unit("failed", "src/a.test.ts"), { ...unit("passed", "src/a.test.ts"), qualityCheckKind: "integration" }]));
    expect(items).toEqual([
      `unit: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 1 ran, 0 passed, 1 failed`,
      `integration: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 1 ran, 1 passed, 0 failed`,
    ]);
  });

  it("keeps each distinct message once, after the file", () => {
    const several = "2 clm properties cite CLM-A and CLM-B — a test cites exactly one scenario.\nmore detail";
    const items = unnamedClaimItemsOf(reportOf([
      unit("failed", "tests/p.py::test_x", several),
      unit("failed", "tests/p.py::test_x", several),
      unit("passed", "tests/p.py::test_x", "a | piped note"),
    ]));
    expect(items).toEqual([
      `unit: ${CITES_NO_SCENARIO()} (tests/p.py::test_x: 2 clm properties cite CLM-A and CLM-B — a test cites exactly one scenario. / a \\| piped note) — 3 ran, 1 passed, 2 failed`,
    ]);
  });

  it("gives a group with no file its counts alone", () => {
    expect(unnamedClaimItemsOf(reportOf([unit("passed", undefined)]))).toEqual([`unit: ${CITES_NO_SCENARIO()} — 1 ran, 1 passed, 0 failed`]);
  });

  it("lists a broken item before the groups, as before", () => {
    const cell = unnamedClaimCell(reportOf([
      unit("passed", "src/a.test.ts"),
      { ...unit("failed", "src/broken.test.ts", "Cannot find module"), broken: true },
    ]));
    expect(cell).toBe(
      `unit: ${coreMessage(CoreMessage.OutcomeBroken)} (src/broken.test.ts: Cannot find module); ` +
        `unit: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 1 ran, 1 passed, 0 failed`
    );
  });
});

describe("[CLM-RPT-036] a failed test that cites no scenario is named on the unnamed claim's row by its test title", () => {
  it("names the test that failed by its title, and not the test that passed", () => {
    expect(unnamedClaimItemsOf(reportOf([named("failed", "spawns yarn"), named("passed", "reads the lockfile")]))).toEqual([
      `unit: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 2 ran, 1 passed, 1 failed (failed: spawns yarn)`,
    ]);
  });

  it("names every test that failed in the file, in evidence order, each made safe for the cell", () => {
    expect(unnamedClaimItemsOf(reportOf([named("failed", "b | piped"), named("passed", "p"), named("failed", "a\n  wrapped")]))).toEqual([
      `unit: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 3 ran, 1 passed, 2 failed (failed: a wrapped / b \\| piped)`,
    ]);
  });

  it("counts a failed test with no name or an empty name without naming it", () => {
    const items = (tests: BehaviouralEvidenceObservation[]): string[] => unnamedClaimItemsOf(reportOf(tests));
    expect(items([named("failed", undefined), named("failed", " ")])).toEqual([`unit: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 2 ran, 0 passed, 2 failed`]);
    expect(items([named("failed", ""), named("failed", "z")])).toEqual([`unit: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 2 ran, 0 passed, 2 failed (failed: z)`]);
  });
});

function step(fitnessFunction: string, at: string): FitnessEvidenceObservation {
  return { qualityCheckKind: "fitness", fitnessFunction, step: at, exists: true, enforcedOverRealSource: true };
}

describe("[CLM-RPT-038] the CI steps that cite no scenario are grouped together on the unnamed claim's row, each named", () => {
  it("lists the CI steps once, after the file groups, naming each", () => {
    expect(unnamedClaimItemsOf(reportOf([step("lint:bar", "ci.yml:ci:pnpm lint:bar"), step("lint:foo", "ci.yml:ci:pnpm lint:foo"), unit("passed", "src/a.test.ts")]))).toEqual([
      `unit: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 1 ran, 1 passed, 0 failed`,
      `fitness: ${CITES_NO_SCENARIO()} — 2 CI steps: ci.yml:ci:pnpm lint:bar, ci.yml:ci:pnpm lint:foo`,
    ]);
  });

  it("lists the CI steps after a broken item and the file groups", () => {
    const cell = unnamedClaimCell(reportOf([
      step("lint:uncited", "ci.yml:ci:pnpm lint:uncited"),
      unit("passed", "src/a.test.ts"),
      { ...unit("failed", "src/broken.test.ts", "Cannot find module"), broken: true },
    ]));
    expect(cell).toBe(
      `unit: ${coreMessage(CoreMessage.OutcomeBroken)} (src/broken.test.ts: Cannot find module); ` +
        `unit: ${CITES_NO_SCENARIO()} (src/a.test.ts) — 1 ran, 1 passed, 0 failed; fitness: ${CITES_NO_SCENARIO()} — 1 CI step: ci.yml:ci:pnpm lint:uncited`
    );
  });

  it("names a lone CI step as one step", () => {
    expect(unnamedClaimItemsOf(reportOf([step("lint:solo", "ci.yml:ci:pnpm lint:solo")]))).toEqual([`fitness: ${CITES_NO_SCENARIO()} — 1 CI step: ci.yml:ci:pnpm lint:solo`]);
  });

  it("counts what ran adding up to the count of evidence observations that cite no scenario", () => {
    const md = reportOf([step("lint:bar", "ci.yml:ci:pnpm lint:bar"), step("lint:foo", "ci.yml:ci:pnpm lint:foo"), unit("failed", "src/a.test.ts"), unit("passed", "src/b.test.ts")]);
    const counted = unnamedClaimItemsOf(md).map((item) => Number(/ — (\d+) (?:ran,|CI steps?:)/.exec(item)![1]));
    const uncited = Number(rowCells(md, CITES_NO_SCENARIO())[3]);
    expect(counted.reduce((a, b) => a + b, 0)).toBe(uncited);
    expect(uncited).toBe(4);
  });
});
