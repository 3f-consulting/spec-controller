import { describe, it, expect } from "vitest";
import { planOutput, type OutputPlan } from "./format.js";

function planOf(result: ReturnType<typeof planOutput>): OutputPlan {
  if (!result.ok) throw new Error(`expected a plan, got error: ${result.error}`);
  return result.plan;
}

describe("[SCN-FMT-001] planOutput plans markdown to stdout by default", () => {
  it("plans exactly one md→stdout output when no --format flag is given", () => {
    const plan = planOf(planOutput([]));
    expect(plan.outputs).toEqual([{ fmt: "md", dest: { kind: "stdout" } }]);
  });

  it("plans exactly one md→stdout output for an explicit --format md", () => {
    const plan = planOf(planOutput(["md"]));
    expect(plan.outputs).toEqual([{ fmt: "md", dest: { kind: "stdout" } }]);
  });
});

describe("[SCN-FMT-002] planOutput plans json to a caller-given file", () => {
  it("plans exactly one json→file output for a json:<path> spec", () => {
    const plan = planOf(planOutput(["json:reports/spec-reconciliation.json"]));
    expect(plan.outputs).toEqual([
      { fmt: "json", dest: { kind: "file", path: "reports/spec-reconciliation.json" } },
    ]);
  });

  it("takes the path as everything after the FIRST colon (a later colon stays in the path)", () => {
    const plan = planOf(planOutput(["json:/tmp/out:v2.json"]));
    expect(plan.outputs).toEqual([
      { fmt: "json", dest: { kind: "file", path: "/tmp/out:v2.json" } },
    ]);
  });
});

describe("[SCN-FMT-003] planOutput plans markdown to a caller-given file", () => {
  it("plans exactly one md→file output for a md:<path> spec", () => {
    const plan = planOf(planOutput(["md:reports/spec-reconciliation.md"]));
    expect(plan.outputs).toEqual([
      { fmt: "md", dest: { kind: "file", path: "reports/spec-reconciliation.md" } },
    ]);
  });

  it("routes nothing to stdout when the markdown is file-destined", () => {
    const plan = planOf(planOutput(["md:reports/spec-reconciliation.md"]));
    expect(plan.outputs.filter((o) => o.dest.kind === "stdout")).toEqual([]);
  });
});

describe("[SCN-FMT-004] planOutput routes several specs independently in one plan", () => {
  it("plans md→stdout AND json→file from a `md` + `json:<path>` spec list", () => {
    const plan = planOf(planOutput(["md", "json:reports/spec-reconciliation.json"]));
    expect(plan.outputs).toEqual([
      { fmt: "md", dest: { kind: "stdout" } },
      { fmt: "json", dest: { kind: "file", path: "reports/spec-reconciliation.json" } },
    ]);
  });

  it("routes EXACTLY ONE output to stdout — the allowed multi-output shape", () => {
    const plan = planOf(planOutput(["md", "json:reports/spec-reconciliation.json"]));
    expect(plan.outputs.filter((o) => o.dest.kind === "stdout")).toEqual([
      { fmt: "md", dest: { kind: "stdout" } },
    ]);
  });
});

describe("[SCN-FMT-005] planOutput rejects more than one output routed to stdout", () => {
  it("rejects two DIFFERENT formats both bound for stdout, with a stdout+:<path> hint", () => {
    const result = planOutput(["md", "json"]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable: expected a stdout-collision error");
    expect(result.error).toMatch(/stdout/i);
    expect(result.error).toMatch(/:<path>/);
  });

  it("rejects the SAME format twice (md, md) — both stdout — locking the count semantics", () => {
    const result = planOutput(["md", "md"]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable: expected a stdout-collision error");
    expect(result.error).toMatch(/:<path>/);
  });

  it("accepts a single stdout-bound output (the allowed shape)", () => {
    expect(planOutput(["md"]).ok).toBe(true);
  });

  it("accepts one stdout output plus one file output (only the stdout count matters)", () => {
    expect(planOutput(["md", "json:reports/spec-reconciliation.json"]).ok).toBe(true);
  });
});

describe("[SCN-FMT-007] planOutput rejects an unknown format with a hint listing md and json", () => {
  it("rejects an unsupported format (xml) with a hint listing md and json", () => {
    const result = planOutput(["xml"]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable: expected an unknown-format error");
    expect(result.error).toMatch(/\bmd\b/);
    expect(result.error).toMatch(/\bjson\b/);
  });

  it("rejects an unknown format among otherwise-valid specs (md:x + nope)", () => {
    const result = planOutput(["md:x", "nope"]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable: expected an unknown-format error");
    expect(result.error).toMatch(/\bmd\b/);
    expect(result.error).toMatch(/\bjson\b/);
  });

  it("accepts the supported formats — md, json, md:<path>, json:<path> — unchanged", () => {
    expect(planOutput(["md"]).ok).toBe(true);
    expect(planOutput(["json"]).ok).toBe(true);
    expect(planOutput(["md:x"]).ok).toBe(true);
    expect(planOutput(["json:x"]).ok).toBe(true);
  });
});

describe("[SCN-FMT-011] planOutput counts a --format path naming standard output as routed to stdout", () => {
  const namesStdout = (path: string): boolean => path === "/dev/stdout" || path === "/dev/fd/1";

  it("refuses the markdown report on stdout beside one at a path naming stdout", () => {
    const result = planOutput(["md", "json:/dev/fd/1"], namesStdout);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("More than one output routes to stdout (md, json)");
  });

  it("refuses two paths that both name stdout", () => {
    expect(planOutput(["md:/dev/stdout", "json:/dev/stdout"], namesStdout).ok).toBe(false);
  });

  it("plans one output at a path naming stdout, and a stdout output beside a path that does not", () => {
    expect(planOutput(["md:/dev/stdout"], namesStdout).ok).toBe(true);
    expect(planOutput(["md", "json:/dev/stderr"], namesStdout).ok).toBe(true);
  });
});
