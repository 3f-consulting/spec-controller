import { describe, it, expect } from "vitest";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "./vitest.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { renderMarkdown } from "../assemble/composers.js";
import type { RunContext } from "../domain/runProvenance.js";
import { CoreMessage } from "../render/messages.js";
import { handedInputs } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "../render/publishedExitCodes.test-utils.js";
import { coreMessage } from "../render/coreText.js";

describe("[CLM-VIT-006] every observation read from a Vitest report is posted at unit, because a Vitest report is a report of test results and carries no layer tags", () => {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/a.test.ts",
        assertionResults: [
          { fullName: "[CLM-FOO-001] does a thing", status: "passed" },
          { fullName: "[CLM-FOO-002] does another", status: "failed" },
        ],
      },
    ],
  };

  it("posts every observation at unit, with no layer handed in", () => {
    expect(parseVitestEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-FOO-001", status: "passed", locator: "/r/a.test.ts", testName: "[CLM-FOO-001] does a thing" },
      { qualityCheckKind: "unit", claimCode: "CLM-FOO-002", status: "failed", locator: "/r/a.test.ts", testName: "[CLM-FOO-002] does another" },
    ]);
  });
});

describe("[CLM-VIT-001] parseVitestEvidenceObservations attributes an assertion by its own leaf title", () => {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/citation.test.ts",
        assertionResults: [
          {
            fullName: "[CLM-ANC-016] the grouping describe > [CLM-LEA-016] the leaf proves its own scenario",
            title: "[CLM-LEA-016] the leaf proves its own scenario",
            status: "passed",
          },
          {
            fullName: "[CLM-ANC-016] the grouping describe > the bare sibling leaf proves the ancestor's",
            title: "the bare sibling leaf proves the ancestor's",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("emits the self-citing leaf's evidence observation citing the scenario its OWN title cites, not the ancestor describe's", () => {
    expect(parseVitestEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-LEA-016", status: "passed", locator: "/r/citation.test.ts", testName: report.testResults![0]!.assertionResults![0]!.fullName },
      { qualityCheckKind: "unit", claimCode: "CLM-ANC-016", status: "passed", locator: "/r/citation.test.ts", testName: report.testResults![0]!.assertionResults![1]!.fullName },
    ]);
  });
});

describe("[CLM-VIT-002] parseVitestEvidenceObservations reads the bracketed token — an id in prose is prose", () => {
  const proseOnly: VitestJsonReport = {
    testResults: [
      {
        name: "/r/prose.test.ts",
        assertionResults: [
          {
            fullName: "the tally block > drops CLM-PDX-001 when the guard is not running (@CLM-PDR-002)",
            title: "drops CLM-PDX-001 when the guard is not running (@CLM-PDR-002)",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("emits an uncited evidence observation — neither the bare id nor the @-prefixed one cites", () => {
    expect(parseVitestEvidenceObservations(proseOnly)).toEqual([
      { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "/r/prose.test.ts", testName: proseOnly.testResults![0]!.assertionResults![0]!.fullName },
    ]);
  });
});

describe("[CLM-VIT-003] a leaf's prose mention does not override its describe's bracketed citation", () => {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/prose.test.ts",
        assertionResults: [
          {
            fullName: "[CLM-ANC-032] the grouping describe > mirrors what CLM-PDX-032 does, per @CLM-PDR-032",
            title: "mirrors what CLM-PDX-032 does, per @CLM-PDR-032",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("emits the evidence observation citing the ancestor describe's scenario — the leaf's prose mentions are not citations", () => {
    expect(parseVitestEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-ANC-032", status: "passed", locator: "/r/prose.test.ts", testName: report.testResults![0]!.assertionResults![0]!.fullName },
    ]);
  });
});

describe("[CLM-VIT-005] a collection-failed vitest file emits an observation that never ran naming the file and its error", () => {
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

  it("emits ONE observation that never ran carrying the file locator and the collection message", () => {
    expect(parseVitestEvidenceObservations(collectionFailed)).toEqual([
      {
        qualityCheckKind: "unit",
        claimCode: null,
        status: "failed",
        locator: "/r/harness.test.ts",
        neverRan: true,
        message: "Error: Cannot find package '@cucumber/tag-expressions'",
      },
    ]);
  });

  it("relativises the locator of an observation that never ran to the run root, as it does every evidence observation", () => {
    const out = parseVitestEvidenceObservations(collectionFailed, "/r");
    expect(out).toHaveLength(1);
    const observation = out[0]!;
    expect(observation.qualityCheckKind).not.toBe("fitness");
    if (observation.qualityCheckKind === "fitness") throw new Error("unreachable");
    expect(observation.locator).toBe("harness.test.ts");
  });

  it("BOUNDARY: a failed file that DID collect emits its assertions and no observation that never ran", () => {
    const failedButCollected: VitestJsonReport = {
      testResults: [
        {
          name: "/r/a.test.ts",
          status: "failed",
          message: "1 test failed",
          assertionResults: [{ fullName: "[CLM-FOO-003] throws at runtime", status: "failed" }],
        },
      ],
    };
    expect(parseVitestEvidenceObservations(failedButCollected)).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-FOO-003", status: "failed", locator: "/r/a.test.ts", testName: "[CLM-FOO-003] throws at runtime" },
    ]);
  });

  it("a PASSING file with zero assertions emits nothing — only a FAILED collection never ran", () => {
    expect(
      parseVitestEvidenceObservations(
        { testResults: [{ name: "/r/empty.test.ts", status: "passed", assertionResults: [] }] }
      )
    ).toEqual([]);
  });
});

describe("[CLM-RPT-036] parseVitestEvidenceObservations names each test by its full name, or its title when it has none", () => {
  it("carries the runner's name for the test on its evidence observation", () => {
    const report: VitestJsonReport = {
      testResults: [{ name: "/r/n.test.ts", assertionResults: [
        { fullName: "suite > spawns yarn", title: "spawns yarn", status: "failed" },
        { title: "reads the lockfile", status: "passed" },
        { status: "passed" },
      ] }],
    };
    expect(parseVitestEvidenceObservations(report).map((o) => (o as { testName?: string }).testName)).toEqual([
      "suite > spawns yarn", "reads the lockfile", undefined,
    ]);
  });
});

describe("[CLM-VIT-004] a Vitest test whose title cites two scenarios credits neither, and the unnamed claim's row names both codes", () => {
  const reportOf = (...assertions: Array<{ title: string; fullName?: string }>): VitestJsonReport => ({
    testResults: [
      {
        name: "/r/several.test.ts",
        assertionResults: assertions.map((a) => ({ fullName: a.fullName ?? a.title, title: a.title, status: "passed" })),
      },
    ],
  });
  const several = () => reportOf({ title: "[CLM-AAA-001] [CLM-AAA-002] two" });

  it("emits one evidence observation citing no claim, with a note of both codes and no message", () => {
    expect(parseVitestEvidenceObservations(several())).toEqual([
      {
        qualityCheckKind: "unit",
        claimCode: null,
        status: "passed",
        locator: "/r/several.test.ts",
        testName: "[CLM-AAA-001] [CLM-AAA-002] two",
        notes: [{ kind: "several-claim-codes", codes: ["CLM-AAA-001", "CLM-AAA-002"] }],
      },
    ]);
  });

  it("reads the ancestors' codes by the same rule when the leaf cites none", () => {
    const [observation] = parseVitestEvidenceObservations(
      reportOf({ title: "the bare leaf", fullName: "[CLM-AAA-001] [CLM-AAA-002] the describe > the bare leaf" })
    );
    expect(observation).toMatchObject({ claimCode: null, notes: [{ kind: "several-claim-codes", codes: ["CLM-AAA-001", "CLM-AAA-002"] }] });
    expect(observation).not.toHaveProperty("message");
  });

  it.each([
    ["one code", "[CLM-AAA-001] one"],
    ["one code repeated", "[CLM-AAA-001] once [CLM-AAA-001] again"],
  ])("CONTROL: a title with %s credits it, with no note and no message", (_, title) => {
    expect(parseVitestEvidenceObservations(reportOf({ title }))).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-AAA-001", status: "passed", locator: "/r/several.test.ts", testName: title },
    ]);
  });

  it("CONTROL: a leaf citing one code inside a describe citing another still credits the leaf's code", () => {
    const [observation] = parseVitestEvidenceObservations(
      reportOf({ title: "[CLM-AAA-002] leaf", fullName: "[CLM-AAA-001] describe > [CLM-AAA-002] leaf" })
    );
    expect(observation).toMatchObject({ claimCode: "CLM-AAA-002" });
    expect(observation).not.toHaveProperty("notes");
    expect(observation).not.toHaveProperty("message");
  });

  describe("assembled into the ledger", () => {
    const ledger = () => reconcile(
      [
        { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "CLM-AAA-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      parseVitestEvidenceObservations(several()),
      []
    );
    const unitOutcomeOf = (claimCode: string) =>
      ledger().claimReconciliations
        .find((row) => row.claim === claimCode)
        ?.qualityCheckReconciliations.find((q) => q.qualityCheckKind === "unit")?.outcome;

    it.each(["CLM-AAA-001", "CLM-AAA-002"])("leaves %s missing", (claimCode) => {
      expect(unitOutcomeOf(claimCode)).toBe("missing");
    });

    it("words both codes on the unnamed claim's row in the catalogue's words", () => {
      const ctx: RunContext = { target: "several", inputs: handedInputs({}), corpus: "features", runStart: new Date("2026-10-14T09:00:00.000Z"), sourceSha: null };
      const reconciled = ledger();
      const unnamedClaimRow = renderMarkdown({ summary: summaryOf(reconciled, false), ledger: reconciled }, ctx, publishedExitCodeOf)
        .split("\n")
        .find((line) => line.startsWith("| (unnamed claim) | "));

      expect(unnamedClaimRow ?? "").toContain(
        `(/r/several.test.ts: ${coreMessage(CoreMessage.SeveralClaimCodesCited, { count: 2, codes: "CLM-AAA-001, CLM-AAA-002" })})`
      );
    });
  });
});
