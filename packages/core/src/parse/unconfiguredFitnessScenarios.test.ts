/**
 * @unit for @SCN-LNT-020 — the CORPUS READING half: which scenarios on the fitness axis no
 * configured row names.
 *
 * It reads through `readTargetCorpus` rather than the reader alone, because the claim is about the
 * two readings AGREEING — the obligation rule raising nothing for such a scenario, and the corpus
 * naming it — and those two agree only if they are taken from one walk of one corpus. A test over
 * the reader alone would leave a composition free to hand it a different corpus from the one the
 * obligations were raised over, which is the phantom-row fault @SCN-LNT-009 already names.
 *
 * THE REPORT HALF RIDES HERE TOO, though the surface it renders is the renderer's. The reading and
 * the naming are one claim in two halves — a scenario the corpus names must be one the rule raised
 * nothing for — and pinning them in two files would let each go on agreeing with itself. (The
 * renderer's own file also carries a recorded `max-lines` value, which an addition would regress.)
 *
 * Bidirectional evidence: the describes carry the @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { readTargetCorpus } from "./targetCorpus.js";
import { resolveFitnessChecks } from "./targetManifest.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { isBalanced } from "../domain/ledger.js";
import { renderMarkdown } from "../render/markdown.js";
import type { Ledger } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";

/** The half-converted corpus: two scenarios on the axis, and below it a row for only one. */
const halfConverted = `@HCV
Feature: a half-converted target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-HCV-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-HCV-002
    Scenario: the tree stays above its mutation floor
`;

/** One row, naming the first scenario and saying nothing about the second. */
const oneRow = resolveFitnessChecks(
  {
    specController: {
      fitnessChecks: [{ scn: "SCN-HCV-001", characteristic: "complexity", command: "eslint" }],
    },
  },
  // No gate reference in these rows, so the reader is never asked; it is present because the
  // resolver takes one, exactly as `resolveThresholds` does.
  () => null
);

function corpusOf(source: string, fitnessChecks = oneRow) {
  return readTargetCorpus([source], [], new Map(), fitnessChecks);
}

describe("[SCN-LNT-020] a @fitness scenario no configured row names raises no Evidence Obligation", () => {
  it("raises the row's characteristic for the named scenario and NOTHING for the unnamed one", () => {
    // WHOLE-CORPUS equality over both rows, and the two are deliberately side by side: the only
    // thing separating them is whether a row names them, so a rule that reached for a near
    // characteristic — or for the axis word itself — reds here as firmly as one that raised
    // nothing for either.
    expect(corpusOf(halfConverted).scenarios).toEqual([
      {
        scnId: "SCN-HCV-001",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity" }],
      },
      { scnId: "SCN-HCV-002", evidenceObligations: [] },
    ]);
  });
});

describe("[SCN-LNT-020] the corpus names the fitness scenarios no configured row names", () => {
  it("names the unnamed scenario and not the one its row names", () => {
    expect(corpusOf(halfConverted).unconfiguredFitnessScenarios).toEqual(["SCN-HCV-002"]);
  });

  it("names every one of them when a target carries the tag and has configured no rows at all", () => {
    // The wholly-unconverted half-conversion: the tags moved and no row was ever written. Both
    // scenarios are named, in corpus order, because both said which axis they are on and neither
    // said what it is about.
    expect(corpusOf(halfConverted, new Map()).unconfiguredFitnessScenarios).toEqual([
      "SCN-HCV-001",
      "SCN-HCV-002",
    ]);
  });

  it("names nothing on a corpus that carries the axis tag nowhere — inert on an unconverted target", () => {
    // A target that has converted nothing must read exactly as it read before, or every corpus in
    // the portfolio acquires this fault the day the reading lands.
    const unconverted = `@HCV
Feature: an unconverted target

  Rule: the tree stays inside its thresholds

    @complexity @SCN-HCV-003
    Scenario: the codebase stays under its complexity threshold

    @unit @SCN-HCV-004
    Scenario: a customer is greeted by name
`;
    expect(corpusOf(unconverted, new Map()).unconfiguredFitnessScenarios).toEqual([]);
  });

  it("names a scenario ONCE though the axis tag reaches it twice", () => {
    // A scenario's effective tags are its own plus its Rule's and its Feature's (@SCN-LDG-020), so
    // the axis tag can arrive twice. Naming it twice would put the same remedy on the report twice
    // and make the count say there are two half-converted checks where there is one.
    const hoisted = `@HCV @fitness
Feature: a half-converted target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-HCV-002
    Scenario: the tree stays above its mutation floor
`;
    expect(corpusOf(hoisted, new Map()).unconfiguredFitnessScenarios).toEqual(["SCN-HCV-002"]);
  });
});

/** The provenance the renderer requires; immaterial to every assertion below. */
const CTX: RunContext = {
  target: "a-half-converted-target",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

describe("[SCN-LNT-020] the report names them, and the run reds on the outcome canon already carries", () => {
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A): the second scenario raises nothing (no row
  // names it) and nothing cites it, so the reconciler — not this fixture — decides its row.
  const halfConvertedLedger: Ledger = reconcile(
    [
      {
        scnId: "SCN-HCV-001",
        evidenceObligations: [{ qualityCheck: "lint", staticCheck: "complexity" }],
      },
      { scnId: "SCN-HCV-002", evidenceObligations: [] },
    ],
    []
  );

  const reportOf = (named?: readonly string[]) =>
    renderMarkdown(
      {
        summary: {
          ...summaryOf(halfConvertedLedger, false, true),
          ...(named === undefined ? {} : { unconfiguredFitnessScenarios: named }),
        },
        ledger: halfConvertedLedger,
      },
      CTX
    );

  it("names them where an uncited static check surfaces — count and ids, and no prescribed cure", () => {
    const markdown = reportOf(["SCN-HCV-002"]);
    expect(markdown).toContain("### Static checks");
    expect(markdown).toContain("1 @fitness scenario(s) no configured row names: SCN-HCV-002.");
  });

  it("reds the run through the degenerate item canon already carries, minting no new outcome", () => {
    // RULING A. The scenario is real, no Evidence Obligation was raised and no Evidence Observation
    // cites it — canon's `both-missing` row exactly (Scenario Exists, Obligation None, Observation
    // None) — so the run is out of balance with no new outcome and no canon edit.
    expect(isBalanced(halfConvertedLedger)).toBe(false);
    const row = halfConvertedLedger.scenarioReconciliations.find(
      (reconciliation) => reconciliation.scnId === "SCN-HCV-002"
    );
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.reconcilingItems.map((item) => item.outcome)).toEqual(["both-missing"]);
  });

  it("omits the line where every fitness scenario has a row — an unconverted corpus renders as before", () => {
    expect(reportOf()).not.toContain("no configured row names");
    expect(reportOf([])).not.toContain("no configured row names");
  });
});
