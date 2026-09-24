/**
 * @SCN-USG-014 — THE RECONCILER IS NOT ONE OF THE RECONCILED ROWS, and nothing configures that.
 *
 * Every arm below hands `reconcilerSteps` a manifest that says nothing about any step: there is no
 * `specController` block in any of them, and most carry no `notChecks`-shaped anything at all. That
 * is the whole subject. A pair of consumer exclusions produces the same report over the same
 * pipeline, so an arm run over a target that HAD written them could not tell the two answers apart
 * — and the consumer who has written nothing is every consumer on their first run.
 *
 * WHAT IS RECOGNISED, AND WHY NEITHER HALF IS A LIST. The reconciling step is the one running this
 * tool's own reconciling invocation, compared as WHOLE ADJACENT SHELL TOKENS and followed through
 * the manifest scripts a step invokes — the runner rule's own comparison (`parse/commandRuns`),
 * because a pipeline invokes a binary through a script alias far more often than it names it. The
 * dump is the step carrying GitHub's own step-record expression, which is the only way that record
 * can be produced. One is our invocation, one is GitHub's grammar; neither is a step's title.
 * // @SCN-USG-014
 */
import { describe, it, expect } from "vitest";
import { ciWorkflowSteps } from "./checkScriptsRunInCI.js";
import { reconcilerSteps } from "./reconcilerSteps.js";

/** The invocation the application edge names — this tool, run to reconcile. */
const INVOCATION = "spec-controller balance";

/** The one workflow file every arm reads unless it says otherwise. */
const NAMES = ["ci.yml"];

/**
 * A pipeline whose reconciler is invoked DIRECTLY — no script alias anywhere, and the manifest
 * below is empty, so nothing but the step's own command can be doing the recognising.
 */
const DIRECT_CI = `
jobs:
  ci:
    steps:
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
      - name: Self-reconciliation balance
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
      - name: Sweep check
        run: pnpm lint:sweep
`;

/** The same two steps reached through `package.json` scripts, which is how real pipelines do it. */
const ALIASED_CI = `
jobs:
  ci:
    steps:
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: pnpm lint:dump
      - name: Self-reconciliation balance
        run: pnpm lint:reconcile
      - name: Sweep check
        run: pnpm lint:sweep
`;

const ALIASES = {
  scripts: {
    "lint:dump": `printf '%s' "$STEPS_JSON" > ci-steps.json`,
    "lint:reconcile": "spec-controller balance --features features",
    "lint:sweep": "madge --circular",
  },
};

/** One step of a walked pipeline, by the identity GitHub would display for it. */
function stepNamed(ci: string, identity: string) {
  const step = ciWorkflowSteps([ci]).find((s) => s.identity === identity);
  if (step === undefined) throw new Error(`no step named "${identity}" in the fixture`);
  return step;
}

describe("[SCN-USG-014] reconcilerSteps — by construction, over a manifest that says nothing", () => {
  // THE CENTRAL ARM. The manifest is `{}` — no scripts, no `specController`, no exclusion list of
  // any kind — and both halves of the reconciler are still recognised. A reader that took its
  // answer from configuration recognises neither here, which is exactly the consumer's first run.
  it("recognises the reconciling step and its step-record dump with nothing configured", () => {
    const { steps } = reconcilerSteps([DIRECT_CI], NAMES, INVOCATION, {});
    expect(steps).toEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
      { step: "ci.yml:ci:Self-reconciliation balance", role: "reconciles" },
    ]);
  });

  it("answers the discovery seam for each of them, and for the ordinary check beside them", () => {
    const { isReconciler } = reconcilerSteps([DIRECT_CI], NAMES, INVOCATION, {});
    expect(isReconciler(stepNamed(DIRECT_CI, "Self-reconciliation balance"))).toBe(true);
    expect(isReconciler(stepNamed(DIRECT_CI, "Dump this run's step record"))).toBe(true);
    // THE CONTROL, and it is the half that makes the two above mean anything: a reader answering
    // `true` to everything satisfies both arms while taking the whole pipeline off the books.
    expect(isReconciler(stepNamed(DIRECT_CI, "Sweep check"))).toBe(false);
  });
});

describe("[SCN-USG-014] reconcilerSteps — through the manifest scripts a step invokes", () => {
  // THE SHAPE REAL PIPELINES HAVE. Measured on this repository's own: the binary's name is not in
  // the workflow at all — the step runs a `package.json` script and the script runs the binary.
  it("recognises the reconciler at a step that invokes it through a script alias", () => {
    const { steps } = reconcilerSteps([ALIASED_CI], NAMES, INVOCATION, ALIASES);
    expect(steps).toEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
      { step: "ci.yml:ci:Self-reconciliation balance", role: "reconciles" },
    ]);
  });

  it("follows a script that invokes a script", () => {
    const ci = `
jobs:
  ci:
    steps:
      - name: Verify
        run: pnpm verify
`;
    const scripts = { scripts: { verify: "pnpm reconcile", reconcile: "spec-controller balance" } };
    expect(reconcilerSteps([ci], NAMES, INVOCATION, scripts).steps).toEqual([
      { step: "ci.yml:ci:Verify", role: "reconciles" },
    ]);
  });
});

describe("[SCN-USG-014] reconcilerSteps — what it does not recognise", () => {
  /** The steps recognised over one pipeline, with the aliases every arm here shares. */
  const recognised = (ci: string, scripts: Record<string, string> = {}): unknown[] => [
    ...reconcilerSteps([ci], NAMES, INVOCATION, { scripts }).steps,
  ];

  // THE TOOL, RUN FOR SOMETHING ELSE. A step running the same binary for anything but `balance`
  // is an ordinary step of the pipeline being reconciled, and a whole-token match on the binary
  // alone would take it off the books.
  it("leaves a step running this tool's OTHER command a candidate", () => {
    expect(recognised(`jobs:\n  ci:\n    steps:\n      - run: pnpm spec-controller help`)).toEqual(
      []
    );
  });

  it("leaves a step naming the package rather than running it a candidate", () => {
    expect(
      recognised(`jobs:\n  ci:\n    steps:\n      - run: pnpm --filter spec-controller build`)
    ).toEqual([]);
  });

  // THE WORDS WITHOUT THE TOKENS. A path or a hyphenated script carries both words and runs
  // nothing — the substring reading that the runner rule was measured to fail on, one rule along.
  it("leaves a step carrying the words inside another token a candidate", () => {
    expect(
      recognised(`jobs:\n  ci:\n    steps:\n      - run: node scripts/spec-controller-balance.js`)
    ).toEqual([]);
    expect(recognised(`jobs:\n  ci:\n    steps:\n      - run: pnpm lint:balance`)).toEqual([]);
  });

  // RECOGNITION IS NOT BY TITLE, and this is the arm that says so. The step is spelled exactly as
  // the dump is and carries no step-record expression anywhere, so there is nothing by
  // construction about it.
  it("leaves a dump-shaped step carrying no step-record expression a candidate", () => {
    expect(
      recognised(
        `jobs:\n  ci:\n    steps:\n      - name: Dump this run's step record\n        run: pnpm lint:dump`
      )
    ).toEqual([]);
  });

  // A JOB-LEVEL ENV REACHES EVERY STEP, so reading one would make every step of that job the
  // reconciler — the whole pipeline off the books on one key. The expression is read where it is
  // written, on the step.
  it("does not read the expression off the job", () => {
    const ci = `
jobs:
  ci:
    env:
      STEPS_JSON: \${{ toJSON(steps) }}
    steps:
      - name: Sweep check
        run: pnpm lint:sweep
`;
    expect(recognised(ci)).toEqual([]);
  });

  // AN INVOCATION NOBODY NAMED NAMES NOTHING. An empty invocation is an empty token list, and a
  // reader taking that as "matches anywhere" excludes every step of every pipeline it is handed.
  it("recognises no reconciling step when it has been given no invocation", () => {
    expect(reconcilerSteps([DIRECT_CI], NAMES, "", {}).steps).toEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
    ]);
  });
});

describe("[SCN-USG-014] reconcilerSteps — how the step-record expression is read", () => {
  /** One step carrying `value` wherever the arm puts it, and what the reader made of it. */
  const dumpWith = (env: string): unknown[] => [
    ...reconcilerSteps(
      [`jobs:\n  ci:\n    steps:\n      - name: Dump\n        env:\n          J: ${env}\n        run: echo done`],
      NAMES,
      INVOCATION,
      {}
    ).steps,
  ];

  // GITHUB'S FUNCTION NAMES ARE CASE-INSENSITIVE AND ITS EXPRESSIONS TOLERATE WHITESPACE, so a
  // consumer writing either is writing the same expression and gets the same answer.
  it("reads the expression however GitHub lets it be spelled", () => {
    const named = [{ step: "ci.yml:ci:Dump", role: "records" }];
    expect(dumpWith("${{ toJSON(steps) }}")).toEqual(named);
    expect(dumpWith("${{tojson(steps)}}")).toEqual(named);
    expect(dumpWith("${{ toJSON( steps ) }}")).toEqual(named);
  });

  it("reads a different expression as nothing of ours", () => {
    expect(dumpWith("${{ toJSON(github) }}")).toEqual([]);
    expect(dumpWith("steps")).toEqual([]);
  });

  // WRITTEN INTO THE COMMAND RATHER THAN THROUGH `env:` IT IS STILL THE RECORD. GitHub substitutes
  // it before bash sees it, which is a hazard a consumer may not know about — but what they wrote
  // is a step producing this run's step record, and the reader answers what is there.
  it("reads the expression where a consumer wrote it into the command", () => {
    expect(
      [
        ...reconcilerSteps(
          [`jobs:\n  ci:\n    steps:\n      - name: Dump\n        run: echo '\${{ toJSON(steps) }}' > r.json`],
          NAMES,
          INVOCATION,
          {}
        ).steps,
      ]
    ).toEqual([{ step: "ci.yml:ci:Dump", role: "records" }]);
  });
});

describe("[SCN-USG-014] reconcilerSteps — the account the report is written from", () => {
  // THE WORKFLOW FILE IS PART OF THE NAME, exactly as it is in a `notChecks` entry: two pipelines
  // may both carry a step called `Self-reconciliation balance`, and a report naming one of them
  // without saying which has told the consumer nothing they can act on.
  it("names each step by the workflow it was read from", () => {
    const other = `jobs:\n  release:\n    steps:\n      - name: Balance\n        run: spec-controller balance`;
    const { steps } = reconcilerSteps(
      [`jobs:\n  ci:\n    steps:\n      - run: pnpm lint:sweep`, other],
      ["ci.yml", "release.yml"],
      INVOCATION,
      {}
    );
    expect(steps).toEqual([{ step: "release.yml:release:Balance", role: "reconciles" }]);
  });

  // A SOURCE THIS RUN WAS GIVEN NO NAME FOR IS STILL RECOGNISED, and that is the safe direction:
  // the exclusion holds either way, because a citation on it is unsatisfiable whoever named the
  // file. What cannot be qualified is only the account, so the step is named by the identity
  // GitHub itself displays and nothing is dropped.
  it("still names a step whose source this run was given no name for", () => {
    const { steps, isReconciler } = reconcilerSteps([DIRECT_CI], [], INVOCATION, {});
    expect(steps).toEqual([
      { step: "Dump this run's step record", role: "records" },
      { step: "Self-reconciliation balance", role: "reconciles" },
    ]);
    expect(isReconciler(stepNamed(DIRECT_CI, "Self-reconciliation balance"))).toBe(true);
  });
});
