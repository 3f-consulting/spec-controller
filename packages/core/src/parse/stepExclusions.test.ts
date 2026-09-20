/**
 * Unit tests for THE CONSUMER'S OWN EXCLUSIONS (@SCN-USG-015) — the third of the axis's three
 * exclusions, and the only one that is a list the consumer writes. Two readers are pinned here:
 * `stepExclusions`, which partitions a target's `notChecks` entries into the ones that named a
 * step of its pipeline and the ones that named nothing, and `resolveNotChecks`, which reads the
 * list off the manifest.
 *
 * AND THE OBSERVER'S HONOURING OF THE SEAM, in the same file rather than beside the observer's
 * other arms. The claim is one claim — a step the consumer named a non-check is not a candidate
 * AND is named on the report — and splitting the resolution from its effect would leave two
 * files each passing on half of it.
 *
 * ITS OWN FILE for the reason `recognisedRunners.test.ts` is: `runningStaticChecks.test.ts` was
 * near the 400-line file-length ceiling then in force (retired portfolio-wide on 2026-09-18,
 * 3F-2320), and these arms are a claim of their own in any case.
 *
 * Parent: @SCN-USG-015.
 */

import { describe, it, expect } from "vitest";
import { ciWorkflowSteps } from "./checkScriptsRunInCI.js";
import { stepExclusions } from "./stepExclusions.js";
import { runningStaticChecks } from "./runningStaticChecks.js";
import { resolveNotChecks } from "./targetManifest.js";

/** One workflow: a `uses:` step, an unnamed `run:` step, and two named check steps. */
const CI_YML = [
  "jobs:",
  "  ci:",
  "    steps:",
  "      - uses: actions/checkout@v4",
  "      - run: pnpm install --frozen-lockfile",
  "      - name: Rule check",
  "        run: pnpm lint:rules",
  "      - name: Sweep check",
  "        run: pnpm lint:sweep",
].join("\n");

/** A SECOND workflow carrying a step of the SAME name in a job of the same name. */
const RELEASE_YML = [
  "jobs:",
  "  ci:",
  "    steps:",
  "      - name: Rule check",
  "        run: pnpm lint:rules",
].join("\n");

const SCRIPTS = {
  scripts: {
    "lint:rules": "eslint . --format json",
    "lint:sweep": "madge --circular",
  },
};

// A target that has named no behavioural runners — the membership argument the observed prefix
// set used to occupy (@SCN-USG-004, 3F-3343). This fixture's pipeline runs no suite, so a runner
// block would be configuration about a step that is not there.
const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

// ---------------------------------------------------------------------------
// @SCN-USG-015 — WHAT AN ENTRY NAMES, AND WHAT IT DOES NOT.
// ---------------------------------------------------------------------------
describe("[SCN-USG-015] stepExclusions — an entry naming a step of the pipeline", () => {
  it("excludes the step the entry names, and no other", () => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], ["ci.yml:ci:Rule check"]);
    expect(resolved.excluded).toEqual(["ci.yml:ci:Rule check"]);
    expect(resolved.unmatchedEntries).toEqual([]);
    const named = ciWorkflowSteps([CI_YML]).filter((step) => resolved.isExcluded(step));
    expect(named.map((step) => step.identity)).toEqual(["Rule check"]);
  });

  it("names a `uses:` step by the action it uses, which is the identity the walk carries", () => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], ["ci.yml:ci:actions/checkout@v4"]);
    expect(resolved.excluded).toEqual(["ci.yml:ci:actions/checkout@v4"]);
    const named = ciWorkflowSteps([CI_YML]).filter((step) => resolved.isExcluded(step));
    expect(named.map((step) => step.identity)).toEqual(["actions/checkout@v4"]);
  });

  it("names an unnamed `run:` step by the first line of its command", () => {
    const entry = "ci.yml:ci:pnpm install --frozen-lockfile";
    expect(stepExclusions([CI_YML], ["ci.yml"], [entry]).excluded).toEqual([entry]);
  });

  it("excludes nothing when the target names nothing", () => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], []);
    expect(resolved.excluded).toEqual([]);
    expect(resolved.unmatchedEntries).toEqual([]);
    expect(ciWorkflowSteps([CI_YML]).some((step) => resolved.isExcluded(step))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-015 — EXACTLY, AND FULLY QUALIFIED. One form and no grammar: a partial entry is not a
// looser way of saying the same thing, it is an entry that names nothing — and it is REPORTED as
// one rather than quietly widened into a match.
// ---------------------------------------------------------------------------
describe("[SCN-USG-015] stepExclusions — the match is exact and fully qualified", () => {
  const nothingMatches = (entry: string): void => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], [entry]);
    expect(resolved.excluded).toEqual([]);
    expect(resolved.unmatchedEntries).toEqual([entry]);
    expect(ciWorkflowSteps([CI_YML]).some((step) => resolved.isExcluded(step))).toBe(false);
  };

  it("matches no step on a bare step name", () => nothingMatches("Rule check"));
  it("matches no step on a job-and-step form", () => nothingMatches("ci:Rule check"));
  it("matches no step on a file-and-step form", () => nothingMatches("ci.yml:Rule check"));
  it("matches no step on a prefix of the qualified name", () => nothingMatches("ci.yml:ci:Rule"));
  it("matches no step on a trailing wildcard", () => nothingMatches("ci.yml:ci:Rule*"));
  it("matches no step on a whole-job wildcard", () => nothingMatches("ci.yml:ci:*"));
  it("matches no step on a different case", () => nothingMatches("ci.yml:ci:rule check"));
  it("matches no step on surrounding whitespace", () => nothingMatches(" ci.yml:ci:Rule check "));
});

// ---------------------------------------------------------------------------
// @SCN-USG-015 — WHY THE ENTRY IS QUALIFIED AT ALL, measured rather than asserted: `Rule check`
// is a check in one workflow and the same word in another, and a bare-name form would take out
// both. This is what the walk was widened to carry the job and the source for.
// ---------------------------------------------------------------------------
describe("[SCN-USG-015] stepExclusions — two steps of one name in two workflows", () => {
  const sources = [CI_YML, RELEASE_YML];
  const names = ["ci.yml", "release.yml"];

  it("excludes the one the entry's workflow names, and leaves its namesake alone", () => {
    const resolved = stepExclusions(sources, names, ["release.yml:ci:Rule check"]);
    expect(resolved.excluded).toEqual(["release.yml:ci:Rule check"]);
    const excluded = ciWorkflowSteps(sources).filter((step) => resolved.isExcluded(step));
    expect(excluded.map((step) => step.sourceIndex)).toEqual([1]);
  });

  it("excludes both only when the target writes both entries", () => {
    const resolved = stepExclusions(sources, names, [
      "ci.yml:ci:Rule check",
      "release.yml:ci:Rule check",
    ]);
    expect(resolved.excluded).toEqual(["ci.yml:ci:Rule check", "release.yml:ci:Rule check"]);
    expect(ciWorkflowSteps(sources).filter((step) => resolved.isExcluded(step))).toHaveLength(2);
  });

  it("excludes no step of a source this run was given no name for", () => {
    // The names come from the edge that resolved the paths. A source it named none for cannot be
    // written down by a consumer, so it cannot be excluded — the safe direction, and the one that
    // stops a nameless source colliding with every other nameless one.
    const resolved = stepExclusions(sources, ["ci.yml"], ["ci.yml:ci:Rule check"]);
    const excluded = ciWorkflowSteps(sources).filter((step) => resolved.isExcluded(step));
    expect(excluded.map((step) => step.sourceIndex)).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-015 — THE STALE ENTRY. A line that matches nothing is a fact about the manifest only
// this run can see, and the report is the only place it can be seen from.
// ---------------------------------------------------------------------------
describe("[SCN-USG-015] stepExclusions — an entry naming no step", () => {
  it("reports the entry rather than dropping it", () => {
    const resolved = stepExclusions([CI_YML], ["ci.yml"], ["ci.yml:ci:Circular-import check"]);
    expect(resolved.unmatchedEntries).toEqual(["ci.yml:ci:Circular-import check"]);
    expect(resolved.excluded).toEqual([]);
  });

  it("partitions every entry into exactly one of the two halves", () => {
    // TOTAL, and asserted as a partition rather than as two lists that happen to look right: an
    // entry lost between them is an exclusion the consumer wrote that nothing anywhere accounts
    // for, which is the silence this scenario exists to close.
    const entries = [
      "ci.yml:ci:Rule check",
      "ci.yml:ci:Circular-import check",
      "ci.yml:ci:Sweep check",
      "Rule check",
    ];
    const resolved = stepExclusions([CI_YML], ["ci.yml"], entries);
    expect([...resolved.excluded, ...resolved.unmatchedEntries].sort()).toEqual([...entries].sort());
    expect(resolved.excluded).toEqual(["ci.yml:ci:Rule check", "ci.yml:ci:Sweep check"]);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-015 — AND THE STEP STOPS BEING A CANDIDATE. The report half without this one is a
// label on a step that still reaches the books; this half without the report is the silence.
// ---------------------------------------------------------------------------
describe("[SCN-USG-015] runningStaticChecks — a check whose every step the target excluded", () => {
  // THE PLUMBING IS OUT IN BOTH ARMS, and that is the inverted rule rather than a
  // convenience. Since @SCN-USG-004 an install step is a candidate like any other, and since
  // @SCN-USG-013 so is the checkout ACTION beside it, so leaving either in would put a further row
  // in each assertion and make these arms partly about a disposition they are not testing. Both
  // are taken out by the very mechanism under test, which is the only honest way to take them out
  // — and the two CHECK steps are what varies between the arms.
  const PLUMBING = ["ci.yml:ci:actions/checkout@v4", "ci.yml:ci:pnpm install --frozen-lockfile"];
  const observed = (notChecks: readonly string[]): string[] =>
    runningStaticChecks(
      [CI_YML],
      SCRIPTS,
      NO_RUNNERS,
      () => null,
      stepExclusions([CI_YML], ["ci.yml"], [...PLUMBING, ...notChecks]).isExcluded
    ).map((observation) => observation.staticCheck);

  it("observes both checks when the target excludes neither of them", () => {
    expect(observed([])).toEqual(["lint:rules", "lint:sweep"]);
  });

  it("stops observing the check whose only step the target named a non-check", () => {
    expect(observed(["ci.yml:ci:Rule check"])).toEqual(["lint:sweep"]);
  });

  it("goes on observing a check a second, unexcluded step also runs", () => {
    // The entry names a STEP, not a script. A check the consumer excluded at one step and still
    // runs at another is a check their pipeline runs, and reading the entry as being about the
    // script would delete it from the report on the strength of something they did not say.
    const twice = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Rule check",
      "        run: pnpm lint:rules",
      "      - name: Sweep check",
      "        run: pnpm lint:sweep",
      "  nightly:",
      "    steps:",
      "      - name: Nightly rules",
      "        run: pnpm lint:rules",
    ].join("\n");
    const resolved = stepExclusions([twice], ["ci.yml"], ["ci.yml:ci:Rule check"]);
    const checks = runningStaticChecks([twice], SCRIPTS, NO_RUNNERS, () => null, resolved.isExcluded);
    expect(checks.map((observation) => observation.staticCheck)).toEqual(["lint:rules", "lint:sweep"]);
  });
});

// ---------------------------------------------------------------------------
// @SCN-USG-015 — READING THE LIST OFF THE MANIFEST, defensive like every resolver beside it.
// ---------------------------------------------------------------------------
describe("[SCN-USG-015] resolveNotChecks — the target's specController.notChecks list", () => {
  it("reads the entries the target wrote, in the order it wrote them", () => {
    expect(
      resolveNotChecks({
        specController: { notChecks: ["ci.yml:ci:Rule check", "ci.yml:ci:Install"] },
      })
    ).toEqual(["ci.yml:ci:Rule check", "ci.yml:ci:Install"]);
  });

  it("resolves empty for a manifest that names none", () => {
    expect(resolveNotChecks({})).toEqual([]);
    expect(resolveNotChecks({ specController: {} })).toEqual([]);
  });

  it("resolves empty for a value that is not a list", () => {
    expect(resolveNotChecks({ specController: { notChecks: "ci.yml:ci:Rule check" } })).toEqual([]);
    expect(resolveNotChecks({ specController: { notChecks: { "ci.yml": "ci" } } })).toEqual([]);
  });

  it("drops an entry that is not a name, rather than throwing over it", () => {
    expect(
      resolveNotChecks({ specController: { notChecks: ["ci.yml:ci:Rule check", 7, null] } })
    ).toEqual(["ci.yml:ci:Rule check"]);
  });

  it("keeps one entry where the target wrote it twice", () => {
    expect(
      resolveNotChecks({
        specController: { notChecks: ["ci.yml:ci:Rule check", "ci.yml:ci:Rule check"] },
      })
    ).toEqual(["ci.yml:ci:Rule check"]);
  });
});
