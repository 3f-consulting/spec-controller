import { describe, expect, it } from "vitest";
import { parseHostInvocation } from "./host.js";
import { dispatchesUnstored, storedReRenderRefusal } from "./storedRun.js";
import { shownText } from "./shownText.test-utils.js";

describe("[SCN-RMG-006] the host answers a stored command's help before the store is touched", () => {
  it("dispatches unstored when there is no --store", () => {
    const inv = parseHostInvocation(["balance", "--features", "f"]);

    expect(dispatchesUnstored(inv)).toBe(true);
  });
});

describe("[SCN-RMG-007] the host refuses a stored re-render, naming the store and no flag the operator did not give", () => {
  const SAVED = ["balance", "--render-from-json", "saved.json"];

  it("names --store, and never --format", () => {
    const refusal = shownText(storedReRenderRefusal(parseHostInvocation(["--store", "/s", ...SAVED])));

    expect(refusal).toContain("--store");
    expect(refusal).not.toContain("--format");
    expect(refusal).not.toContain("--run-id");
  });

  it("refuses nothing without --store, without --render-from-json, or when help is asked for", () => {
    expect(shownText(storedReRenderRefusal(parseHostInvocation(SAVED)))).toBeUndefined();
    expect(shownText(storedReRenderRefusal(parseHostInvocation(["--store", "/s", "balance", "--features", "f"])))).toBeUndefined();
    expect(shownText(storedReRenderRefusal(parseHostInvocation(["--store", "/s", ...SAVED, "--help"])))).toBeUndefined();
  });
});

describe("[SCN-MSG-015] a counted noun agrees with its count — a re-render's flags it does not read", () => {
  it("1 flag", () => {
    const refusal = shownText(storedReRenderRefusal(parseHostInvocation(["--store", "/s", "balance", "--render-from-json", "saved.json"])));
    expect(refusal?.trimEnd().split("\n").at(-1)).toBe("Run 'spec-controller balance --render-from-json <path>' without it.");
  });
});
