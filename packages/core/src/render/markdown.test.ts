import { describe, expect, it } from "vitest";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation } from "../domain/postEvidenceObservation.js";
import { coreText } from "./coreText.js";
import { renderJson } from "./json.js";
import { renderMarkdown } from "./markdown.js";

const ONE_001 = { featureCode: "ONE", number: "001" };

function observation(said: Partial<EvidenceObservation> = {}): EvidenceObservation {
  return { cites: [ONE_001], result: "failed", kind: "unit", place: "a.test.ts", name: "a test", message: "it broke", notes: [], ...said };
}

function everySection(failing: EvidenceObservation = observation()): EvidenceReconciliation {
  return {
    provenance: {
      target: "acme/widgets",
      sourceSha: "abc123",
      toolSha: "def456",
      toolVersion: "0.2.0",
      inputs: [{ name: "features", path: "features" }, { name: "workflows" }],
    },
    errorsInTheInputs: {
      claimCodeErrors: [{ kind: "no-feature-code", files: ["three.feature"] }],
      configurationErrors: [{ kind: "configuration-unknown-key", entry: "runnerz" }],
    },
    runIntegrity: { neverRan: [observation({ result: "never-ran", name: "a file that never loaded" })] },
    runVerdict: { verdict: "out-of-balance" },
    totals: {
      claimReconciliations: { total: 1, balanced: 0, outOfBalance: 1 },
      qualityCheckReconciliations: { total: 1, outOfBalance: 1, byOutcome: [{ outcome: "failing", count: 1 }], missingByKind: [{ kind: "unit", count: 0 }] },
      evidenceObservations: { total: 1, byKind: [{ kind: "unit", count: 1 }], onExecutableClaim: 1, onPhantomClaim: 0, onUnnamedClaim: 0, fitnessFunctionsRan: 0 },
      outOfBalanceByFeature: [{ file: "one.feature", count: 1 }],
      excludedClaimCodeOccurrences: 0,
    },
    stepAccount: {
      jobs: [{ workflow: "ci.yml", job: "ci", stepsRead: 3, runners: 1, reconcilerSteps: 1, nonChecks: 1, plumbing: 0, candidates: 0 }],
      total: { stepsRead: 3, runners: 1, reconcilerSteps: 1, nonChecks: 1, plumbing: 0, candidates: 0, accountedFor: 3 },
    },
    claimReconciliations: [
      {
        claim: { claimCode: ONE_001, file: "one.feature", title: "a claim", obligations: [{ kind: "unit" }] },
        qualityCheckReconciliations: [{ outcome: "failing", kind: "unit", obligation: { kind: "unit" }, observation: failing }],
        verdict: "out-of-balance",
      },
    ],
  };
}

function headingsAt(level: number, markdown: string): string[] {
  const marker = `${"#".repeat(level)} `;
  return markdown.split("\n").flatMap((line) => (line.startsWith(marker) ? [line.slice(marker.length)] : []));
}

describe("the Markdown report's sections will come in a fixed order", () => {
  it("[CLM-RPT-009] the Markdown report's sections will come in a fixed order", () => {
    expect(headingsAt(2, renderMarkdown(everySection()))).toEqual([
      coreText("provenance-heading"),
      coreText("errors-in-the-inputs-heading"),
      coreText("run-integrity-heading"),
      coreText("summary-heading"),
      coreText("claim-reconciliations-heading"),
    ]);
  });
});

describe("a report will show its Claim Reconciliations when the run had none", () => {
  it("[CLM-RPT-105] a report will show its Claim Reconciliations when the run had none", () => {
    const nothing = { ...everySection(), claimReconciliations: [] };
    const lines = renderMarkdown(nothing).split("\n").filter((line) => line !== "");
    const section = lines.slice(lines.indexOf(`## ${coreText("claim-reconciliations-heading")}`));
    expect({ markdown: section.slice(0, 2), json: (JSON.parse(renderJson(nothing)) as EvidenceReconciliation).claimReconciliations }).toEqual({
      markdown: [`## ${coreText("claim-reconciliations-heading")}`, coreText("claim-reconciliations-none")],
      json: [],
    });
  });
});

describe("neither report will have an optional section the run had nothing for", () => {
  it.each([
    [
      "CLM-RPT-077",
      "errors-in-the-inputs-heading",
      ({ errorsInTheInputs: _absent, ...rest }: EvidenceReconciliation): EvidenceReconciliation => rest,
      (json: EvidenceReconciliation): boolean => "errorsInTheInputs" in json,
    ],
    [
      "CLM-RPT-021",
      "run-integrity-heading",
      ({ runIntegrity: _absent, ...rest }: EvidenceReconciliation): EvidenceReconciliation => rest,
      (json: EvidenceReconciliation): boolean => "runIntegrity" in json,
    ],
    [
      "CLM-RPT-052",
      "step-account-heading",
      ({ stepAccount: _absent, ...rest }: EvidenceReconciliation): EvidenceReconciliation => rest,
      (json: EvidenceReconciliation): boolean => "stepAccount" in json,
    ],
    [
      "CLM-RPT-006",
      "out-of-balance-by-feature-heading",
      (evidenceReconciliation: EvidenceReconciliation): EvidenceReconciliation => {
        const { outOfBalanceByFeature: _absent, ...totals } = evidenceReconciliation.totals;
        return { ...evidenceReconciliation, totals };
      },
      (json: EvidenceReconciliation): boolean => "outOfBalanceByFeature" in json.totals,
    ],
  ] as const)("[%s] neither report has the section %s when the run had nothing for it", (_clm, section, without, inJson) => {
    const run = without(everySection());
    const headings = [...headingsAt(2, renderMarkdown(run)), ...headingsAt(3, renderMarkdown(run))];
    expect({ markdown: headings.includes(coreText(section)), json: inJson(JSON.parse(renderJson(run)) as EvidenceReconciliation) }).toEqual({
      markdown: false,
      json: false,
    });
  });
});

describe("a name will read as it was given, in a table that stays a table", () => {
  const UNESCAPED_PIPE = /(?<!\\)\|/g;

  it.each([
    ["CLM-RPT-084", "a|b", "`a\\|b`"],
    ["CLM-RPT-106", "a\\b", "`a\\b`"],
    ["CLM-RPT-107", "a\nb", '`"a\\nb"`'],
    ["CLM-RPT-088", "`a`", "`` `a` ``"],
    ["CLM-RPT-108", "*a*", "`*a*`"],
  ])("[%s] the name %j reads as it was given, in a row that keeps its columns", (_clm, name, cell) => {
    const lines = renderMarkdown(everySection(observation({ name }))).split("\n");
    const [header] = lines.filter((line) => line.startsWith(`| ${coreText("outcome-column")} `));
    const [row] = lines.filter((line) => line.startsWith("| failing | unit "));
    expect({ cell: row?.includes(cell), columns: row?.match(UNESCAPED_PIPE)?.length }).toEqual({
      cell: true,
      columns: header?.match(UNESCAPED_PIPE)?.length,
    });
  });
});

describe("the report quotes an Evidence Observation's first line and every note", () => {
  it("[CLM-RPT-085] the report quotes an Evidence Observation's first line and every note", () => {
    const neverRan = observation({ result: "never-ran", message: "first line\nsecond line\nthird line", notes: ["one note", "another note"] });
    const markdown = renderMarkdown({ ...everySection(neverRan), runIntegrity: { neverRan: [neverRan] } });
    const rowsQuoting = (text: string): number => markdown.split("\n").filter((line) => line.startsWith("|") && line.includes(text)).length;
    expect({
      firstLine: rowsQuoting("`first line`"),
      notes: [rowsQuoting("`one note`"), rowsQuoting("`another note`")],
      laterLines: rowsQuoting("second line") + rowsQuoting("third line"),
    }).toEqual({ firstLine: 2, notes: [2, 2], laterLines: 0 });
  });
});

describe("each section will have its heading, each value its label, and each table a key", () => {
  it("[CLM-RPT-109] each section will have its heading, each value its label, and each table a key", () => {
    const lines = renderMarkdown(everySection())
      .split("\n")
      .filter((line) => line !== "");
    const tableStarts = lines.flatMap((line, at) => (line.startsWith("|") && !(lines[at - 1] ?? "").startsWith("|") ? [at] : []));
    const keyless = tableStarts.filter((at) => /^(#|- |\|)/.test(lines[at - 1] ?? "#"));
    const unlabelled = lines.filter((line) => line.startsWith("- ") && !/^- [^`:]+: \S/.test(line));
    const labels = ["target-label", "source-sha-label", "tool-sha-label", "tool-version-label", "inputs-label", "run-verdict-label"] as const;
    const missingLabels = labels.filter((code) => !lines.some((line) => line.startsWith(`- ${coreText(code)}: `)));
    expect({ tables: tableStarts.length, keyless, unlabelled, missingLabels }).toEqual({ tables: 7, keyless: [], unlabelled: [], missingLabels: [] });
  });
});
