/**
 * @integration for features/term-spelling.feature — the SEAM a hand-authored term crosses: a
 * target's manifest read into a threshold registry, a configured fitness-check index and a
 * deferral set, the corpus read against all three, the measurement artefact read into citing
 * credits, a check step's own citation read against the configured-row index, and the
 * reconciler handed the result.
 *
 * @SCN-TRM-001 — the bidirectional @integration marker (Evidence Manifesto §9), matching
 * features/term-spelling.feature and the @unit pins in packages/core/src/lib/bareTerm.test.ts and
 * tests/checks/termSpelling.test.ts.
 *
 * WHY THIS ARM AND NOT THE @unit PINS ALONE. Each reading is a pure function and each is provable
 * on its own; what none of them can show is that the term a reading STORES is the term the next
 * lookup ASKS FOR. That is the whole of this defect — seven readings each correct in isolation,
 * every one of them wired to a lookup that asks bare — and it reads green at unit and wrong on the
 * ledger. So this composes the real readers in process, the way ciRunTime.steps.ts does, rather
 * than spawning a binary: the boundary being proved is between the readings, not between a
 * command line and a file.
 *
 * EVERY TERM IS PADDED IN FRONT OF ITS SIGIL, which is the one spelling nothing in this repository
 * generates and the only one a target types by hand. The corpus is spelled the way a feature file
 * always is, because a feature file is what the corpus reader is handed — the asymmetry IS the
 * fault: the target's side is hand-typed and the corpus's side is not.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

import { parseScenarios, reconcile } from "@3f-consulting/spec-controller-core";
import type { Ledger, ScenarioReconciliation } from "@3f-consulting/spec-controller-core";
import {
  isMeasuredObservation,
  measuredCheckTags,
  parseMeasuredEvidenceObservations,
  resolveDeferralTags,
  resolveFitnessChecks,
  resolveThresholds,
} from "@3f-consulting/spec-controller-core/internal";
import type { ScriptCitation } from "@3f-consulting/spec-controller-core/internal";
// NOT ON THE PUBLISHED BOUNDARY (technical design, 3F-3161's `## Technical design` -- "KEPT ...
// citationOfCitedRow and ScriptCitation -- the id: route"). Reached by relative import the way
// tests/steps/lintReconciliation.steps.ts already does for the same function, rather than widening
// `/internal` for one seam test.
import { citationOfCitedRow } from "../../packages/core/src/parse/fitnessCitations.js";

import { killFloorReaderFor } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { DEFAULT_DEFERRAL_TAGS } from "../../packages/spec-controller/src/deferralTags.js";

/** The measured fitness scenario the target holds to a ceiling. */
const MEASURED_SCN = "SCN-TRM-900";
/** The converted fitness scenario the target's own configured row names a characteristic for. */
const FITNESS_SCN = "SCN-TRM-901";
/** The behavioural scenario the target's own deferral tag defers. */
const DEFERRED_SCN = "SCN-TRM-902";

const MEASURED_CHECK = "ci-run-time";
const FITNESS_CHARACTERISTIC = "planted-fitness-check";
const INTERIOR_CHECK = "cucumber@e2e";
const DEFERRAL_TAG = "spike";
const CEILING = 75;
const MEASUREMENT = 40;

/**
 * The corpus, spelled the way a feature file spells tags — no padding anywhere.
 *
 * That is not a convenience: the parser tokenises, so a corpus CANNOT carry a padded tag, and the
 * asymmetry between this side and the target's hand-typed side is exactly where the miss lived.
 */
const CORPUS = `@TRM
Feature: the target's own corpus

  @${MEASURED_CHECK} @${MEASURED_SCN}
  Scenario: the suite completes within its CI threshold

  @fitness @${FITNESS_SCN}
  Scenario: a converted check the target has configured a row for

  @${DEFERRAL_TAG} @unit @${DEFERRED_SCN}
  Scenario: a behaviour the target has deferred
    Given the target has deferred this behaviour
`;

/** The target's `package.json`, as the resolvers at the app edge are handed it. */
let manifest: { specController?: Record<string, unknown> };

/** The measurement artefact the target's run posted. */
let artefact: { measurements: unknown[] };

/** What the whole seam produced. */
let ledger: Ledger;

/** The deferral set the target's manifest resolved to — read by the corpus and asserted directly. */
let deferralTags: readonly string[];

/** The measured check tags the target's thresholds named. */
let measuredTags: readonly string[];

/** The CI check step's own `id:` — hand-authored, and the citation route reads it back bare. */
let citedStepId: string;

/** What `citationOfCitedRow` answered for that step's `id:` against the target's configured rows. */
let citation: ScriptCitation | null;

/** The row this scenario is about, or a failure naming every row there is. */
function rowOf(scnId: string): ScenarioReconciliation {
  const row = ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  assert.ok(
    row,
    `expected a Ledger row for ${scnId}; got ${JSON.stringify(
      ledger.scenarioReconciliations.map((r) => r.scnId)
    )}`
  );
  return row;
}

// @SCN-TRM-001
Given(
  "a target that hand-authors its terms — a threshold's two key levels, a configured row's scn and characteristic, a check step's id:, a deferral tag, and a measurement row's two terms",
  function () {
    // Every port a target hand-authors a term at, in one manifest and one artefact — which is what
    // makes this a seam and not four unit tests in a trench coat. Spelled bare here; the next step
    // pads them.
    manifest = {
      specController: {
        thresholds: {
          [MEASURED_SCN]: { [MEASURED_CHECK]: CEILING, [INTERIOR_CHECK]: CEILING },
        },
        fitnessChecks: [{ scn: FITNESS_SCN, characteristic: FITNESS_CHARACTERISTIC }],
        deferralTags: [DEFERRAL_TAG],
      },
    };
    artefact = {
      measurements: [{ scnId: MEASURED_SCN, checkTag: MEASURED_CHECK, measured: MEASUREMENT }],
    };
    citedStepId = FITNESS_SCN;
  }
);

// @SCN-TRM-001
Given(
  "every one of them is spelled with whitespace in front of its sigil, the one spelling nothing in this repository generates",
  function () {
    // The re-spelling, and the ONLY difference between this scenario and a green one. A term that
    // is nothing but whitespace and a sigil rides along at two of the ports, so the empty reading
    // is proved on the same pass rather than in a scenario of its own.
    const padded = (term: string): string => `  @${term}`;
    manifest = {
      specController: {
        thresholds: {
          [padded(MEASURED_SCN)]: {
            [padded(MEASURED_CHECK)]: CEILING,
            [`  ${INTERIOR_CHECK}  `]: CEILING,
            "  @  ": CEILING,
          },
        },
        fitnessChecks: [{ scn: padded(FITNESS_SCN), characteristic: padded(FITNESS_CHARACTERISTIC) }],
        deferralTags: [padded(DEFERRAL_TAG), "  @  "],
      },
    };
    artefact = {
      measurements: [
        { scnId: padded(MEASURED_SCN), checkTag: padded(MEASURED_CHECK), measured: MEASUREMENT },
        { scnId: "  @  ", checkTag: padded(MEASURED_CHECK), measured: MEASUREMENT },
      ],
    };
    citedStepId = padded(FITNESS_SCN);
  }
);

// @SCN-TRM-001
When("the corpus is reconciled against that target", function () {
  // THE WHOLE SEAM IN ONE STEP. Readings of the target's hand-typed terms, the corpus read
  // against them, the artefact read into citing credits, a check step's own citation read
  // against the configured-row index, and the reconciler handed both sides. A reading that
  // stores a term the next lookup cannot ask for shows here and nowhere else.
  const thresholds = resolveThresholds(manifest, killFloorReaderFor(process.cwd()));
  const fitnessChecks = resolveFitnessChecks(manifest, killFloorReaderFor(process.cwd()));
  deferralTags = resolveDeferralTags(manifest, DEFAULT_DEFERRAL_TAGS);
  measuredTags = measuredCheckTags(thresholds);
  ledger = reconcile(
    parseScenarios(CORPUS, deferralTags, measuredTags, thresholds, fitnessChecks),
    parseMeasuredEvidenceObservations(artefact)
  );
  citation = citationOfCitedRow(citedStepId, fitnessChecks);
});

// @SCN-TRM-001
Then(
  "each term names exactly the pair its bare spelling names, so nothing the target plainly authored is dormant",
  function () {
    // THE MEASURED PAIR — both key levels of the threshold, and both terms of the credit. Satisfied
    // is the whole claim: the bar was found, the credit posted to the row that raised it, and the
    // comparison was made. A padded key leaves this row raising nothing and the credit citing a
    // scenario the corpus never named.
    const measured = rowOf(MEASURED_SCN).qualityCheckReconciliations.find(
      (r) => r.staticCheck === MEASURED_CHECK
    );
    assert.ok(measured, `expected a reconciliation for ${MEASURED_CHECK} on ${MEASURED_SCN}`);
    assert.equal(measured.outcome, "satisfied");
    assert.equal(measured.evidenceObligation?.threshold, CEILING);
    const credit = measured.evidenceObservation;
    assert.ok(credit && isMeasuredObservation(credit), "expected a measured credit on the row");
    assert.equal(credit.measured, MEASUREMENT);
    assert.equal(rowOf(MEASURED_SCN).verdict, "balanced");

    // THE CONFIGURED ROW'S SCN AND CHARACTERISTIC. A converted check's row is the target's own
    // second place to author an obligation, so a row stored under a key still carrying its @
    // would leave this axis-tagged scenario looking half-converted — the tag moved and the row
    // never resolved.
    const converted = rowOf(FITNESS_SCN).qualityCheckReconciliations.find(
      (r) => r.staticCheck === FITNESS_CHARACTERISTIC
    );
    assert.ok(
      converted,
      `expected ${FITNESS_SCN} to owe the configured characteristic ${FITNESS_CHARACTERISTIC}; got ${JSON.stringify(
        rowOf(FITNESS_SCN).qualityCheckReconciliations
      )}`
    );

    // A CHECK STEP'S id:. citationOfCitedRow bares its input on the way in, so a step hand-authored
    // with a stray space still names the configured row its code points at, rather than citing
    // nothing and posting to suspense.
    assert.deepEqual(citation, { checkTag: FITNESS_CHARACTERISTIC, scnId: FITNESS_SCN });

    // THE DEFERRAL TAG. Recognised, so the scenario carrying it defers — its obligation is a
    // Pending Item rather than an unanswered debit, which is the difference between "deferred on
    // purpose" and "out of balance for a reason nobody wrote down".
    assert.ok(deferralTags.includes(DEFERRAL_TAG), `expected ${DEFERRAL_TAG} in ${JSON.stringify(deferralTags)}`);
    assert.equal(rowOf(DEFERRED_SCN).pendingItems.length, 1);
    assert.equal(rowOf(DEFERRED_SCN).verdict, "balanced");
  }
);

// @SCN-TRM-001
Then(
  "a term carrying an @ inside itself keeps it, because only a LEADING sigil is a sigil",
  function () {
    // Padded on both sides and carrying an @ in the middle. Trimming FIRST must not turn that
    // interior @ into a leading one — the pair would be renamed to one no lookup asks for, and the
    // bar would go dormant for the opposite reason.
    //
    // CLAIMED ON THE TARGET'S SIDE, WHICH IS THE ONLY SIDE THAT HAS ONE. Gherkin's tag lexer starts
    // a new tag at every `@`, so `@cucumber@e2e` in a corpus is the two tags `cucumber` and `e2e`
    // and a corpus tag CANNOT carry an interior @ at all. There is therefore no reconciled route
    // for such a pair to travel, and what this arm can honestly say is that the reading the target
    // hand-authored still names it. The credit-side reading of the same spelling is pinned at @unit.
    assert.ok(
      measuredTags.includes(INTERIOR_CHECK),
      `expected the interior-@ check ${INTERIOR_CHECK}; got ${JSON.stringify(measuredTags)}`
    );
    assert.ok(!measuredTags.includes("cucumber"), "expected the interior @ neither eaten nor split");
  }
);

// @SCN-TRM-001
Then(
  "a term that is nothing but whitespace and a sigil names no pair at all, and is dropped as an empty one is",
  function () {
    // Dropped, not stored as "@". A term nobody can ask for reaches the ledger as a bar that can
    // never be settled and a credit citing a scenario nothing carries — a phantom row manufactured
    // out of a stray space.
    assert.ok(!measuredTags.includes("@"), `expected no "@" check tag; got ${JSON.stringify(measuredTags)}`);
    assert.ok(!deferralTags.includes(""), `expected no empty deferral tag; got ${JSON.stringify(deferralTags)}`);
    const invented = ledger.scenarioReconciliations.filter(
      (r) => r.scnId === "@" || r.scnId === ""
    );
    assert.deepEqual(
      invented,
      [],
      `expected no row invented from an empty term; got ${JSON.stringify(invented.map((r) => r.scnId))}`
    );
  }
);
