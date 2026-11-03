import { describe, expect, it } from "vitest";
import { sharedFileRefusal } from "./format.js";
import { APP_MESSAGES, AppMessage } from "../../messages.js";
import { toFile, toStdout, fileIdentity as id, identifiedAs as at } from "./plannedOutput.test-utils.js";


describe("[SCN-FMT-010] two outputs whose regular files share one device and inode are refused, naming both", () => {
  it("refuses two outputs on one file, naming each as the operator gave it", () => {
    const refusal = sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("json", "./y.md"), id(1n, 7n))]);

    expect(refusal).toBe(APP_MESSAGES[AppMessage.OutputsShareFile]("md:y.md", "json:./y.md"));
  });

  it("names standard output as such when it is redirected into the file another output names", () => {
    const refusal = sharedFileRefusal([at(toStdout("md"), id(2n, 5n)), at(toFile("json", "out.md"), id(2n, 5n))]);

    expect(refusal).toBe(APP_MESSAGES[AppMessage.OutputsShareFile](APP_MESSAGES[AppMessage.FormatOnStandardOutput]("md"), "json:out.md"));
  });

  it("passes outputs on files with different identities", () => {
    expect(sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("json", "z.json"), id(1n, 8n))])).toBeUndefined();
    expect(sharedFileRefusal([at(toFile("md", "y.md"), id(1n, 7n)), at(toFile("json", "z.json"), id(2n, 7n))])).toBeUndefined();
  });
});
