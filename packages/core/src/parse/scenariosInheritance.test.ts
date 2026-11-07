import { describe, it, expect } from "vitest";
import { parseFeatureCorpus } from "./scenarios.js";
import { parseScenarios, parseUntaggedScenarios } from "./scenarioReaders.test-utils.js";

describe("[CLM-GRD-001] a scenario's named tags include the ones it inherits from its Feature and Rule", () => {
  it("inherits a layer from the FEATURE — the false-green that reads BALANCED today", () => {
    const source = `@AAA @integration
Feature: alpha

  @unit @CLM-AAA-001
  Scenario: alpha works
    Given a thing
`;
    const [scenario] = parseScenarios(source);

    expect(scenario!.claimCode).toBe("CLM-AAA-001");
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheckKind: "unit" },
      { qualityCheckKind: "integration" },
    ]);
  });

  it("inherits a layer from an enclosing RULE", () => {
    const source = `@AAA
Feature: alpha

  @integration
  Rule: alpha behaves

    @unit @CLM-AAA-001
    Scenario: alpha works
      Given a thing
`;
    const [scenario] = parseScenarios(source);

    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheckKind: "unit" },
      { qualityCheckKind: "integration" },
    ]);
  });

  it.each([
    [
      "is BYTE-IDENTICAL on a file that uses no inheritance — the regression bar",
      `@AAA
Feature: alpha

  @unit @integration @CLM-AAA-001
  Scenario: alpha works
    Given a thing

  @fitness @CLM-AAA-002
  Scenario: beta stays inside its threshold
`,
      "fitness",
    ],
    [
      "passes a Feature's layer through its Background to every scenario, and the Background is no scenario",
      `@integration
Feature: alpha

  Background:
    Given a shared precondition

  @unit @CLM-AAA-001
  Scenario: alpha works
    Given a thing

  @CLM-AAA-002
  Scenario: alpha also works
    Given another thing
`,
      "integration",
    ],
  ] as const)("%s", (_title, source, qualityCheckKind) => {
    expect(parseScenarios(source)).toEqual([
      {
        claimCode: "CLM-AAA-001",
        evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration" }],
      },
      {
        claimCode: "CLM-AAA-002",
        evidenceObligations: [{ qualityCheckKind }],
      },
    ]);
  });

  it.each([
    ["an empty file", ""],
    ["a file of comments only", "# alpha is not written yet\n\n# nor is beta\n"],
  ])("holds no scenario in %s, and reads it without throwing", (_label, source) => {
    expect(parseScenarios(source)).toEqual([]);
  });

  it("reads unparseable source as a fault in the parser's own words, never as a parsed file — an empty corpus balances against anything, so it never returns one", () => {
    const parse = parseFeatureCorpus([{ file: "features/broken.feature", source: "not gherkin at all {{{" }]);

    expect(parse).toEqual({
      kind: "unparseable",
      faults: [
        {
          file: "features/broken.feature",
          message:
            "Parser errors:\n(1:1): expected: #EOF, #Language, #TagLine, #FeatureLine, #Comment, #Empty, got 'not gherkin at all {{{'",
        },
      ],
    });
  });
});

describe("[CLM-GRD-002] a scenario whose claim code it inherits from its Feature or Rule is not listed as untagged", () => {
  it.each([
    [
      "Feature",
      `@AAA @unit @CLM-AAA-001
Feature: alpha

  Scenario: the one scenario beneath it
    Given a thing
`,
      [],
    ],
    [
      "Rule",
      `@AAA
Feature: alpha

  @unit @CLM-AAA-001
  Rule: alpha behaves

    Scenario: the one scenario beneath it
      Given a thing

  Rule: beta has no code

    Scenario: a scenario no code reaches
      Given a thing
`,
      ["a scenario no code reaches"],
    ],
  ] as const)("inherited from its %s", (_ancestor, source, untagged) => {
    expect(parseScenarios(source).map(({ claimCode }) => claimCode)).toEqual(["CLM-AAA-001"]);
    expect(parseUntaggedScenarios(source)).toEqual(untagged);
  });
});

describe("[CLM-GRD-003] a code a scenario inherits from its Rule or Feature is one of its codes, so a different code of its own makes two, and the same code makes one", () => {
  const underAncestor = {
    Rule: (own: string): string =>
      `@AAA\nFeature: alpha\n\n  @CLM-AAA-001\n  Rule: alpha behaves\n\n    @unit ${own}\n    Scenario: carries codes\n      Given a thing\n`,
    Feature: (own: string): string =>
      `@AAA @CLM-AAA-001\nFeature: alpha\n\n  @unit ${own}\n  Scenario: carries codes\n    Given a thing\n`,
  } as const;

  it.each(["Rule", "Feature"] as const)(
    "a different code of its own under a %s code raises no obligation under either and is not untagged",
    (ancestor) => {
      const source = underAncestor[ancestor]("@CLM-AAA-002");
      expect(parseScenarios(source)).toEqual([]);
      expect(parseUntaggedScenarios(source)).toEqual([]);
    },
  );

  it.each(["Rule", "Feature"] as const)(
    "the same code of its own as its %s's raises its obligation under that one code, as today",
    (ancestor) => {
      const source = underAncestor[ancestor]("@CLM-AAA-001");
      expect(parseScenarios(source)).toEqual([
        { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ]);
      expect(parseUntaggedScenarios(source)).toEqual([]);
    },
  );
});
