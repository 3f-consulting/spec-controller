/**
 * The release gate list's planted arm — one release, read every way it can be wrong (@SCN-REL-004).
 *
 * ONE ARM PER CHECK MODULE (3F-3218 / 3F-3239). The pure half of this check is a READING: which of
 * a release's steps stand ahead of its pack, which of those ask about this repository rather than
 * about the artefact, which of them a run of this repository's own ladder can put to itself, and
 * where a release stopped. The single object below carries an instance of every one of those at
 * once, and by equality over the whole return rather than by containment on a field — a reading
 * that stopped applying a rule moves this object rather than going quiet.
 *
 * THE TWO PLANTED RELEASES ARE THE POINT, because the sound one reds on nothing. A release gating on
 * the self-reconciliation and one gating on the fitness pass are the two shapes this rule exists to
 * refuse, and each is built by adding one step to the sound release rather than by describing a
 * fault — the reading meets them in the form a workflow file actually produces.
 *
 * AND THE THIRD PLANT IS THE VACUITY FENCE. A release whose only pack-shaped step is the SMOKE —
 * which hands a pack directory to a check with `--pack-dir` — packs nothing, and a reading that took
 * that flag for a pack would report the smoke's own gates as the release's whole gate list and call
 * it green. It is refused instead.
 *
 * WHAT THIS ARM IS NOT. It never runs a gate, reads `.github/`, or touches an evidence root. Putting
 * the gate list to a run whose reconciliation refuses it is the @integration arm's, in
 * tests/steps/release.steps.ts. Bidirectional evidence (Evidence Manifesto §9): the describe and the
 * it both carry [SCN-REL-004], matching features/release.feature.
 */

import { describe, expect, it } from "vitest";

import {
  gateFaults,
  gateRunPlan,
  gatesAheadOfThePack,
  notAsked,
  refusedAt,
  type GateAnswer,
} from "./releaseGates.js";
import type { StatedRelease } from "./releaseWorkflow.js";

const PACK = 'pnpm --dir packages/core pack --pack-destination "$RUNNER_TEMP/release"';
const SMOKE =
  'pnpm exec tsx tests/checks/cleanRoomInstallCli.ts --pack-dir "$RUNNER_TEMP/release" packages/core';

/** A release shaped exactly as this repository's own is, with the two suites and the pack. */
const SOUND: StatedRelease = {
  permissions: { "id-token": "write" },
  steps: [
    { name: "actions/checkout@v7", run: "" },
    { name: "Enable corepack", run: "corepack enable" },
    { name: "Install dependencies", run: "pnpm install --frozen-lockfile" },
    { name: "Build", run: "pnpm build" },
    { name: "Typecheck", run: "pnpm typecheck" },
    { name: "Test", run: "pnpm test" },
    { name: "Cucumber", run: "pnpm cucumber" },
    { name: "Pack both packages, once", run: PACK },
    { name: "Smoke the packed artefacts in a clean room", run: SMOKE },
    { name: "Stage core", run: 'npm stage publish "$RUNNER_TEMP/release"/core.tgz' },
  ],
  body: "{}",
};

/** The same release with one more gate ahead of the pack — the shape each plant takes. */
function gating(step: string, run: string): StatedRelease {
  const at = SOUND.steps.findIndex((existing) => existing.name === "Pack both packages, once");
  return {
    ...SOUND,
    steps: [...SOUND.steps.slice(0, at), { name: step, run }, ...SOUND.steps.slice(at)],
  };
}

/** What a release with no pack in it says, as one string a reader can compare. */
function refusalOf(stated: StatedRelease): string {
  try {
    gatesAheadOfThePack(stated);
    return "no refusal";
  } catch (raised) {
    return raised instanceof Error ? raised.message : String(raised);
  }
}

const GATES = gatesAheadOfThePack(SOUND);

/** A release that packs nothing, and whose only pack-shaped step is the smoke's `--pack-dir`. */
const PACKS_NOTHING: StatedRelease = {
  ...SOUND,
  steps: SOUND.steps.filter((step) => step.run !== PACK),
};

/** One run's answers, as the @integration arm assembles them — a refusal, and none. */
const ANSWERED: GateAnswer[] = [
  { step: "Build", answer: "passed" },
  { step: "Self-reconcile", answer: "refused" },
  { step: "Typecheck", answer: "passed" },
];

describe("[SCN-REL-004] a release can be cut while the self-reconciliation is red", () => {
  it("[SCN-REL-004] reads a release's gates as an ordered list, refuses the two that ask about this repository, and says which of them a run can put to itself", () => {
    expect({
      gates: GATES,
      sound: gateFaults(GATES),
      reconciliation: gateFaults(
        gatesAheadOfThePack(gating("Reconcile this repository", "pnpm balance:self")),
      ),
      fitness: gateFaults(
        gatesAheadOfThePack(gating("Cucumber (fitness)", "pnpm cucumber:fitness")),
      ),
      plan: gateRunPlan(GATES),
      refusals: [refusalOf(PACKS_NOTHING), refusalOf(SOUND)],
      stoppedAt: [refusedAt(ANSWERED), refusedAt(ANSWERED.filter((a) => a.answer !== "refused"))],
      notAsked: notAsked("the Vitest pass is this ladder's sibling over the same tree"),
    }).toEqual({
      // The `uses:` step carries no command and is not a gate; everything from the pack onwards is
      // about the artefact the gates produced rather than about whether to produce it.
      gates: [
        { step: "Enable corepack", command: "corepack enable" },
        { step: "Install dependencies", command: "pnpm install --frozen-lockfile" },
        { step: "Build", command: "pnpm build" },
        { step: "Typecheck", command: "pnpm typecheck" },
        { step: "Test", command: "pnpm test" },
        { step: "Cucumber", command: "pnpm cucumber" },
      ],
      sound: [],
      reconciliation: [
        {
          kind: "gate-about-this-repository",
          message:
            '"Reconcile this repository" gates this release on balance:self, and the ' +
            "self-reconciliation is a statement about this repository's own bookkeeping, and under " +
            "a model skew it is red for the very reason the release is being cut — so a release " +
            "consulting it cannot publish the cure for the disease. A release path consults nothing " +
            "that is about this repository rather than about the artefact.",
        },
      ],
      fitness: [
        {
          kind: "gate-about-this-repository",
          message:
            '"Cucumber (fitness)" gates this release on cucumber:fitness, and the fitness axis ' +
            "measures this repository — its complexity bars, its corpus traceability, its own " +
            "mutation score, the duration of its observer — and one of its rows prints a number a " +
            "scheduled sweep left behind, so a release gating on it is a release a lapsed cron can " +
            "block. A release path consults nothing that is about this repository rather than about " +
            "the artefact.",
        },
      ],
      plan: [
        {
          step: "Enable corepack",
          notAsked: "this reading is already running under the package manager it enables",
        },
        {
          step: "Install dependencies",
          notAsked:
            "this reading is executing out of the tree it produced, and running it again would " +
            "rewrite that tree mid-read",
        },
        { step: "Build", shell: "pnpm build" },
        { step: "Typecheck", shell: "pnpm typecheck" },
        { step: "Test", notAsked: "the Vitest pass is this ladder's sibling over the same tree" },
        {
          step: "Cucumber",
          notAsked:
            "this reading IS the behavioural pass, and invoking it from inside itself does not terminate",
        },
      ],
      refusals: [
        "this release packs nothing, so it has no artefact and no gates standing ahead of one",
        "no refusal",
      ],
      stoppedAt: ["Self-reconcile", undefined],
      notAsked: "not asked — the Vitest pass is this ladder's sibling over the same tree",
    });
  });
});
