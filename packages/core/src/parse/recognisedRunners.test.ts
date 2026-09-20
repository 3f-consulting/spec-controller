/**
 * Unit tests for RULE D — the recognition that says which steps of a target's pipeline run the
 * behavioural runners its manifest named (`recognisedRunners`), and the resolver those runners are
 * read out of the manifest by (`resolveRunners`, which lives in `./targetManifest.ts`).
 *
 * ITS OWN FILE, split off `runningStaticChecks.test.ts` at @SCN-USG-019 when the closure's arms
 * took that file past the 400-line file-length ceiling then in force (retired portfolio-wide on
 * 2026-09-18, 3F-2320). The seam is the one the two readers already have: the file left behind
 * pins the OBSERVER — which of a target's scripts CI runs as a static check — and this one pins
 * the disposition a step gets INSTEAD of reaching that observer. They share a module and nothing
 * else, which is the whole of the reason they are two files and outlives the ceiling.
 *
 * Parent: @SCN-USG-011 (rule D), @SCN-USG-012 (its teeth), @SCN-USG-016 (the three states of a
 * tier), @SCN-USG-019 (the key set's closure).
 */

import { describe, it, expect } from "vitest";
import { recognisedRunners } from "./runningStaticChecks.js";
import { resolveRunners } from "./targetManifest.js";

// ---------------------------------------------------------------------------
// @SCN-USG-011 — RULE D, the recognition a named runner is found by.
//
// THE MANIFEST HOP IS THE RULE, not a refinement of it, and these arms are written around the
// measurement that settled it: over 113 run: steps in five real portfolio pipelines a
// whole-token match on the STEP COMMAND alone recognises zero runners, because every one of
// them invokes its runner through a package.json script alias and the binary's name is never
// written in the workflow. So the arms that matter here are the ones where `vitest` appears
// only in the manifest.
// ---------------------------------------------------------------------------
describe("[SCN-USG-011] recognisedRunners — a runner recognised at the step invoking it through a manifest script", () => {
  const ciWith = (...steps: string[]): string =>
    ["jobs:", "  ci:", "    steps:", ...steps].join("\n");

  const aliasCi = ciWith(
    "      - run: pnpm install --frozen-lockfile",
    "      - name: Unit tests",
    "        run: pnpm test"
  );

  it("recognises the runner a step reaches through the manifest script it invokes", () => {
    // The shape all five real pipelines have: the workflow says `pnpm test`, the manifest says
    // what `test` runs, and the two together say what the step is.
    expect(
      recognisedRunners([aliasCi], { scripts: { test: "vitest run" } }, { unit: "vitest" })
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });

  it("recognises nothing from the workflow alone — the measurement that makes the hop the rule", () => {
    // The SAME workflow with the manifest's answer withheld. A reader that could recognise this
    // runner without the hop would report a runner over a document that does not name one, and
    // the arm above would then be passing for a reason that has nothing to do with the manifest.
    expect(aliasCi.includes("vitest")).toBe(false);
    expect(recognisedRunners([aliasCi], { scripts: {} }, { unit: "vitest" })).toEqual([]);
  });

  it("recognises a runner the step's own command names, with no script in the way", () => {
    const directCi = ciWith("      - name: Unit tests", "        run: pnpm exec vitest run --coverage");
    expect(
      recognisedRunners([directCi], { scripts: {} }, { unit: "vitest" })
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });

  it("follows a script that invokes another script", () => {
    // A manifest whose `test` is itself an alias. The runner is two hops from the workflow, and
    // a reader stopping at the first script body reports nothing over a pipeline that runs it.
    expect(
      recognisedRunners(
        [aliasCi],
        { scripts: { test: "pnpm test:unit", "test:unit": "vitest run" } },
        { unit: "vitest" }
      )
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });

  it("stops following at three hops", () => {
    // Three hops reach it; a fourth does not. A chain this deep is a shape no pipeline in the
    // portfolio has, and an unbounded walk over a manifest the consumer wrote is an input this
    // tool does not control — so the bound is stated by a pair of arms rather than by a comment.
    const scripts = { test: "pnpm a", a: "pnpm b", b: "vitest run" };
    expect(recognisedRunners([aliasCi], { scripts }, { unit: "vitest" })).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
    expect(
      recognisedRunners(
        [aliasCi],
        { scripts: { test: "pnpm a", a: "pnpm b", b: "pnpm c", c: "vitest run" } },
        { unit: "vitest" }
      )
    ).toEqual([]);
  });

  it("terminates on a script chain that loops back on itself", () => {
    // A manifest whose scripts cite each other, which a consumer is free to write and a hang is
    // the one failure they cannot read a report out of. WHAT MAKES THIS TERMINATE IS THE DEPTH
    // BOUND AND NOT THE VISITED SET, measured by plant: deleting the set leaves this arm and
    // every other one green, because a loop exhausts the depth exactly as a long chain does. So
    // this arm is honest about what it holds — the walk RETURNS over a cyclic manifest — and
    // makes no claim about which of the two mechanisms did it.
    expect(
      recognisedRunners(
        [aliasCi],
        { scripts: { test: "pnpm other", other: "pnpm test" } },
        { unit: "vitest" }
      )
    ).toEqual([]);
  });

  it("recognises nothing for a tier whose runner no step reaches", () => {
    expect(
      recognisedRunners([aliasCi], { scripts: { test: "vitest run" } }, { integration: "cucumber-js" })
    ).toEqual([]);
  });

  it("names every tier a step is the runner for — two tiers, one runner, one step", () => {
    // Two tiers sharing a runner is the ordinary case (@integration and @e2e both cucumber-js),
    // and each tier is a separate thing the reader was told; collapsing them would answer for a
    // tier nobody asked about.
    const cukeCi = ciWith("      - name: Cucumber", "        run: pnpm cucumber");
    expect(
      recognisedRunners(
        [cukeCi],
        { scripts: { cucumber: "cucumber-js" } },
        { integration: "cucumber-js", e2e: "cucumber-js" }
      )
    ).toEqual([
      { tier: "integration", runner: "cucumber-js", step: "Cucumber" },
      { tier: "e2e", runner: "cucumber-js", step: "Cucumber" },
    ]);
  });

  it("recognises nothing when the manifest names no runners", () => {
    expect(recognisedRunners([aliasCi], { scripts: { test: "vitest run" } }, {})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-011 — the CONFIGURATION the rule above is read against.
// ---------------------------------------------------------------------------
describe("[SCN-USG-011] resolveRunners — the target's specController.runners block", () => {
  it("reads the tier-to-runner entries the target wrote", () => {
    expect(
      resolveRunners({ specController: { runners: { unit: "vitest", e2e: "playwright" } } }).tiers
    ).toEqual({ unit: "vitest", e2e: "playwright" });
  });

  it("resolves empty for a manifest that names no runners", () => {
    // A target that has told the tool nothing is a `new-client`, not an error — the same
    // defensive stance every resolver in this family takes.
    expect(resolveRunners({}).tiers).toEqual({});
    expect(resolveRunners({ specController: {} }).tiers).toEqual({});
  });

  it("drops an entry that is not a runner's name", () => {
    // Config is data from outside. A value that is neither a runner's name nor the target's own
    // statement that the tier has none is not something a whole-token match can be run against,
    // and a resolver that threw would cost the run its whole verdict over one bad character in a
    // manifest nobody may even be reading. (A NULL is not dropped — it is the statement, and it
    // is @SCN-USG-016's, which is why it is no longer among this arm's inputs.)
    expect(
      resolveRunners({ specController: { runners: { unit: "vitest", e2e: 7 } } }).tiers
    ).toEqual({ unit: "vitest" });
  });

  it("resolves empty for a runners config that is not a block of named fields", () => {
    expect(resolveRunners({ specController: { runners: ["vitest"] } }).tiers).toEqual({});
    expect(resolveRunners({ specController: { runners: "vitest" } }).tiers).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-012 — RULE D'S TEETH: the runner's name occurring anywhere but the command position.
//
// THE MEASUREMENT THESE ARMS ARE WELDED TO. Over the same 113 run: steps in five real portfolio
// pipelines, a substring reading of the recognition recognises exactly TWO — and both are false
// exclusions, each matched on the filename vitest.json. The commands below are those two shapes
// and their neighbours, reached on ORDINARY check steps: the reconciler's own step is excluded as
// well, but by construction rather than by this rule, so sharing a fixture with it would let a
// green be silent about which exclusion did the work.
//
// EVERY ARM HERE MUST RED ON `command.includes(runner)`. That is not a prediction — the swap was
// made, the red was read, and it was reverted (3F-3354). A guard whose teeth were reasoned about
// rather than watched is not a guard, and the CONTROL arm at the end is what stops the rest of
// them passing because the reader is blind.
// ---------------------------------------------------------------------------
describe("[SCN-USG-012] recognisedRunners — a runner's name out of command position leaves the step a candidate", () => {
  const checkStep = (command: string): string =>
    ["jobs:", "  ci:", "    steps:", "      - name: Rule check", `        run: ${command}`].join("\n");

  const unit = { unit: "vitest" };
  const eslintScripts = { scripts: { "lint:rules": "eslint . --format json" } };

  it("leaves a check writing its report to a file named after the runner a candidate", () => {
    expect(
      recognisedRunners([checkStep("pnpm lint:rules --output-file reports/vitest.json")], eslintScripts, unit)
    ).toEqual([]);
  });

  it("leaves a check whose =-joined argument names the runner a candidate", () => {
    // The measured shape of this repository's own Test step, on an ordinary check:
    // --outputFile.json="$DIR/vitest.json" is one shell token and it is not the runner.
    expect(
      recognisedRunners(
        [checkStep('pnpm lint:rules --outputFile.json="$EVIDENCE_DIR/vitest.json"')],
        eslintScripts,
        unit
      )
    ).toEqual([]);
  });

  it("leaves a check whose flag is spelled like the runner a candidate", () => {
    // The measured shape of the reconciler's own --vitest argument, reached here on an ordinary
    // check: --vitest is a flag naming a FILE the runner wrote, never a command running it.
    expect(
      recognisedRunners(
        [checkStep('pnpm lint:rules --vitest "$EVIDENCE_DIR/vitest.json"')],
        eslintScripts,
        unit
      )
    ).toEqual([]);
  });

  it("leaves a step running a different binary whose name contains the runner's a candidate", () => {
    // Command position, and still not the runner. `vitest-bench` is somebody else's tool, and a
    // reader excluding it has deleted a check on the strength of a shared prefix.
    expect(recognisedRunners([checkStep("pnpm exec vitest-bench run")], { scripts: {} }, unit)).toEqual([]);
  });

  it("leaves a check whose manifest script writes a file named after the runner a candidate", () => {
    // THE HOP CARRIES THE SAME RULE, and this is the arm that says so. The step's own command
    // never writes the word; the script body it invokes does, in a path. A reader applying whole
    // tokens to the command and a substring to the resolved body is the same fault one layer in,
    // and it would be invisible to every arm above.
    expect(
      recognisedRunners(
        [checkStep("pnpm lint:rules")],
        { scripts: { "lint:rules": "eslint . --output-file reports/vitest.json" } },
        unit
      )
    ).toEqual([]);
  });

  it("recognises the runner beside every one of them — the control", () => {
    // THE ARMS ABOVE ARE ALL ABSENCES, and an absence is what a blind reader reports too. This is
    // the one arm that must be PRESENT: the same target, the same runner, the check step that
    // names it out of position, and the suite step that actually runs it. Exactly one recognition,
    // and it is the suite step's.
    const both = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Unit tests",
      "        run: pnpm test",
      "      - name: Rule check",
      '        run: pnpm lint:rules --outputFile.json="$EVIDENCE_DIR/vitest.json"',
    ].join("\n");
    expect(
      recognisedRunners(
        [both],
        { scripts: { test: "vitest run", "lint:rules": "eslint . --format json" } },
        unit
      )
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-016 — A TIER STATED TO HAVE NO RUNNER, AND A TIER THE BLOCK OMITS.
//
// THE DISTINCTION IS ONLY EVER VISIBLE HERE, at the reader's return value. Neither state
// recognises a step and neither excludes one, so no comparison anywhere downstream has a
// different outcome under a reader that folds the two together: every discovery arm in this file
// and every scenario in the feature beside it goes on passing. What the collapse destroys is a
// fact the target gave us — "we have no performance suite" — and the only places that loss can be
// read are this record and the sentence the report prints off it.
//
// THREE STATES, ASSERTED AS THREE. A value that is a runner's name, a value that is null, and a
// key that is not there. `toStrictEqual` is what makes the middle one load-bearing: a missing key
// and a null value are the same to `toEqual`'s undefined handling, which is the exact conflation
// under test.
// ---------------------------------------------------------------------------
describe("[SCN-USG-016] resolveRunners — a null runner, a named one, and a tier the block omits", () => {
  it("keeps a null runner as the target's own statement, and reads an omitted tier as no entry", () => {
    const resolved = resolveRunners({
      specController: { runners: { unit: "vitest", performance: null } },
    }).tiers;
    expect(resolved).toStrictEqual({ unit: "vitest", performance: null });
    // THE THREE STATES, TOLD APART ONE BY ONE, because the record above can be read as two facts
    // by a reader that only ever asks `resolved[tier]` — null and undefined are both falsy, and
    // that is the shape of the collapse this scenario exists to foreclose.
    expect(resolved.unit).toBe("vitest");
    expect(resolved.performance).toBeNull();
    expect(Object.hasOwn(resolved, "performance")).toBe(true);
    expect(Object.hasOwn(resolved, "e2e")).toBe(false);
  });

  it("keeps a tier the target says has no runner even when it names no other", () => {
    // A manifest whose whole runner block is a stated absence is not an empty one. The target
    // answered; a reader that resolves it to {} has thrown the answer away and reports the target
    // as never having been asked.
    const resolved = resolveRunners({ specController: { runners: { performance: null } } }).tiers;
    expect(resolved).toStrictEqual({ performance: null });
    expect(Object.keys(resolved)).toEqual(["performance"]);
  });

  it("still drops a value that is neither a runner's name nor a stated absence", () => {
    // The widening is to null ALONE. A number, an array or an object is not something a
    // whole-token match can be run against and not something the target said about having no
    // runner either, so the defensive drop the six sibling resolvers make is unchanged.
    expect(
      resolveRunners({ specController: { runners: { unit: "vitest", e2e: 7, integration: [] } } })
        .tiers
    ).toStrictEqual({ unit: "vitest" });
  });

  it("recognises no step for a tier the target says has no runner", () => {
    // The null reaches the recognition rule and must fall out of it: there is no name for a
    // whole-token match to be run against, so the tier is recognised at no step. A reader that
    // matched the null against the command — or threw on it — is what this arm forecloses.
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Unit tests",
      "        run: pnpm test",
    ].join("\n");
    expect(
      recognisedRunners([ci], { scripts: { test: "vitest run" } }, { unit: "vitest", performance: null })
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-019 — THE KEY SET'S CLOSURE, at the resolver that partitions it.
//
// THE FOUR TIERS ARE WRITTEN OUT ON THIS SIDE AND DERIVED ON THE OTHER. The reader takes them
// from the ledger's own enumeration, because a second copy in the product is the drift this axis
// exists to remove; these arms name them literally, because a test reading the same constant the
// reader reads could only ever agree with itself — it would go green over a ledger holding three
// tiers, or five. The literal is what makes the derivation checkable rather than circular.
//
// THE PARTITION IS ON THE KEY, NOT THE VALUE, and the two questions are kept apart deliberately.
// A canon tier whose value is neither a runner's name nor a stated absence is malformed config
// and is dropped, which is the stance of all seven resolvers in this family and is pinned by the
// arms above. A key that is not a tier at all is not malformed — it is something the consumer
// meant, about a tier that does not exist — and dropping it silently is what this scenario rules
// out, whatever its value happens to be.
// ---------------------------------------------------------------------------
describe("[SCN-USG-019] resolveRunners — the four canon tiers, and the keys that are not one of them", () => {
  const CANON_TIERS = ["unit", "integration", "e2e", "performance"] as const;

  it("keeps every one of the four canon tiers and treats none of them as unrecognised", () => {
    // The whole closed set in one manifest, so a reader whose enumeration is short by one is
    // caught here rather than by whichever tier a sibling scenario happened to use.
    const resolved = resolveRunners({
      specController: {
        runners: {
          unit: "vitest",
          integration: "cucumber-js",
          e2e: "cucumber-js",
          performance: null,
        },
      },
    });
    expect(resolved.tiers).toStrictEqual({
      unit: "vitest",
      integration: "cucumber-js",
      e2e: "cucumber-js",
      performance: null,
    });
    expect(Object.keys(resolved.tiers)).toEqual([...CANON_TIERS]);
    expect(resolved.unrecognisedKeys).toEqual([]);
  });

  it("partitions a key outside the four tiers out of the runners and names it", () => {
    // The smuggling the closure forbids: `"lint": "eslint"` is a consumer taking their own checks
    // out of discovery one key at a time. It must not reach the recognition, and it must not
    // vanish either — the consumer wrote it and believes it took effect.
    const resolved = resolveRunners({
      specController: { runners: { unit: "vitest", lint: "eslint" } },
    });
    expect(resolved.tiers).toStrictEqual({ unit: "vitest" });
    expect(resolved.unrecognisedKeys).toEqual(["lint"]);
  });

  it("names an unrecognised key whatever its value, because the consumer still wrote it", () => {
    // Value shape is the OTHER question. A key that is not a tier is not malformed config to be
    // dropped defensively — there is no tier for any value of it to be a runner for, so the value
    // is beside the point and the key is the fact worth reporting.
    const resolved = resolveRunners({
      specController: { runners: { lint: 7, "test:contract": null, deploy: ["sh"] } },
    });
    expect(resolved.tiers).toStrictEqual({});
    expect(resolved.unrecognisedKeys).toEqual(["lint", "test:contract", "deploy"]);
  });

  it("still drops a canon tier whose value is neither a runner's name nor a stated absence", () => {
    // Unchanged, and asserted beside the partition so the two cannot come to answer for each
    // other: `e2e` IS a tier, so its bad value is malformed config and is dropped — not smuggling,
    // and not something to name as an unrecognised key.
    const resolved = resolveRunners({
      specController: { runners: { unit: "vitest", e2e: 7 } },
    });
    expect(resolved.tiers).toStrictEqual({ unit: "vitest" });
    expect(resolved.unrecognisedKeys).toEqual([]);
  });

  it("resolves both halves empty for a manifest that names no runners", () => {
    expect(resolveRunners({})).toStrictEqual({ tiers: {}, unrecognisedKeys: [] });
    expect(resolveRunners({ specController: { runners: ["vitest"] } })).toStrictEqual({
      tiers: {},
      unrecognisedKeys: [],
    });
  });

  it("recognises no step for a key that is not a tier, however reachable its command is", () => {
    // THE EXCLUSION THAT MUST NOT HAPPEN, at the composition rather than at either half. The
    // pipeline runs `pnpm lint:rules`, the manifest's `lint:rules` script runs `eslint`, and the
    // bogus key names `eslint` — so a reader honouring the key recognises that step and deletes a
    // fitness check from the report with nothing said. Only the unit row may come back.
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Unit tests",
      "        run: pnpm test",
      "      - name: Rule check",
      "        run: pnpm lint:rules",
    ].join("\n");
    const scripts = { test: "vitest run", "lint:rules": "eslint . --format json" };
    const { tiers } = resolveRunners({
      specController: { runners: { unit: "vitest", lint: "eslint" } },
    });
    expect(recognisedRunners([ci], { scripts }, tiers)).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
  });
});
