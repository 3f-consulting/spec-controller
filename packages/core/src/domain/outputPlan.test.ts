import { describe, expect, it } from "vitest";
import { outputClashOf, outputPlanOf, type IdentifiedInput, type IdentifiedOutput, type LocatedOutput } from "./outputPlan.js";

type Format = "md" | "json";

const WRITTEN: readonly Format[] = ["md", "json"];

const TO_STANDARD_OUTPUT: LocatedOutput = { fmt: "md", dest: { kind: "stdout" }, namesStandardOutput: false };

describe("an argument the tool does not accept will stop the run", () => {
  it.each<[string, readonly string[]]>([
    ["CLM-CLI-133", ["xml"]],
    ["CLM-CLI-133", ["xml", "yaml"]],
  ])("[%s] a report format the tool does not have, %j, is refused, naming it and the formats the tool has", (_clm, formats) => {
    const requested = formats.map((fmt): LocatedOutput => ({ fmt, dest: { kind: "stdout" }, namesStandardOutput: false }));
    expect(outputPlanOf(requested, WRITTEN)).toEqual({ ok: false, refusal: { kind: "unknown-format", formats, written: WRITTEN } });
  });

  it("[CLM-CLI-133] a report format the tool has is planned as asked", () => {
    const requested: LocatedOutput[] = [{ fmt: "json", dest: { kind: "file", path: "out.json" }, namesStandardOutput: false }];
    expect(outputPlanOf(requested, WRITTEN)).toEqual({ ok: true, outputs: [{ fmt: "json", dest: { kind: "file", path: "out.json" } }] });
  });
});

describe("two reports will not both go to standard output", () => {
  it.each<[string, string, LocatedOutput]>([
    ["CLM-FMT-005", "no destination", { fmt: "json", dest: { kind: "stdout" }, namesStandardOutput: false }],
    ["CLM-FMT-011", "a path that names standard output", { fmt: "json", dest: { kind: "file", path: "/dev/stdout" }, namesStandardOutput: true }],
    ["CLM-FMT-023", "a link to standard output", { fmt: "json", dest: { kind: "file", path: "out" }, namesStandardOutput: true }],
  ])("[%s] no destination beside %s is refused, naming what each report asked for", (_clm, _other, other) => {
    expect(outputPlanOf([TO_STANDARD_OUTPUT, other], WRITTEN)).toEqual({
      ok: false,
      refusal: { kind: "more-than-one-to-standard-output", formats: ["md", "json"] },
    });
  });

  it("[CLM-FMT-005] no destination beside a file that is not standard output is planned", () => {
    const toFile: LocatedOutput = { fmt: "json", dest: { kind: "file", path: "out.json" }, namesStandardOutput: false };
    expect(outputPlanOf([TO_STANDARD_OUTPUT, toFile], WRITTEN)).toMatchObject({ ok: true });
  });
});

describe("a report will not be written over a file the run reads", () => {
  const READ: IdentifiedInput = { subject: "the --vitest report", path: "vitest.json", identity: { dev: 1n, ino: 2n } };

  it("[CLM-FMT-013] a report on the file the run reads is refused, naming the report and the file", () => {
    const onTheInput: IdentifiedOutput<Format> = { output: { fmt: "json", dest: { kind: "file", path: "again.json" } }, identity: { dev: 1n, ino: 2n }, toStandardError: false };
    expect(outputClashOf([onTheInput], [READ])).toEqual({ kind: "output-overwrites-an-input", output: onTheInput.output, input: READ });
  });

  it("[CLM-FMT-013] the second of two reports, on the file the run reads, is refused", () => {
    const elsewhere: IdentifiedOutput<Format> = { output: { fmt: "md", dest: { kind: "file", path: "report.md" } }, identity: { dev: 1n, ino: 3n }, toStandardError: false };
    const onTheInput: IdentifiedOutput<Format> = { output: { fmt: "json", dest: { kind: "file", path: "vitest.json" } }, identity: { dev: 1n, ino: 2n }, toStandardError: false };
    expect(outputClashOf([elsewhere, onTheInput], [READ])).toMatchObject({ kind: "output-overwrites-an-input", output: onTheInput.output });
  });

  it("[CLM-FMT-013] a report on another file of the same device, or on a file of another device with the same number, is planned", () => {
    const sameDevice: IdentifiedOutput<Format> = { output: { fmt: "md", dest: { kind: "file", path: "a.md" } }, identity: { dev: 1n, ino: 3n }, toStandardError: false };
    const otherDevice: IdentifiedOutput<Format> = { output: { fmt: "json", dest: { kind: "file", path: "b.json" } }, identity: { dev: 4n, ino: 2n }, toStandardError: false };
    expect(outputClashOf([sameDevice, otherDevice], [READ, { subject: "the corpus", path: "a.feature", identity: undefined }])).toBeUndefined();
  });
});
