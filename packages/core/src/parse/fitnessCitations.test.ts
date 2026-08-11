/**
 * @unit for @SCN-LNT-001 — the citation seam's SECOND hop (bare check tag → the fitness
 * scenario's `@SCN`, read from the corpus) and the two hops composed.
 *
 * Bidirectional evidence: the describes carry the SCN-LNT-001 id, back-linking to
 * features/fitness-reconciliation.feature's @SCN-LNT-001 scenario.
 */

import { describe, it, expect } from "vitest";
import { checkRegistryOf } from "../domain/checkRegistry.js";
import { citationOfScript, fitnessCitations } from "./fitnessCitations.js";
import { parseTaggedScenarios } from "./scenarios.js";

const REGISTRY = checkRegistryOf({
  "lint:complexity": "complexity",
  typecheck: "typecheck",
});

/** The registered tag set, as the corpus hop receives it. */
const CHECK_TAGS = ["complexity", "typecheck"];

describe("[SCN-LNT-001] fitnessCitations reads each check's scenario off the corpus", () => {
  it("maps a registered check tag to the @SCN of the scenario carrying it", () => {
    const source = `@AAA
Feature: alpha

  @complexity @SCN-AAA-001
  Scenario: complexity stays under the threshold

  @typecheck @SCN-AAA-002
  Scenario: the tree type-checks
`;

    expect([...fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS)]).toEqual([
      ["complexity", "SCN-AAA-001"],
      ["typecheck", "SCN-AAA-002"],
    ]);
  });

  it("reads a check tag the scenario INHERITS, because cucumber would", () => {
    const source = `@AAA @complexity
Feature: alpha

  @SCN-AAA-001
  Scenario: complexity stays under the threshold
`;

    expect(fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS).get("complexity")).toBe(
      "SCN-AAA-001"
    );
  });

  it("ignores a tag no registry names — an unknown tag is not a candidate check", () => {
    const source = `@AAA
Feature: alpha

  @unit @smoke @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;

    expect(fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS).size).toBe(0);
  });

  it("gives one check to the FIRST scenario naming it, leaving the second with no credit", () => {
    // The LNT-011 ruling: one run is one credit, so it cites one @SCN. Merging the two would have
    // to invent which scenario the credit means; the corpus has not said, and the second
    // scenario's obligation is left to reconcile `missing` where it can be seen.
    const source = `@AAA
Feature: alpha

  @complexity @SCN-AAA-001
  Scenario: complexity stays under the threshold

  @complexity @SCN-AAA-002
  Scenario: complexity also stays under the threshold
`;

    expect([...fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS)]).toEqual([
      ["complexity", "SCN-AAA-001"],
    ]);
  });

  it("omits a registered check no scenario carries — the uncited check, left uncited", () => {
    const source = `@AAA
Feature: alpha

  @complexity @SCN-AAA-001
  Scenario: complexity stays under the threshold
`;

    const citations = fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS);

    expect(citations.has("typecheck")).toBe(false);
  });
});

describe("[SCN-LNT-001] citationOfScript composes both hops into the @SCN a run cites", () => {
  const source = `@AAA
Feature: alpha

  @complexity @SCN-AAA-001
  Scenario: complexity stays under the threshold
`;
  const citations = fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS);

  it("carries a script handle through to its scenario's @SCN", () => {
    // BOTH TERMS, because the reconciler needs both: the @SCN picks the row, the bare check tag
    // picks which of that row's fitness obligations the credit answers (@SCN-LNT-012).
    expect(citationOfScript("lint:complexity", REGISTRY, citations)).toEqual({
      checkTag: "complexity",
      scnId: "SCN-AAA-001",
    });
  });

  it("is null when the registry does not reach the handle", () => {
    expect(citationOfScript("lint:unregistered", REGISTRY, citations)).toBeNull();
  });

  it("is null when the handle is registered but no scenario carries its check", () => {
    expect(citationOfScript("typecheck", REGISTRY, citations)).toBeNull();
  });
});
