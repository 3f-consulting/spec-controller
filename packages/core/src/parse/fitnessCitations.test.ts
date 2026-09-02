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
      ["complexity", ["SCN-AAA-001"]],
      ["typecheck", ["SCN-AAA-002"]],
    ]);
  });

  it("reads a check tag the scenario INHERITS, because cucumber would", () => {
    const source = `@AAA @complexity
Feature: alpha

  @SCN-AAA-001
  Scenario: complexity stays under the threshold
`;

    expect(fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS).get("complexity")).toEqual([
      "SCN-AAA-001",
    ]);
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
    //
    // THE CHOICE MOVED ONE FUNCTION ALONG (@SCN-LNT-015), and the ruling did not move with it: the
    // hop now reports both carriers so a registry entry can name the row it credits, and an entry
    // naming NO row still takes the first. So this is read off the composition rather than off the
    // map, and it is the same fact it always was.
    const source = `@AAA
Feature: alpha

  @complexity @SCN-AAA-001
  Scenario: complexity stays under the threshold

  @complexity @SCN-AAA-002
  Scenario: complexity also stays under the threshold
`;
    const citations = fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS);

    expect(citationOfScript("lint:complexity", REGISTRY, citations)).toEqual({
      checkTag: "complexity",
      scnId: "SCN-AAA-001",
    });
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

/**
 * @unit for @SCN-LNT-015 — the relocated arm at hop 2 and at the composition. The corpus hop
 * reports EVERY carrier of a characteristic, and the entry's own `@SCN` picks which row its run
 * credits; an entry naming none still takes the first carrier.
 *
 * Bidirectional evidence: the describe carries the SCN-LNT-015 id, back-linking to
 * features/fitness-reconciliation.feature's @SCN-LNT-015 scenario.
 */
describe("[SCN-LNT-015] the corpus hop reports every carrier, and the entry's @SCN picks the row", () => {
  // TWO SCENARIOS, ONE CHARACTERISTIC — what the collapse produces wherever a characteristic
  // names more than one check.
  const source = `@AAA
Feature: alpha

  @complexity @SCN-AAA-001
  Scenario: complexity stays under the threshold

  @complexity @SCN-AAA-002
  Scenario: the complexity exceptions list stays under its threshold
`;
  const citations = fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS);

  it("lists every scenario carrying the characteristic, in corpus order", () => {
    // The hop already walked past the runners-up and threw them away. Keeping them is what lets
    // the entry's @SCN be answered from ONE lookup, without widening any signature.
    expect(citations.get("complexity")).toEqual(["SCN-AAA-001", "SCN-AAA-002"]);
  });

  it("credits the scenario the entry NAMES, not the first one carrying its characteristic", () => {
    const registry = checkRegistryOf({
      "lint:complexity": { check: "complexity", scn: "SCN-AAA-001" },
      "lint:complexity-exceptions": { check: "complexity", scn: "SCN-AAA-002" },
    });

    // BOTH TERMS AND NO MORE — the citation keeps exactly its two fields, which is the arity
    // claim canon makes about this migration: one arm relocated, nothing added.
    expect(citationOfScript("lint:complexity", registry, citations)).toEqual({
      checkTag: "complexity",
      scnId: "SCN-AAA-001",
    });
    expect(citationOfScript("lint:complexity-exceptions", registry, citations)).toEqual({
      checkTag: "complexity",
      scnId: "SCN-AAA-002",
    });
  });

  it("leaves an entry naming only a characteristic on first-in-corpus — @SCN-LNT-008 stays true", () => {
    // The runner-up still reads missing, LOUDLY, when a characteristic grows a second check
    // without gaining discriminators. That fallback is the compatibility, not an oversight.
    const registry = checkRegistryOf({
      "lint:complexity": "complexity",
      "lint:complexity-exceptions": "complexity",
    });

    expect(citationOfScript("lint:complexity", registry, citations)?.scnId).toBe("SCN-AAA-001");
    expect(citationOfScript("lint:complexity-exceptions", registry, citations)?.scnId).toBe(
      "SCN-AAA-001"
    );
  });
});

/**
 * @unit for @SCN-LNT-016 — the citation is ALL OR NOTHING. An entry naming an `@SCN` the corpus
 * does not carry with that characteristic cites nothing, rather than degrading to the corpus hop
 * and crediting a row nobody named.
 *
 * Bidirectional evidence: the describe carries the SCN-LNT-016 id, back-linking to
 * features/fitness-reconciliation.feature's @SCN-LNT-016 scenario.
 */
describe("[SCN-LNT-016] an @SCN no scenario carries withholds the citation whole", () => {
  const source = `@AAA
Feature: alpha

  @complexity @SCN-AAA-001
  Scenario: complexity stays under the threshold

  @complexity @SCN-AAA-002
  Scenario: the complexity exceptions list stays under its threshold
`;
  const citations = fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS);

  it("cites nothing when the entry names an @SCN absent from the corpus", () => {
    // THE RENUMBERING FAULT. Two artefacts keyed by the same word agree until one is edited, and
    // the wrong answer here is the QUIET one: fall back to the corpus hop, take SCN-AAA-001, and
    // green a row the registry never named while SCN-AAA-002 reads missing.
    const registry = checkRegistryOf({
      "lint:complexity-exceptions": { check: "complexity", scn: "SCN-AAA-003" },
    });

    expect(citationOfScript("lint:complexity-exceptions", registry, citations)).toBeNull();
  });

  it("cites nothing for a NEAR-match — a shared prefix is not a match", () => {
    // No near-match branch exists, and this is what pins that: an id one character out is as
    // absent as one typed against a code that never existed.
    const registry = checkRegistryOf({
      "lint:complexity": { check: "complexity", scn: "SCN-AAA-0011" },
    });

    expect(citationOfScript("lint:complexity", registry, citations)).toBeNull();
  });

  it("withholds BOTH terms, never a half-citation", () => {
    // ALL OR NOTHING is about the OBSERVATION's shape, not only its `@SCN`: a citation returning
    // its `checkTag` with no row would put citation keys on an uncited observation, which is the
    // shape the seam has never emitted.
    const registry = checkRegistryOf({
      "lint:complexity": { check: "complexity", scn: "SCN-ZZZ-009" },
    });

    expect(citationOfScript("lint:complexity", registry, citations)).toBeNull();
  });

  it("leaves the entries around it untouched — the fault is per-entry", () => {
    // A withheld citation is one entry's fact. The sibling naming a row the corpus DOES carry
    // still credits it, so a target learns which entry is wrong rather than losing the axis.
    const registry = checkRegistryOf({
      "lint:complexity": { check: "complexity", scn: "SCN-AAA-001" },
      "lint:complexity-exceptions": { check: "complexity", scn: "SCN-AAA-003" },
    });

    expect(citationOfScript("lint:complexity", registry, citations)).toEqual({
      checkTag: "complexity",
      scnId: "SCN-AAA-001",
    });
    expect(citationOfScript("lint:complexity-exceptions", registry, citations)).toBeNull();
  });
});

/**
 * @unit for @SCN-LNT-017 — the near-match. The `@SCN` an entry names is a real scenario the
 * corpus carries, under a DIFFERENT bare characteristic; the citation is still withheld whole,
 * because a credit is keyed by the PAIR and existence is not membership.
 *
 * Bidirectional evidence: the describe carries the SCN-LNT-017 id, back-linking to
 * features/fitness-reconciliation.feature's @SCN-LNT-017 scenario.
 */
describe("[SCN-LNT-017] an @SCN carrying a different characteristic is not a match", () => {
  // THREE ROWS AND TWO CHARACTERISTICS. SCN-AAA-003 is the near-match's target: real, citable,
  // and carrying `typecheck` rather than `complexity`.
  const source = `@AAA
Feature: alpha

  @complexity @SCN-AAA-001
  Scenario: complexity stays under the threshold

  @complexity @SCN-AAA-002
  Scenario: the complexity exceptions list stays under its threshold

  @typecheck @SCN-AAA-003
  Scenario: the tree type-checks
`;
  const citations = fitnessCitations(parseTaggedScenarios(source), CHECK_TAGS);

  it("files carriers per characteristic, so a row is a member of one list and not the other", () => {
    // WHY EXISTENCE IS NOT MEMBERSHIP, read off the structure the lookup uses. SCN-AAA-003 is in
    // the corpus and in this map, and it is still absent from `complexity`'s carriers.
    expect(citations.get("complexity")).toEqual(["SCN-AAA-001", "SCN-AAA-002"]);
    expect(citations.get("typecheck")).toEqual(["SCN-AAA-003"]);
  });

  it("cites nothing when the named scenario carries a DIFFERENT characteristic", () => {
    // The id resolves — which is exactly what makes this the tempting one to smooth over. A
    // reading that tested existence would credit a row that owes `complexity` nothing.
    const registry = checkRegistryOf({
      "lint:complexity-exceptions": { check: "complexity", scn: "SCN-AAA-003" },
    });

    expect(citationOfScript("lint:complexity-exceptions", registry, citations)).toBeNull();
  });

  it("still credits that same scenario for the characteristic it DOES carry", () => {
    // The control, and it is what makes the arm above an assertion about the PAIR rather than
    // about the row. Nothing is wrong with SCN-AAA-003; it is wrong for `complexity`.
    const registry = checkRegistryOf({ typecheck: { check: "typecheck", scn: "SCN-AAA-003" } });

    expect(citationOfScript("typecheck", registry, citations)).toEqual({
      checkTag: "typecheck",
      scnId: "SCN-AAA-003",
    });
  });

  it("does not fall back to the characteristic's first carrier — the row it was meant for keeps its miss", () => {
    // THE QUIET WRONG ANSWER, refused. Degrading to the corpus hop would green SCN-AAA-001 on a
    // credit that named SCN-AAA-003, while SCN-AAA-002 — the row the author meant — still read
    // missing. The sibling entry naming a row the corpus DOES carry is unaffected.
    const registry = checkRegistryOf({
      "lint:complexity": { check: "complexity", scn: "SCN-AAA-001" },
      "lint:complexity-exceptions": { check: "complexity", scn: "SCN-AAA-003" },
    });

    expect(citationOfScript("lint:complexity", registry, citations)).toEqual({
      checkTag: "complexity",
      scnId: "SCN-AAA-001",
    });
    expect(citationOfScript("lint:complexity-exceptions", registry, citations)).toBeNull();
  });
});
