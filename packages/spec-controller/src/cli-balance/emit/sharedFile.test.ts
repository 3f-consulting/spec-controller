import { describe, expect, it } from "vitest";
import { sharedFileRefusal } from "./format.js";
import { toFile, toStdout, fileIdentity as id, identifiedAs as at } from "./plannedOutput.test-utils.js";


describe("[SCN-FMT-010] two outputs whose regular files share one device and inode are refused, naming both", () => {
  it("refuses two outputs on one file, naming each as the operator gave it", () => {
    const refusal = sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("json", "./y.md"), id(1n, 7n))]);

    expect(refusal).toBe("Two outputs name the same file: md:y.md and json:./y.md. Give each output a file of its own.");
  });

  it("names standard output as such when it is redirected into the file another output names", () => {
    const refusal = sharedFileRefusal([at(toStdout("md"), id(2n, 5n)), at(toFile("json", "out.md"), id(2n, 5n))]);

    expect(refusal).toBe("Two outputs name the same file: md on standard output and json:out.md. Give each output a file of its own.");
  });

  it("passes outputs on files with different identities", () => {
    expect(sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("json", "z.json"), id(1n, 8n))])).toBeUndefined();
    expect(sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("json", "z.json"), id(2n, 7n))])).toBeUndefined();
  });
});
