import { describe, it, expect } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";
import type { BehaviouralEvidenceObservation } from "../model.js";
import { CoreMessage } from "../render/messages.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { renderMarkdown } from "../assemble/composers.js";
import { remarkWordsOf } from "../render/remarkWords.js";
import type { RunContext } from "../domain/runProvenance.js";
import { handedInputs } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "../render/publishedExitCodes.test-utils.js";
import { coreMessage } from "../render/coreText.js";

describe("[SCN-CUC-002] a Cucumber scenario tagged @e2e, by its own tag or one it inherits, is posted at e2e, and one tagged only @unit, or with no layer tag, at integration", () => {
  const report: CucumberJsonReport = [
    {
      uri: "features/x.feature",
      elements: [
        { tags: [{ name: "@SCN-FOO-003" }], steps: [{ result: { status: "passed" } }] },
      ],
    },
  ];

  it("posts an untagged scenario's observation at integration, with no layer handed in", () => {
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "integration", scnId: "SCN-FOO-003", status: "passed", locator: "features/x.feature" },
    ]);
  });
});

describe("[SCN-CUC-002] parseCucumberEvidenceObservations derives the layer from the scenario's named layer tag", () => {
  it("stamps an @e2e-tagged scenario's observation e2e — the tag, not the report's fallback", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/e2e.feature",
        elements: [
          {
            tags: [{ name: "@e2e" }, { name: "@SCN-LDG-011" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "e2e", scnId: "SCN-LDG-011", status: "passed", locator: "features/e2e.feature" },
    ]);
  });
});

describe("[SCN-CUC-002] parseCucumberEvidenceObservations posts at the layer its tag names, not the report's fallback", () => {

  it("reads an @e2e scenario failed when one step failed, whatever its other steps did", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/e2e.feature",
        elements: [
          {
            tags: [{ name: "@e2e" }, { name: "@SCN-LDG-012" }],
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
      { qualityCheckKind: "e2e", scnId: "SCN-LDG-012", status: "failed", locator: "features/e2e.feature" },
    ]);
  });

  it("emits no evidence observation for a tagged scenario that ran no steps", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/e2e.feature",
        elements: [{ tags: [{ name: "@e2e" }, { name: "@SCN-LDG-012" }], steps: [] }],
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
            tags: [{ name: "@e2e" }, { name: "@e2e" }, { name: "@SCN-LDG-012" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "e2e", scnId: "SCN-LDG-012", status: "passed", locator: "features/e2e.feature" },
    ]);
  });
});

describe("[SCN-CUC-002] parseCucumberEvidenceObservations emits one observation per named non-unit layer", () => {
  it("emits BOTH an integration and an e2e observation from ONE cucumber pass of an @integration @e2e scenario", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/both.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@e2e" }, { name: "@SCN-LDG-014" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "integration", scnId: "SCN-LDG-014", status: "passed", locator: "features/both.feature" },
      { qualityCheckKind: "e2e", scnId: "SCN-LDG-014", status: "passed", locator: "features/both.feature" },
    ]);
  });
});

describe("[SCN-CUC-002] parseCucumberEvidenceObservations derives NO non-unit level from a @unit-only scenario and never manufactures a unit discharge", () => {
  it("posts a @unit-only scenario at integration, the fallback of a report of scenario runs — never a unit observation (unit is vitest's substrate, not cucumber-derivable)", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/unitOnly.feature",
        elements: [
          {
            tags: [{ name: "@unit" }, { name: "@SCN-LDG-015" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "integration", scnId: "SCN-LDG-015", status: "passed", locator: "features/unitOnly.feature" },
    ]);
  });
});

describe("[SCN-CUC-003] parseCucumberEvidenceObservations emits a broken observation for an ambiguous step — a broken harness, not an absent test", () => {
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

  it("emits ONE broken observation carrying the scenario's scnId, the feature-file locator, and a note naming the ambiguous step", () => {
    const observations = parseCucumberEvidenceObservations(
      ambiguousReport([{ name: "@integration" }, { name: "@SCN-HNS-020" }])
    );

    expect(observations).toEqual([
      {
        qualityCheckKind: "integration",
        scnId: "SCN-HNS-020",
        status: "failed",
        locator: "features/ldg019.feature",
        broken: true,
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

    expect(observation).toMatchObject({ broken: true, notes: [note] });
    expect(observation).not.toHaveProperty("message");
    expect(observation?.notes?.[0]).toStrictEqual(note);
    expect(remarkWordsOf(observation ?? {})).toBe(wordsOf());
  });
});

describe("[SCN-RPT-037] parseCucumberEvidenceObservations names each scenario's observations by the scenario's name", () => {
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

describe("[SCN-CUC-001] a Cucumber scenario tagged with two scenario codes credits neither, and the unnamed claim's row names both codes", () => {
  const severalNote = { kind: "several-scn-codes", codes: ["SCN-AAA-001", "SCN-AAA-002"] };
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

  it("emits every layer's evidence observation citing no scenario, each with a note of both codes and no message", () => {
    const report = reportOf(["@integration", "@e2e", "@SCN-AAA-001", "@SCN-AAA-002"], "passed");

    expect(parseCucumberEvidenceObservations(report)).toEqual(
      ["integration", "e2e"].map((qualityCheckKind) => ({
        qualityCheckKind,
        scnId: null,
        status: "passed",
        locator: "features/several.feature",
        testName: "two codes",
        notes: [severalNote],
      }))
    );
  });

  it("carries the ambiguous step as a note on the broken observation, then the note naming both codes", () => {
    const report = reportOf(["@integration", "@SCN-AAA-001", "@SCN-AAA-002"], "ambiguous");

    expect(parseCucumberEvidenceObservations(report)).toEqual([
      {
        qualityCheckKind: "integration",
        scnId: null,
        status: "failed",
        locator: "features/several.feature",
        broken: true,
        notes: [{ kind: "ambiguous-step", step: "Given a step" }, severalNote],
      },
    ]);
  });

  it("leaves both scenarios missing, and the unnamed claim's row names both codes", () => {
    const ledger = reconcile(
      [
        { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "integration" }] },
        { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheckKind: "integration" }] },
      ],
      parseCucumberEvidenceObservations(reportOf(["@integration", "@SCN-AAA-001", "@SCN-AAA-002"], "passed")),
      []
    );
    const outcomes = ["SCN-AAA-001", "SCN-AAA-002"].map(
      (scnId) =>
        ledger.claimReconciliations
          .find((row) => row.claim === scnId)
          ?.qualityCheckReconciliations.find((q) => q.qualityCheckKind === "integration")?.outcome
    );
    const ctx: RunContext = { target: "several", inputs: handedInputs({}), corpus: "features", runStart: new Date("2026-10-14T09:00:00.000Z"), sourceSha: null };
    const unnamedClaimRow = renderMarkdown({ summary: summaryOf(ledger, false), ledger }, ctx, publishedExitCodeOf)
      .split("\n")
      .find((line) => line.startsWith("| (unnamed claim) | "));

    expect(outcomes).toEqual(["missing", "missing"]);
    expect(unnamedClaimRow ?? "").toContain("SCN-AAA-001");
    expect(unnamedClaimRow ?? "").toContain("SCN-AAA-002");
  });

  it.each([
    ["one code", ["@integration", "@SCN-AAA-001"]],
    ["one code repeated", ["@integration", "@SCN-AAA-001", "@SCN-AAA-001"]],
  ])("CONTROL: a scenario tagged with %s credits it, with no note and no message", (_, tagNames) => {
    expect(parseCucumberEvidenceObservations(reportOf(tagNames, "passed"))).toEqual([
      { qualityCheckKind: "integration", scnId: "SCN-AAA-001", status: "passed", locator: "features/several.feature", testName: "two codes" },
    ]);
  });
});
