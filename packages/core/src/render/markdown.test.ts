import { describe, expect, it } from "vitest";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation } from "../domain/postEvidenceObservation.js";
import { coreText } from "./coreText.js";
import { renderJson } from "./json.js";
import { renderMarkdown } from "./markdown.js";

const ONE_001 = { featureCode: "ONE", number: "001" };
const TWO_002 = { featureCode: "TWO", number: "002" };

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
      claimCodeErrors: [
        { kind: "no-feature-code", files: ["three.feature"] },
        {
          kind: "foreign-claim-code",
          files: ["four.feature", "five.feature"],
          featureCode: "FOUR",
          claimCode: "CLM-FIVE-001",
          namedFeatureCode: "FIVE",
          namedFeatureFiles: ["five.feature"],
        },
        { kind: "several-claim-codes", files: ["six.feature"], scenario: "a scenario", codes: ["CLM-SIX-001", "CLM-SIX-002"] },
      ],
      configurationErrors: [{ kind: "configuration-unknown-key", entry: "runnerz" }],
    },
    runIntegrity: { neverRan: [observation({ result: "never-ran", name: "a file that never loaded" })] },
    runVerdict: { verdict: "not-reconciled", why: "claim-code-errors" },
    totals: {
      claimReconciliations: { total: 4, balanced: 0, outOfBalance: 4 },
      qualityCheckReconciliations: {
        total: 4,
        outOfBalance: 4,
        byOutcome: [
          { outcome: "failing", count: 1 },
          { outcome: "no-claim-code", count: 1 },
        ],
        missingByKind: [{ kind: "unit", count: 0 }],
      },
      evidenceObservations: {
        total: 3,
        byKind: [
          { kind: "unit", count: 2 },
          { kind: "integration", count: 1 },
        ],
        onExecutableClaim: 1,
        onPhantomClaim: 1,
        onUnnamedClaim: 1,
        fitnessFunctionsRan: 0,
      },
      outOfBalanceByFeature: [{ file: "one.feature", count: 1 }],
      excludedClaimCodeOccurrences: 2,
    },
    stepAccount: {
      jobs: [{ workflow: "ci.yml", job: "ci", stepsRead: 9, runners: 4, reconcilerSteps: 1, nonChecks: 3, plumbing: 1, candidates: 0 }],
      total: { stepsRead: 9, runners: 4, reconcilerSteps: 1, nonChecks: 3, plumbing: 1, candidates: 0, accountedFor: 9 },
    },
    claimReconciliations: [
      {
        claim: { claimCode: ONE_001, file: "one.feature", title: "a claim", obligations: [{ kind: "unit" }] },
        qualityCheckReconciliations: [{ outcome: "failing", kind: "unit", obligation: { kind: "unit" }, observation: failing }],
        verdict: "out-of-balance",
      },
      {
        claim: { file: "two.feature", title: "a claim with no code", obligations: [] },
        qualityCheckReconciliations: [{ outcome: "no-claim-code", obligation: {} }],
        verdict: "out-of-balance",
      },
      {
        claim: { claimCode: TWO_002 },
        qualityCheckReconciliations: [
          {
            outcome: "cites-unknown-claim",
            kind: "integration",
            observation: { cites: [TWO_002], result: "passed", kind: "integration", place: "b.test.ts", notes: [] },
          },
        ],
        verdict: "out-of-balance",
      },
      {
        claim: {},
        qualityCheckReconciliations: [
          { outcome: "cites-no-claim", kind: "unit", observation: observation({ cites: [], result: "passed", place: "c.test.ts", name: "c test", message: "said" }) },
        ],
        verdict: "out-of-balance",
      },
    ],
  };
}

function headingsAt(level: number, markdown: string): string[] {
  const marker = `${"#".repeat(level)} `;
  return markdown.split("\n").flatMap((line) => (line.startsWith(marker) ? [line.slice(marker.length)] : []));
}

// The report with one section cut out: from its heading to the next heading at its level or above.
function cutOut(markdown: string, sectionHeading: string): string {
  const lines = markdown.split("\n");
  const start = lines.indexOf(sectionHeading);
  const level = sectionHeading.indexOf(" ");
  const after = lines.findIndex((line, at) => at > start && /^#+ /.test(line) && line.indexOf(" ") <= level);
  return [...lines.slice(0, start), ...lines.slice(after)].join("\n");
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
      "## ",
      "errors-in-the-inputs-heading",
      ({ errorsInTheInputs: _absent, ...rest }: EvidenceReconciliation): EvidenceReconciliation => rest,
      (json: EvidenceReconciliation): boolean => "errorsInTheInputs" in json,
    ],
    [
      "CLM-RPT-021",
      "## ",
      "run-integrity-heading",
      ({ runIntegrity: _absent, ...rest }: EvidenceReconciliation): EvidenceReconciliation => rest,
      (json: EvidenceReconciliation): boolean => "runIntegrity" in json,
    ],
    [
      "CLM-RPT-052",
      "### ",
      "step-account-heading",
      ({ stepAccount: _absent, ...rest }: EvidenceReconciliation): EvidenceReconciliation => rest,
      (json: EvidenceReconciliation): boolean => "stepAccount" in json,
    ],
    [
      "CLM-RPT-006",
      "### ",
      "out-of-balance-by-feature-heading",
      (evidenceReconciliation: EvidenceReconciliation): EvidenceReconciliation => {
        const { outOfBalanceByFeature: _absent, ...totals } = evidenceReconciliation.totals;
        return { ...evidenceReconciliation, totals };
      },
      (json: EvidenceReconciliation): boolean => "outOfBalanceByFeature" in json.totals,
    ],
  ] as const)("[%s] neither report has the section %s%s when the run had nothing for it", (_clm, marker, section, without, inJson) => {
    const run = without(everySection());
    expect({ markdown: renderMarkdown(run), json: inJson(JSON.parse(renderJson(run)) as EvidenceReconciliation) }).toEqual({
      markdown: cutOut(renderMarkdown(everySection()), `${marker}${coreText(section)}`),
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
    ["CLM-RPT-088", "`a", "`` `a ``"],
    ["CLM-RPT-088", "a``b`", "``` a``b` ```"],
    ["CLM-RPT-108", "*a*", "`*a*`"],
  ])("[%s] the name %j reads as it was given, in a row that keeps its columns", (_clm, name, cell) => {
    const lines = renderMarkdown(everySection(observation({ name }))).split("\n");
    const [header] = lines.filter((line) => line.startsWith(`| ${coreText("outcome-column")} `));
    const [row] = lines.filter((line) => line.startsWith("| failing | unit "));
    expect({ cell: row?.includes(` ${cell} `), columns: row?.match(UNESCAPED_PIPE)?.length }).toEqual({
      cell: true,
      columns: header?.match(UNESCAPED_PIPE)?.length,
    });
  });
});

describe("the report quotes an Evidence Observation's first line and every note", () => {
  it("[CLM-RPT-085] the report quotes an Evidence Observation's first line and every note", () => {
    const neverRan = observation({ result: "never-ran", message: "first line\nsecond line\nthird line", notes: ["one note", "another note"] });
    const markdown = renderMarkdown({ ...everySection(neverRan), runIntegrity: { neverRan: [neverRan] } });
    const rowsQuoting = (text: string): number => markdown.split("\n").filter((line) => line.startsWith("|") && line.includes(` ${text} `)).length;
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
    const text = coreText;
    const claimTable = [
      text("claim-reconciliations-key"),
      `| ${text("outcome-column")} | ${text("kind-column")} | ${text("where-column")} | ${text("said-column")} |`,
      "| --- | --- | --- | --- |",
    ];
    expect(lines).toEqual([
      `# ${text("report-title")}`,
      `## ${text("provenance-heading")}`,
      `- ${text("target-label")}: \`acme/widgets\``,
      `- ${text("source-sha-label")}: \`abc123\``,
      `- ${text("tool-sha-label")}: \`def456\``,
      `- ${text("tool-version-label")}: \`0.2.0\``,
      `- ${text("inputs-label")}: \`features\` (\`features\`), \`workflows\` (${text("input-not-given")})`,
      `## ${text("errors-in-the-inputs-heading")}`,
      `### ${text("claim-code-errors-heading")}`,
      text("claim-code-errors-key"),
      `| ${text("kind-column")} | ${text("about-column")} |`,
      "| --- | --- |",
      `| no-feature-code | ${text("files-label")}: \`three.feature\` |`,
      `| foreign-claim-code | ${text("files-label")}: \`four.feature\` \`five.feature\`; ${text("feature-code-label")}: \`FOUR\`; ` +
        `${text("claim-code-label")}: \`CLM-FIVE-001\`; ${text("named-feature-code-label")}: \`FIVE\`; ${text("named-feature-files-label")}: \`five.feature\` |`,
      `| several-claim-codes | ${text("files-label")}: \`six.feature\`; ${text("scenario-label")}: \`a scenario\`; ${text("codes-label")}: \`CLM-SIX-001\` \`CLM-SIX-002\` |`,
      `### ${text("configuration-errors-heading")}`,
      text("configuration-errors-key"),
      `| ${text("kind-column")} | ${text("setting-column")} |`,
      "| --- | --- |",
      "| configuration-unknown-key | `runnerz` |",
      `## ${text("run-integrity-heading")}`,
      text("never-ran-key"),
      `| ${text("kind-column")} | ${text("where-column")} | ${text("said-column")} |`,
      "| --- | --- | --- |",
      "| unit | `a.test.ts` `a file that never loaded` | `it broke` |",
      `## ${text("summary-heading")}`,
      `- ${text("run-verdict-label")}: not-reconciled (claim-code-errors)`,
      text("totals-key"),
      `| ${text("counted-column")} | ${text("count-column")} |`,
      "| --- | --- |",
      `| ${text("claim-reconciliations-total")} | 4 |`,
      `| ${text("claim-reconciliations-balanced")} | 0 |`,
      `| ${text("claim-reconciliations-out-of-balance")} | 4 |`,
      `| ${text("quality-check-reconciliations-total")} | 4 |`,
      `| ${text("quality-check-reconciliations-out-of-balance")} | 4 |`,
      "| failing | 1 |",
      "| no-claim-code | 1 |",
      `| ${text("missing-label")} unit | 0 |`,
      `| ${text("evidence-observations-total")} | 3 |`,
      "| unit | 2 |",
      "| integration | 1 |",
      `| ${text("on-executable-claim-label")} | 1 |`,
      `| ${text("on-phantom-claim-label")} | 1 |`,
      `| ${text("on-unnamed-claim-label")} | 1 |`,
      `| ${text("fitness-functions-ran-label")} | 0 |`,
      `| ${text("excluded-claim-code-occurrences-label")} | 2 |`,
      `### ${text("out-of-balance-by-feature-heading")}`,
      text("out-of-balance-by-feature-key"),
      `| ${text("file-column")} | ${text("count-column")} |`,
      "| --- | --- |",
      "| `one.feature` | 1 |",
      `### ${text("step-account-heading")}`,
      text("step-account-key"),
      `| ${text("workflow-column")} | ${text("job-column")} | ${text("steps-read-column")} | ${text("runners-column")} | ` +
        `${text("reconciler-steps-column")} | ${text("non-checks-column")} | ${text("plumbing-column")} | ${text("candidates-column")} |`,
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| `ci.yml` | `ci` | 9 | 4 | 1 | 3 | 1 | 0 |",
      `| ${text("step-account-total")} |  | 9 | 4 | 1 | 3 | 1 | 0 |`,
      `- ${text("accounted-for-label")}: 9`,
      `## ${text("claim-reconciliations-heading")}`,
      "### CLM-ONE-001",
      `- ${text("title-label")}: \`a claim\``,
      `- ${text("file-label")}: \`one.feature\``,
      `- ${text("verdict-label")}: out-of-balance`,
      ...claimTable,
      "| failing | unit | `a.test.ts` `a test` | `it broke` |",
      "### `a claim with no code`",
      `- ${text("title-label")}: \`a claim with no code\``,
      `- ${text("file-label")}: \`two.feature\``,
      `- ${text("verdict-label")}: out-of-balance`,
      ...claimTable,
      "| no-claim-code |  |  |  |",
      "### CLM-TWO-002",
      `- ${text("phantom-claim-label")}: ${text("phantom-claim")}`,
      `- ${text("verdict-label")}: out-of-balance`,
      ...claimTable,
      "| cites-unknown-claim | integration | `b.test.ts` |  |",
      `### ${text("unnamed-claim")}`,
      `- ${text("verdict-label")}: out-of-balance`,
      ...claimTable,
      "| cites-no-claim | unit | `c.test.ts` `c test` | `said` |",
      text("evidence-groups-key"),
      `| ${text("kind-column")} | ${text("file-column")} | ${text("claim-code-column")} | ${text("ran-column")} | ${text("passed-column")} | ${text("failed-column")} | ${text("failures-column")} |`,
      "| --- | --- | --- | --- | --- | --- | --- |",
      "| unit | `c.test.ts` |  | 1 | 1 | 0 |  |",
    ]);
  });
});

describe("the unnamed claim's evidence will be shown one group per file, each counting the tests that ran, passed and failed", () => {
  it("[CLM-RPT-110] the unnamed claim's evidence will be shown one group per file, each counting the tests that ran, passed and failed", () => {
    const citingNoClaim = (place: string, name: string, result: EvidenceObservation["result"]) =>
      ({ outcome: "cites-no-claim", kind: "unit", observation: { cites: [], result, kind: "unit", place, name, notes: [] } }) as const;
    const run: EvidenceReconciliation = {
      ...everySection(),
      claimReconciliations: [
        {
          claim: {},
          qualityCheckReconciliations: [
            citingNoClaim("a.test.ts", "first a", "passed"),
            citingNoClaim("a.test.ts", "second a", "passed"),
            citingNoClaim("b.test.ts", "first b", "passed"),
            citingNoClaim("b.test.ts", "second b", "failed"),
          ],
          verdict: "out-of-balance",
        },
      ],
    };
    const lines = renderMarkdown(run).split("\n");
    const header = lines.indexOf("| Kind | File | Claim code | Ran | Passed | Failed | Failures |");
    expect(lines.slice(header, header + 4)).toEqual([
      "| Kind | File | Claim code | Ran | Passed | Failed | Failures |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      "| unit | `a.test.ts` |  | 2 | 2 | 0 |  |",
      "| unit | `b.test.ts` |  | 2 | 1 | 1 | `second b` |",
    ]);
  });
});
