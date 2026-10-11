import { describe, it, expect } from "vitest";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "./vitest.js";

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
      { qualityCheck: "unit", scnId: "SCN-FOO-001", status: "passed", locator: "/r/a.test.ts" },
      { qualityCheck: "unit", scnId: "SCN-FOO-002", status: "failed", locator: "/r/a.test.ts" },
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
      { qualityCheck: "unit", scnId: "SCN-LEA-016", status: "passed", locator: "/r/citation.test.ts" },
      { qualityCheck: "unit", scnId: "SCN-ANC-016", status: "passed", locator: "/r/citation.test.ts" },
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
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "/r/prose.test.ts" },
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
      { qualityCheck: "unit", scnId: "SCN-ANC-032", status: "passed", locator: "/r/prose.test.ts" },
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
      { qualityCheck: "unit", scnId: "SCN-FOO-003", status: "failed", locator: "/r/a.test.ts" },
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
