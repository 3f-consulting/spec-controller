import { describe, it, expect } from "vitest";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "./vitest.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { renderMarkdown } from "../assemble/composers.js";
import type { RunContext } from "../domain/runProvenance.js";
import { CORE_MESSAGES, CoreMessage } from "../render/messages.js";

describe("[SCN-LDG-011] parseVitestEvidenceObservations stamps the caller-named level — vitest derives none", () => {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/a.test.ts",
        assertionResults: [
          { fullName: "[SCN-FOO-001] does a thing", status: "passed" },
          { fullName: "[SCN-FOO-002] does another", status: "failed" },
        ],
      },
    ],
  };

  it("attributes results at the named level (unit — the JS-ecosystem default named by the CLI)", () => {
    expect(parseVitestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-FOO-001", status: "passed", locator: "/r/a.test.ts", testName: "[SCN-FOO-001] does a thing" },
      { qualityCheck: "unit", scnId: "SCN-FOO-002", status: "failed", locator: "/r/a.test.ts", testName: "[SCN-FOO-002] does another" },
    ]);
  });
});

describe("[SCN-LDG-016] parseVitestEvidenceObservations attributes an assertion by its own leaf title", () => {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/citation.test.ts",
        assertionResults: [
          {
            fullName: "[SCN-ANC-016] the grouping describe > [SCN-LEA-016] the leaf proves its own scenario",
            title: "[SCN-LEA-016] the leaf proves its own scenario",
            status: "passed",
          },
          {
            fullName: "[SCN-ANC-016] the grouping describe > the bare sibling leaf proves the ancestor's",
            title: "the bare sibling leaf proves the ancestor's",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("emits the self-citing leaf's evidence observation citing the scenario its OWN title cites, not the ancestor describe's", () => {
    expect(parseVitestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-LEA-016", status: "passed", locator: "/r/citation.test.ts", testName: report.testResults![0]!.assertionResults![0]!.fullName },
      { qualityCheck: "unit", scnId: "SCN-ANC-016", status: "passed", locator: "/r/citation.test.ts", testName: report.testResults![0]!.assertionResults![1]!.fullName },
    ]);
  });
});

describe("[SCN-LDG-033] parseVitestEvidenceObservations reads the bracketed token — an id in prose is prose", () => {
  const proseOnly: VitestJsonReport = {
    testResults: [
      {
        name: "/r/prose.test.ts",
        assertionResults: [
          {
            fullName: "the tally block > drops SCN-PDX-001 when the guard is not running (@SCN-PDR-002)",
            title: "drops SCN-PDX-001 when the guard is not running (@SCN-PDR-002)",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("emits an uncited evidence observation — neither the bare id nor the @-prefixed one cites", () => {
    expect(parseVitestEvidenceObservations(proseOnly, "unit")).toEqual([
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "/r/prose.test.ts", testName: proseOnly.testResults![0]!.assertionResults![0]!.fullName },
    ]);
  });
});

describe("[SCN-LDG-032] a leaf's prose mention does not override its describe's bracketed citation", () => {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/prose.test.ts",
        assertionResults: [
          {
            fullName: "[SCN-ANC-032] the grouping describe > mirrors what SCN-PDX-032 does, per @SCN-PDR-032",
            title: "mirrors what SCN-PDX-032 does, per @SCN-PDR-032",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("emits the evidence observation citing the ancestor describe's scenario — the leaf's prose mentions are not citations", () => {
    expect(parseVitestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-ANC-032", status: "passed", locator: "/r/prose.test.ts", testName: report.testResults![0]!.assertionResults![0]!.fullName },
    ]);
  });
});

describe("[SCN-LDG-017] a collection-failed vitest file emits a broken observation naming the file and its error", () => {
  const collectionFailed: VitestJsonReport = {
    testResults: [
      {
        name: "/r/harness.test.ts",
        status: "failed",
        message: "Error: Cannot find package '@cucumber/tag-expressions'",
        assertionResults: [],
      },
    ],
  };

  it("emits ONE broken observation carrying the file locator and the collection message", () => {
    expect(parseVitestEvidenceObservations(collectionFailed, "unit")).toEqual([
      {
        qualityCheck: "unit",
        scnId: null,
        status: "failed",
        locator: "/r/harness.test.ts",
        broken: true,
        message: "Error: Cannot find package '@cucumber/tag-expressions'",
      },
    ]);
  });

  it("relativises the broken observation's locator to the run root, as it does every evidence observation", () => {
    const out = parseVitestEvidenceObservations(collectionFailed, "unit", "/r");
    expect(out).toHaveLength(1);
    const observation = out[0]!;
    expect(observation.qualityCheck).not.toBe("fitness");
    if (observation.qualityCheck === "fitness") throw new Error("unreachable");
    expect(observation.locator).toBe("harness.test.ts");
  });

  it("BOUNDARY: a failed file that DID collect emits its assertions and no broken observation", () => {
    const failedButCollected: VitestJsonReport = {
      testResults: [
        {
          name: "/r/a.test.ts",
          status: "failed",
          message: "1 test failed",
          assertionResults: [{ fullName: "[SCN-FOO-003] throws at runtime", status: "failed" }],
        },
      ],
    };
    expect(parseVitestEvidenceObservations(failedButCollected, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-FOO-003", status: "failed", locator: "/r/a.test.ts", testName: "[SCN-FOO-003] throws at runtime" },
    ]);
  });

  it("a PASSING file with zero assertions emits nothing — only a FAILED collection is broken", () => {
    expect(
      parseVitestEvidenceObservations(
        { testResults: [{ name: "/r/empty.test.ts", status: "passed", assertionResults: [] }] },
        "unit"
      )
    ).toEqual([]);
  });
});

describe("[SCN-RPT-036] parseVitestEvidenceObservations names each test by its full name, or its title when it has none", () => {
  it("carries the runner's name for the test on its evidence observation", () => {
    const report: VitestJsonReport = {
      testResults: [{ name: "/r/n.test.ts", assertionResults: [
        { fullName: "suite > spawns yarn", title: "spawns yarn", status: "failed" },
        { title: "reads the lockfile", status: "passed" },
        { status: "passed" },
      ] }],
    };
    expect(parseVitestEvidenceObservations(report, "unit").map((o) => (o as { testName?: string }).testName)).toEqual([
      "suite > spawns yarn", "reads the lockfile", undefined,
    ]);
  });
});

describe("[SCN-LDG-040] a Vitest test whose title cites two scenarios credits neither, and suspense names both codes", () => {
  const reportOf = (...assertions: Array<{ title: string; fullName?: string }>): VitestJsonReport => ({
    testResults: [
      {
        name: "/r/several.test.ts",
        assertionResults: assertions.map((a) => ({ fullName: a.fullName ?? a.title, title: a.title, status: "passed" })),
      },
    ],
  });
  const several = () => reportOf({ title: "[SCN-AAA-001] [SCN-AAA-002] two" });

  it("emits one evidence observation citing no scenario, with a note of both codes and no message", () => {
    expect(parseVitestEvidenceObservations(several(), "unit")).toEqual([
      {
        qualityCheck: "unit",
        scnId: null,
        status: "passed",
        locator: "/r/several.test.ts",
        testName: "[SCN-AAA-001] [SCN-AAA-002] two",
        notes: [{ kind: "several-scn-codes", codes: ["SCN-AAA-001", "SCN-AAA-002"] }],
      },
    ]);
  });

  it("reads the ancestors' codes by the same rule when the leaf cites none", () => {
    const [observation] = parseVitestEvidenceObservations(
      reportOf({ title: "the bare leaf", fullName: "[SCN-AAA-001] [SCN-AAA-002] the describe > the bare leaf" }),
      "unit"
    );
    expect(observation).toMatchObject({ scnId: null, notes: [{ kind: "several-scn-codes", codes: ["SCN-AAA-001", "SCN-AAA-002"] }] });
    expect(observation).not.toHaveProperty("message");
  });

  it.each([
    ["one code", "[SCN-AAA-001] one"],
    ["one code repeated", "[SCN-AAA-001] once [SCN-AAA-001] again"],
  ])("CONTROL: a title with %s credits it, with no note and no message", (_, title) => {
    expect(parseVitestEvidenceObservations(reportOf({ title }), "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed", locator: "/r/several.test.ts", testName: title },
    ]);
  });

  it("CONTROL: a leaf citing one code inside a describe citing another still credits the leaf's code", () => {
    const [observation] = parseVitestEvidenceObservations(
      reportOf({ title: "[SCN-AAA-002] leaf", fullName: "[SCN-AAA-001] describe > [SCN-AAA-002] leaf" }),
      "unit"
    );
    expect(observation).toMatchObject({ scnId: "SCN-AAA-002" });
    expect(observation).not.toHaveProperty("notes");
    expect(observation).not.toHaveProperty("message");
  });

  describe("assembled into the ledger", () => {
    const ledger = () => reconcile(
      [
        { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      parseVitestEvidenceObservations(several(), "unit"),
      []
    );
    const unitOutcomeOf = (scnId: string) =>
      ledger().scenarioReconciliations
        .find((row) => row.scnId === scnId)
        ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit")?.outcome;

    it.each(["SCN-AAA-001", "SCN-AAA-002"])("leaves %s missing", (scnId) => {
      expect(unitOutcomeOf(scnId)).toBe("missing");
    });

    it("words both codes on the suspense row in the catalogue's words", () => {
      const ctx: RunContext = { target: "several", inputs: {}, runStart: new Date("2026-10-14T09:00:00.000Z"), sourceSha: null };
      const reconciled = ledger();
      const suspenseRow = renderMarkdown({ summary: summaryOf(reconciled, false, false), ledger: reconciled }, ctx)
        .split("\n")
        .find((line) => line.startsWith("| (no scenario) | "));

      expect(suspenseRow ?? "").toContain(
        `(/r/several.test.ts: ${CORE_MESSAGES[CoreMessage.SeveralScnCodes](["SCN-AAA-001", "SCN-AAA-002"])})`
      );
    });
  });
});
