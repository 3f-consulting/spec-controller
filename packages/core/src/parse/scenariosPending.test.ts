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

  it("does not read a bare tier tag as pending — the suffix is significant", () => {
    expect(pendingQualityCheck("integration")).toBeNull();
    expect(pendingQualityCheck("lint")).toBeNull();
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

  it("an @integrationpending scenario derives a pending integration obligation and no plain one", () => {
    const source = [
      "@integrationpending @SCN-XXX-002",
      "Scenario: a deferred integration scenario",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source));
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "integration", pending: true },
    ]);
    expect(
      scenario!.evidenceObligations.some(
        (o) => o.qualityCheck === "integration" && o.pending !== true
      )
    ).toBe(false);
  });

  it("a passing Cucumber scenario tagged @integrationpending is credited at the caller's fallback, never as integration", () => {
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
  it("the helper returns null for an unknown <x>pending and for bare pending", () => {
    expect(pendingQualityCheck("foopending")).toBeNull();
    expect(pendingQualityCheck("pending")).toBeNull();
    expect(pendingQualityCheck("unitpendingx")).toBeNull();
  });

  it("an @foopending scenario derives no obligation — exactly like a plain unknown @foo", () => {
    const foopending = parseScenarios(asFeature(["@foopending @SCN-XXX-003", "Scenario: an unknown pending tag", "  Given a step"].join("\n"))
    );
    const foo = parseScenarios(asFeature(["@foo @SCN-XXX-004", "Scenario: a plain unknown tag", "  Given a step"].join("\n"))
    );
    expect(foopending[0]!.evidenceObligations).toEqual([]);
    expect(foo[0]!.evidenceObligations).toEqual([]);
    expect(foopending[0]!.evidenceObligations).toEqual(foo[0]!.evidenceObligations);
  });

  it("an unknown <x>pending alongside a recognised tag leaves the recognised obligation intact", () => {
    const [scenario] = parseScenarios(asFeature(["@unit @foopending @SCN-XXX-006", "Scenario: a mix", "  Given a step"].join("\n"))
    );
    expect(scenario!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });
});

describe("[SCN-PND-016] a recognised community deferral tag defers every named obligation on its scenario", () => {
  const COMMUNITY_TAGS = ["@wip", "@ignore", "@skip", "@todo", "@pending"] as const;

  COMMUNITY_TAGS.forEach((tag, i) => {
    it(`${tag} marks both the @unit and @integration obligation pending`, () => {
      const source = [
        `${tag} @unit @integration @SCN-XXX-${100 + i}`,
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

  it("defers a FITNESS obligation too — the whole scenario is deferred", () => {
    const [scenario] = parseScenarios(asFeature(["@wip @fitness @SCN-XXX-110", "Scenario: a deferred fitness scenario"].join("\n")),
      DEFERRAL_TAGS);
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "fitness", pending: true },
    ]);
  });

  it("does not defer for an UNRECOGNISED community-shaped tag — the negative boundary", () => {
    const [scenario] = parseScenarios(asFeature(["@notadeferral @unit @integration @SCN-XXX-120", "Scenario: an unrecognised tag", "  Given a step"].join("\n"))
    );
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("honours the injected deferralTags param — a custom tag defers, the built-in default does not", () => {
    const source = [
      "@deferme @unit @SCN-XXX-130",
      "Scenario: a custom-deferral-tag scenario",
      "  Given a step",
    ].join("\n");
    expect(parseScenarios(asFeature(source), ["deferme"])[0]!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
    ]);
    expect(parseScenarios(asFeature(source))[0]!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });
});

describe("[SCN-PND-017] `@integrationpending` defers only its own obligation (obligation-scope), not the whole scenario", () => {
  it("derives a non-pending unit obligation alongside a pending integration one — obligation-scope", () => {
    const source = [
      "@unit @integrationpending @SCN-XXX-140",
      "Scenario: an obligation-scope-deferred scenario, no community tag",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source));
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration", pending: true },
    ]);
  });

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

  it("the scenario-scope source overlaps the obligation-scope one on integration — the mark is idempotent, no duplicate obligation", () => {
    const source = [
      "@wip @unit @integrationpending @SCN-XXX-161",
      "Scenario: overlap on the integration obligation",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source), DEFERRAL_TAGS);
    const integration = scenario!.evidenceObligations.filter((o) => o.qualityCheck === "integration");
    expect(integration).toEqual([{ qualityCheck: "integration", pending: true }]);
    expect(scenario!.evidenceObligations).toHaveLength(2);
  });
});

describe("[SCN-PND-020] an unrecognised tag is given no special meaning — it defers nothing", () => {
  it("derives a plain (non-pending) obligation for a scenario carrying an unrecognised @foo tag", () => {
    const source = [
      "@foo @unit @SCN-XXX-200",
      "Scenario: a scenario carrying an unrecognised tag alongside a named unit obligation",
      "  Given a step",
    ].join("\n");
    const [scenario] = parseScenarios(asFeature(source));
    expect(scenario!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });

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

  it("does NOT synthesise for a NON-deferred scenario naming no obligations — the negative boundary", () => {
    const [scenario] = parseScenarios(asFeature(["@SCN-XXX-211", "Scenario: a bare scenario, no deferral tag", "  Given a step"].join("\n"))
    );
    expect(scenario!.evidenceObligations).toEqual([]);
  });

  it("still marks named obligations pending when the @wip scenario DOES name them — no spurious synthesised obligation", () => {
    const [scenario] = parseScenarios(asFeature(["@wip @unit @SCN-XXX-212", "Scenario: a @wip scenario naming a unit obligation", "  Given a step"].join("\n")),
      DEFERRAL_TAGS
    );
    expect(scenario!.evidenceObligations).toEqual([{ qualityCheck: "unit", pending: true }]);
  });

  it("synthesises for a project-configured deferral tag too — a custom tag on a zero-obligation scenario defers scenario-scope", () => {
    const source = [
      "@deferme @SCN-XXX-213",
      "Scenario: a custom-deferral-tag scenario naming no obligations",
      "  Given a step",
    ].join("\n");
    expect(parseScenarios(asFeature(source), ["deferme"])[0]!.evidenceObligations).toEqual([{ pending: true }]);
    expect(parseScenarios(asFeature(source))[0]!.evidenceObligations).toEqual([]);
  });
});
