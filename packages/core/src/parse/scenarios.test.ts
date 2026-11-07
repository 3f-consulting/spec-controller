import { describe, it, expect, beforeEach } from "vitest";
import { corpusCountsOfFeatures, countClaimCodeOccurrences } from "./scenarios.js";
import { parseScenarioTags, parseScenarios, parseUntaggedScenarios } from "./scenarioReaders.test-utils.js";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { parsedFeatures } from "./parsedFeatures.test-utils.js";

describe("[CLM-RPT-008] countClaimCodeOccurrences counts every claim code occurrence including non-tag context", () => {
  let source: string;
  beforeEach(() => {
    source = [
      "@RPT @CLM-RPT-001",
      "Scenario: a thing",
      "  Given the rule @CLM-RPT-001 is referenced again in prose",
      "  # see also @CLM-LNT-005 in a comment",
      "",
      "@unit @CLM-LDG-003",
      "Scenario: another",
    ].join("\n");
  });

  it("counts claim code occurrences across tag lines AND non-tag context (prose, comments)", () => {
    expect(countClaimCodeOccurrences(source)).toBe(4);
  });

  it("returns 0 for a source with no claim code occurrences", () => {
    expect(countClaimCodeOccurrences("Feature: nothing\n  Scenario: blank")).toBe(0);
  });
});

describe("[CLM-RPT-008] the excluded figure counts only the claim codes not written as tags", () => {
  it.each([
    {
      shape: "a scenario carrying several codes, none in prose",
      source:
        "Feature: two\n\n  @unit @CLM-TWO-001\n  Scenario: one code\n    Given a step\n\n  @unit @CLM-TWO-002 @CLM-TWO-003\n  Scenario: two codes\n    Given a step\n",
      excluded: 0,
    },
    {
      shape: "a code on a Rule over three scenarios carrying none",
      source:
        "Feature: rule\n\n  @CLM-RUL-001\n  Rule: tagged\n\n    Scenario: a\n      Given a step\n\n    Scenario: b\n      Given a step\n\n    Scenario: c\n      Given a step\n",
      excluded: 0,
    },
    {
      shape: "a code on a Feature over two scenarios carrying none",
      source: "@FEA @CLM-FEA-001\nFeature: feature\n\n  Scenario: a\n    Given a step\n\n  Scenario: b\n    Given a step\n",
      excluded: 0,
    },
    {
      shape: "a code on an Examples block under a tagged Scenario Outline",
      source:
        "Feature: examples\n\n  @unit @CLM-EXA-001\n  Scenario Outline: outline\n    Given a <thing>\n\n    @CLM-EXA-002\n    Examples:\n      | thing |\n      | one   |\n",
      excluded: 0,
    },
    {
      shape: "one code in a step and one in a comment",
      source:
        "Feature: prose\n\n  @unit @CLM-PRO-001\n  Scenario: mentions\n    # see @CLM-PRO-008\n    Given the rule @CLM-PRO-009 is cited\n",
      excluded: 2,
    },
  ])("$shape", ({ source, excluded }) => {
    expect(corpusCountsOfFeatures(parsedFeatures([source])).excludedOccurrences).toBe(excluded);
  });
});

describe("[CLM-RPT-014] parseUntaggedScenarios returns the scenarios with no claim code", () => {
  let source: string;
  beforeEach(() => {
    source = [
      "@UNT",
      "Feature: a fixture",
      "",
      "  Rule: a mix of tagged and untagged scenarios",
      "",
      "    @unit @CLM-UNT-001",
      "    Scenario: a tagged scenario with an anchor",
      "      Given a step",
      "",
      "    Scenario: an untagged scenario",
      "      Given a step",
      "",
      "    Scenario Outline: an untagged outline",
      "      Given <x>",
      "      Examples:",
      "        | x |",
      "        | 1 |",
      "",
      "    @CLM-UNT-002",
      "    Scenario Outline: a tagged outline",
      "      Given <y>",
      "      Examples:",
      "        | y |",
      "        | 2 |",
    ].join("\n");
  });

  it("returns the untagged scenario + outline names, excluding the claim-code-tagged ones", () => {
    expect(parseUntaggedScenarios(source)).toEqual([
      "an untagged scenario",
      "an untagged outline",
    ]);
  });

  it("reads a tag line with more than one space between its tags as tags", () => {
    const spaced = [
      "Feature: spaced tags",
      "  @unit  @CLM-AB-001",
      "  Scenario: coded on a double-spaced tag line",
      "    Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(spaced)).toEqual([]);
  });

  it("lists an untagged scenario under every header keyword, the colon followed by a space or not", () => {
    const headers = [
      "Feature: header keywords",
      "  Scenario Outline: an untagged outline",
      "    Given <x>",
      "    Examples:",
      "      | x |",
      "      | 1 |",
      "  Scenario Template: an untagged template",
      "    Given <y>",
      "    Examples:",
      "      | y |",
      "      | 2 |",
      "  Example: an untagged example",
      "    Given a step",
      "  Scenario:written hard against its colon",
      "    Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(headers)).toEqual([
      "an untagged outline",
      "an untagged template",
      "an untagged example",
      "written hard against its colon",
    ]);
  });

  it("never reads a header keyword in the middle of a step as a scenario", () => {
    const midLine = [
      "Feature: mid-line keyword",
      "  @unit @CLM-AB-001",
      "  Scenario: coded",
      "    Given the Scenario: wording appears mid-line",
    ].join("\n");
    expect(parseUntaggedScenarios(midLine)).toEqual([]);
  });

  it("lists an untagged scenario whose header follows a step citing a code", () => {
    const cited = [
      "Feature: a cited code above a header",
      "  @unit @CLM-AB-001",
      "  Scenario: coded",
      "    Given the rule @CLM-AB-001 is cited",
      "  Scenario: no-claim-code, straight after the cited step",
      "    Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(cited)).toEqual(["no-claim-code, straight after the cited step"]);
  });
});

describe("[CLM-GRD-004] a scenario tagged with two claim codes raises no evidence obligation under either", () => {
  const source = (ids: string): string =>
    `@AAA\nFeature: a\n\n  @unit @CLM-AAA-001\n  Scenario: its own\n    Given a thing\n\n  @unit ${ids}\n  Scenario: carries codes\n    Given a thing\n`;

  it("raises obligations under neither code, and does not count the scenario as untagged", () => {
    const two = source("@CLM-AAA-002 @CLM-AAA-003");
    expect(parseScenarios(two).map((s) => s.claimCode)).toEqual(["CLM-AAA-001"]);
    expect(parseUntaggedScenarios(two)).toEqual([]);
  });

  it("raises its obligation under one code, or the same code repeated, as today", () => {
    expect(parseScenarios(source("@CLM-AAA-002"))).toEqual([
      { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      { claimCode: "CLM-AAA-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ]);
    expect(parseScenarios(source("@CLM-AAA-002 @CLM-AAA-002")).map((s) => s.claimCode)).toEqual([
      "CLM-AAA-001",
      "CLM-AAA-002",
    ]);
  });
});

describe("[CLM-GRD-005] an Outline whose two rows hold CLM-ONE-001 and CLM-ONE-002 is two claims", () => {
  it("reads one claim for each row, under the code in its clm cell", () => {
    const source = [
      "@ONE",
      "Feature: one",
      "",
      "  @unit",
      "  Scenario Outline: a claim for each row",
      "",
      "    Examples:",
      "      | clm         |",
      "      | CLM-ONE-001 |",
      "      | CLM-ONE-002 |",
    ].join("\n");
    expect(parseScenarios(source).map((s) => s.claimCode)).toEqual(["CLM-ONE-001", "CLM-ONE-002"]);
  });

  it("reads each row's code from its clm column wherever the column stands, and none from another column", () => {
    const source = [
      "@ONE",
      "Feature: one",
      "",
      "  @unit",
      "  Scenario Outline: a claim for each row",
      "",
      "    Examples:",
      "      | case        | clm         |",
      "      | CLM-ONE-009 | CLM-ONE-001 |",
      "      | CLM-ONE-008 | CLM-ONE-002 |",
    ].join("\n");
    expect(parseScenarios(source).map((s) => s.claimCode)).toEqual(["CLM-ONE-001", "CLM-ONE-002"]);
  });

  it("gives a row of a block with no clm column no code, beside a block that has one", () => {
    const source = [
      "@ONE",
      "Feature: one",
      "",
      "  @unit",
      "  Scenario Outline: a claim for each row",
      "",
      "    Examples:",
      "      | clm         |",
      "      | CLM-ONE-001 |",
      "",
      "    Examples:",
      "      | thing       |",
      "      | CLM-ONE-002 |",
    ].join("\n");
    expect(parseScenarios(source).map((s) => s.claimCode)).toEqual(["CLM-ONE-001"]);
    expect(parseUntaggedScenarios(source)).toEqual(["a claim for each row"]);
  });
});

describe("[CLM-GRD-006] each row's claim raises the Evidence Obligations its Outline's tags name", () => {
  it("raises a unit and an integration obligation for a row of an Outline tagged @unit and @integration", () => {
    const source = [
      "@ONE",
      "Feature: one",
      "",
      "  @unit @integration",
      "  Scenario Outline: a claim for each row",
      "",
      "    Examples:",
      "      | clm         |",
      "      | CLM-ONE-001 |",
    ].join("\n");
    expect(parseScenarios(source)).toEqual([
      {
        claimCode: "CLM-ONE-001",
        evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration" }],
      },
    ]);
  });
});

describe("[CLM-GRD-007] a row whose code is wrong reconciles as a scenario whose code is wrong", () => {
  const outline = (tags: string, examplesTags: string, cells: readonly string[]): string =>
    [
      "@ONE",
      "Feature: one",
      "",
      `  ${tags}`,
      "  Scenario Outline: a row whose code is wrong",
      "",
      `    ${examplesTags}`,
      "    Examples:",
      "      | clm |",
      ...cells.map((cell) => `      | ${cell} |`),
    ].join("\n");

  const reconciled = (source: string) => {
    const { ledger, claimCodeErrors } = evidenceReconciliationFromSources({
      features: parsedFeatures([source], ["features/one.feature"]),
      packageJson: {},
      ciWorkflows: [],
      behaviouralObservations: [],
      deferralTags: [],
    });
    return {
      rowTags: parseScenarioTags(source).map(({ tags }) => [...tags].sort()),
      claims: ledger.claimReconciliations.map(({ claim, qualityCheckReconciliations }) => [
        claim,
        qualityCheckReconciliations.map(({ qualityCheckKind, outcome }) => [qualityCheckKind, outcome]),
      ]),
      claimCodeErrors: (claimCodeErrors ?? []).map((error) => ("codes" in error ? [error.kind, error.codes] : [error.kind])),
    };
  };

  it.each([
    {
      case: "not a code, empty included",
      tags: "@integration",
      examplesTags: "",
      cells: ["", "first", "unit"],
      expected: {
        rowTags: [
          ["ONE", "integration"],
          ["ONE", "integration"],
          ["ONE", "integration"],
        ],
        claims: [
          ["features/one.feature : a row whose code is wrong", [[undefined, "no-claim-code"]]],
          ["features/one.feature : a row whose code is wrong", [[undefined, "no-claim-code"]]],
          ["features/one.feature : a row whose code is wrong", [[undefined, "no-claim-code"]]],
        ],
        claimCodeErrors: [],
      },
    },
    {
      case: "one code in two rows",
      tags: "@unit",
      examplesTags: "",
      cells: ["CLM-ONE-001", "CLM-ONE-001"],
      expected: {
        rowTags: [
          ["CLM-ONE-001", "ONE", "unit"],
          ["CLM-ONE-001", "ONE", "unit"],
        ],
        claims: [
          ["CLM-ONE-001", [["unit", "duplicate-claim-code"]]],
          ["CLM-ONE-001", [["unit", "duplicate-claim-code"]]],
        ],
        claimCodeErrors: [],
      },
    },
    {
      case: "a code on the Outline too",
      tags: "@unit @CLM-ONE-009",
      examplesTags: "",
      cells: ["CLM-ONE-001"],
      expected: {
        rowTags: [["CLM-ONE-001", "CLM-ONE-009", "ONE", "unit"]],
        claims: [],
        claimCodeErrors: [["several-claim-codes", ["CLM-ONE-001", "CLM-ONE-009"]]],
      },
    },
    {
      case: "a code on an Examples tag",
      tags: "@unit",
      examplesTags: "@CLM-ONE-009",
      cells: ["CLM-ONE-001"],
      expected: {
        rowTags: [["CLM-ONE-001", "CLM-ONE-009", "ONE", "unit"]],
        claims: [],
        claimCodeErrors: [["several-claim-codes", ["CLM-ONE-001", "CLM-ONE-009"]]],
      },
    },
  ])("$case", ({ tags, examplesTags, cells, expected }) => {
    expect(reconciled(outline(tags, examplesTags, cells))).toEqual(expected);
  });
});

describe("[CLM-GRD-008] an Outline tagged with a code and with no clm column is one claim", () => {
  it("reads one claim under the Outline's code, whatever its rows and their Examples tags hold", () => {
    const source = [
      "@ONE",
      "Feature: one",
      "",
      "  @unit @CLM-ONE-001",
      "  Scenario Outline: one claim for all its rows",
      "    Given a <thing>",
      "",
      "    @CLM-ONE-002",
      "    Examples:",
      "      | thing       |",
      "      | CLM-ONE-003 |",
      "      | CLM-ONE-004 |",
    ].join("\n");
    expect(parseScenarios(source).map((s) => s.claimCode)).toEqual(["CLM-ONE-001"]);
  });

  it("reads one claim under the Outline's code when its Examples block has no table", () => {
    const source = ["@ONE", "Feature: one", "", "  @unit @CLM-ONE-001", "  Scenario Outline: one claim", "", "    Examples:"].join("\n");
    expect(parseScenarios(source).map((s) => s.claimCode)).toEqual(["CLM-ONE-001"]);
  });
});
