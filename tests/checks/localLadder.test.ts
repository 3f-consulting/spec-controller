/**
 * The local-ladder derivation's planted-violation arm — one corpus, one verdict (@SCN-LAD-008).
 *
 * ONE ARM PER CHECK MODULE (3F-3218 / 3F-3239). Twenty-two arms across seven citations became
 * this one. A retained arm is not priced in its own lines: it is priced in the tickets,
 * discussions and eventual deletion it generates, and the twenty-one that left were each a
 * separate reading of the same derivation over a corpus built to isolate it. The corpus below
 * carries an instance of EVERY violation kind the derivation reports, at once, and one `expect`
 * takes the whole verdict — so a rule that stops being enforced moves this object rather than
 * going quiet in a file nobody re-reads.
 *
 * BY EQUALITY OVER THE WHOLE RETURN, never by containment on a field. A derivation that
 * returned nothing satisfies "no unexpected gates" and satisfies it forever; the shape below
 * pins every list the ladder can populate, including the ones a clean corpus leaves empty.
 *
 * WHY THE CITATION IS @SCN-LAD-008 AND NOT ONE OF THE OTHER SIX. Chosen by neutering the module
 * rule by rule and recording who reds, not by preference (3F-3239's table, in the commit). Two
 * criteria, and this scenario wins both: its arms reached FIVE of the derivation's rules where no
 * other scenario reached more than four, and it was the sole observer of two — the `why` string
 * that says WHICH key severs a step, and staleness being measured against what CI invokes rather
 * than against what the ladder omitted. Every rule @SCN-LAD-001, -004, -005 and -007 observed had
 * a second observer in `tests/steps/localLadder.steps.ts`, so those four keep their `@integration`
 * evidence and lose only the `@unit` tag this file used to satisfy.
 *
 * @SCN-LAD-002 AND @SCN-LAD-003 RETIRED WITH THEIR ARMS. Both were `@unit`-only and every
 * observation either had was in this file, so the collapse takes them off the corpus rather than
 * leaving two obligations standing with nothing to reconcile them. The rules they described are
 * still enforced and still observed — here, in the same verdict — by the verbatim command on
 * the `test` gate, the two `unsupported` rows, and the two setup steps that never become gates.
 *
 * THE REAL TREE IS NOT THIS ARM'S SUBJECT, and the three arms that read this repository's own
 * `ci.yml` are gone because a stronger observer already covers it, measured rather than assumed
 * (3F-3239, Ruling B). `pnpm ladder` derives from the real workflow and the real manifest as the
 * FIRST thing `scripts/verify.sh` does, exits 1 and emits zero gates on a stale exclusion or a
 * late one — proven by planting each fault into the real `package.json` and watching it red —
 * and `@SCN-LAD-006` re-derives the same ladder through `verify.sh --list`, where a hard-coded
 * floor of five gates is what catches a derivation that has stopped finding them.
 *
 * WHAT NEITHER OF THOSE COVERS, AND WHY THIS ARM IS THE ONE THAT DOES. A derivation returning an
 * EMPTY ladder leaves `pnpm ladder` at exit 0, so `verify.sh` runs zero gates and prints
 * "all 0 local gates green" — and @SCN-LAD-006, which would have caught it, is itself one of the
 * gates that did not run. Both real-tree observers sit inside the ladder they observe. The
 * equality below is outside it.
 */

import { describe, it, expect } from "vitest";
import { ciOnlyExclusionsOf, deriveLocalLadder } from "./localLadder.js";

/**
 * The manifest the planted workflow is read against.
 *
 * `build` is here and in no CI step: the manifest is not the source, and a script CI never runs
 * must not become a local gate by living in the same object.
 */
const manifest = {
  scripts: {
    build: "tsc -b",
    test: "vitest run",
    typecheck: "tsc --noEmit",
    "lint:alpha": "tsx alpha.ts",
    "lint:quoted": "tsx quoted.ts",
    "lint:beta": "tsx beta.ts",
    "lint:gamma": "tsx gamma.ts",
    "lint:multi": "tsx multi.ts",
    "lint:two-a": "tsx twoA.ts",
    "lint:two-b": "tsx twoB.ts",
    "lint:expr": "tsx expr.ts",
    "lint:job-swallowed": "tsx jobSwallowed.ts",
    "lint:never-run": "tsx neverRun.ts",
  },
};

const BETA_REASON = "reads a pull request's diff and has no answer outside one";
const GAMMA_REASON = "needs a token CI supplies";
const NEVER_RUN_REASON = "excused something CI stopped running";

/**
 * The manifest's exclusion key, carrying a malformed entry beside three real ones.
 *
 * A target cannot narrow its own green-check by writing the key wrongly: `{ script: 3 }` yields
 * nothing rather than a half-exclusion.
 */
const plantedManifest = {
  ...manifest,
  specController: {
    ciOnlyExclusions: [
      { script: "lint:beta", reason: BETA_REASON },
      { script: "lint:gamma", reason: GAMMA_REASON },
      { script: "lint:never-run", reason: NEVER_RUN_REASON },
      { script: 3 },
    ],
  },
};

/**
 * One workflow breaching every rule the derivation reports on.
 *
 * Written as SOURCE rather than as a parsed object, because `continue-on-error` is a key of the
 * same step mapping the walk already visits: writing the YAML out is what pins that the walk
 * reads the document rather than a shape a test built for it. Two jobs, because a job-level
 * `continue-on-error` and a step-level one produce different `why` strings and a reader has to
 * know which key to delete.
 */
const PLANTED_CI = [
  "jobs:",
  "  ci:",
  "    steps:",
  "      - run: corepack enable",
  "      - run: pnpm install --frozen-lockfile",
  "      - run: pnpm test --reporter=json --outputFile.json=runs/self-balance/vitest.json",
  "      - run: pnpm typecheck",
  "      - run: pnpm lint:beta",
  "      - run: pnpm lint:gamma",
  "        continue-on-error: true",
  "      - run: |",
  "          pnpm lint:multi",
  "          echo done",
  "      - run: pnpm lint:two-a && pnpm lint:two-b",
  "      - run: pnpm lint:expr",
  "        continue-on-error: ${{ github.event_name == 'push' }}",
  "      - run: pnpm lint:alpha",
  "        continue-on-error: false",
  '      - run: pnpm lint:quoted',
  '        continue-on-error: "false"',
  "  swallowed:",
  "    continue-on-error: true",
  "    steps:",
  "      - run: pnpm lint:job-swallowed",
].join("\n");

describe("[SCN-LAD-008] a CI step whose red the job would swallow reds the ladder, naming it", () => {
  it("[SCN-LAD-008] one workflow breaching every rule at once derives one verdict naming each breach", () => {
    const exclusions = ciOnlyExclusionsOf(plantedManifest);

    expect({
      exclusions,
      ladder: deriveLocalLadder(PLANTED_CI, manifest, exclusions),
      // The safe direction, inherited from the shared CI walk and asserted nowhere else in the
      // tree: an unreadable document reports an EMPTY ladder, which reds `pnpm verify` visibly,
      // rather than a partial one that runs and looks green.
      fromUnreadableConfig: deriveLocalLadder("jobs: [unclosed", manifest, exclusions).gates,
    }).toEqual({
      // The malformed fourth entry is dropped; the three well-formed ones are read back whole.
      exclusions: [
        { script: "lint:beta", reason: BETA_REASON },
        { script: "lint:gamma", reason: GAMMA_REASON },
        { script: "lint:never-run", reason: NEVER_RUN_REASON },
      ],
      ladder: {
        // In the workflow's order, carrying the workflow's command character for character —
        // `--outputFile.json=` included, because `balance:self` reads exactly the path `test`
        // writes and a ladder reconciling gate NAMES would green while that flag drifted.
        // `corepack enable` and `pnpm install` invoke no script and are neither gates nor
        // exclusions; `build` is a script no step invokes and is not a gate either;
        // `continue-on-error: false` and its quoted form still vouch for a step.
        gates: [
          {
            script: "test",
            command:
              "pnpm test --reporter=json --outputFile.json=runs/self-balance/vitest.json",
          },
          { script: "typecheck", command: "pnpm typecheck" },
          { script: "lint:alpha", command: "pnpm lint:alpha" },
          { script: "lint:quoted", command: "pnpm lint:quoted" },
        ],
        // The excluded step CI runs, printed with the reason it is left out — never silently.
        // `lint:gamma` is excluded too and is NOT here: its red is swallowed, which is reported
        // ahead of the exclusion lookup so the worst instance of the swallow cannot be dressed
        // up as a routine omission.
        omitted: [{ script: "lint:beta", reason: BETA_REASON }],
        // Staleness is measured against what CI INVOKES, not against what the ladder omitted:
        // `lint:gamma` never reaches `omitted` and is still not stale, because CI does run it.
        stale: [{ script: "lint:never-run", reason: NEVER_RUN_REASON }],
        // The gates ahead are NAMED, not counted — they are what tells a reader which step to
        // move past what, and an excluded step has one chance to run where every gate has two.
        late: [
          { script: "lint:beta", reason: BETA_REASON, gatesAhead: ["test", "typecheck"] },
        ],
        // Named, never resolved: taking the first line runs half a gate and calls it green, and
        // picking one of two scripts loses the other to package.json key order. The block
        // scalar's trailing newline is trimmed, so the command is the one a shell could run.
        unsupported: [
          {
            script: "lint:multi",
            command: "pnpm lint:multi\necho done",
            why: "the command spans lines; a gate runs one command, and running only its first line would run half a gate and call it green",
          },
          {
            script: "lint:two-a",
            command: "pnpm lint:two-a && pnpm lint:two-b",
            why: "the step invokes 2 scripts (lint:two-a, lint:two-b); naming it by one would lose the others to package.json key order",
          },
        ],
        // Three severing arrangements, each naming the key that severs it: the step's own, an
        // expression the derivation cannot resolve and so must not vouch for, and the job's.
        unenforced: [
          {
            script: "lint:gamma",
            command: "pnpm lint:gamma",
            why: "it carries continue-on-error: true",
          },
          {
            script: "lint:expr",
            command: "pnpm lint:expr",
            why: "it carries continue-on-error: ${{ github.event_name == 'push' }}",
          },
          {
            script: "lint:job-swallowed",
            command: "pnpm lint:job-swallowed",
            why: "its job carries continue-on-error: true",
          },
        ],
      },
      fromUnreadableConfig: [],
    });
  });
});
