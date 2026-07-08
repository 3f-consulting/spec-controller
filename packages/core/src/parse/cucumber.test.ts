/**
 * @unit guard for the source→level seam.
 *
 * Strict coverage gain: parseCucumberEvidenceObservations had no dedicated unit test — its level was
 * a hardcoded "integration". This proves the level is now the CALLER-DECLARED one, so the
 * implicit Cucumber⇒integration assumption is gone (the Read's positive guard). The
 * JS-ecosystem default (integration) is declared at the CLI edge, not here.
 */

import { describe, it, expect } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";

describe("parseCucumberEvidenceObservations stamps the declared level", () => {
  const report: CucumberJsonReport = [
    {
      uri: "features/x.feature",
      elements: [
        { tags: [{ name: "@SCN-FOO-003" }], steps: [{ result: { status: "passed" } }] },
      ],
    },
  ];

  it("attributes results at the declared level (integration — the JS-ecosystem default declared by the CLI)", () => {
    // Each credit carries its feature-file locator (the where-to-fix, ruling Q5).
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-FOO-003", status: "passed", locator: "features/x.feature" },
    ]);
  });

  it("honors a NON-default declared level — the assumption is gone (no Cucumber⇒integration hardcode)", () => {
    const out = parseCucumberEvidenceObservations(report, "unit");
    expect(out).toHaveLength(1);
    expect(out.every((r) => r.qualityCheck === "unit")).toBe(true);
  });
});

describe("[SCN-LDG-011] parseCucumberEvidenceObservations derives the level from the scenario's declared tier tag", () => {
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
    // Fallback "integration" is the JS-ecosystem default the CLI declares; the scenario's
    // own @e2e tag overrides it, so the observation is levelled e2e (an adopter's repository fix).
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "e2e", scnId: "SCN-LDG-011", status: "passed", locator: "features/e2e.feature" },
    ]);
  });

  it("falls back to the caller-declared level for a scenario with no tier tag", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/x.feature",
        elements: [
          { tags: [{ name: "@SCN-FOO-009" }], steps: [{ result: { status: "passed" } }] },
        ],
      },
    ];
    // No @integration/@e2e/@performance tag → the fallback (source level) still applies.
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-FOO-009", status: "passed", locator: "features/x.feature" },
    ]);
  });
});

describe("[SCN-LDG-012] parseCucumberEvidenceObservations derives integration from the @integration tag, not the source fallback", () => {
  it("stamps an @integration-tagged scenario's observation integration even under a non-integration fallback — derivation, not the old hardcode", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/integration.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-LDG-012" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    // Fallback "e2e" is deliberately NOT "integration": the integration level can only come
    // from DERIVING the scenario's declared @integration tag. The retired
    // CUCUMBER_QUALITY_CHECK="integration" hardcode agreed for this case by COINCIDENCE; this
    // proves the tier is now reached by derivation. If the parser ignored the tag and used the
    // fallback, the level would be e2e — the mutation that proves this pin's teeth.
    expect(parseCucumberEvidenceObservations(report, "e2e")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-012", status: "passed", locator: "features/integration.feature" },
    ]);
  });
});

describe("[SCN-LDG-014] parseCucumberEvidenceObservations emits one observation per declared non-unit tier", () => {
  it("emits BOTH an integration and an e2e observation from ONE cucumber pass of an @integration @e2e scenario", () => {
    // The multi-tag ruling's teeth: a SINGLE cucumber run of a scenario declaring two non-unit
    // tiers discharges BOTH obligations, so the parser must emit ONE observation per declared
    // tier (integration + e2e), same scnId, same passed status. Before per-tier emission the
    // parser emitted a SINGLE observation (the first matched tier), so this reds at length 1.
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
    // One observation per declared tier, in declaration order (@integration then @e2e), same
    // scnId / status / locator. Today's single-observation parser emits only the first tier, so
    // toEqual reds on the length-1 vs length-2 mismatch.
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-014", status: "passed", locator: "features/both.feature" },
      { qualityCheck: "e2e", scnId: "SCN-LDG-014", status: "passed", locator: "features/both.feature" },
    ]);
  });

  it("GUARD: a single-non-unit-tag scenario still emits EXACTLY ONE observation (no accidental duplicate)", () => {
    // Per-tier emission must not double-count the single-tier case: an @integration-only
    // scenario yields exactly one integration observation, not two. Pins LDG-011/012/013's
    // single-observation invariant against a regression in the per-tier fan-out.
    const report: CucumberJsonReport = [
      {
        uri: "features/one.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-LDG-014" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "e2e")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-014", status: "passed", locator: "features/one.feature" },
    ]);
  });
});

describe("[SCN-LDG-015] parseCucumberEvidenceObservations derives NO non-unit level from a @unit-only scenario and never manufactures a unit discharge", () => {
  it("falls back to the single caller-declared level for a @unit-only scenario — never a unit observation (unit is vitest's substrate, not cucumber-derivable)", () => {
    // The NEGATIVE BOUNDARY of the derivation rule: @unit is NOT a cucumber-derivable tier, so
    // deriveLevels finds no non-unit tier tag and falls back to the SINGLE caller-declared level
    // (integration). Exactly ONE observation, at the fallback level — and crucially NOT levelled
    // unit: cucumber must never manufacture a unit discharge for a @unit-only scenario (unit is
    // the vitest substrate). Reds if @unit is added to the derivable tiers — a spurious unit
    // observation would then discharge the scenario's unit obligation where none is declared.
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
