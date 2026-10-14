import { describe, it, expect } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";
import type { BehaviouralEvidenceObservation } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { renderMarkdown } from "../assemble/composers.js";
import type { RunContext } from "../domain/runProvenance.js";

describe("[SCN-LDG-011] parseCucumberEvidenceObservations stamps the caller-named level as the untagged fallback", () => {
  const report: CucumberJsonReport = [
    {
      uri: "features/x.feature",
      elements: [
        { tags: [{ name: "@SCN-FOO-003" }], steps: [{ result: { status: "passed" } }] },
      ],
    },
  ];

  it("attributes results at the named level (integration — the JS-ecosystem default named by the CLI)", () => {
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-FOO-003", status: "passed", locator: "features/x.feature" },
    ]);
  });
});

describe("[SCN-LDG-011] parseCucumberEvidenceObservations derives the level from the scenario's named tier tag", () => {
  it("stamps an @e2e-tagged scenario's observation e2e — the tag, not the fallback source level", () => {
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
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "e2e", scnId: "SCN-LDG-011", status: "passed", locator: "features/e2e.feature" },
    ]);
  });
});

describe("[SCN-LDG-012] parseCucumberEvidenceObservations derives integration from the @integration tag, not the source fallback", () => {

  it("reads an @integration scenario failed when one step failed, whatever its other steps did", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/integration.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-LDG-012" }],
            steps: [
              { keyword: "Given ", name: "a ledger", result: { status: "passed" } },
              { keyword: "When ", name: "it reconciles", result: { status: "failed" } },
              { keyword: "Then ", name: "it balances", result: { status: "skipped" } },
            ],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "e2e")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-012", status: "failed", locator: "features/integration.feature" },
    ]);
  });

  it("emits no evidence observation for an @integration scenario that ran no steps", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/integration.feature",
        elements: [{ tags: [{ name: "@integration" }, { name: "@SCN-LDG-012" }], steps: [] }],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "e2e")).toEqual([]);
  });

  it("emits one integration evidence observation when the tag is inherited from the feature beside the scenario's own", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/integration.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@integration" }, { name: "@SCN-LDG-012" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "e2e")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-012", status: "passed", locator: "features/integration.feature" },
    ]);
  });
});

describe("[SCN-LDG-014] parseCucumberEvidenceObservations emits one observation per named non-unit tier", () => {
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
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-014", status: "passed", locator: "features/both.feature" },
      { qualityCheck: "e2e", scnId: "SCN-LDG-014", status: "passed", locator: "features/both.feature" },
    ]);
  });
});

describe("[SCN-LDG-015] parseCucumberEvidenceObservations derives NO non-unit level from a @unit-only scenario and never manufactures a unit discharge", () => {
  it("falls back to the single caller-named level for a @unit-only scenario — never a unit observation (unit is vitest's substrate, not cucumber-derivable)", () => {
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
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-015", status: "passed", locator: "features/unitOnly.feature" },
    ]);
  });
});

describe("[SCN-LDG-019] parseCucumberEvidenceObservations emits a broken observation for an ambiguous step — a broken harness, not an absent test", () => {
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

  it("emits ONE broken observation carrying the scenario's scnId, the feature-file locator, and a synthesised message naming the ambiguous step", () => {
    const observations = parseCucumberEvidenceObservations(
      ambiguousReport([{ name: "@integration" }, { name: "@SCN-HNS-020" }]),
      "integration"
    );

    expect(observations).toHaveLength(1);
    const [observation] = observations as BehaviouralEvidenceObservation[];
    expect(observation).toMatchObject({
      qualityCheck: "integration",
      scnId: "SCN-HNS-020",
      status: "failed",
      locator: "features/ldg019.feature",
      broken: true,
    });
    expect(observation!.message).toContain("Given a step two definitions both match");
    expect(observation!.message).toMatch(/step definitions match/i);
    expect(observation!.message).toMatch(/never ran/i);
  });

  it.each<[string, { keyword?: string; name?: string }, () => string]>([
    ["by its keyword and text", { keyword: "Given ", name: "a step two definitions both match" }, () => CORE_MESSAGES[CoreMessage.AmbiguousNamedStep]("Given a step two definitions both match")],
    ["by its keyword alone, trimmed, when its text is empty", { keyword: "Given ", name: "" }, () => CORE_MESSAGES[CoreMessage.AmbiguousNamedStep]("Given")],
    ["as a step, when it has neither keyword nor text", {}, () => CORE_MESSAGES[CoreMessage.AmbiguousUnnamedStep]],
  ])("names the ambiguous step %s", (_case, step, messageOf) => {
    const report: CucumberJsonReport = [
      {
        uri: "features/ldg019.feature",
        elements: [{ tags: [{ name: "@integration" }], steps: [{ ...step, result: { status: "ambiguous" } }] }],
      },
    ];

    expect(parseCucumberEvidenceObservations(report, "integration")).toMatchObject([{ broken: true, message: messageOf() }]);
  });
});

describe("[SCN-RPT-037] parseCucumberEvidenceObservations names each scenario's observations by the scenario's name", () => {
  it("carries the scenario's name on each of its evidence observations, at every tier it ran at", () => {
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
    expect(parseCucumberEvidenceObservations(report, "integration").map((o) => (o as BehaviouralEvidenceObservation).testName)).toEqual([
      "an expired coupon is refused", "an expired coupon is refused", "an empty basket cannot be checked out", undefined,
    ]);
  });
});

describe("[SCN-LDG-041] a Cucumber scenario tagged with two scenario codes credits neither, and suspense names both codes", () => {
  const severalNote =
    "2 scenario codes cite SCN-AAA-001, SCN-AAA-002 — a test cites exactly one scenario, so this one credits none of them.";
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

  it("emits every tier's evidence observation citing no scenario, each with a message naming both codes", () => {
    const report = reportOf(["@integration", "@e2e", "@SCN-AAA-001", "@SCN-AAA-002"], "passed");

    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual(
      ["integration", "e2e"].map((qualityCheck) => ({
        qualityCheck,
        scnId: null,
        status: "passed",
        locator: "features/several.feature",
        testName: "two codes",
        message: severalNote,
      }))
    );
  });

  it("keeps the ambiguous-step diagnosis on the broken observation and adds the note naming both codes", () => {
    const report = reportOf(["@integration", "@SCN-AAA-001", "@SCN-AAA-002"], "ambiguous");

    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      {
        qualityCheck: "integration",
        scnId: null,
        status: "failed",
        locator: "features/several.feature",
        broken: true,
        message: `${CORE_MESSAGES[CoreMessage.AmbiguousNamedStep]("Given a step")} ${severalNote}`,
      },
    ]);
  });

  it("leaves both scenarios missing, and the suspense row names both codes", () => {
    const ledger = reconcile(
      [
        { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "integration" }] },
        { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "integration" }] },
      ],
      parseCucumberEvidenceObservations(reportOf(["@integration", "@SCN-AAA-001", "@SCN-AAA-002"], "passed"), "integration"),
      []
    );
    const outcomes = ["SCN-AAA-001", "SCN-AAA-002"].map(
      (scnId) =>
        ledger.scenarioReconciliations
          .find((row) => row.scnId === scnId)
          ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "integration")?.outcome
    );
    const ctx: RunContext = { target: "several", inputs: {}, runStart: new Date("2026-10-14T09:00:00.000Z"), sourceSha: null };
    const suspenseRow = renderMarkdown({ summary: summaryOf(ledger, false, false), ledger }, ctx)
      .split("\n")
      .find((line) => line.startsWith("| (no scenario) | "));

    expect(outcomes).toEqual(["missing", "missing"]);
    expect(suspenseRow ?? "").toContain("SCN-AAA-001");
    expect(suspenseRow ?? "").toContain("SCN-AAA-002");
  });

  it.each([
    ["one code", ["@integration", "@SCN-AAA-001"]],
    ["one code repeated", ["@integration", "@SCN-AAA-001", "@SCN-AAA-001"]],
  ])("CONTROL: a scenario tagged with %s credits it, with no message", (_, tagNames) => {
    expect(parseCucumberEvidenceObservations(reportOf(tagNames, "passed"), "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-AAA-001", status: "passed", locator: "features/several.feature", testName: "two codes" },
    ]);
  });
});
