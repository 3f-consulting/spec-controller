import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import { describe, expect, it } from "vitest";
import { exitCodeOf } from "./exitStatus.js";

describe("each run verdict will have its exit code", () => {
  it.each([
    ["CLM-CLI-166", "balanced", (): RunVerdict => ({ verdict: "balanced" }), 0],
    ["CLM-CLI-167", "out of balance", (): RunVerdict => ({ verdict: "out-of-balance" }), 1],
    ["CLM-CLI-168", "not reconciled, because unsound", (): RunVerdict => ({ verdict: "not-reconciled", why: "unsound" }), 3],
    ["CLM-CLI-169", "not reconciled, because claim code errors", (): RunVerdict => ({ verdict: "not-reconciled", why: "claim-code-errors" }), 3],
    ["CLM-CLI-170", "not reconciled, because nothing to reconcile", (): RunVerdict => ({ verdict: "not-reconciled", why: "nothing-to-reconcile" }), 3],
  ])("[%s] the run verdict %s", (_clm, _name, runVerdict, code) => {
    expect(exitCodeOf(runVerdict(), false)).toBe(code);
  });
});

describe("under --exit-zero only an out-of-balance run will exit 0 instead of its code", () => {
  it.each([
    ["CLM-CLI-171", "balanced", (): RunVerdict => ({ verdict: "balanced" }), 0, 0],
    ["CLM-CLI-172", "out of balance", (): RunVerdict => ({ verdict: "out-of-balance" }), 1, 0],
    ["CLM-CLI-173", "not reconciled", (): RunVerdict => ({ verdict: "not-reconciled", why: "unsound" }), 3, 3],
  ])("[%s] a run that ended %s", (_clm, _name, runVerdict, code, underExitZero) => {
    const verdict = Object.freeze(runVerdict());

    expect(exitCodeOf(verdict, false)).toBe(code);
    expect(exitCodeOf(verdict, true)).toBe(underExitZero);
    expect(verdict).toEqual(runVerdict());
  });
});
