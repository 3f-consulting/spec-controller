import { describe, it, expect } from "vitest";

import { isFailingVerdict } from "./verdictCode.js";

describe("[SCN-CLI-021] isFailingVerdict — the verdicts --exit-zero moves to 0", () => {
  it("an out-of-balance or scenario-code-error verdict (1) is a failing verdict", () => {
    expect(isFailingVerdict(1)).toBe(true);
  });

  it("a pending verdict under --strict (3) is a failing verdict", () => {
    expect(isFailingVerdict(3)).toBe(true);
  });

  it("a balanced verdict (0) is not a failing verdict, so it ends on 0 unmoved", () => {
    expect(isFailingVerdict(0)).toBe(false);
  });
});

describe("[SCN-CLI-022] isFailingVerdict — a run that could give no verdict is never moved by --exit-zero", () => {
  it("an unsound run (4) is not a failing verdict", () => {
    expect(isFailingVerdict(4)).toBe(false);
  });

  it("a run with nothing to reconcile (5) is not a failing verdict", () => {
    expect(isFailingVerdict(5)).toBe(false);
  });
});
