/**
 * WHAT A RELEASE IS ALLOWED TO ASK BEFORE IT PACKS (@SCN-REL-004; features/release.feature).
 *
 * ONE RULE, TWO EXCLUSIONS. A release gates on what says THIS ARTEFACT IS SOUND — it builds, it
 * typechecks, it runs both suites, it installs the packed tarballs where no checkout can help them.
 * It asks nothing that is about THIS REPOSITORY rather than about the artefact, and the two things
 * in that category are named below with the reason each one is in it. The self-reconciliation is
 * there because under a model skew it is red for the very reason the release is being cut, so a
 * release consulting it would refuse to publish the cure for the disease (3F-3105). The fitness
 * axis is there because it is the same category row for row — and because one of its rows prints a
 * number a SCHEDULED sweep left behind, which a release runner starting cold has never seen, so the
 * pass reds and the job dies before it packs anything (measured, 3F-3249).
 *
 * THE GATES ARE READ AS AN ORDERED LIST, NOT SEARCHED FOR TWO NAMES. A ledger cannot see an
 * unraised debit: a reading that only looked for `balance:self` and `verify` would be
 * blind to the THIRD repository-scoped gate somebody adds next year, and equally blind to a release
 * that had quietly stopped gating on anything at all. So the caller compares the whole list, in
 * order, and a gate added, removed or renamed reds until somebody says which side of the line it is
 * on.
 *
 * NOTHING HERE READS A DISK OR RUNS A COMMAND. It is handed a release as a document already parsed
 * and answers what that document gates on; putting the gates to an actual run is the caller's, and
 * `gateRunPlan` is where this module says which of them a caller standing INSIDE this repository's
 * own ladder can put and which it cannot.
 *
 * THE `uses:` STEPS ARE INVISIBLE TO THIS READING, WHICH IS A RESIDUAL RATHER THAN A DECISION. A
 * gate expressed as a marketplace action carries no `run:` and so is not a gate here; the parse
 * this module is handed reports such a step with an empty command and it is dropped. Nothing in
 * this repository gates that way, and a reading that guessed at an action's subject from its name
 * would be guessing.
 *
 * Parent: 3F-3250, under 3F-2811 — the deadlock hatch: a release can be cut while the
 * self-reconciliation is red.
 */

import { commandInvokesScript } from "@3f-consulting/spec-controller-core";

import type { StatedRelease } from "./releaseWorkflow.js";

/** One gate of a release: the step that states it, and the command that step runs. */
export interface ReleaseGate {
  readonly step: string;
  readonly command: string;
}

/** A command whose subject is this repository's own bookkeeping rather than the artefact. */
export interface RepositoryScopedCommand {
  readonly script: string;
  /** Why a release gating on it would be asking the wrong question — stated, never implied. */
  readonly why: string;
}

/**
 * The commands a release must not gate on, and the reason each one is here.
 *
 * TWO ENTRIES AND A STATED RESIDUAL. This list cannot notice a third command of the same category
 * arriving; what notices that is the caller's ordered comparison of the whole gate list, which reds
 * on any gate nobody has classified. The list exists so that the two known ones red with the reason
 * a reader needs rather than with "unrecognised".
 */
export const ABOUT_THIS_REPOSITORY: readonly RepositoryScopedCommand[] = [
  {
    script: "balance:self",
    why:
      "the self-reconciliation is a statement about this repository's own bookkeeping, and under a " +
      "model skew it is red for the very reason the release is being cut — so a release consulting " +
      "it cannot publish the cure for the disease",
  },
  {
    // THE SCRIPT MOVED WHEN THE PASS WENT (3F-3272), AND THE REASON DID NOT. It was
    // `cucumber:fitness`, the one gate every converted check ran behind — so naming the axis was
    // naming one script. The twelve rows are twelve CI steps now and there is no single handle for
    // them, and one of those steps is `pnpm typecheck`, which the release runs DELIBERATELY because
    // it is about the artefact. So what is named here is the local ladder that runs the whole of
    // this repository's own bookkeeping in one command: it reaches `balance:self` and every fitness
    // row, including the one that reads a scheduled sweep's record. Naming the retired script would
    // have been a rule that can no longer match anything, and naming each row would be the roster
    // this repository keeps deleting.
    script: "verify",
    why:
      "the local ladder runs the fitness axis and the self-reconciliation together, and that axis " +
      "measures this repository — its complexity bars, its corpus traceability, its own mutation " +
      "score, the duration of its observer — with one row printing a number a scheduled sweep left " +
      "behind, so a release gating on it is a release a lapsed cron can block",
  },
];

/** A release that cannot be read as a release, or one asking the wrong question before it packs. */
export interface GateFault {
  readonly kind: "gate-about-this-repository";
  readonly message: string;
}

/**
 * Where a release packs, in `pnpm`'s own subcommand form.
 *
 * THE SURROUNDING WHITESPACE IS PART OF THE NEEDLE, and without it the SMOKE step matches too. That
 * step hands a pack directory to a check with `--pack-dir`, and `pack` inside a flag sits between
 * two hyphens — which every word-boundary test in the language calls a word boundary. Requiring
 * `pack` to stand as its own token is what keeps this reading pointed at the step that produces the
 * tarballs rather than at one of the steps that reads them.
 */
const PACKS = /\bpnpm\b[^\n]*\spack(\s|$)/m;

/**
 * Every step the release runs before it has packed anything — the gates whose red costs it the pack.
 *
 * A RELEASE THAT PACKS NOTHING IS REFUSED RATHER THAN REPORTED EMPTY. With no pack there is no
 * artefact, so there is nothing for a gate to stand ahead of and no question this module can answer;
 * answering it with an empty list would report "no gate asks about this repository" over a release
 * that had stopped being one, which is the vacuous green this repository is named for.
 */
export function gatesAheadOfThePack(stated: StatedRelease): ReleaseGate[] {
  const at = stated.steps.findIndex((step) => PACKS.test(step.run));
  if (at === -1) {
    throw new Error(
      "this release packs nothing, so it has no artefact and no gates standing ahead of one",
    );
  }
  return stated.steps
    .slice(0, at)
    .filter((step) => step.run !== "")
    .map((step) => ({ step: step.name, command: step.run }));
}

/** Every gate of this release that asks about this repository rather than about the artefact. */
export function gateFaults(gates: readonly ReleaseGate[]): GateFault[] {
  return gates.flatMap((gate) =>
    ABOUT_THIS_REPOSITORY.filter((scoped) => commandInvokesScript(gate.command, scoped.script)).map(
      (scoped) => ({
        kind: "gate-about-this-repository" as const,
        message:
          `"${gate.step}" gates this release on ${scoped.script}, and ${scoped.why}. ` +
          "A release path consults nothing that is about this repository rather than about the artefact.",
      }),
    ),
  );
}

/** A gate a reading standing inside this repository's own ladder cannot put to the run it is in. */
export interface GateThisRunStandsOn {
  readonly step: string;
  readonly why: string;
}

/**
 * The gates a run of this repository's own ladder is already standing on, and cannot ask again.
 *
 * THE REASON IS THE SAME FOR ALL FOUR AND IT IS NOT "EXPENSIVE". This reading executes under the
 * package manager the first one enables, out of the tree the second one produced, beside the Vitest
 * pass of the third and INSIDE the behavioural pass of the fourth. A third invocation of any of
 * them from in here answers a question the containing run has already answered over the same tree,
 * and the last one does not terminate. On CI that containing run's evidence root is the runner's
 * own temporary directory, cold by construction, which is the condition this whole scenario is
 * about — so the containing run is not a weaker witness than a nested one would be.
 *
 * NAMED, NEVER DROPPED. An entry here keeps its place in the caller's ordered comparison and reports
 * that it was not asked; a gate quietly missing from that list would read as a gate that passed.
 */
export const GATES_THIS_RUN_STANDS_ON: readonly GateThisRunStandsOn[] = [
  {
    step: "Enable corepack",
    why: "this reading is already running under the package manager it enables",
  },
  {
    step: "Install dependencies",
    why: "this reading is executing out of the tree it produced, and running it again would rewrite that tree mid-read",
  },
  { step: "Test", why: "the Vitest pass is this ladder's sibling over the same tree" },
  { step: "Cucumber", why: "this reading IS the behavioural pass, and invoking it from inside itself does not terminate" },
];

/** Why this run cannot ask one gate, or nothing where it can. */
export function standsOn(step: string): string | undefined {
  return GATES_THIS_RUN_STANDS_ON.find((gate) => gate.step === step)?.why;
}

/** What is to be done with one gate: put it to the run, or say what this run is standing on. */
export type GatePlan =
  | { readonly step: string; readonly shell: string }
  | { readonly step: string; readonly notAsked: string };

/** The whole gate list, each entry either a command to run or a reason it is not asked here. */
export function gateRunPlan(gates: readonly ReleaseGate[]): GatePlan[] {
  return gates.map((gate) => {
    const why = standsOn(gate.step);
    return why === undefined ? { step: gate.step, shell: gate.command } : { step: gate.step, notAsked: why };
  });
}

/** How one gate answered the run it was put to, in the one form a whole list reads as a table. */
export interface GateAnswer {
  readonly step: string;
  /** `passed`, `refused`, or `not asked — <why>`. */
  readonly answer: string;
}

/** What a gate this run stands on answers with — the explicit null, never an absent row. */
export function notAsked(why: string): string {
  return `not asked — ${why}`;
}

/**
 * The gate that refused the run, or nothing where the release reached its pack.
 *
 * THE FIRST ONE, BECAUSE A RELEASE IS A LADDER. A step that reds aborts the job, so the gates behind
 * the first refusal never run at all — reporting the last refusal, or all of them, would describe a
 * release that does not exist.
 */
export function refusedAt(answers: readonly GateAnswer[]): string | undefined {
  return answers.find((answer) => answer.answer === "refused")?.step;
}
