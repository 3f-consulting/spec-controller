/**
 * Unit test for the local-ladder derivation (@SCN-LAD-001, 3F-2448).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * @SCN-LAD-001 id matching features/local-ladder.feature, so a grep of the id returns both
 * halves of the pair.
 *
 * The derivation is a pure function from two sources — a CI config and a package manifest —
 * to an ordered gate list, so this arm injects both rather than reading files. What it pins
 * is the property the whole slice rests on: the ladder IS ci.yml's script steps, in ci.yml's
 * order. Asserted by equality, never by containment — a derivation that returned nothing
 * would satisfy "no unexpected gates" and satisfy it forever.
 *
 * Parent: @SCN-LAD-001 (3F-2448) — the derived local ladder.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CI_ONLY_EXCLUSIONS, deriveLocalLadder } from "./localLadder.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** A CI config whose steps invoke `scripts`, in the order given. */
const ciConfigRunning = (...commands: string[]): string =>
  ["jobs:", "  ci:", "    steps:", ...commands.map((command) => `      - run: ${command}`)].join(
    "\n",
  );

const manifest = {
  scripts: {
    test: "vitest run",
    typecheck: "tsc --noEmit",
    "lint:alpha": "tsx alpha.ts",
    "lint:beta": "tsx beta.ts",
    "lint:never-run": "tsx neverRun.ts",
  },
};

describe("[SCN-LAD-001] the ladder is every CI script step, in ci.yml's order", () => {
  it("[SCN-LAD-001] gates each CI script step, in the CI config's order", () => {
    const ladder = deriveLocalLadder(
      ciConfigRunning("pnpm lint:beta", "pnpm typecheck", "pnpm lint:alpha"),
      manifest,
      [],
    );

    // Equality, in order — the whole claim. A ladder holding the right SET in the wrong
    // ORDER is the failure the header's self-balance note describes: the reconciler reads
    // reports the suites have not written yet and reports every obligation unobserved.
    expect(ladder.gates.map((gate) => gate.script)).toEqual([
      "lint:beta",
      "typecheck",
      "lint:alpha",
    ]);
  });

  it("[SCN-LAD-001] a package.json script CI never runs is not a gate", () => {
    // The other half of "derived from ci.yml": the manifest is not the source. `mutation`,
    // `build` and the rest exist in this repository and are deliberately not local gates.
    const ladder = deriveLocalLadder(ciConfigRunning("pnpm lint:alpha"), manifest, []);

    expect(ladder.gates.map((gate) => gate.script)).toEqual(["lint:alpha"]);
  });

  it("[SCN-LAD-001] a CI config that does not parse yields no gates rather than wrong ones", () => {
    // The safe direction, inherited from ciRunCommands: an unreadable config reports
    // nothing enforced. Here that surfaces as an empty ladder, which reds `pnpm verify`
    // visibly, rather than a partial ladder that runs and looks green.
    expect(deriveLocalLadder("jobs: [unclosed", manifest, []).gates).toEqual([]);
  });
});

describe("[SCN-LAD-002] a gate runs CI's command verbatim, flags and report paths included", () => {
  it("[SCN-LAD-002] the gate carries the CI step's command, not `pnpm <script>`", () => {
    // THE PROPERTY A NAME-RECONCILER COULD NOT HAVE. `balance:self` reads exactly the
    // paths `test` and `cucumber` write; a check that reconciled gate NAMES would green
    // while `--outputFile.json=` drifted to a path nothing wrote, and the gate would then
    // report every evidence obligation unobserved — "the suite did not run". Carrying the
    // command makes that drift unrepresentable rather than detectable.
    const command = "pnpm test --reporter=json --outputFile.json=runs/self-balance/vitest.json";

    expect(deriveLocalLadder(ciConfigRunning(command), manifest, []).gates).toEqual([
      { script: "test", command },
    ]);
  });

  it("[SCN-LAD-002] a command spanning lines is named unsupported, never silently dropped", () => {
    // A block scalar has no single-line form for the shell that consumes the ladder. Taking
    // the first line would run half a gate and call it green; dropping the step would narrow
    // the ladder in silence, which is the whole failure this slice closes. So it is named,
    // and `pnpm verify` reds until someone splits the step or excludes it with a reason.
    const ladder = deriveLocalLadder(
      ["jobs:", "  ci:", "    steps:", "      - run: |", "          pnpm lint:alpha", "          echo done"].join(
        "\n",
      ),
      manifest,
      [],
    );

    expect(ladder.gates).toEqual([]);
    expect(ladder.unsupported.map((step) => step.script)).toEqual(["lint:alpha"]);
  });

  it("[SCN-LAD-002] a step invoking two scripts is named unsupported, not reduced to one", () => {
    // `find` would pick whichever script package.json happens to list first and drop the
    // other without a word — a gate lost to key order. Named instead.
    const ladder = deriveLocalLadder(
      ciConfigRunning("pnpm lint:alpha && pnpm lint:beta"),
      manifest,
      [],
    );

    expect(ladder.gates).toEqual([]);
    expect(ladder.unsupported).toHaveLength(1);
  });
});

describe("[SCN-LAD-003] a CI step invoking no package.json script is not a gate", () => {
  it("[SCN-LAD-003] dependency install and corepack are dropped, the gates around them kept", () => {
    // `install` is pnpm's own verb and `corepack` is not pnpm at all, so neither resolves to
    // a script and neither becomes a gate. That falls out of the derivation rather than out
    // of a rule — which is why it is asserted here. A property nothing asserts is one the
    // next refactor can lose in silence, and losing this one would put dependency
    // installation on the ladder as if it were a quality gate.
    const ladder = deriveLocalLadder(
      ciConfigRunning(
        "corepack enable",
        "pnpm install --frozen-lockfile",
        "pnpm typecheck",
        "pnpm lint:alpha",
      ),
      manifest,
      [],
    );

    // By equality, with real gates on either side of the setup steps: a derivation that
    // dropped everything would satisfy "the setup steps are absent" and satisfy it forever.
    expect(ladder.gates.map((gate) => gate.script)).toEqual(["typecheck", "lint:alpha"]);

    // NOT AN EXCLUSION EITHER — the second half of the scenario's claim. An exclusion is for
    // a step CI runs that this ladder deliberately skips; setup steps are not skipped, they
    // are not gates. A derivation that excused them here would teach the next reader that the
    // exclusion list is where environment setup goes, and the list would start growing.
    expect(ladder.omitted).toEqual([]);
    expect(ladder.unsupported).toEqual([]);
  });
});

describe("[SCN-LAD-004] an excluded CI-only step is not a gate, and its reason is printed", () => {
  const excluded = [
    { script: "lint:beta", reason: "reads a pull request's diff and has no answer outside one" },
  ];

  it("[SCN-LAD-004] the excluded step is not a gate, and the gates around it are kept", () => {
    const ladder = deriveLocalLadder(
      ciConfigRunning("pnpm lint:alpha", "pnpm lint:beta", "pnpm typecheck"),
      manifest,
      excluded,
    );

    expect(ladder.gates.map((gate) => gate.script)).toEqual(["lint:alpha", "typecheck"]);
  });

  it("[SCN-LAD-004] the ladder reports the omission with its reason, never silently", () => {
    // The point of the whole entry. `scripts/verify.sh` already held that "an unexplained
    // gap in a green-check is the exact failure mode this file exists to close" — as a
    // comment somebody had to keep true. Here the reason is a value the tool carries, so a
    // skipped gate cannot become a quiet one.
    const ladder = deriveLocalLadder(ciConfigRunning("pnpm lint:beta"), manifest, excluded);

    expect(ladder.omitted).toEqual(excluded);
  });

  it("[SCN-LAD-004] this repository excludes exactly one step, and it says why", () => {
    // The list is the one hand-maintained artefact the derivation leaves. Pinning its size
    // is what makes growing it a deliberate act with a diff, rather than a habit.
    expect(CI_ONLY_EXCLUSIONS.map((exclusion) => exclusion.script)).toEqual([
      "lint:scn-subissues",
    ]);
    for (const exclusion of CI_ONLY_EXCLUSIONS) {
      expect(exclusion.reason.length, `${exclusion.script} must say why`).toBeGreaterThan(20);
    }
  });
});

describe("[SCN-LAD-005] an exclusion naming a script CI does not run reds as stale", () => {
  it("[SCN-LAD-005] an entry no CI step invokes is reported stale", () => {
    // An exclusion covering nothing excuses nothing by construction, so it reds nothing and
    // costs nothing to leave behind — which is how it survives to license the next script
    // that happens to take the name. The ratchet shape `lint:exempt-data-floor` and
    // `lint:complexity-exceptions` already use here, for the same defect class.
    const ladder = deriveLocalLadder(ciConfigRunning("pnpm typecheck"), manifest, [
      { script: "lint:never-run", reason: "excused something CI stopped running" },
    ]);

    expect(ladder.stale.map((entry) => entry.script)).toEqual(["lint:never-run"]);
    // The gates are unaffected: a stale entry is a fault in the list, not in the ladder.
    expect(ladder.gates.map((gate) => gate.script)).toEqual(["typecheck"]);
  });

  it("[SCN-LAD-005] an entry CI does run is not stale", () => {
    // The load-bearing negative. Without it, "everything is stale" would satisfy the
    // assertion above and red every ladder this repository ever builds.
    const ladder = deriveLocalLadder(ciConfigRunning("pnpm lint:beta"), manifest, [
      { script: "lint:beta", reason: "reads a pull request's diff" },
    ]);

    expect(ladder.stale).toEqual([]);
  });

  it("[SCN-LAD-005] this repository's own exclusions are not stale against its own CI", () => {
    // The entry is only honest while ci.yml still runs the step it excuses. Pinned against
    // the real workflow so removing that CI step reds here rather than quietly widening
    // what `pnpm verify` claims to have covered.
    const ladder = deriveLocalLadder(
      readFileSync(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8"),
      JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")),
      CI_ONLY_EXCLUSIONS,
    );

    expect(ladder.stale).toEqual([]);
  });
});

describe("[SCN-LAD-007] an excluded step CI runs behind a gate reds, naming the gates ahead of it", () => {
  const excluded = [
    { script: "lint:beta", reason: "reads a pull request's diff and has no answer outside one" },
  ];

  it("[SCN-LAD-007] an excluded step behind two gates is late, naming both in CI's order", () => {
    // The gates ahead are NAMED, not counted. The names are what tells a reader which step to
    // move past what, and they are the same list that says how many unrelated reds can
    // currently take this step off the board without reporting it unrun.
    const ladder = deriveLocalLadder(
      ciConfigRunning("pnpm lint:alpha", "pnpm typecheck", "pnpm lint:beta"),
      manifest,
      excluded,
    );

    expect(ladder.late).toEqual([{ ...excluded[0], gatesAhead: ["lint:alpha", "typecheck"] }]);
  });

  it("[SCN-LAD-007] the same step run ahead of every gate is not late", () => {
    // The load-bearing negative. Without it "everything is late" satisfies the assertion above
    // forever, and no arrangement of any ci.yml could be green.
    const ladder = deriveLocalLadder(
      ciConfigRunning("pnpm lint:beta", "pnpm lint:alpha", "pnpm typecheck"),
      manifest,
      excluded,
    );

    expect(ladder.late).toEqual([]);
    // Still omitted, and the gates behind it still gated. Lateness is a fact ABOUT an
    // omission, never a replacement for one: a derivation that reported the step late instead
    // of omitted would red the ladder and lose the printed reason in the same move.
    expect(ladder.omitted).toEqual(excluded);
    expect(ladder.gates.map((gate) => gate.script)).toEqual(["lint:alpha", "typecheck"]);
  });

  it("[SCN-LAD-007] this repository's own ci.yml runs its excluded step ahead of every gate", () => {
    // THE REAL-TREE PIN, the analogue of [SCN-LAD-005]'s. A rule held only over planted
    // configs is a rule a reordering of THIS workflow undoes in silence — which is exactly the
    // defect 3F-3014 was filed for: lint:scn-subissues sat last behind all fifteen gates, and
    // a stale mutation record redding balance:self cost it three consecutive runs while
    // nothing reported it unrun.
    const ladder = deriveLocalLadder(
      readFileSync(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8"),
      JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")),
      CI_ONLY_EXCLUSIONS,
    );

    expect(ladder.late).toEqual([]);
  });
});

describe("[SCN-LAD-008] a CI step whose red the job would swallow reds the ladder, naming it", () => {
  /**
   * A CI config whose job carries `jobKeys` and whose steps are `run:` commands each
   * followed by the extra keys its tuple names.
   *
   * Injected as SOURCE, not as a parsed object: `continue-on-error` is a key of the same
   * step mapping the walk already visits, and writing the YAML out is what pins that the
   * widened walk reads the document rather than a shape a test built for it.
   */
  const ciConfigOf = (
    jobKeys: readonly string[],
    steps: readonly (readonly string[])[],
  ): string =>
    [
      "jobs:",
      "  ci:",
      ...jobKeys.map((key) => `    ${key}`),
      "    steps:",
      ...steps.flatMap(([command, ...stepKeys]) => [
        `      - run: ${command}`,
        ...stepKeys.map((key) => `        ${key}`),
      ]),
    ].join("\n");

  const SWALLOWED = "continue-on-error: true";

  it("[SCN-LAD-008] a step carrying continue-on-error is unenforced, and is not a gate", () => {
    const ladder = deriveLocalLadder(
      ciConfigOf([], [["pnpm typecheck"], ["pnpm lint:alpha", SWALLOWED]]),
      manifest,
      [],
    );

    // The step is NAMED, and it names the key that severs it — a reader has to know which key
    // to delete, and the two cases are deleted in different places.
    expect(ladder.unenforced).toEqual([
      { script: "lint:alpha", command: "pnpm lint:alpha", why: "it carries continue-on-error: true" },
    ]);
    // And it is not a gate. Running it locally would answer a question CI does not ask.
    expect(ladder.gates.map((gate) => gate.script)).toEqual(["typecheck"]);
  });

  it("[SCN-LAD-008] a job-level continue-on-error unenforces every run: step under it", () => {
    const ladder = deriveLocalLadder(
      ciConfigOf([SWALLOWED], [["pnpm typecheck"], ["pnpm lint:alpha"]]),
      manifest,
      [],
    );

    expect(ladder.unenforced.map((step) => step.script)).toEqual(["typecheck", "lint:alpha"]);
    expect(ladder.unenforced.map((step) => step.why)).toEqual([
      "its job carries continue-on-error: true",
      "its job carries continue-on-error: true",
    ]);
    expect(ladder.gates).toEqual([]);
  });

  it("[SCN-LAD-008] the same config without the attribute is an ordinary ladder", () => {
    // The load-bearing negative. Without it "everything is unenforced" satisfies both
    // assertions above and reds every ladder this repository ever builds.
    const ladder = deriveLocalLadder(
      ciConfigOf([], [["pnpm typecheck"], ["pnpm lint:alpha"]]),
      manifest,
      [],
    );

    expect(ladder.unenforced).toEqual([]);
    expect(ladder.gates.map((gate) => gate.script)).toEqual(["typecheck", "lint:alpha"]);
  });

  it("[SCN-LAD-008] continue-on-error: false, and the string false, still vouch for a step", () => {
    // The attribute PRESENT and declining to sever is the ordinary way to write it out, and
    // a reading that keyed on the key's presence would red a workflow that says the safe
    // thing out loud. The quoted form is the same value: YAML admits both.
    const ladder = deriveLocalLadder(
      ciConfigOf(
        [],
        [
          ["pnpm typecheck", "continue-on-error: false"],
          ["pnpm lint:alpha", 'continue-on-error: "false"'],
        ],
      ),
      manifest,
      [],
    );

    expect(ladder.unenforced).toEqual([]);
    expect(ladder.gates.map((gate) => gate.script)).toEqual(["typecheck", "lint:alpha"]);
  });

  it("[SCN-LAD-008] an expression the derivation cannot resolve does not vouch for a step", () => {
    // THE SAFE DIRECTION, the one this parse already takes on a document it cannot read at
    // all. An expression's value is decided by the run, not by the document, so a derivation
    // that read it optimistically would vouch for a step on a guess — and the guess is wrong
    // on exactly the runs the attribute was written for.
    const ladder = deriveLocalLadder(
      ciConfigOf([], [["pnpm lint:alpha", "continue-on-error: ${{ github.event_name == 'push' }}"]]),
      manifest,
      [],
    );

    expect(ladder.unenforced.map((step) => step.script)).toEqual(["lint:alpha"]);
    expect(ladder.gates).toEqual([]);
  });

  it("[SCN-LAD-008] a swallowed red is caught on the EXCLUDED step, ahead of the exclusion lookup", () => {
    // THE ORDERING IS LOAD-BEARING, and this is the assertion that holds it. An excluded step
    // is the one gate with a single chance to run (@SCN-LAD-007), so swallowing ITS red is the
    // worst instance of this fault — and an exclusion lookup running first would `continue`
    // past it, report the omission with its reason, and say nothing at all.
    const excluded = [{ script: "lint:beta", reason: "reads a pull request's diff" }];
    const ladder = deriveLocalLadder(
      ciConfigOf([], [["pnpm lint:beta", SWALLOWED], ["pnpm typecheck"]]),
      manifest,
      excluded,
    );

    expect(ladder.unenforced.map((step) => step.script)).toEqual(["lint:beta"]);
    expect(ladder.omitted).toEqual([]);
    // AND THE ENTRY IS NOT STALE, which is the half a swallowed step nearly cost. Staleness
    // used to be read off `omitted`, and a swallowed step never reaches it — so the exclusion
    // for a step CI DOES run would have been reported as excusing a step CI no longer runs.
    // The emitter reds on the swallow first, so nobody would have seen the false row; a
    // derivation that carries an untrue row and relies on nothing asking is the arrangement
    // 3F-3041 already cost this repository four weeks.
    expect(ladder.stale).toEqual([]);
  });
});
