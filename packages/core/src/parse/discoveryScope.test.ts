import { describe, it, expect } from "vitest";
import { discoveryScope } from "./discoveryScope.js";
import { runningStaticChecks } from "./runningStaticChecks.js";
import type { CiWorkflowStep } from "./checkScriptsRunInCI.js";

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

const UNIT_RUNNER: Readonly<Record<string, string | null>> = { unit: "vitest" };

const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

const excluding =
  (...identities: readonly string[]) =>
  (step: CiWorkflowStep): boolean =>
    identities.includes(step.identity);

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
    expect(ci).toEqual({ source: "ci.yml", job: "ci", steps: 4, candidates: 4 });
  });

  it("reports a job every step of which something took out, rather than dropping it", () => {
    expect(
      discoveryScope([RELEASE_YML], ["release.yml"], SCRIPTS, NO_RUNNERS, excluding("Build", "Publish"))
    ).toEqual([{ source: "release.yml", job: "publish", steps: 2, candidates: 0 }]);
  });

  it("reads nothing from a document that parses to no jobs", () => {
    expect(discoveryScope(["name: CI\non: [push]\n"], ["ci.yml"], SCRIPTS, NO_RUNNERS)).toEqual([]);
  });
});

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

describe("[SCN-USG-020] discoveryScope — one settled order", () => {
  const inOrder = discoveryScope([CI_YML, NIGHTLY_YML], ["ci.yml", "nightly.yml"], SCRIPTS, NO_RUNNERS);

  it("sorts the jobs of one workflow, whatever order the workflow writes them in", () => {
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
