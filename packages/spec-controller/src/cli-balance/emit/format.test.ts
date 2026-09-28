/**
 * Unit test for `planOutput` — the pure `--format` parse+validate (@SCN-FMT-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it carry the @SCN-FMT-001
 * id matching features/output-format.feature, so a grep of the id returns both halves of
 * the pair (this @unit + the @integration Cucumber step-block).
 *
 * FMT-001's plan skeleton: no `--format` flag — and an explicit `md` — both plan EXACTLY
 * ONE markdown output bound for stdout. Pure: no IO, no subprocess (the writer's real
 * stdout effect is the @integration arm — the anti-watermelon split).
 *
 * Parent: @SCN-FMT-001 — the output-dispatch rework.
 */

import { describe, it, expect } from "vitest";
import { planOutput, type OutputPlan } from "./format.js";

/** Narrow the PlanResult to its ok plan, failing loudly with the error otherwise. */
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
    // The FMT-003 contract: when md is file-routed, nothing is stdout-destined — so the
    // caller captures the human report without shell redirection, stdout staying clean.
    const plan = planOf(planOutput(["md:reports/spec-reconciliation.md"]));
    expect(plan.outputs.filter((o) => o.dest.kind === "stdout")).toEqual([]);
  });
});

describe("[SCN-FMT-004] planOutput routes several specs independently in one plan", () => {
  it("plans md→stdout AND json→file from a `md` + `json:<path>` spec list", () => {
    // The FMT-004 contract: several --format specs in one run each route to their own
    // destination — so a single invocation plans markdown for stdout AND json for a file.
    // The outputs preserve argv order (md first, json second), each routed independently.
    const plan = planOf(planOutput(["md", "json:reports/spec-reconciliation.json"]));
    expect(plan.outputs).toEqual([
      { fmt: "md", dest: { kind: "stdout" } },
      { fmt: "json", dest: { kind: "file", path: "reports/spec-reconciliation.json" } },
    ]);
  });

  it("routes EXACTLY ONE output to stdout — the allowed multi-output shape", () => {
    // Coheres with the stdout invariant (FMT-005): the multi-output case is allowed
    // precisely because exactly one output is stdout-destined (the md arm), the json
    // arm going to a file. So the plan is valid, not a two-to-stdout collision.
    const plan = planOf(planOutput(["md", "json:reports/spec-reconciliation.json"]));
    expect(plan.outputs.filter((o) => o.dest.kind === "stdout")).toEqual([
      { fmt: "md", dest: { kind: "stdout" } },
    ]);
  });
});

describe("[SCN-FMT-005] planOutput rejects more than one output routed to stdout", () => {
  // The invariant: AT MOST ONE output may route to stdout,
  // so a captured stdout never carries two interleaved documents. planOutput returns the
  // typed PlanResult error (the shared error surface FMT-006/007 also use) carrying a hint
  // to give one of them a :<path>. This @unit is the pure half of the @SCN-FMT-005 pair;
  // the @integration half (the real CLI exit + stderr) lives in the Cucumber step-block.

  it("rejects two DIFFERENT formats both bound for stdout, with a stdout+:<path> hint", () => {
    // The feature-scenario exemplar: `--format md --format json` — two different formats,
    // both defaulting to stdout — a collision.
    const result = planOutput(["md", "json"]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable: expected a stdout-collision error");
    expect(result.error).toMatch(/stdout/i);
    expect(result.error).toMatch(/:<path>/);
  });

  it("rejects the SAME format twice (md, md) — both stdout — locking the count semantics", () => {
    // The count-semantics TEETH: `--format md --format md` is TWO outputs both bound for
    // stdout (two interleaved markdown documents). A "distinct formats > 1" check would
    // WRONGLY pass this; the true invariant is a COUNT of stdout-destined outputs (≤ 1),
    // so the same format twice must reject exactly as two different formats do.
    const result = planOutput(["md", "md"]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable: expected a stdout-collision error");
    expect(result.error).toMatch(/:<path>/);
  });

  it("accepts a single stdout-bound output (the allowed shape)", () => {
    expect(planOutput(["md"]).ok).toBe(true);
  });

  it("accepts one stdout output plus one file output (only the stdout count matters)", () => {
    // Coheres with FMT-004: md→stdout + json→file is exactly one stdout-destined output,
    // so it stays valid — the check counts stdout routing, not total outputs.
    expect(planOutput(["md", "json:reports/spec-reconciliation.json"]).ok).toBe(true);
  });
});

describe("[SCN-FMT-007] planOutput rejects an unknown format with a hint listing md and json", () => {
  // The unknown-format guard: a --format naming an
  // unsupported format (`xml`, or a typo) is rejected with the typed PlanResult error (the
  // shared surface FMT-005/006 also use), carrying a hint that LISTS the supported formats
  // md + json — rather than silently rendering as markdown (the writer's default branch).
  // This @unit is the pure half of the @SCN-FMT-007 pair; the @integration half (the real
  // CLI exit + stderr) lives in the Cucumber step-block.

  it("rejects an unsupported format (xml) with a hint listing md and json", () => {
    // The feature-scenario exemplar: `--format xml` — an unsupported format.
    const result = planOutput(["xml"]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable: expected an unknown-format error");
    expect(result.error).toMatch(/\bmd\b/);
    expect(result.error).toMatch(/\bjson\b/);
  });

  it("rejects an unknown format among otherwise-valid specs (md:x + nope)", () => {
    // The guard flags an unknown token even when a sibling spec is valid — here `md:x` (a
    // valid file-routed markdown) plus `nope` (an unknown format). `nope` is rejected; the
    // otherwise-valid `md:x` does not mask it.
    const result = planOutput(["md:x", "nope"]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable: expected an unknown-format error");
    expect(result.error).toMatch(/\bmd\b/);
    expect(result.error).toMatch(/\bjson\b/);
  });

  it("accepts the supported formats — md, json, md:<path>, json:<path> — unchanged", () => {
    // The guard rejects ONLY unknown formats; every supported format (bare or file-routed)
    // stays valid, so the guard doesn't regress FMT-001..004.
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
