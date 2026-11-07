import { describe, expect, it } from "vitest";
import { inputOverwriteRefusal, type FileIdentity, type IdentifiedInput } from "./format.js";
import { AppError } from "../../messages.js";
import { message } from "../../appText.js";
import { toFile, toStdout, fileIdentity as id, identifiedAs as at } from "./plannedOutput.test-utils.js";
import { shownText } from "../../shownText.test-utils.js";

const input = (subject: string, path: string, identity: FileIdentity | undefined): IdentifiedInput => ({ subject, path, identity });

describe("[CLM-FMT-013] an output on the regular file an input is refused, naming the output and the input", () => {
  it("refuses an output on the file an input names, naming the output as given and the input by its subject and path", () => {
    const refusal = shownText(inputOverwriteRefusal([at(toFile("json", "vitest.json"), id(1n, 7n))], [input("the --vitest report", "vitest.json", id(1n, 7n))]));

    expect(refusal).toBe(message(AppError.OutputOverwritesInput, { output: "json:vitest.json", subject: "the --vitest report", path: "vitest.json" }));
  });

  it("names the output that lands on an input whichever position it has among the outputs", () => {
    const inputs = [input("the package.json read by default", "package.json", id(1n, 4n)), input("the --vitest report", "vitest.json", id(1n, 7n))];

    expect(shownText(inputOverwriteRefusal([at(toFile("md", "a.md"), id(1n, 1n)), at(toFile("json", "package.json"), id(1n, 4n))], inputs))).toContain(
      "json:package.json is the package.json read by default",
    );
    expect(shownText(inputOverwriteRefusal([at(toFile("json", "package.json"), id(1n, 4n)), at(toFile("md", "a.md"), id(1n, 1n))], inputs))).toContain(
      "json:package.json is the package.json read by default",
    );
  });

  it("passes outputs on files no input is", () => {
    const inputs = [input("the --vitest report", "vitest.json", id(1n, 7n))];

    expect(shownText(inputOverwriteRefusal([at(toFile("json", "out.json"), id(1n, 8n))], inputs))).toBeUndefined();
    expect(shownText(inputOverwriteRefusal([at(toFile("json", "out.json"), id(2n, 7n))], inputs))).toBeUndefined();
    expect(shownText(inputOverwriteRefusal([at(toFile("json", "out.json"), id(1n, 8n))], []))).toBeUndefined();
  });

  it("never compares a destination or an input that is not a regular file", () => {
    expect(shownText(inputOverwriteRefusal([at(toFile("md", "/dev/null"), undefined)], [input("the --vitest report", "/dev/null", undefined)]))).toBeUndefined();
    expect(shownText(inputOverwriteRefusal([at(toStdout("md"), undefined)], [input("the --vitest report", "vitest.json", id(1n, 7n))]))).toBeUndefined();
  });
});
