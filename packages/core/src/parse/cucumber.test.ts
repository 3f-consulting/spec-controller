import { describe, it, expect } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";
import { claimCodesAtOf } from "./scenarios.js";
import { parsedFeatures } from "./parsedFeatures.test-utils.js";
import type { BehaviouralEvidenceObservation } from "../model.js";
import { CoreMessage } from "../render/messages.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { renderMarkdown } from "../assemble/composers.js";
import { remarkWordsOf } from "../render/remarkWords.js";
import type { RunContext } from "../domain/runProvenance.js";
import { handedInputs } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "../render/publishedExitCodes.test-utils.js";
import { coreMessage } from "../render/coreText.js";

describe("[CLM-CUC-002] a Cucumber scenario tagged @e2e, by its own tag or one it inherits, is posted at e2e, and one tagged only @unit, or with no layer tag, at integration", () => {
  const report: CucumberJsonReport = [
    {
      uri: "features/x.feature",
      elements: [
        { tags: [{ name: "@CLM-FOO-003" }], steps: [{ result: { status: "passed" } }] },
      ],
    },
  ];

  it("posts an untagged scenario's observation at integration, with no layer handed in", () => {
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "integration", claimCode: "CLM-FOO-003", status: "passed", locator: "features/x.feature" },
    ]);
  });
});

describe("[CLM-CUC-002] parseCucumberEvidenceObservations derives the layer from the scenario's named layer tag", () => {
  it("stamps an @e2e-tagged scenario's observation e2e — the tag, not the report's fallback", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/e2e.feature",
        elements: [
          {
            tags: [{ name: "@e2e" }, { name: "@CLM-LDG-011" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "e2e", claimCode: "CLM-LDG-011", status: "passed", locator: "features/e2e.feature" },
    ]);
  });
});

describe("[CLM-CUC-002] parseCucumberEvidenceObservations posts at the layer its tag names, not the report's fallback", () => {

  it("reads an @e2e scenario failed when one step failed, whatever its other steps did", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/e2e.feature",
        elements: [
          {
            tags: [{ name: "@e2e" }, { name: "@CLM-LDG-012" }],
            steps: [
              { keyword: "Given ", name: "a ledger", result: { status: "passed" } },
              { keyword: "When ", name: "it reconciles", result: { status: "failed" } },
              { keyword: "Then ", name: "it balances", result: { status: "skipped" } },
            ],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "e2e", claimCode: "CLM-LDG-012", status: "failed", locator: "features/e2e.feature" },
    ]);
  });

  it("emits no evidence observation for a tagged scenario that ran no steps", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/e2e.feature",
        elements: [{ tags: [{ name: "@e2e" }, { name: "@CLM-LDG-012" }], steps: [] }],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([]);
  });

  it("emits one e2e evidence observation when the tag is inherited from the feature beside the scenario's own", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/e2e.feature",
        elements: [
          {
            tags: [{ name: "@e2e" }, { name: "@e2e" }, { name: "@CLM-LDG-012" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "e2e", claimCode: "CLM-LDG-012", status: "passed", locator: "features/e2e.feature" },
    ]);
  });
});

describe("[CLM-CUC-002] parseCucumberEvidenceObservations emits one observation per named non-unit layer", () => {
  it("emits BOTH an integration and an e2e observation from ONE cucumber pass of an @integration @e2e scenario", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/both.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@e2e" }, { name: "@CLM-LDG-014" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "integration", claimCode: "CLM-LDG-014", status: "passed", locator: "features/both.feature" },
      { qualityCheckKind: "e2e", claimCode: "CLM-LDG-014", status: "passed", locator: "features/both.feature" },
    ]);
  });
});

describe("[CLM-CUC-002] parseCucumberEvidenceObservations derives NO non-unit level from a @unit-only scenario and never manufactures a unit discharge", () => {
  it("posts a @unit-only scenario at integration, the fallback of a report of scenario runs — never a unit observation (unit is vitest's substrate, not cucumber-derivable)", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/unitOnly.feature",
        elements: [
          {
            tags: [{ name: "@unit" }, { name: "@CLM-LDG-015" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "integration", claimCode: "CLM-LDG-015", status: "passed", locator: "features/unitOnly.feature" },
    ]);
  });
});

describe("[CLM-CUC-003] parseCucumberEvidenceObservations emits an observation that never ran for an ambiguous step — a broken harness, not an absent test", () => {
  const ambiguousReport = (tags: Array<{ name?: string }>): CucumberJsonReport => [
    {
      uri: "features/ldg019.feature",
      elements: [
        {
          tags,
          steps: [
            { keyword: "Given ", name: "a step two definitions both match", result: { status: "ambiguous", duration: 0 } },
          ],
        },
      ],
    },
  ];

  it("emits ONE observation that never ran carrying the scenario's claimCode, the feature-file locator, and a note naming the ambiguous step", () => {
    const observations = parseCucumberEvidenceObservations(
      ambiguousReport([{ name: "@integration" }, { name: "@CLM-HNS-020" }])
    );

    expect(observations).toEqual([
      {
        qualityCheckKind: "integration",
        claimCode: "CLM-HNS-020",
        status: "failed",
        locator: "features/ldg019.feature",
        neverRan: true,
        notes: [{ kind: "ambiguous-step", step: "Given a step two definitions both match" }],
      },
    ]);
  });

  it.each<[string, { keyword?: string; name?: string }, object, () => string]>([
    ["by its keyword and text", { keyword: "Given ", name: "a step two definitions both match" }, { kind: "ambiguous-step", step: "Given a step two definitions both match" }, () => coreMessage(CoreMessage.AmbiguousNamedStep, { step: "Given a step two definitions both match" })],
    ["by its keyword alone, trimmed, when its text is empty", { keyword: "Given ", name: "" }, { kind: "ambiguous-step", step: "Given" }, () => coreMessage(CoreMessage.AmbiguousNamedStep, { step: "Given" })],
    ["as a step, when it has neither keyword nor text", {}, { kind: "ambiguous-step" }, () => coreMessage(CoreMessage.AmbiguousUnnamedStep)],
  ])("names the ambiguous step %s, and the report words the note", (_case, step, note, wordsOf) => {
    const report: CucumberJsonReport = [
      {
        uri: "features/ldg019.feature",
        elements: [{ tags: [{ name: "@integration" }], steps: [{ ...step, result: { status: "ambiguous" } }] }],
      },
    ];
    const [observation] = parseCucumberEvidenceObservations(report) as BehaviouralEvidenceObservation[];

    expect(observation).toMatchObject({ neverRan: true, notes: [note] });
    expect(observation).not.toHaveProperty("message");
    expect(observation?.notes?.[0]).toStrictEqual(note);
    expect(remarkWordsOf(observation ?? {})).toBe(wordsOf());
  });
});

describe("[CLM-RPT-037] parseCucumberEvidenceObservations names each scenario's observations by the scenario's name", () => {
  it("carries the scenario's name on each of its evidence observations, at every layer it ran at", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/checkout.feature",
        elements: [
          { name: "an expired coupon is refused", tags: [{ name: "@integration" }, { name: "@e2e" }], steps: [{ result: { status: "failed" } }] },
          { name: "an empty basket cannot be checked out", steps: [{ result: { status: "passed" } }] },
          { steps: [{ result: { status: "passed" } }] },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report).map((o) => (o as BehaviouralEvidenceObservation).testName)).toEqual([
      "an expired coupon is refused", "an expired coupon is refused", "an empty basket cannot be checked out", undefined,
    ]);
  });
});

describe("[CLM-CUC-001] a Cucumber scenario tagged with two claim codes credits neither, and the unnamed claim's row names both codes", () => {
  const severalNote = { kind: "several-claim-codes", codes: ["CLM-AAA-001", "CLM-AAA-002"] };
  const reportOf = (tagNames: readonly string[], status: string): CucumberJsonReport => [
    {
      uri: "features/several.feature",
      elements: [
        {
          name: "two codes",
          tags: tagNames.map((name) => ({ name })),
          steps: [{ keyword: "Given ", name: "a step", result: { status } }],
        },
      ],
    },
  ];

  it("emits every layer's evidence observation citing no claim, each with a note of both codes and no message", () => {
    const report = reportOf(["@integration", "@e2e", "@CLM-AAA-001", "@CLM-AAA-002"], "passed");

    expect(parseCucumberEvidenceObservations(report)).toEqual(
      ["integration", "e2e"].map((qualityCheckKind) => ({
        qualityCheckKind,
        claimCode: null,
        status: "passed",
        locator: "features/several.feature",
        testName: "two codes",
        notes: [severalNote],
      }))
    );
  });

  it("carries the ambiguous step as a note on the observation that never ran, then the note naming both codes", () => {
    const report = reportOf(["@integration", "@CLM-AAA-001", "@CLM-AAA-002"], "ambiguous");

    expect(parseCucumberEvidenceObservations(report)).toEqual([
      {
        qualityCheckKind: "integration",
        claimCode: null,
        status: "failed",
        locator: "features/several.feature",
        neverRan: true,
        notes: [{ kind: "ambiguous-step", step: "Given a step" }, severalNote],
      },
    ]);
  });

  it("leaves both scenarios missing, and the unnamed claim's row names both codes", () => {
    const ledger = reconcile(
      [
        { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "integration" }] },
        { claimCode: "CLM-AAA-002", evidenceObligations: [{ qualityCheckKind: "integration" }] },
      ],
      parseCucumberEvidenceObservations(reportOf(["@integration", "@CLM-AAA-001", "@CLM-AAA-002"], "passed")),
      []
    );
    const outcomes = ["CLM-AAA-001", "CLM-AAA-002"].map(
      (claimCode) =>
        ledger.claimReconciliations
          .find((row) => row.claim === claimCode)
          ?.qualityCheckReconciliations.find((q) => q.qualityCheckKind === "integration")?.outcome
    );
    const ctx: RunContext = { target: "several", inputs: handedInputs({}), corpus: "features", runStart: new Date("2026-10-14T09:00:00.000Z"), sourceSha: null };
    const unnamedClaimRow = renderMarkdown({ summary: summaryOf(ledger, false), ledger }, ctx, publishedExitCodeOf)
      .split("\n")
      .find((line) => line.startsWith("| (unnamed claim) | "));

    expect(outcomes).toEqual(["missing", "missing"]);
    expect(unnamedClaimRow ?? "").toContain("CLM-AAA-001");
    expect(unnamedClaimRow ?? "").toContain("CLM-AAA-002");
  });

  it.each([
    ["one code", ["@integration", "@CLM-AAA-001"]],
    ["one code repeated", ["@integration", "@CLM-AAA-001", "@CLM-AAA-001"]],
  ])("CONTROL: a scenario tagged with %s credits it, with no note and no message", (_, tagNames) => {
    expect(parseCucumberEvidenceObservations(reportOf(tagNames, "passed"))).toEqual([
      { qualityCheckKind: "integration", claimCode: "CLM-AAA-001", status: "passed", locator: "features/several.feature", testName: "two codes" },
    ]);
  });
});

describe("[CLM-CUC-006] a passing row and a failing row of one Outline reconcile apart", () => {
  const outline = [
    "@ONE",
    "Feature: one",
    "",
    "  @integration",
    "  Scenario Outline: a claim for each row",
    "    Given the row <result>",
    "",
    "    Examples:",
    "      | clm         | result |",
    "      | CLM-ONE-001 | passes |",
    "      | CLM-ONE-002 | fails  |",
  ];

  const rowRan = (line: number, status: string) => ({
    line,
    name: "a claim for each row",
    tags: [{ name: "@ONE" }, { name: "@integration" }],
    steps: [{ keyword: "Given ", name: "the row", result: { status } }],
  });

  it("credits each row's result to the code in the clm cell of the row at that line of that feature file", () => {
    const codesAt = claimCodesAtOf(parsedFeatures([outline.join("\n")], ["rows.feature"]));
    const report: CucumberJsonReport = [{ uri: "features/rows.feature", elements: [rowRan(10, "passed"), rowRan(11, "failed")] }];
    expect(parseCucumberEvidenceObservations(report, undefined, codesAt).map(({ claimCode, status }) => ({ claimCode, status }))).toEqual([
      { claimCode: "CLM-ONE-001", status: "passed" },
      { claimCode: "CLM-ONE-002", status: "failed" },
    ]);
  });

  it.each([
    { where: "Cucumber ran beside the features folder", uri: "features/rows.feature" },
    { where: "Cucumber ran in a package of a larger repository", uri: "packages/app/features/rows.feature" },
    { where: "the report names the file by an absolute path", uri: "/home/team/app/features/rows.feature" },
    { where: "the report separates folders with backslashes", uri: "app\\features\\rows.feature" },
  ])("ties a row's result to its code wherever $where", ({ uri }) => {
    const codesAt = claimCodesAtOf(parsedFeatures([outline.join("\n")], ["rows.feature"]));
    const report: CucumberJsonReport = [{ uri, elements: [rowRan(10, "passed")] }];
    expect(parseCucumberEvidenceObservations(report, undefined, codesAt).map(({ claimCode }) => claimCode)).toEqual(["CLM-ONE-001"]);
  });

  it("ties a row to the corpus file whose path the report's path ends in most fully, not a shorter one it also ends in", () => {
    const other = outline.map((line) => line.replace("CLM-ONE-001", "CLM-ONE-005").replace("CLM-ONE-002", "CLM-ONE-006"));
    const codesAt = claimCodesAtOf(parsedFeatures([outline.join("\n"), other.join("\n")], ["rows.feature", "nested/rows.feature"]));
    const report: CucumberJsonReport = [{ uri: "features/nested/rows.feature", elements: [rowRan(10, "passed")] }];
    expect(parseCucumberEvidenceObservations(report, undefined, codesAt).map(({ claimCode }) => claimCode)).toEqual(["CLM-ONE-005"]);
  });

  it("ties no row of a corpus file the report's path does not end in", () => {
    const codesAt = claimCodesAtOf(parsedFeatures([outline.join("\n")], ["rows.feature"]));
    const report: CucumberJsonReport = [{ uri: "features/other-rows.feature", elements: [rowRan(10, "passed")] }];
    expect(parseCucumberEvidenceObservations(report, undefined, codesAt).map(({ claimCode }) => claimCode)).toEqual([null]);
  });
});

describe("[CLM-CUC-006] a Cucumber scenario the lookup cannot place reads its tags alone", () => {
  const answersAnyRow = () => ["CLM-ONE-009"];
  const passed = { tags: [{ name: "@CLM-ONE-001" }], steps: [{ result: { status: "passed" } }] };

  it.each([
    { shape: "a report element with no line", feature: { uri: "features/rows.feature", elements: [passed] }, claimCodesAt: answersAnyRow },
    { shape: "a feature with no uri or name", feature: { elements: [{ ...passed, line: 10 }] }, claimCodesAt: answersAnyRow },
    { shape: "no lookup handed in", feature: { uri: "features/rows.feature", elements: [{ ...passed, line: 10 }] }, claimCodesAt: undefined },
  ])("$shape credits the code its tags carry", ({ feature, claimCodesAt }) => {
    expect(parseCucumberEvidenceObservations([feature], undefined, claimCodesAt).map(({ claimCode }) => claimCode)).toEqual(["CLM-ONE-001"]);
  });

  it("credits neither of a code tag and a different code in the row at its line", () => {
    const report: CucumberJsonReport = [{ uri: "features/rows.feature", elements: [{ ...passed, line: 10 }] }];
    expect(parseCucumberEvidenceObservations(report, undefined, answersAnyRow).map(({ claimCode }) => claimCode)).toEqual([null]);
  });
});
