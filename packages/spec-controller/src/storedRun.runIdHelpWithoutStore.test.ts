import { describe, expect, it } from "vitest";
import { parseHostInvocation } from "./host.js";
import { storedReRenderRefusal, unstoredRunIdRefusal } from "./storedRun.js";

describe("[SCN-CLI-084] balance's help after --run-id with no --store is answered, never refused", () => {
  it.each(["--help", "-h"])("refuses nothing for balance %s after --run-id", (help) => {
    const inv = parseHostInvocation(["--run-id", "r1", "balance", help]);

    expect(unstoredRunIdRefusal(inv)).toBeUndefined();
    expect(storedReRenderRefusal(inv)).toBeUndefined();
  });

  it("refuses nothing when the help follows the target's flags", () => {
    const inv = parseHostInvocation(["--run-id", "r1", "balance", "--features", "f", "--help"]);

    expect(unstoredRunIdRefusal(inv)).toBeUndefined();
  });

  it("still refuses the same run when no help is asked for", () => {
    expect(unstoredRunIdRefusal(parseHostInvocation(["--run-id", "r1", "balance", "--features", "f"]))).toBeDefined();
  });
});
