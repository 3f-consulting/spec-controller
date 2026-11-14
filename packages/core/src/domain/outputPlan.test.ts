import { describe, expect, it } from "vitest";
import { outputPlanOf, type FileIdentity, type IdentifiedOutput } from "./outputPlan.js";

const toFile = (format: string, path: string, identity: FileIdentity): IdentifiedOutput<string> => ({ output: { format, destination: { to: "file", path } }, identity });

describe("each of two reports will be where you asked", () => {
  it.each([
    [
      "CLM-FMT-021",
      "two files with one inode number, on two devices",
      { is: "regular-file", device: 1n, inode: 7n },
      { is: "regular-file", device: 2n, inode: 7n },
    ],
    [
      "CLM-FMT-021",
      "two files not yet made, of one name, in folders with one inode number on two devices",
      { is: "absent", folder: { device: 1n, inode: 7n }, name: "report" },
      { is: "absent", folder: { device: 2n, inode: 7n }, name: "report" },
    ],
  ] as const)("[%s] a run had two reports to write: when you ask for them at %s, each file will contain its own report, as each is planned for its own file", (_clm, _files, one, other) => {
    expect(outputPlanOf([toFile("md", "a/report", one), toFile("json", "b/report", other)], [])).toEqual({ ok: true });
  });
});

describe("two reports share a place only when it is standard error or a place that discards them", () => {
  it("[CLM-FMT-022] a run had two reports to write: when you ask for both on standard error, redirected into a file, both reports are planned on standard error, one after the other", () => {
    const redirected: FileIdentity = { is: "regular-file", device: 1n, inode: 7n };
    const onStandardError = (format: string): IdentifiedOutput<string> => ({ output: { format, destination: { to: "standard-error" } }, identity: redirected });

    expect(outputPlanOf([onStandardError("md"), onStandardError("json")], [])).toEqual({ ok: true });
  });
});

describe("it stops before it damages anything", () => {
  it("[CLM-FMT-013] the run read a file, such as your test results: when you ask for the report to go in that same file, the run is refused as overwriting it", () => {
    const identity: FileIdentity = { is: "regular-file", device: 1n, inode: 9n };
    const report = toFile("json", "results.json", identity);
    const input = { name: "vitest", path: "results.json", identity };

    expect(outputPlanOf([report], [input])).toEqual({ ok: false, refusal: { kind: "output-overwrites-an-input", output: report.output, input } });
  });
});
