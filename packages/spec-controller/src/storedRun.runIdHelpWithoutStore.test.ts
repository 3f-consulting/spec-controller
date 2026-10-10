import { describe, expect, it } from "vitest";
import { parseHostInvocation } from "./host.js";
import { unstoredRunIdRefusal } from "./storedRun.js";

describe("[SCN-CLI-084] balance's help after --run-id with no --store is answered, never refused", () => {

  it("still refuses the same run when no help is asked for", () => {
    expect(unstoredRunIdRefusal(parseHostInvocation(["--run-id", "r1", "balance", "--features", "f"]))).toBeDefined();
  });
});
