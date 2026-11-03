import { describe, it, expect } from "vitest";
import { planOutput, type OutputPlan } from "./format.js";
import { APP_MESSAGES, AppMessage } from "../../messages.js";
import { runBalanceCaptured } from "../../runBalance.test-utils.js";

function planOf(result: ReturnType<typeof planOutput>): OutputPlan {
  if (!result.ok) throw new Error(`expected a plan, got error: ${result.error}`);
  return result.plan;
}

describe("[SCN-FMT-001] planOutput plans markdown to stdout by default", () => {
  it("plans exactly one md→stdout output when no --format flag is given", () => {
    const plan = planOf(planOutput([], () => false));
    expect(plan.outputs).toEqual([{ fmt: "md", dest: { kind: "stdout" } }]);
  });
});

describe("[SCN-FMT-002] planOutput plans json to a caller-given file", () => {
  it.each([
    ["plans exactly one json→file output for a json:<path> spec", "json:reports/spec-reconciliation.json", "reports/spec-reconciliation.json"],
    ["takes the path as everything after the FIRST colon (a later colon stays in the path)", "json:/tmp/out:v2.json", "/tmp/out:v2.json"],
  ] as const)("%s", (_title, spec, path) => {
    const plan = planOf(planOutput([spec], () => false));
    expect(plan.outputs).toEqual([
      { fmt: "json", dest: { kind: "file", path } },
    ]);
  });
});

describe("[SCN-FMT-003] planOutput plans markdown to a caller-given file", () => {
  it("plans exactly one md→file output for a md:<path> spec", () => {
    const plan = planOf(planOutput(["md:reports/spec-reconciliation.md"], () => false));
    expect(plan.outputs).toEqual([
      { fmt: "md", dest: { kind: "file", path: "reports/spec-reconciliation.md" } },
    ]);
  });
});

describe("[SCN-FMT-004] planOutput routes several specs independently in one plan", () => {
  it("plans md→stdout AND json→file from a `md` + `json:<path>` spec list", () => {
    const plan = planOf(planOutput(["md", "json:reports/spec-reconciliation.json"], () => false));
    expect(plan.outputs).toEqual([
      { fmt: "md", dest: { kind: "stdout" } },
      { fmt: "json", dest: { kind: "file", path: "reports/spec-reconciliation.json" } },
    ]);
  });
});

describe("[SCN-FMT-005] planOutput rejects more than one output routed to stdout", () => {
  it("rejects two DIFFERENT formats both bound for stdout, with a stdout+:<path> hint", () => {
    const result = planOutput(["md", "json"], () => false);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable: expected a stdout-collision error");
    expect(result.error).toMatch(/stdout/i);
    expect(result.error).toMatch(/:<path>/);
  });
});

describe("[SCN-FMT-007] balance rejects an unknown format with a hint listing md and json", () => {
  it("runBalance refuses --format xml at exit 2 with the hint alone, writing nothing, over a target that would otherwise reconcile", () => {
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", "tests/fixtures/balanced/features",
      "--vitest", "tests/fixtures/balanced/vitest.json",
      "--package-json", "tests/fixtures/balanced/package.json",
      "--ci", "tests/fixtures/balanced",
      "--format", "xml",
    ]);

    expect(exitCode).toBe(2);
    expect(stderr).toBe(APP_MESSAGES[AppMessage.UnknownFormat]("xml", "md, json") + "\n");
    expect(stdout).toBe("");
  });

  it("names each unknown format once, in the order first given, however often and wherever it is routed", () => {
    const result = planOutput(["xml", "xml:a.out", "yaml"], () => false);
    expect(result).toEqual({
      ok: false,
      error: APP_MESSAGES[AppMessage.UnknownFormat]("xml, yaml", "md, json"),
    });
  });
});

describe("[SCN-FMT-011] planOutput counts a --format path naming standard output as routed to stdout", () => {
  const namesStdout = (path: string): boolean => path === "/dev/stdout" || path === "/dev/fd/1";

  it("refuses the markdown report on stdout beside one at a path naming stdout", () => {
    const result = planOutput(["md", "json:/dev/fd/1"], namesStdout);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(APP_MESSAGES[AppMessage.MoreThanOneToStdout]("md, json"));
  });
});
