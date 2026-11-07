import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evidenceReconciliationOf, type RunContext } from "@3f-consulting/spec-controller-core";
import { CoreMessage, coreMessage, markdownHeading } from "@3f-consulting/spec-controller-core/internal";
import { writeOutputs, type OutputPayloads } from "./writer.js";
import type { OutputPlan, PlannedOutput } from "./format.js";
import { stdoutIdentity as processStdout } from "../../outputLocation.js";
import { earlierStoredRunDirOf, planRunManifest, serialiseRunManifest } from "../../run-management/keptRun.js";
import { usageStatusOf } from "../../usageStatus.test-utils.js";
import { noOwnRun } from "./earlierStoredRun.test-utils.js";
import { temporaryDirectory } from "../../temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, stderrWrites } from "../../programOutput.test-utils.js";

const ctx: RunContext = {
  target: "later",
  inputs: [{ name: "features", flag: "--features", path: "features" }],
  corpus: "features",
  runStart: new Date("2026-10-11T00:00:00.000Z"),
  sourceSha: null,
};

const EARLIER_JSON = "an earlier run's reconciliation\n";
const EARLIER_MARKDOWN = "# an earlier run's reconciliation\n";

const toFile = (path: string, fmt: "md" | "json"): PlannedOutput => ({ fmt, dest: { kind: "file", path } });
const plan = (...outputs: PlannedOutput[]): OutputPlan => ({ outputs });

let payloads: OutputPayloads;
let manifest: string;
let scratch: string;
let earlierRunDir: string;

function storeAnEarlierRun(runDir: string): void {
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "run.yaml"), manifest);
  writeFileSync(join(runDir, "spec-reconciliation.json"), EARLIER_JSON);
  writeFileSync(join(runDir, "spec-reconciliation.md"), EARLIER_MARKDOWN);
}

function expectEarlierRunKept(runDir: string): void {
  expect(readFileSync(join(runDir, "run.yaml"), "utf8")).toBe(manifest);
  expect(readFileSync(join(runDir, "spec-reconciliation.json"), "utf8")).toBe(EARLIER_JSON);
  expect(readFileSync(join(runDir, "spec-reconciliation.md"), "utf8")).toBe(EARLIER_MARKDOWN);
}

beforeEach(() => {
  manifest = serialiseRunManifest(
    planRunManifest({ runId: "r0", target: "earlier", sourceSha: "unknown", toolSha: "unknown", toolVersion: "0.0.0", mode: "balance", date: "2026-10-10T00:00:00.000Z" }),
  );
  payloads = { balance: evidenceReconciliationOf([], [], []), ctx };
  scratch = temporaryDirectory("spec-controller-earlier-run-");
  earlierRunDir = join(scratch, "store", "earlier", "r0");
  storeAnEarlierRun(earlierRunDir);
});

recordWhatTheProgramWrites();

describe("[CLM-RMG-012] a --format path naming a file of an earlier stored run is refused naming the file, and that run keeps its files", () => {
  const files: ReadonlyArray<readonly [string, "md" | "json"]> = [
    ["spec-reconciliation.json", "json"],
    ["spec-reconciliation.md", "md"],
    ["run.yaml", "md"],
  ];

  for (const [file, fmt] of files) {
    it(`refuses the ${fmt} report at the earlier run's ${file}, naming it on one line with no stack trace`, () => {
      const path = join(earlierRunDir, file);

      expect(usageStatusOf(() => writeOutputs(plan(toFile(path, fmt)), payloads, processStdout, [], noOwnRun))).toBe(2);

      const refusal = whatTheProgramWrote().stderr;
      expect(refusal).toContain(path);
      expect(refusal.trimEnd().split("\n")).toHaveLength(1);
      expect(refusal).not.toMatch(/^\s+at /m);
      expectEarlierRunKept(earlierRunDir);
    });
  }

  it("refuses the earlier run's file however its path is spelled", () => {
    const spelling = `${earlierRunDir}/../r0/spec-reconciliation.json`;

    expect(usageStatusOf(() => writeOutputs(plan(toFile(spelling, "json")), payloads, processStdout, [], noOwnRun))).toBe(2);

    expect(whatTheProgramWrote().stderr).toContain(spelling);
    expectEarlierRunKept(earlierRunDir);
  });

  it("refuses a new file in the earlier run's directory, and creates nothing there", () => {
    const path = join(earlierRunDir, "extra.md");

    expect(usageStatusOf(() => writeOutputs(plan(toFile(path, "md")), payloads, processStdout, [], noOwnRun))).toBe(2);

    expect(whatTheProgramWrote().stderr).toContain(path);
    expect(existsSync(path)).toBe(false);
  });

  it("writes no report at all when any one output names the earlier run's file", () => {
    const elsewhere = join(scratch, "report.md");

    expect(usageStatusOf(() => writeOutputs(plan(toFile(elsewhere, "md"), toFile(join(earlierRunDir, "spec-reconciliation.json"), "json")), payloads, processStdout, [], noOwnRun))).toBe(2);

    expect(existsSync(elsewhere)).toBe(false);
    expectEarlierRunKept(earlierRunDir);
  });
});

describe("[CLM-RMG-012] the stored run's own run directory is not an earlier stored run's", () => {
  it("writes into the run's own directory though an earlier run under the same run id left its run.yaml there", () => {
    const path = join(earlierRunDir, "spec-reconciliation.json");

    expect(usageStatusOf(() => writeOutputs(plan(toFile(path, "json")), payloads, processStdout, [], (path) => earlierStoredRunDirOf(path, earlierRunDir)))).toBeUndefined();

    expect(stderrWrites()).toEqual([]);
    expect(readFileSync(path, "utf8")).not.toBe(EARLIER_JSON);
  });
});

describe("[CLM-RMG-014] a --format path that is a symlink to a file of an earlier stored run is refused naming the link and that run's directory", () => {
  const files: ReadonlyArray<readonly [string, "md" | "json"]> = [
    ["spec-reconciliation.json", "json"],
    ["spec-reconciliation.md", "md"],
    ["run.yaml", "md"],
  ];

  for (const [file, fmt] of files) {
    it(`refuses the ${fmt} report at a link to the earlier run's ${file}, naming the link and the run's directory on one line`, () => {
      const link = join(scratch, "links", "report");
      mkdirSync(join(scratch, "links"));
      symlinkSync(join("..", "store", "earlier", "r0", file), link);

      expect(usageStatusOf(() => writeOutputs(plan(toFile(link, fmt)), payloads, processStdout, [], noOwnRun))).toBe(2);

      const refusal = whatTheProgramWrote().stderr;
      expect(refusal).toContain(link);
      expect(refusal).toContain(realpathSync(earlierRunDir));
      expect(refusal.trimEnd().split("\n")).toHaveLength(1);
      expect(refusal).not.toMatch(/^\s+at /m);
      expectEarlierRunKept(earlierRunDir);
    });
  }

  it("refuses a link to the earlier run's file for a stored run of its own, whose run directory is elsewhere", () => {
    const ownRunDir = join(scratch, "store", "later", "r1");
    mkdirSync(ownRunDir, { recursive: true });
    const link = join(scratch, "report.json");
    symlinkSync(join(earlierRunDir, "spec-reconciliation.json"), link);

    expect(usageStatusOf(() => writeOutputs(plan(toFile(link, "json")), payloads, processStdout, [], (path) => earlierStoredRunDirOf(path, ownRunDir)))).toBe(2);

    expectEarlierRunKept(earlierRunDir);
  });
});

describe("[CLM-RMG-013] a --format path beside a run.yaml that is not a run manifest is written as before", () => {
  const notManifests: ReadonlyArray<readonly [string, string | undefined]> = [
    ["a run.yaml that is not YAML", "jobs: [build\n"],
    ["a run.yaml of some other tool", "name: ci\non: push\njobs: {}\n"],
    ["a run.yaml with a run id and schema version but no artefacts", "schema_version: 2\nrun_id: r0\n"],
    ["a run.yaml with a schema version and artefacts but no run id", "schema_version: 2\nartefacts:\n  document: spec-reconciliation.md\n"],
    ["a run.yaml with a run id and artefacts but no schema version", "run_id: r0\nartefacts:\n  document: spec-reconciliation.md\n"],
    ["a run.yaml whose artefacts are empty", "schema_version: 2\nrun_id: r0\nartefacts:\n"],
    ["an empty run.yaml", ""],
    ["no run.yaml", undefined],
  ];

  for (const [beside, content] of notManifests) {
    for (const file of ["report.md", "run.yaml"]) {
      if (content === undefined && file === "run.yaml") continue;

      it(`writes the report at ${file} in a directory holding ${beside}`, () => {
        const dir = join(scratch, "elsewhere");
        mkdirSync(dir, { recursive: true });
        if (content !== undefined) writeFileSync(join(dir, "run.yaml"), content);
        const path = join(dir, file);

        expect(usageStatusOf(() => writeOutputs(plan(toFile(path, "md")), payloads, processStdout, [], noOwnRun))).toBeUndefined();

        expect(stderrWrites()).toEqual([]);
        expect(readFileSync(path, "utf8").slice(0, markdownHeading(1, coreMessage(CoreMessage.ReportTitle)).length)).toBe(markdownHeading(1, coreMessage(CoreMessage.ReportTitle)));
      });
    }
  }
});
