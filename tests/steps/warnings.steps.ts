import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { parseScenarios, evidenceReconciliationOf } from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import type { Scenario, EvidenceObservation } from "@3f-consulting/spec-controller-core";
import type { RunContext } from "@3f-consulting/spec-controller-core";

let scenarios: Scenario[];
let evidenceObservations: EvidenceObservation[];
let markdown: string;

const CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

function ledgerRowCells(scnId: string): { verdict: string; items: string } {
  const ledgerStart = markdown.indexOf("## Scenario Reconciliations");
  const ledger = ledgerStart >= 0 ? markdown.slice(ledgerStart) : markdown;
  const row = ledger.split("\n").find((line) => {
    if (!line.startsWith("|")) return false;
    const cells = line.split("|").map((c) => c.trim());
    return cells[1] === scnId;
  });
  assert.ok(row, `expected a ledger row for ${scnId}; got:\n${markdown}`);
  const cells = row.split("|").map((c) => c.trim());
  return { verdict: cells[2] ?? "", items: cells[3] ?? "" };
}

Given(
  "a scenario {string} with no evidence-obligation tags",
  function (scnId: string) {
    const feature = [
      "@WRN",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${scnId}`,
      "    Scenario: a fixture scenario",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
    evidenceObservations = [];
  }
);

When("the reconciler runs over the scenarios", function () {
  markdown = renderMarkdown(evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false), CTX);
});

Then(
  "the ledger reports {string} as a both-missing reconciliation, out of balance",
  function (scnId: string) {
    const { verdict, items } = ledgerRowCells(scnId);
    assert.ok(
      items.includes("Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"),
      `expected ${scnId}'s reconciling items to include a both-missing item; got "${items}"`
    );
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance; got "${verdict}"`
    );
  }
);

Then("the report carries no warnings section", function () {
  assert.ok(
    !markdown.includes("## Warnings"),
    `expected NO "## Warnings" section (dissolved); got:\n${markdown}`
  );
});
