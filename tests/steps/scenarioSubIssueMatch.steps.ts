/**
 * Step definitions for features/scenario-sub-issue-match.feature — spec-controller's
 * OWN light coverage of the ported hermetic scenario↔sub-issue gate (the
 * @integration half).
 *
 * @SCN-SSM-001 — bidirectional evidence marker for
 * features/scenario-sub-issue-match.feature. Grepping SCN-SSM-001 returns the
 * scenario, this step block, and the @unit test in
 * tests/checks/scnSubIssueGate.test.ts.
 *
 * Parent: 3F-1137 (the port + fork-exemption design).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import {
  decideScnGate,
  type ScnGateInput,
  type ScnGateResult,
} from "../checks/scnSubIssueGate.js";

function baseInput(overrides: Partial<ScnGateInput> = {}): ScnGateInput {
  return {
    addedCodes: [],
    updatedCodes: [],
    deletedCodes: [],
    renumberPairs: [],
    exemptions: [],
    unitEquivalentBehaviourBearing: false,
    unitEquivalentCitedCodes: [],
    uncitedChangedTestBlocks: [],
    hasTicketHandle: false,
    isExternalPr: false,
    prBodyReadable: true,
    ...overrides,
  };
}

let input: ScnGateInput;
let result: ScnGateResult;

// @SCN-SSM-001
Given("an added scenario code on an internal PR that carries a ticket handle", function () {
  input = baseInput({
    addedCodes: ["SCN-LDG-001"],
    hasTicketHandle: true,
    isExternalPr: false,
  });
});

// @SCN-SSM-001
When("the scenario sub-issue gate decides", function () {
  result = decideScnGate(input);
});

// @SCN-SSM-001
Then("the gate passes", function () {
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});
