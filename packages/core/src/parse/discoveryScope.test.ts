/**
 * Unit tests for THE SCOPE DISCOVERY RANGED OVER (@SCN-USG-020) — the per-job census: which
 * workflow files and which jobs of them this run read, how many steps each held, and how many of
 * those steps are candidate fitness checks.
 *
 * WHAT IS PINNED HERE IS PROVENANCE, and it is not the accounting identity beside it
 * (@SCN-USG-018). That one asserts the dispositions sum to the steps read, so nothing the reader
 * saw was dropped; this one asserts WHICH files and WHICH jobs those steps came from. A reader
 * satisfies either alone — a correct sum over a scope it never names, or a named scope whose
 * numbers do not add up — so neither file asserts the other's claim.
 *
 * THE CANDIDATE FIGURE IS TAKEN FROM THE OBSERVER, NOT RE-DERIVED, and one arm below asserts
 * exactly that by comparing the census against what `runningStaticChecks` actually posts. A census
 * that answered "how many became candidates" out of its own reading of the membership rule would
 * be measuring its own arithmetic, and would go on agreeing with the report while disagreeing with
 * the books.
 *
 * ITS OWN FILE for the reason `stepExclusions.test.ts` and `recognisedRunners.test.ts` are:
 * `runningStaticChecks.test.ts` sits near the 400-line `max-lines` ceiling, and an exception
 * excuses debt rather than buying headroom.
 *
 * Parent: @SCN-USG-020.
 */

import { describe, it, expect } from "vitest";
import { discoveryScope } from "./discoveryScope.js";
import { runningStaticChecks } from "./runningStaticChecks.js";
import type { CiWorkflowStep } from "./checkScriptsRunInCI.js";

/** One job, four steps, in both forms — a `uses:`, a plumbing command, the suite, and a check. */
const CI_YML = [
  "jobs:",
  "  ci:",
  "    steps:",
  "      - uses: actions/checkout@v4",
  "      - name: Install",
  "        run: pnpm install --frozen-lockfile",
  "      - name: Unit tests",
  "        run: pnpm test",
  "      - name: Rule check",
  "        run: pnpm lint:rules",
].join("\n");

/**
 * TWO jobs in ONE file, written `sweep` before `audit` — the order a sorted census has to change.
 * Written this way deliberately: with the jobs already in order, a reader emitting them as it met
 * them would agree with a reader that sorts, and the sorting arm below would assert nothing.
 */
const NIGHTLY_YML = [
  "jobs:",
  "  sweep:",
  "    steps:",
  "      - name: Sweep check",
  "        run: pnpm lint:sweep",
  "      - name: Depth check",
  "        run: pnpm lint:depth",
  "  audit:",
  "    steps:",
  "      - name: Audit",
  "        run: pnpm audit --audit-level=high",
].join("\n");

/** A job whose every step something takes out of discovery — the job that contributes nothing. */
const RELEASE_YML = [
  "jobs:",
  "  publish:",
  "    steps:",
  "      - name: Build",
  "        run: pnpm build",
  "      - name: Publish",
  "        run: pnpm publish --access public",
].join("\n");

const SCRIPTS = {
  scripts: {
    test: "vitest run",
    "lint:rules": "eslint .",
    "lint:sweep": "madge --circular",
    "lint:depth": "depcruise src",
    build: "tsc -b",
  },
};

/** The unit tier only — one named runner, so exactly one step of the pipeline is one. */
const UNIT_RUNNER: Readonly<Record<string, string | null>> = { unit: "vitest" };

/** No runner named at all, which is the `new-client` shape (@SCN-USG-017). */
const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

/** The consumer's own exclusion seam, standing in for `stepExclusions`' answer over these steps. */
const excluding =
  (...identities: readonly string[]) =>
  (step: CiWorkflowStep): boolean =>
    identities.includes(step.identity);

// ---------------------------------------------------------------------------
// @SCN-USG-020 — ONE ROW PER JOB, NAMING THE WORKFLOW IT CAME FROM.
// ---------------------------------------------------------------------------
describe("[SCN-USG-020] discoveryScope — the workflows and the jobs a run read", () => {
  it("names every workflow and every job, with the steps it read from each", () => {
    expect(
      discoveryScope(
        [CI_YML, NIGHTLY_YML],
        ["ci.yml", "nightly.yml"],
        SCRIPTS,
        UNIT_RUNNER,
        excluding("Install")
      )
    ).toEqual([
      { source: "ci.yml", job: "ci", steps: 4, candidates: 2 },
      { source: "nightly.yml", job: "audit", steps: 1, candidates: 1 },
      { source: "nightly.yml", job: "sweep", steps: 2, candidates: 2 },
    ]);
  });

  it("counts a `uses:` step among the steps it read, because the walk reads one", () => {
    const [ci] = discoveryScope([CI_YML], ["ci.yml"], SCRIPTS, NO_RUNNERS);
    // Four steps, of which one is an action — a census reading `run:` steps alone reports three.
    expect(ci).toEqual({ source: "ci.yml", job: "ci", steps: 4, candidates: 4 });
  });

  it("reports a job every step of which something took out, rather than dropping it", () => {
    // THE QUIET JOB, which is half of what this scenario is for: a consumer needs to see a job the
    // run ranged over that contributed nothing, and a census built out of the candidates alone has
    // no row to put it on.
    expect(
      discoveryScope([RELEASE_YML], ["release.yml"], SCRIPTS, NO_RUNNERS, excluding("Build", "Publish"))
    ).toEqual([{ source: "release.yml", job: "publish", steps: 2, candidates: 0 }]);
  });

  it("reads nothing from a document that parses to no jobs", () => {
    expect(discoveryScope(["name: CI\non: [push]\n"], ["ci.yml"], SCRIPTS, NO_RUNNERS)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-020 — THE CANDIDATE FIGURE IS THE OBSERVER'S, and this is the arm that says so. A
// census answering the membership question for itself measures its own arithmetic: it would go on
// agreeing with the scope section while the books beneath it said something else.
// ---------------------------------------------------------------------------
describe("[SCN-USG-020] discoveryScope — the candidates it counts are the ones posted", () => {
  const sources = [CI_YML, NIGHTLY_YML];
  const names = ["ci.yml", "nightly.yml"];

  const totalCandidates = (isExcluded: (step: CiWorkflowStep) => boolean): number =>
    discoveryScope(sources, names, SCRIPTS, UNIT_RUNNER, isExcluded).reduce(
      (total, entry) => total + entry.candidates,
      0
    );

  const posted = (isExcluded: (step: CiWorkflowStep) => boolean): number =>
    runningStaticChecks(sources, SCRIPTS, UNIT_RUNNER, () => null, isExcluded).length;

  it("counts what the observer posts when the consumer excluded a step", () => {
    expect(totalCandidates(excluding("Install"))).toBe(posted(excluding("Install")));
    expect(posted(excluding("Install"))).toBe(5);
  });

  it("counts what the observer posts when the consumer excluded nothing", () => {
    const nothing = (): boolean => false;
    expect(totalCandidates(nothing)).toBe(posted(nothing));
    expect(posted(nothing)).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-020 — SORTED, so two runs over one tree cannot differ and a diff of two reports never
// turns on the order a directory happened to be handed back in.
// ---------------------------------------------------------------------------
describe("[SCN-USG-020] discoveryScope — one settled order", () => {
  const inOrder = discoveryScope([CI_YML, NIGHTLY_YML], ["ci.yml", "nightly.yml"], SCRIPTS, NO_RUNNERS);

  it("sorts the jobs of one workflow, whatever order the workflow writes them in", () => {
    // nightly.yml writes `sweep` first; the census reports `audit` first.
    expect(inOrder.map((entry) => `${entry.source}:${entry.job}`)).toEqual([
      "ci.yml:ci",
      "nightly.yml:audit",
      "nightly.yml:sweep",
    ]);
  });

  it("reads the same whichever order the sources were handed over in", () => {
    expect(
      discoveryScope([NIGHTLY_YML, CI_YML], ["nightly.yml", "ci.yml"], SCRIPTS, NO_RUNNERS)
    ).toEqual(inOrder);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-020 — A SOURCE THIS RUN WAS GIVEN NO NAME FOR. The core holds no filesystem, so the
// workflow names arrive as data from the CLI edge (`parse/stepNames`). A source named to nobody
// can still be READ, and dropping its jobs would be the silence this axis exists to end — so the
// row survives without the half of its name nobody supplied, the direction `reconcilerSteps` takes.
// ---------------------------------------------------------------------------
describe("[SCN-USG-020] discoveryScope — a source with no name", () => {
  it("keeps the job, and names no workflow for it", () => {
    expect(discoveryScope([CI_YML], [], SCRIPTS, NO_RUNNERS)).toEqual([
      { job: "ci", steps: 4, candidates: 4 },
    ]);
  });

  it("sorts a nameless source ahead of a named one, so the order is still settled", () => {
    expect(
      discoveryScope([CI_YML, NIGHTLY_YML], [undefined as unknown as string, "nightly.yml"], SCRIPTS, NO_RUNNERS)
    ).toEqual([
      { job: "ci", steps: 4, candidates: 4 },
      { source: "nightly.yml", job: "audit", steps: 1, candidates: 1 },
      { source: "nightly.yml", job: "sweep", steps: 2, candidates: 2 },
    ]);
  });
});
