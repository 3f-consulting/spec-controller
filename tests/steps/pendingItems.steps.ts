/**
 * Step definitions for features/pending-items.feature — the @SCN-PND-001 @integration
 * arm: a `<quality-check>pending` tag flows through the REAL `parseScenarios` and
 * derives a pending evidence obligation.
 *
 * @SCN-PND-001 — bidirectional evidence marker (Evidence Manifesto §9). The @unit arm
 * (packages/core/src/parse/scenarios.test.ts) proves the `pendingQualityCheck` helper in
 * isolation; this @integration arm proves the flag flows through `parseScenarios` over a
 * PLANTED tests/fixtures/ feature-string — never a real `@<qc>pending` scenario in the
 * scanned features/ corpus (fixture policy, evidence-manifesto §11B).
 *
 * The fixture is read once via readFileSync (IO in the test layer, not the pure core) and
 * parsed by the pure `parseScenarios`. For each Examples row the assertion scopes to the
 * pending obligation at the row's quality-check: it reds if `parseScenarios` does not derive
 * a `{ qualityCheck, pending: true }` obligation from the row's tag.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseScenarios } from "@3f-consulting/spec-controller-core";
import type { Scenario, EvidenceObligation } from "@3f-consulting/spec-controller-core";

const FIXTURE = join(process.cwd(), "tests/fixtures/pending-tags/features/target.feature");
const SUFFIX_FIXTURE = join(
  process.cwd(),
  "tests/fixtures/pending-tags/features/suffix-significance.feature"
);

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let pendingTag: string;
let obligations: EvidenceObligation[];
// @SCN-PND-002 — the parsed suffix-significance fixture scenarios, keyed by @SCN id.
let suffixScenarios: Scenario[];

// @SCN-PND-001
Given("a planted fixture scenario tagged {string}", function (tag: string) {
  // Record the tag under test; the parse happens in the When over the planted fixture.
  pendingTag = tag;
});

// @SCN-PND-001
When("the parser derives its evidence obligations", function () {
  // Feed the PLANTED tests/fixtures/ feature-string to the pure parser — the fixture
  // carries a scenario per `<qc>pending` tag, so its parsed obligations are the derivation
  // under test. (pendingTag is asserted-against in the Then; the fixture is the source.)
  assert.ok(pendingTag, "expected a pending tag to have been recorded");
  const source = readFileSync(FIXTURE, "utf8");
  const scenarios: Scenario[] = parseScenarios(source);
  obligations = scenarios.flatMap((s) => s.evidenceObligations);
});

// @SCN-PND-001
Then("it declares a pending {string} obligation", function (qualityCheck: string) {
  // Scope to the pending obligation at this row's quality-check: parseScenarios must have
  // derived exactly one `{ qualityCheck, pending: true }` obligation from the planted
  // fixture. Reds before the parser recognises `<qc>pending` (no obligation carries pending).
  const pendingAtCheck = obligations.filter(
    (o) => o.qualityCheck === qualityCheck && o.pending === true
  );
  assert.equal(
    pendingAtCheck.length,
    1,
    `expected exactly one pending "${qualityCheck}" obligation derived from the planted fixture; got ${
      pendingAtCheck.length
    } (all obligations: ${JSON.stringify(obligations)})`
  );
  // A pending obligation is one-sided: no guard payload (the guard doesn't exist yet).
  assert.equal(
    pendingAtCheck[0]!.guard,
    undefined,
    `a pending obligation carries no guard payload; got guard="${pendingAtCheck[0]!.guard}"`
  );
});

// @SCN-PND-002 — the `pending` suffix makes `@integrationpending` a SEPARATE recognition
// from `@integration`: the two never collide. Proved through the REAL parseScenarios over a
// PLANTED tests/fixtures/ feature-string (the bare-integration scenario @SCN-PDS-001 and the
// integration-pending scenario @SCN-PDS-002) — never a real `@<qc>pending` scenario in the
// scanned features/ corpus (fixture policy, evidence-manifesto §11B). The @unit arm
// (packages/core/src/parse/scenarios.test.ts, [SCN-PND-002]) proves the same non-collision
// over inline strings in isolation.
Given(
  "the planted suffix-significance fixture — a bare `@integration` scenario alongside an `@integrationpending` one",
  function () {
    // The fixture (both scenarios) is the source; the parse happens in the When.
  }
);

When("the parser derives each scenario's evidence obligations", function () {
  const source = readFileSync(SUFFIX_FIXTURE, "utf8");
  suffixScenarios = parseScenarios(source);
});

Then(
  "the bare `@integration` scenario declares a plain {string} obligation and no pending one",
  function (qualityCheck: string) {
    const scenario = suffixScenarios.find((s) => s.scnId === "SCN-PDS-001");
    assert.ok(scenario, "expected the bare-integration fixture scenario (SCN-PDS-001)");
    const atCheck = scenario.evidenceObligations.filter((o) => o.qualityCheck === qualityCheck);
    assert.equal(
      atCheck.length,
      1,
      `expected exactly one "${qualityCheck}" obligation on the bare scenario; got ${
        atCheck.length
      } (${JSON.stringify(scenario.evidenceObligations)})`
    );
    // The bare tier tag gains NO pending obligation — the suffix is significant.
    assert.equal(
      atCheck[0]!.pending,
      undefined,
      `a bare @integration must NOT gain a pending obligation; got ${JSON.stringify(atCheck[0])}`
    );
  }
);

Then(
  "the `@integrationpending` scenario declares a pending {string} obligation and no plain one",
  function (qualityCheck: string) {
    const scenario = suffixScenarios.find((s) => s.scnId === "SCN-PDS-002");
    assert.ok(scenario, "expected the integration-pending fixture scenario (SCN-PDS-002)");
    const atCheck = scenario.evidenceObligations.filter((o) => o.qualityCheck === qualityCheck);
    assert.equal(
      atCheck.length,
      1,
      `expected exactly one "${qualityCheck}" obligation on the pending scenario; got ${
        atCheck.length
      } (${JSON.stringify(scenario.evidenceObligations)})`
    );
    // The pending tag gains a pending obligation and NOT a plain (non-pending) one.
    assert.equal(
      atCheck[0]!.pending,
      true,
      `an @integrationpending must gain a pending obligation; got ${JSON.stringify(atCheck[0])}`
    );
  }
);
