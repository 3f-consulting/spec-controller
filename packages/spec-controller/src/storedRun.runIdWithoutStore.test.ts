import { describe, expect, it } from "vitest";
import { parseHostInvocation } from "./host.js";
import { storedReRenderRefusal, unstoredRunIdRefusal } from "./storedRun.js";

describe("[SCN-CLI-083] the host refuses --run-id given without --store as a usage fault, naming it", () => {
  const LIVE = ["balance", "--features", "f"];

  it.each([[[]], [["--exit-zero"]], [["--strict"]], [["--format", "json:report.json"]]])(
    "refuses a live balance run named with --run-id and no --store, with %j",
    (extra) => {
      const refusal = unstoredRunIdRefusal(parseHostInvocation(["--run-id", "r1", ...LIVE, ...extra]));

      expect(refusal).toBeDefined();
      expect(refusal).toContain("--run-id");
      expect(refusal).toContain("r1");
    },
  );

  it("refuses a re-render named with --run-id alone, naming it and never advising --store", () => {
    const refusal = storedReRenderRefusal(
      parseHostInvocation(["--run-id", "r1", "balance", "--render-from-json", "saved.json"]),
    );

    expect(refusal).toBeDefined();
    expect(refusal).toContain("--run-id");
    expect(refusal).not.toContain("--store");
  });

  it("refuses nothing when --store is given, or when no --run-id is", () => {
    expect(unstoredRunIdRefusal(parseHostInvocation(["--store", "/s", "--run-id", "r1", ...LIVE]))).toBeUndefined();
    expect(unstoredRunIdRefusal(parseHostInvocation(LIVE))).toBeUndefined();
  });

  it("leaves --run-id before a command that takes no host modifier to that command's own refusal", () => {
    expect(unstoredRunIdRefusal(parseHostInvocation(["--run-id", "r1", "allocate", "CLI"]))).toBeUndefined();
  });
});
