/**
 * @SCN-STG-009 (3F-2737) — the ONE planted-violation arm of the tier floor's EDGE (3F-3234 /
 * 3F-3218). The floor's DECISION is `scnTags.ts`'s and is proven there over injected sets; what
 * only this edge can answer is which WORDS it resolves and hands that decision, and what a human
 * reading a red build then sees. So: one manifest planted four ways, one corpus its resolved set
 * decides, and ONE expect over the status, the sentence and every finding together.
 *
 * WHY THIS CODE AND NOT @SCN-STG-005, WHICH THIS FILE ALSO CREDITED. An arm credits exactly one
 * scenario, so collapsing five arms into one spends four citations. Measured off the run's own
 * report with `parseVitestEvidenceObservations`: @SCN-STG-009 drew all three of its `@unit`
 * observations HERE and none anywhere else, while @SCN-STG-005 drew two here and five from
 * `scnTags.test.ts`. Citing @SCN-STG-005 would leave @SCN-STG-009 with no observation at all and
 * its obligation reading missing. The choice is the measurement's, not a preference.
 *
 * THE WHOLE ARRAY, NOT CONTAINMENT, and that is the part that is stronger than the four arms this
 * replaces. Containment leaves completeness and order unstated — a set carrying the right words
 * plus a fifth satisfied every one of them. Reading the empty manifest as EXACTLY the axis word is
 * what states that the two resolvers invent nothing, and that the third source is not theirs.
 *
 * THE REAL REPOSITORY IS NOT READ HERE, which is Ruling B rather than an omission: @SCN-FIT-008
 * runs `pnpm lint:scn-tags` over the real corpus on every CI run and every `pnpm verify`, and it
 * was proved to REACH this module — neutered to hand the decision an empty set, the row reds.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { floorCheckTags, runScnTagsLint } from "./lintScnTagsCli.js";

/** A check named the way a REGISTERED one is — by the runnable script handle that invokes it. */
const REGISTERED = { checkRegistry: { "lint:complexity": "complexity" } };

/** A check named the way a MEASURED one is — by the row holding it to an authored ceiling. */
const MEASURED = { thresholds: { "SCN-TGT-001": { "ci-run-time": 75 } } };

/**
 * One planted corpus carrying an instance of every kind the resolved set decides. No scenario
 * carries a word the checked-out repository's own manifest could register, so the two admissions
 * are the axis word's and the community starter list's — this edge's answers, not the tree's.
 */
const CORPUS = `@ZZZ
Feature: a planted corpus the tier floor is held over

  @fitness @SCN-ZZZ-001
  Scenario: it names the converted axis word and no tier
    Given a thing

  @wip @SCN-ZZZ-002
  Scenario: it is parked by the community starter list
    Given a thing

  @SCN-ZZZ-003
  Scenario: it names no tier and is not parked
    Given a thing

  @unit @nonsense @SCN-ZZZ-004
  Scenario: it names a tier and still carries a tag that is neither
    Given a thing
`;

/** `process.exit` raised as a value the harness can read, since the real one never returns. */
class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

/** What the edge left behind over the planted corpus: the status it exited, and every line said. */
function edgeVerdict(): { exit: number | undefined; said: string[] } {
  const features = join(mkdtempSync(join(tmpdir(), `scn-stg-009-${process.pid}-`)), "features");
  mkdirSync(features, { recursive: true });
  writeFileSync(join(features, "planted.feature"), CORPUS);

  const said: string[] = [];
  const capture = (...parts: unknown[]): void => void said.push(parts.map(String).join(" "));
  const spies = [
    vi.spyOn(console, "log").mockImplementation(capture),
    vi.spyOn(console, "error").mockImplementation(capture),
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new ExitSignal(code ?? 0);
    }) as never),
  ];

  let exit: number | undefined;
  try {
    runScnTagsLint(["--features", features]);
  } catch (err) {
    if (!(err instanceof ExitSignal)) throw err;
    exit = err.code;
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
  return { exit, said };
}

describe("[SCN-STG-009] the tier floor's edge resolves the words that name a check, and answers on them", () => {
  it("[SCN-STG-009] unions the registered, the measured and the model's own axis word — inventing none of them where a manifest configures nothing — then reds a corpus its set does not admit, naming every offender", () => {
    const { exit, said } = edgeVerdict();

    expect({
      bothSets: floorCheckTags({ specController: { ...REGISTERED, ...MEASURED } }),
      registeredOnly: floorCheckTags({ specController: REGISTERED }),
      measuredOnly: floorCheckTags({ specController: MEASURED }),
      neither: floorCheckTags({}),
      exit,
      said,
    }).toEqual({
      bothSets: ["complexity", "ci-run-time", "fitness"],
      registeredOnly: ["complexity", "fitness"],
      measuredOnly: ["ci-run-time", "fitness"],
      neither: ["fitness"],
      exit: 1,
      said: [
        "scn-tags lint: FAILED — 2 finding(s): a scenario naming an @SCN but no evidence tier " +
          "(and not parked), a tag that is neither a tier nor a recognised deferral tag, or a " +
          "scenario claiming more than one check:",
        '  Feature "planted" scenario @SCN-ZZZ-003 ("it names no tier and is not parked") names ' +
          "no evidence tier and is not parked — every @SCN scenario must name at least one tier " +
          "(@unit/@integration/@e2e/@performance, a <tier>pending variant, or @lint=<guard>), or " +
          "a word that names a check here, unless it carries one of the deferral tags this " +
          "target configures.",
        '  Feature "planted" scenario @SCN-ZZZ-004 ("it names a tier and still carries a tag ' +
          'that is neither") carries @nonsense, which is neither an evidence tier nor a ' +
          "recognised deferral tag",
      ],
    });
  });
});
