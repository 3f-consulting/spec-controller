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

  it("honors a NON-default named level — the assumption is gone (no Vitest⇒unit hardcode)", () => {
    const out = parseVitestEvidenceObservations(report, "e2e");
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.qualityCheck === "e2e")).toBe(true);
    expect(out.map((r) => (r.qualityCheck !== "fitness" ? r.status : null))).toEqual([
      "passed",
      "failed",
    ]);
  });
});

describe("[SCN-PND-015] parseVitestEvidenceObservations classifies three-way — inconclusive is dropped", () => {
  const reportWithStatus = (status: string): VitestJsonReport => ({
    testResults: [
      { name: "/r/a.test.ts", assertionResults: [{ fullName: "[SCN-PDV-001] a unit assertion", status }] },
    ],
  });

  it("emits a `passed` observation for a passed assertion", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("passed"), "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status: "passed", locator: "/r/a.test.ts" },
    ]);
  });

  it("emits a `failed` observation for a failed assertion", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("failed"), "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status: "failed", locator: "/r/a.test.ts" },
    ]);
  });

  it("DROPS a skipped assertion — inconclusive, so nothing is emitted", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("skipped"), "unit")).toEqual([]);
  });

  it("DROPS a todo assertion — inconclusive, so nothing is emitted", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("todo"), "unit")).toEqual([]);
  });

  it("DROPS any non-pass-non-fail status — robust to vitest's status spelling", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("pending"), "unit")).toEqual([]);
    expect(
      parseVitestEvidenceObservations(
        { testResults: [{ name: "/r/a.test.ts", assertionResults: [{ fullName: "[SCN-PDV-001] x" }] }] },
        "unit"
      )
    ).toEqual([]);
  });

  it("drops ONLY the inconclusive assertion — genuine passed/failed siblings still emit", () => {
    const out = parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "/r/a.test.ts",
            assertionResults: [
              { fullName: "[SCN-PDV-001] p", status: "passed" },
              { fullName: "no scn here", status: "failed" },
              { fullName: "[SCN-PDV-002] s", status: "skipped" },
            ],
          },
        ],
      },
      "unit"
    );
    expect(out).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status: "passed", locator: "/r/a.test.ts" },
      { qualityCheck: "unit", scnId: null, status: "failed", locator: "/r/a.test.ts" },
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

  it("credits the self-citing leaf to the scenario its OWN title cites, not the ancestor describe's", () => {
    expect(parseVitestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-LEA-016", status: "passed", locator: "/r/citation.test.ts" },
      { qualityCheck: "unit", scnId: "SCN-ANC-016", status: "passed", locator: "/r/citation.test.ts" },
    ]);
  });

  it("credits the ancestor exactly once — the bare sibling leaf — with no spurious second credit", () => {
    const out = parseVitestEvidenceObservations(report, "unit");
    expect(out.filter((o) => o.qualityCheck !== "fitness" && o.scnId === "SCN-ANC-016")).toHaveLength(1);
    expect(out.filter((o) => o.qualityCheck !== "fitness" && o.scnId === "SCN-LEA-016")).toHaveLength(1);
  });

  it("falls back to the ancestor path when the leaf's own title carries no citation", () => {
    const out = parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "/r/citation.test.ts",
            assertionResults: [
              { fullName: "[SCN-ANC-016] the grouping describe > a plain leaf", title: "a plain leaf", status: "passed" },
            ],
          },
        ],
      },
      "unit"
    );
    expect(out).toEqual([
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

  it("emits an uncited credit — neither the bare id nor the @-prefixed one cites", () => {
    expect(parseVitestEvidenceObservations(proseOnly, "unit")).toEqual([
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "/r/prose.test.ts" },
    ]);
  });

  it("still reads a bracketed citation out of prose that also names other ids", () => {
    const out = parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "/r/prose.test.ts",
            assertionResults: [
              {
                fullName: "unlike SCN-PDX-001, [SCN-PDR-003] is genuinely proved here (cf. @SCN-PDR-002)",
                title: "unlike SCN-PDX-001, [SCN-PDR-003] is genuinely proved here (cf. @SCN-PDR-002)",
                status: "passed",
              },
            ],
          },
        ],
      },
      "unit"
    );
    expect(out).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDR-003", status: "passed", locator: "/r/prose.test.ts" },
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

  it("credits the ancestor describe — the leaf's prose mentions are not citations", () => {
    expect(parseVitestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-ANC-032", status: "passed", locator: "/r/prose.test.ts" },
    ]);
  });

  it("still lets a BRACKETED leaf citation override the ancestor — the fall-through is not a blanket", () => {
    const out = parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "/r/prose.test.ts",
            assertionResults: [
              {
                fullName: "[SCN-ANC-032] the grouping describe > [SCN-LEA-032] proves its own, unlike SCN-PDX-032",
                title: "[SCN-LEA-032] proves its own, unlike SCN-PDX-032",
                status: "passed",
              },
            ],
          },
        ],
      },
      "unit"
    );
    expect(out).toEqual([
      { qualityCheck: "unit", scnId: "SCN-LEA-032", status: "passed", locator: "/r/prose.test.ts" },
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

  it("relativises the broken observation's locator to the run root, as it does every credit", () => {
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
