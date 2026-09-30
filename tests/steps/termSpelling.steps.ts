import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

import { parseScenarios, reconcile } from "@3f-consulting/spec-controller-core";
import type { Ledger, ScenarioReconciliation } from "@3f-consulting/spec-controller-core";
import { resolveDeferralTags } from "@3f-consulting/spec-controller-core/internal";
import type { ScriptCitation } from "@3f-consulting/spec-controller-core/internal";
import { citationOfCitedRow } from "../../packages/core/src/parse/fitnessCitations.js";

import { DEFAULT_DEFERRAL_TAGS } from "../../packages/spec-controller/src/deferralTags.js";

const FITNESS_SCN = "SCN-TRM-901";
const DEFERRED_SCN = "SCN-TRM-902";

const DEFERRAL_TAG = "spike";
const INTERIOR_TAG = "cucumber@e2e";

const CORPUS = `@TRM
Feature: the target's own corpus

  @fitness @${FITNESS_SCN}
  Scenario: a converted check the target has configured a row for

  @${DEFERRAL_TAG} @unit @${DEFERRED_SCN}
  Scenario: a behaviour the target has deferred
    Given the target has deferred this behaviour
`;

let manifest: { specController?: Record<string, unknown> };

let ledger: Ledger;

let deferralTags: readonly string[];

let citedStepId: string;

let citation: ScriptCitation | null;

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

Given(
  "a target that hand-authors its terms — a configured row's scn, a check step's id:, and a deferral tag",
  function () {
    manifest = {
      specController: {
        fitnessChecks: [{ scn: FITNESS_SCN }],
        deferralTags: [DEFERRAL_TAG, INTERIOR_TAG],
      },
    };
    citedStepId = FITNESS_SCN;
  }
);

Given(
  "every one of them is spelled with whitespace in front of its sigil, the one spelling nothing in this repository generates",
  function () {
    const padded = (term: string): string => `  @${term}`;
    manifest = {
      specController: {
        fitnessChecks: [{ scn: padded(FITNESS_SCN) }],
        deferralTags: [padded(DEFERRAL_TAG), `  ${INTERIOR_TAG}  `, "  @  "],
      },
    };
    citedStepId = padded(FITNESS_SCN);
  }
);

When("the corpus is reconciled against that target", function () {
  deferralTags = resolveDeferralTags(manifest, DEFAULT_DEFERRAL_TAGS);
  ledger = reconcile(parseScenarios(CORPUS, deferralTags), []);
  citation = citationOfCitedRow(citedStepId);
});

Then(
  "each term names exactly the pair its bare spelling names, so nothing the target plainly authored is dormant",
  function () {
    const converted = rowOf(FITNESS_SCN).qualityCheckReconciliations.find(
      (r) => r.qualityCheck === "fitness"
    );
    assert.ok(
      converted,
      `expected ${FITNESS_SCN} to owe the fitness obligation its configured row declares; got ${JSON.stringify(
        rowOf(FITNESS_SCN).qualityCheckReconciliations
      )}`
    );

    assert.deepEqual(citation, { scnId: FITNESS_SCN });

    assert.ok(deferralTags.includes(DEFERRAL_TAG), `expected ${DEFERRAL_TAG} in ${JSON.stringify(deferralTags)}`);
    assert.equal(rowOf(DEFERRED_SCN).pendingItems.length, 1);
    assert.equal(rowOf(DEFERRED_SCN).verdict, "balanced");
  }
);

Then(
  "a term carrying an @ inside itself keeps it, because only a LEADING sigil is a sigil",
  function () {
    assert.ok(
      deferralTags.includes(INTERIOR_TAG),
      `expected the interior-@ deferral tag ${INTERIOR_TAG}; got ${JSON.stringify(deferralTags)}`
    );
    assert.ok(!deferralTags.includes("cucumber"), "expected the interior @ neither eaten nor split");
  }
);

Then(
  "a term that is nothing but whitespace and a sigil names no pair at all, and is dropped as an empty one is",
  function () {
    assert.ok(!deferralTags.includes("@"), `expected no "@" deferral tag; got ${JSON.stringify(deferralTags)}`);
    assert.ok(!deferralTags.includes(""), `expected no empty deferral tag; got ${JSON.stringify(deferralTags)}`);
  }
);
