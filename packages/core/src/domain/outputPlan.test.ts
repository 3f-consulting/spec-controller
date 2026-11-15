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
  ] as const)("[%s] reports asked for at %s are each planned for their own file", (_clm, _files, one, other) => {
    expect(outputPlanOf([toFile("md", "a/report", one), toFile("json", "b/report", other)], [])).toEqual({ ok: true });
  });
});

describe("both reports go one after the other to a place that appends", () => {
  it("[CLM-FMT-022] two reports asked for on standard error, redirected into a file, are planned one after the other", () => {
    const onStandardError = (format: string): IdentifiedOutput<string> => ({ output: { format, destination: { to: "standard-error" } }, identity: { is: "regular-file", device: 1n, inode: 7n } });

    expect(outputPlanOf([onStandardError("md"), onStandardError("json")], [])).toEqual({ ok: true });
  });
});

describe("the run refuses to write a report over a file it reads", () => {
  it("[CLM-FMT-013] a report asked for at the file the run read is refused as overwriting that input", () => {
    const identity: FileIdentity = { is: "regular-file", device: 1n, inode: 9n };
    const report = toFile("json", "results.json", identity);
    const input = { name: "vitest", path: "results.json", identity };

    expect(outputPlanOf([report], [input])).toEqual({ ok: false, refusal: { kind: "output-overwrites-an-input", output: report.output, input } });
  });
});
