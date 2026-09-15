/**
 * @SCN-SLF-007's `@unit` arm — the gate's verdict IS the resolved binary's exit status, and nothing
 * stands between them.
 *
 * WHAT THE `@integration` ARM CANNOT SEE. That arm plants a defect and watches the verdict move or
 * not move, which establishes WHICH CODE computes the verdict. It says nothing about whether the
 * workflow then ACTS on it. A step that computed the right verdict and swallowed it — `|| true`, a
 * `continue-on-error`, an `if:` that skipped it on the runs that mattered — would satisfy every
 * assertion over there while the gate gated nothing.
 *
 * THAT IS THE WATERMELON THIS REPOSITORY EXISTS TO REFUSE, so it is asserted rather than assumed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/** The step that reaches this repository's own verdict. It carries no `id:` and no `@SCN`. */
const RECONCILER_STEP = "Self-reconciliation balance";

interface Step {
  name?: string;
  run?: string;
  uses?: string;
  if?: unknown;
  "continue-on-error"?: unknown;
}

function reconcilerStep(): Step {
  const workflow = parse(
    readFileSync(join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8"),
  ) as { jobs: Record<string, { steps: Step[] }> };
  const steps = Object.values(workflow.jobs)[0]?.steps ?? [];
  const step = steps.find((s) => s.name === RECONCILER_STEP);
  expect(step, `ci.yml states no "${RECONCILER_STEP}" step — the gate is not wired at all`).toBeDefined();
  return step as Step;
}

describe("[SCN-SLF-007] the gate acts on the resolved binary's exit status, unmediated", () => {
  it("invokes the reconciler directly as an ordinary run: step", () => {
    const step = reconcilerStep();
    expect(step.run, "the gate must be a run: step, not an action that interprets its own result").toBeDefined();
    expect(step.uses).toBeUndefined();
    // The tool, by the name that resolves to the INSTALLED binary (3F-3413).
    expect(step.run).toMatch(/\bpnpm\s+spec-controller\s+balance\b/);
  });

  it("neither suppresses the failure nor makes the step conditional", () => {
    const step = reconcilerStep();

    expect(
      step["continue-on-error"],
      "continue-on-error lets the job go green on an out-of-balance verdict — the gate would gate nothing",
    ).toBeUndefined();

    expect(
      step.if,
      "an if: on the gate means there are runs where the books are never read, and a green would not say which",
    ).toBeUndefined();

    // `|| true`, `|| exit 0`, `|| echo …` — anything that catches a non-zero status and hands the
    // step a zero one. Command substitution inside the argv (the optional --measurements /
    // --ci-steps flags) is NOT this: it cannot alter the tool's own status.
    expect(
      step.run,
      "the gate's run body swallows a non-zero status, so an out-of-balance verdict would not fail the job",
    ).not.toMatch(/\|\|/);
    expect(step.run, "a trailing `exit 0` discards the verdict the tool just computed").not.toMatch(
      /;\s*exit\s+0\b/,
    );
    expect(step.run, "piping the tool's output replaces its exit status with the pipe's").not.toMatch(
      /\bspec-controller\s+balance\b[^\n]*\|[^|]/,
    );
  });
});
