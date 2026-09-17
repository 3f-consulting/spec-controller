/**
 * @unit for @SCN-LDG-020 — the corpus walk, read directly.
 *
 * Bidirectional evidence: the describe carries the @SCN-LDG-020 id matching features/ledger.feature
 * and the @integration steps in tests/steps/ledger.steps.ts. The tag-INHERITANCE cases live with
 * the obligation rule in scenarios.test.ts; what is pinned here is the walk's own output, now that
 * a second corpus reader consumes it instead of re-deriving inheritance for itself.
 *
 * Its own file rather than a further block in scenarios.test.ts, which sits at a `max-lines`
 * exception — and an exception excuses existing debt, never headroom.
 */

import { describe, it, expect } from "vitest";
import { parseTaggedScenarios, type TaggedScenario } from "./scenarios.js";

/**
 * The TAG reading alone. A scenario's EXTENT rides on the same walk (@SCN-SSM-010) and is pinned by
 * that scenario's own arm; dropping it here keeps these rows asserting exactly what they are about.
 */
const tagReading = (scenarios: readonly TaggedScenario[]) =>
  scenarios.map(({ scnId, tags }) => ({ scnId, tags }));

describe("[SCN-LDG-020] parseTaggedScenarios exposes the effective tag set the obligation rule reads", () => {
  it("puts the scenario's OWN tags first, then the inherited ones, outermost first", () => {
    // Own tags lead — that is what makes a scenario's obligations read in the order its own tags
    // name them. The order is the walk's, and a reader that re-derived it would be free to differ.
    const source = `@AAA @integration
Feature: alpha

  @complexity
  Rule: alpha behaves

    @unit @SCN-AAA-001
    Scenario: alpha works
      Given a thing
`;

    expect(tagReading(parseTaggedScenarios(source))).toEqual([
      {
        scnId: "SCN-AAA-001",
        tags: ["unit", "SCN-AAA-001", "AAA", "integration", "complexity"],
      },
    ]);
  });

  it("keeps a scenario carrying no @SCN out of the corpus, and reports the tags bare", () => {
    const source = `@AAA
Feature: alpha

  @unit
  Scenario: alpha works
    Given a thing

  @unit @SCN-AAA-001
  Scenario: beta works
    Given another thing
`;

    expect(tagReading(parseTaggedScenarios(source))).toEqual([
      { scnId: "SCN-AAA-001", tags: ["unit", "SCN-AAA-001", "AAA"] },
    ]);
  });
});
