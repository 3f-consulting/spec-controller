import { describe, expect, it } from "vitest";
import { sharedFileRefusal, type FileIdentity, type IdentifiedOutput, type PlannedOutput } from "./format.js";

const toFile = (fmt: "md" | "json", path: string): PlannedOutput => ({ fmt, dest: { kind: "file", path } });
const toStdout = (fmt: "md" | "json"): PlannedOutput => ({ fmt, dest: { kind: "stdout" } });
const id = (dev: bigint, ino: bigint): FileIdentity => ({ dev, ino });
const at = (output: PlannedOutput, identity: FileIdentity | undefined): IdentifiedOutput => ({ output, identity });

describe("[SCN-FMT-010] two outputs whose regular files share one device and inode are refused, naming both", () => {
  it("refuses two outputs on one file, naming each as the operator gave it", () => {
    const refusal = sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("json", "./y.md"), id(1n, 7n))]);

    expect(refusal).toBe("Two outputs name the same file: md:y.md and json:./y.md. Give each output a file of its own.");
  });

  it("refuses the same format twice at one path", () => {
    const refusal = sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("md", "y.md"), id(1n, 7n))]);

    expect(refusal).toContain("md:y.md and md:y.md");
  });

  it("recognises the file by its identity, so two spellings that differ only in case or normalisation are one file where the volume says so", () => {
    const nfc = "café.md";
    const nfd = "café.md";

    expect(sharedFileRefusal([at(toFile("md", "y.md"), id(3n, 9n)), at(toFile("json", "Y.MD"), id(3n, 9n))])).toContain("md:y.md and json:Y.MD");
    expect(sharedFileRefusal([at(toFile("md", nfc), id(3n, 10n)), at(toFile("json", nfd), id(3n, 10n))])).toContain(`md:${nfc} and json:${nfd}`);
  });

  it("names standard output as such when it is redirected into the file another output names", () => {
    const refusal = sharedFileRefusal([at(toStdout("md"), id(2n, 5n)), at(toFile("json", "out.md"), id(2n, 5n))]);

    expect(refusal).toBe("Two outputs name the same file: md on standard output and json:out.md. Give each output a file of its own.");
  });

  it("names the pair that shares, when a third output lies between them", () => {
    const refusal = sharedFileRefusal([
      at(toFile("md", "a.md"), id(1n, 1n)),
      at(toFile("json", "b.json"), id(1n, 2n)),
      at(toFile("json", "link.md"), id(1n, 1n)),
    ]);

    expect(refusal).toContain("md:a.md and json:link.md");
  });

  it("passes outputs on files with different identities", () => {
    expect(sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("json", "z.json"), id(1n, 8n))])).toBeUndefined();
    expect(sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("json", "z.json"), id(2n, 7n))])).toBeUndefined();
  });

  it("compares inodes exactly, past the range a JavaScript number holds", () => {
    const big = 2n ** 60n;

    expect(sharedFileRefusal([at(toFile("md", "y.md"), id(1n, big)), at(toFile("json", "z.json"), id(1n, big + 1n))])).toBeUndefined();
  });

  it("never refuses outputs whose destination is not a regular file", () => {
    expect(sharedFileRefusal([at(toFile("md", "/dev/null"), undefined), at(toFile("json", "/dev/null"), undefined)])).toBeUndefined();
    expect(sharedFileRefusal([at(toStdout("md"), undefined), at(toFile("json", "/dev/stderr"), undefined)])).toBeUndefined();
  });
});
