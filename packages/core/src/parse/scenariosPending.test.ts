import { describe, it, expect } from "vitest";
import {
  parseScenarios,
  pendingQualityCheck,
} from "./scenarios.js";
import { parseCucumberEvidenceObservations } from "./cucumber.js";

const DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

const asFeature = (source: string): string => `Feature: a fixture feature\n\n${source}`;

describe("[SCN-PND-001] pendingQualityCheck recognises a <quality-check>pending tag", () => {
  it("maps each recognised <qc>pending tag to its quality-check", () => {
    expect(pendingQualityCheck("fitnesspending")).toBe("fitness");
    expect(pendingQualityCheck("lintpending")).toBeNull();
    expect(pendingQualityCheck("unitpending")).toBe("unit");
    expect(pendingQualityCheck("integrationpending")).toBe("integration");
    expect(pendingQualityCheck("e2epending")).toBe("e2e");
    expect(pendingQualityCheck("performancepending")).toBe("performance");
  });
});

describe("[SCN-PND-002] the pending suffix is significant — @integrationpending is not read as @integration", () => {
  it("a bare @integration scenario derives a plain integration obligation and no pending one", () => {
    const source = [
      "@integration @SCN-XXX-001",
      "Scenario: a bare integration scenario",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source));
    expect(scenario!.evidenceObligations).toEqual([{ qualityCheck: "integration" }]);
    expect(scenario!.evidenceObligations.some((o) => o.pending)).toBe(false);
  });

  it("a passing Cucumber scenario tagged @integrationpending emits its evidence observation at the caller's fallback, never as integration", () => {
    const observations = parseCucumberEvidenceObservations(
      [
        {
          uri: "features/deferred.feature",
          elements: [
            {
              tags: [{ name: "@integrationpending" }, { name: "@SCN-XXX-002" }],
              steps: [{ result: { status: "passed" } }],
            },
          ],
        },
      ],
      "e2e"
    );
    expect(observations).toEqual([
      { qualityCheck: "e2e", scnId: "SCN-XXX-002", status: "passed", locator: "features/deferred.feature" },
    ]);
  });
});

describe("[SCN-PND-003] an unrecognised <x>pending tag is passed through, ignored like any unknown tag", () => {

  it("an unknown <x>pending alongside a recognised tag leaves the recognised obligation intact", () => {
    const [scenario] = parseScenarios(asFeature(["@unit @foopending @SCN-XXX-006", "Scenario: a mix", "  Given a step"].join("\n"))
    );
    expect(scenario!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });
});

describe("[SCN-PND-016] a recognised community deferral tag defers every named obligation on its scenario", () => {
  const COMMUNITY_TAGS = ["@wip", "@ignore", "@skip", "@todo", "@pending"] as const;

  it.each(COMMUNITY_TAGS)("%s marks both the @unit and @integration obligation pending", (tag) => {
    const source = [
      `${tag} @unit @integration @SCN-XXX-${100 + COMMUNITY_TAGS.indexOf(tag)}`,
      "Scenario: a community-deferred scenario naming unit and integration obligations",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
      { qualityCheck: "integration", pending: true },
    ]);
  });
});

describe("[SCN-PND-017] `@integrationpending` defers only its own obligation (obligation-scope), not the whole scenario", () => {

  it("contrasts with the scenario-scope community tag — adding @wip defers the unit obligation too", () => {
    const source = [
      "@wip @unit @integrationpending @SCN-XXX-141",
      "Scenario: the same scenario, now scenario-scope deferred",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
      { qualityCheck: "integration", pending: true },
    ]);
  });
});

describe("[SCN-PND-018] a scenario-scope `@wip` and an obligation-scope `@integrationpending` compose — both obligations pending", () => {
  it("defers the bare unit by the scenario-scope `@wip` and the integration by the obligation-scope `@integrationpending` — both pending", () => {
    const source = [
      "@wip @unit @integrationpending @SCN-XXX-160",
      "Scenario: a composition scenario — scenario-scope over obligation-scope",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
      { qualityCheck: "integration", pending: true },
    ]);
  });
});

describe("[SCN-PND-020] an unrecognised tag is given no special meaning — it defers nothing", () => {

  it("an unrecognised tag derives exactly what no extra tag would — the tag buys no special treatment", () => {
    const withFoo = parseScenarios(asFeature(["@foo @unit @SCN-XXX-201", "Scenario: with an unrecognised tag", "  Given a step"].join("\n"))
    );
    const withoutFoo = parseScenarios(asFeature(["@unit @SCN-XXX-202", "Scenario: without any extra tag", "  Given a step"].join("\n"))
    );
    expect(withFoo[0]!.evidenceObligations).toEqual(withoutFoo[0]!.evidenceObligations);
    expect(withFoo[0]!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });
});

describe("[SCN-PND-022] a deferred scenario naming no obligations synthesises one scenario-scope pending obligation", () => {
  it("a bare @wip scenario (no evidence tag) derives ONE scenario-scope pending obligation with no qualityCheck", () => {
    const source = [
      "@wip @SCN-XXX-210",
      "Scenario: a bare @wip scenario naming no obligations",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
    expect(scenario!.evidenceObligations).toEqual([{ pending: true }]);
  });
});
