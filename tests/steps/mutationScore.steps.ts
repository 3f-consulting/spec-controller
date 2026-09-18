/**
 * @integration for features/mutation-score.feature — the measured axis read in EITHER direction:
 * a threshold entry that carries the comparison its number is read with.
 *
 * Bidirectional evidence (Evidence Manifesto §9): each step block below carries the @SCN it proves,
 * matching the feature file's scenarios and the @unit pins in
 * packages/core/src/domain/thresholds.test.ts and
 * packages/core/src/parse/measuredObligations.test.ts.
 *
 * ITS OWN STEP TEXT RATHER THAN @ci-run-time's. The chain a measured scenario walks — author a
 * manifest, read the corpus against it, look at what was raised — is the shape ciRunTime.steps.ts
 * already walks, and the fixtures either file holds are module-local. Sharing the wording would
 * bind this feature's steps to that file's state and leave the assertions here reading a corpus
 * this file never built.
 *
 * The threshold registry is core-INTERNAL (where this configuration is authored is still settling),
 * so it is reached by source path rather than through the frozen v1 barrel — the same reach
 * ciRunTime.steps.ts makes, for the same reason.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  parseScenarios,
  reconcile,
  evidenceReconciliationOf,
  renderMarkdown,
  renderJson,
} from "@3f-consulting/spec-controller-core";
import type {
  Scenario,
  EvidenceObligation,
  Ledger,
  ScenarioReconciliation,
  RunContext,
} from "@3f-consulting/spec-controller-core";

import {
  thresholdsOf,
  measuredCheckTags,
  parseMeasuredEvidenceObservations,
  resolveThresholds,
  type ThresholdIndex,
} from "@3f-consulting/spec-controller-core/internal";

// THE RESOLVER AND THE READER IT TAKES, which together are @SCN-MUT-012's behaviour: the
// substitution is the engine's and the record read is the app edge's (3F-3087). Composing the
// index any other way would assert that the engine still understands a number — which nothing
// here doubts — so both halves are reached as the balance command reaches them.
import { killFloorReaderFor } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";

// The record's conventional name, taken from the library that defaults to it rather than respelled
// here: a fixture that filed its record under a second spelling of that name would plant a file
// the resolver never opens and red for a reason no reader could see.
import { RECORD_FILE } from "../../packages/spec-controller/src/mutation-ratchet/index.js";

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).

/** The target's authored bars, as its manifest holds them — @SCN, then bare check tag. */
let thresholds: ThresholdIndex;

/** The corpus source, one stepless row at a time. */
let steplessRows: string[];

/** What the corpus raised, read against that manifest. */
let raised: Scenario[];

/** The bar the manifest authored, for the scenario that reads a measurement sitting on it. */
let authoredBar: number;

/**
 * The number the run measured, kept for the scenario that asserts BOTH numbers ride the item.
 * Held here for the reason `authoredBar` is: naming it once in the Given and reading it back is
 * one fewer place for the fixture and the assertion to drift apart the day one of them is edited.
 */
let authoredMeasurement: number;

/**
 * The fixture @SCN is `SCN-MSD-001` — a code no feature file in this repository carries, so the
 * corpus this builds is a claim about the RULE and never about this repository's own books.
 */
function corpusOf(rows: readonly string[]): string {
  return `@MSD
Feature: measured

  Rule: the domain core is mutated at least as hard as its bar

${rows.join("\n")}`;
}

/** The single obligation the fixture row raised for a check, asserted to be the only one. */
function obligationFor(check: string): EvidenceObligation {
  assert.equal(raised.length, 1, `expected one scenario; got ${JSON.stringify(raised)}`);
  const obligations = raised[0]!.evidenceObligations;
  assert.equal(
    obligations.length,
    1,
    `expected exactly one Evidence Obligation; got ${JSON.stringify(obligations)}`
  );
  const obligation = obligations[0]!;
  assert.equal(obligation.staticCheck, check);
  return obligation;
}

// @SCN-MUT-001
Given(
  "the target's manifest authors {float} as a bare-number threshold for {string} on {string}",
  function (bar: number, check: string, scnId: string) {
    // The bare form — a number and nothing else, read at-most. Authored here as a manifest holds
    // it. This repository's own manifest no longer carries one: its two @ci-run-time rows are
    // step-outcome rows and name no bar at all.
    thresholds = thresholdsOf({ [scnId]: { [check]: bar } });
    steplessRows = [];
  }
);

// @SCN-MUT-001
Given(
  "a stepless scenario {string} in the corpus carries the bare check {string}",
  function (scnId: string, check: string) {
    steplessRows.push(
      `    @${check} @${scnId}\n    Scenario: the domain core is mutated at least as hard as its bar\n`
    );
  }
);

// @SCN-MUT-001
When("the corpus is read against that manifest", function () {
  raised = parseScenarios(corpusOf(steplessRows), [], measuredCheckTags(thresholds), thresholds);
});

// @SCN-MUT-001
Then(
  "the Evidence Obligation raised for {string} holds the bar {float}",
  function (check: string, bar: number) {
    assert.equal(obligationFor(check).threshold, bar);
  }
);

// @SCN-MUT-001
Then(
  "that Evidence Obligation names no comparison of its own, so its bar is read at-most",
  function () {
    // The whole of what "unchanged" means on this scenario. The comparison rides the obligation
    // SPARSELY: absent is at-most, and a bare-number entry sets nothing. A flag defaulted to `false`
    // here would be a term two live rows would have to start carrying to keep saying what they
    // already say.
    const obligation = obligationFor("mutation");
    assert.ok(
      !("atLeast" in obligation),
      `expected no comparison on a bare-number obligation; got ${JSON.stringify(obligation)}`
    );
  }
);

// @SCN-MUT-001
Then("it holds nothing a measured Evidence Obligation did not already hold", function () {
  // The regression guard the bare form exists for, asserted on the KEY SET rather than on the
  // fields read one at a time: a widened index that leaked a term into the obligation would
  // satisfy every field assertion above and change what the ledger serialises for any row authored
  // in the bare form, which is the one thing this scenario promises will not happen.
  assert.deepEqual(Object.keys(obligationFor("mutation")).sort(), [
    "measured",
    "qualityCheck",
    "staticCheck",
    "threshold",
  ]);
});

// @SCN-MUT-002
Given(
  "the target's manifest authors {float} as an at-least threshold for {string} on {string}",
  function (bar: number, check: string, scnId: string) {
    // The OBJECT form, which is the extension: the comparison is named by the KEY beside the
    // number, in the same entry, so a manifest cannot author a bar without saying which way it
    // reads and the two halves cannot drift apart.
    thresholds = thresholdsOf({ [scnId]: { [check]: { atLeast: bar } } });
    steplessRows = [];
    // Kept so @SCN-MUT-004 can put a measurement exactly ON this bar without the fixture and the
    // scenario naming the same number twice and drifting apart the day one of them is edited.
    authoredBar = bar;
  }
);

// @SCN-MUT-002
Then(
  "that Evidence Obligation names the at-least comparison, so its bar is read as a floor",
  function () {
    const obligation = obligationFor("mutation");
    assert.equal(
      obligation.atLeast,
      true,
      `expected the at-least comparison on the obligation; got ${JSON.stringify(obligation)}`
    );
  }
);

// @SCN-MUT-003
Given(
  "the target's manifest authors a threshold for {string} on {string} naming a comparison this reads as neither at-least nor at-most",
  function (check: string, scnId: string) {
    // The fault the object form makes newly reachable: a key somebody expected to work. The number
    // beside it is a perfectly good one, which is the point — nothing here is unreadable except
    // the side of it that satisfies, and that is the half no default may supply.
    thresholds = thresholdsOf({ [scnId]: { [check]: { direction: "up", value: 91.87 } } });
    steplessRows = [];
  }
);

// @SCN-MUT-003
Then(
  "an Evidence Obligation is still raised for {string}, measured as any other measured check is",
  function (check: string) {
    // The entry NAMED this check, so the check is measured; whether its bar could be read is a
    // separate question. Raising nothing would leave the tag unrecognised and move the complaint
    // to the tag grammar, where it would read as a check nobody wrote rather than as a bar nobody
    // authored.
    assert.equal(
      obligationFor(check).measured,
      true,
      `expected the obligation to be raised measured; got ${JSON.stringify(obligationFor(check))}`
    );
  }
);

// @SCN-MUT-003
Then(
  "that Evidence Obligation holds no bar at all, rather than one the engine picked a direction for",
  function () {
    // Asserted on the KEY SET, because the reading that must not be reachable is a bar the engine
    // supplied a direction for: `threshold: 91.87` with no comparison would satisfy every
    // field-by-field read and green every run below the number the target actually authored.
    assert.deepEqual(Object.keys(obligationFor("mutation")).sort(), [
      "measured",
      "qualityCheck",
      "staticCheck",
    ]);
  }
);

// ---------------------------------------------------------------------------
// @SCN-MUT-004 — the reconciliation, read the way the DEBIT names rather than the way the first
// measured check happened to be written.
// ---------------------------------------------------------------------------

/** The measurement the run produced, as the artefact carries it. */
let measurementArtefact: { measurements: unknown[] };

/** The Ledger the corpus and that measurement reconciled to. */
let ledger: Ledger;

/**
 * The whole seam in one call — the corpus read against the target's bars, the artefact read into
 * citing credits, and the reconciler handed both. Taken as a function rather than inlined in the
 * When because the boundary is the same reconciliation over one different number, and reaching it
 * any other way would be asserting something other than what the scenario ran.
 */
function reconciledWith(artefact: { measurements: unknown[] }): Ledger {
  return reconcile(
    parseScenarios(corpusOf(steplessRows), [], measuredCheckTags(thresholds), thresholds),
    parseMeasuredEvidenceObservations(artefact)
  );
}

function rowOf(book: Ledger, scnId: string): ScenarioReconciliation {
  const row = book.scenarioReconciliations.find((r) => r.scnId === scnId);
  assert.ok(row, `expected a Ledger row for ${scnId}`);
  return row;
}

function itemFor(book: Ledger, scnId: string, check: string) {
  const item = rowOf(book, scnId).qualityCheckReconciliations.find((r) => r.staticCheck === check);
  assert.ok(item, `expected a quality-check reconciliation for "${check}" on ${scnId}`);
  return item;
}

// @SCN-MUT-004
Given(
  "the run measured {float} for {string} on {string}",
  function (measured: number, check: string, scnId: string) {
    // A number and nothing else, which is the whole of what a credit on this axis is. The side of
    // the bar that satisfies it was authored on the debit, two steps up.
    measurementArtefact = { measurements: [{ scnId, checkTag: check, measured }] };
    authoredMeasurement = measured;
  }
);

// @SCN-MUT-004
When("the corpus and that measurement are reconciled", function () {
  ledger = reconciledWith(measurementArtefact);
});

// @SCN-MUT-004
Then(
  "the row {string} reconciles satisfied on the bare check {string}",
  function (scnId: string, check: string) {
    // 92.52 against 91.87. Read as the ceiling this axis was built as, the same two numbers are
    // `failing` — so this assertion cannot pass unless the comparison came off the obligation.
    assert.equal(itemFor(ledger, scnId, check).outcome, "satisfied");
  }
);

// @SCN-MUT-004
Then("the row is balanced", function () {
  // Asserted rather than assumed. `satisfied` is not in OUT_OF_BALANCE_OUTCOMES, so nothing about
  // the roll-up is special-cased for a floor — which is exactly why an arm that produced the
  // outcome and failed to reach the verdict would be invisible.
  assert.equal(rowOf(ledger, "SCN-MSD-001").verdict, "balanced");
});

// @SCN-MUT-004
Then("a measurement sitting exactly on that bar reconciles satisfied too", function () {
  // AT OR ABOVE, NOT ABOVE. A floor a score sits exactly on has been met; `>` would red a run for
  // hitting its bar precisely, which is not a rule anyone would state out loud and is exactly the
  // kind of thing that survives review unnoticed.
  const onTheBar = reconciledWith({
    measurements: [{ scnId: "SCN-MSD-001", checkTag: "mutation", measured: authoredBar }],
  });
  assert.equal(itemFor(onTheBar, "SCN-MSD-001", "mutation").outcome, "satisfied");
});

// ---------------------------------------------------------------------------
// @SCN-MUT-005 — the FAILING arm of the same comparison, and the verdict it has to reach.
//
// ITS OWN STEP TEXT, DELIBERATELY. `Then the row is out-of-balance` is already registered
// GLOBALLY by tests/steps/ciRunTime.steps.ts, against that file's module-local ledger. Cucumber's
// registry is process-wide, so the unqualified wording here would have bound to that step and
// asserted a verdict over a corpus this file never built — green, and about the wrong run. The
// @SCN is named on the step instead, which is both unambiguous and the row the assertion is
// actually about.
// ---------------------------------------------------------------------------

// @SCN-MUT-005
Then(
  "the row {string} reconciles failing on the bare check {string}",
  function (scnId: string, check: string) {
    // 91.4 against 91.87. Read as the ceiling this axis was BUILT as, the same two numbers are
    // `satisfied` — so this assertion cannot pass while the engine ignores what the debit said.
    // That disagreement is the fixture's construction and not a second claim: the at-most reading
    // is @SCN-CIP-004/-005's and is not re-asserted here.
    assert.equal(itemFor(ledger, scnId, check).outcome, "failing");
  }
);

// @SCN-MUT-005
Then("that reconciling item carries both the measurement and the bar", function () {
  // "mutation is failing" sends a reader nowhere; "91.4 against a floor of 91.87" sends them
  // somewhere. Both numbers are pinned as PRESENT on the one item — the bar off the debit, the
  // measurement off the credit. Whether they are RENDERED is @SCN-MUT-006's.
  const item = itemFor(ledger, "SCN-MSD-001", "mutation");
  assert.equal(item.evidenceObligation?.threshold, authoredBar);
  assert.equal(
    (item.evidenceObservation as { measured?: number } | undefined)?.measured,
    authoredMeasurement
  );
});

// @SCN-MUT-005
Then("the row {string} is out-of-balance", function (scnId: string) {
  // ASSERTED, NOT ASSUMED. A route that produced a failing outcome and quietly failed to reach the
  // run's verdict would be the exact watermelon this tool exists to catch, produced by the tool.
  // `failing` is in OUT_OF_BALANCE_OUTCOMES and nothing about a floor is special-cased there —
  // which is precisely why an arm that missed the verdict would be invisible.
  assert.equal(rowOf(ledger, scnId).verdict, "out-of-balance");
});

// ---------------------------------------------------------------------------
// @SCN-MUT-006 — the RENDER: the comparison the debit named, carried onto the page and into the
// JSON beside the two numbers it qualifies.
//
// ITS OWN STEP TEXT, for the reason @SCN-MUT-005's block records. ciRunTime.steps.ts already
// registers "the corpus and the measurements are reconciled and rendered", "the markdown names the
// check ... with its measurement ... and its threshold ..." and "the JSON carries the measurement
// and the threshold on the row's own entries" globally, over its own module-local fixtures.
// ---------------------------------------------------------------------------

/** The two renderings of the one reconciliation this scenario built. */
let markdown: string;
let json: string;

/** The sibling provenance argument the renderers require; the header above the row is not read. */
const MUT_CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

/**
 * The measured row's cell, scoped to the Scenario Reconciliations ledger.
 *
 * Scoped rather than searched whole-document because the report also carries a per-check summary
 * table whose first cells are the same @SCN and the same check tag — a whole-report search would
 * find that row instead and the assertions would be about a different cut of the same fact.
 */
function ledgerLine(scnId: string): string {
  const start = markdown.indexOf("## Scenario Reconciliations");
  const section = start >= 0 ? markdown.slice(start) : markdown;
  const line = section.split("\n").find((l) => l.startsWith(`| ${scnId} `));
  assert.ok(line, `expected a ledger row for ${scnId}`);
  return line;
}

// @SCN-MUT-006
When("the corpus and that measurement are reconciled and rendered", function () {
  const reconciliation = evidenceReconciliationOf(
    parseScenarios(corpusOf(steplessRows), [], measuredCheckTags(thresholds), thresholds),
    parseMeasuredEvidenceObservations(measurementArtefact),
    [],
    false,
    false
  );
  markdown = renderMarkdown(reconciliation, MUT_CTX);
  json = renderJson(reconciliation, MUT_CTX);
});

// @SCN-MUT-006
Then(
  "the row {string} names the check {string} with its measurement {float} held against a bar of at least {float}",
  function (scnId: string, check: string, measured: number, bar: number) {
    // THREE TERMS, NOT TWO. "91.4 against 91.87" is the report this axis was already able to
    // produce, and it reads as a comfortable pass to anybody who has met a threshold as a ceiling.
    // The comparison is the term that makes the other two actionable, so it is asserted as the
    // words beside the number rather than as the number's mere presence.
    const line = ledgerLine(scnId);
    assert.ok(line.includes(check), `expected the check ${check} in: ${line}`);
    assert.ok(line.includes(String(measured)), `expected the measurement ${measured} in: ${line}`);
    assert.ok(line.includes(`at least ${bar}`), `expected the bar named as a floor in: ${line}`);
  }
);

// @SCN-MUT-006
Then("that row does not read its bar as a maximum", function () {
  // The half of the title that says RATHER THAN A MAXIMUM. A renderer that named a comparison from
  // a constant would satisfy the step above on every row it ever drew; only the negative shows the
  // words came off the obligation.
  const line = ledgerLine("SCN-MSD-001");
  assert.ok(!line.includes("at most"), `expected the floor not to read as a ceiling in: ${line}`);
});

// @SCN-MUT-006
Then(
  "the JSON carries that bar with the comparison the obligation named, on the row's own entries",
  function () {
    // Through the OBLIGATION's own entry rather than a parallel measured-only field — which is
    // why the comparison is asserted in the serialised report rather than on the object. The
    // serialisation is witnessed by @SCN-RMD-007, which re-renders markdown from the parsed JSON
    // and asserts byte-identity (3F-3325).
    const report = JSON.parse(json) as {
      ledger: {
        scenarioReconciliations: {
          scnId: string;
          qualityCheckReconciliations: {
            staticCheck?: string;
            evidenceObligation?: { threshold?: number; atLeast?: true };
          }[];
        }[];
      };
    };
    const row = report.ledger.scenarioReconciliations.find((r) => r.scnId === "SCN-MSD-001");
    assert.ok(row, "expected the row in the serialised report");
    const item = row.qualityCheckReconciliations.find((r) => r.staticCheck === "mutation");
    assert.ok(item, "expected the measured item in the serialised report");
    assert.equal(item.evidenceObligation?.threshold, authoredBar);
    assert.equal(item.evidenceObligation?.atLeast, true);
  }
);

// ---------------------------------------------------------------------------
// @SCN-MUT-012 — the bar that names a GATE rather than a number, resolved at the APP EDGE.
//
// THE WHOLE ARM RUNS THROUGH `resolveThresholds`, AND THAT IS THE CLAIM. Every scenario above
// composes its index with the engine's own `thresholdsOf`, because the bar it authors is
// already a number by the time the engine is handed it. This one cannot: the substitution IS the
// behaviour, so the manifest goes to the edge resolver and the index under test is whatever
// that resolver decided to pass on.
//
// AND THE RECORD GOES TO A TREE OUTSIDE THIS ONE. A record planted inside the working directory
// cannot tell "the root you handed me" from "the root I assumed" — the term that fails in silence,
// and the one that would let this repository's own record answer for a target that never wrote one.
// ---------------------------------------------------------------------------

/** Trees planted for this feature's record fixtures, removed when the scenario ends. */
const plantedRoots: string[] = [];

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** The tree the target keeps its record in — never this repository's own. */
let recordRoot: string;

/** The gate that record banks, and the two figures the bar is derived from. */
let bankedGate: string;
let bankedKills: number;
let bankedAllowance: number;

/** A record's text, as a project authors one. */
function recordTextOf(gate: string, detected: number, total: number, slack: number): string {
  return `mutation-gates:
  ${gate}:
    detected: ${detected}
    total: ${total}
    slack-mutants: ${slack}
    slack-reason: "measured non-determinism on this gate"
`;
}

/** Plant a target tree holding that record under the conventional name, and answer with its root. */
function plantRecord(text: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "mutation-score-record-"));
  plantedRoots.push(root);
  assert.ok(
    !root.startsWith(process.cwd()),
    `the target's tree at ${root} sits inside the working directory, so this arm proves nothing about which tree was read.`
  );
  writeFileSync(path.join(root, RECORD_FILE), text, "utf8");
  return root;
}

/** The manifest naming the gate rather than a figure, as the target authors it. */
function manifestNaming(gate: string, check: string, scnId: string) {
  return { specController: { thresholds: { [scnId]: { [check]: { atLeast: { mutationGate: gate } } } } } };
}

// @SCN-MUT-012
Given(
  "the target's record banks the gate {string} at {int} kills over {int} mutants, with an allowance of {int}",
  function (gate: string, detected: number, total: number, slack: number) {
    bankedGate = gate;
    bankedKills = detected;
    bankedAllowance = slack;
    recordRoot = plantRecord(recordTextOf(gate, detected, total, slack));
  }
);

// @SCN-MUT-012
Given(
  "the target's manifest authors an at-least threshold for {string} on {string} naming that gate rather than a number",
  function (check: string, scnId: string) {
    thresholds = resolveThresholds(
      manifestNaming(bankedGate, check, scnId),
      killFloorReaderFor(recordRoot)
    );
    steplessRows = [];
  }
);

// @SCN-MUT-012
Then(
  "the Evidence Obligation raised for {string} holds the bar {int}, the recorded kills less that allowance",
  function (check: string, bar: number) {
    // The arithmetic is asserted against the fixture before the bar is, so the Gherkin's 699 and the
    // record's 701-less-2 cannot part company the day one of them is edited.
    assert.equal(bar, bankedKills - bankedAllowance);
    assert.equal(obligationFor(check).threshold, bar);
  }
);

// @SCN-MUT-012
Then(
  "it holds nothing a measured Evidence Obligation raised from a bare number did not already hold",
  function () {
    // ASSERTED AS AN IDENTITY, NOT AS A KEY SET. What crosses the edge is a number, so the
    // obligation raised from a reference must be the very one the same manifest with that number
    // typed into it raises — field for field. An index that carried the reference any further
    // than this resolver would satisfy a key-set check and still hand the engine a shape it has
    // never had to read.
    const typed = thresholdsOf({
      "SCN-MSD-001": { mutation: { atLeast: bankedKills - bankedAllowance } },
    });
    const fromANumber = parseScenarios(
      corpusOf(steplessRows),
      [],
      measuredCheckTags(typed),
      typed
    );

    assert.deepEqual(obligationFor("mutation"), fromANumber[0]!.evidenceObligations[0]);
  }
);

// @SCN-MUT-012
Then(
  "a run measuring {int} kills over a population of any size reconciles satisfied on that row",
  function (kills: number) {
    const run = { measurements: [{ scnId: "SCN-MSD-001", checkTag: "mutation", measured: kills }] };
    assert.equal(itemFor(reconciledWith(run), "SCN-MSD-001", "mutation").outcome, "satisfied");

    // OF ANY SIZE, PROVED BY MOVING IT. The same gate, the same kills, the same allowance, banked
    // over a population half as large again: an edge that reached its bar by dividing anything
    // would hold this row to a different number, and the run would red for code nobody wrote.
    thresholds = resolveThresholds(
      manifestNaming(bankedGate, "mutation", "SCN-MSD-001"),
      killFloorReaderFor(
        plantRecord(recordTextOf(bankedGate, bankedKills, bankedKills * 2, bankedAllowance))
      )
    );

    assert.equal(itemFor(reconciledWith(run), "SCN-MSD-001", "mutation").outcome, "satisfied");
  }
);
