import { describe, expect, it } from "vitest";
import variants from "./claimReconciliations.variants.json" with { type: "json" };
import { markdownReportOf } from "./markdown.js";
import { reconciledFrom, type EvidenceHas, type FileHas } from "./reconciledRun.test-utils.js";

// The Claim Reconciliations table as a reader sees it rendered: its header, and each row's cells, without code-span fences.
function claimTable(files: readonly FileHas[], evidence: readonly EvidenceHas[]): { readonly header: string[]; readonly rows: string[][] } {
  const markdown = markdownReportOf(reconciledFrom(files, evidence));
  const lines = markdown.slice(markdown.indexOf("\n## Claim Reconciliations\n")).split("\n").filter((line) => line.startsWith("| "));
  const cells = (line: string): string[] => line.slice(2, -2).split(/ (?<!\\)\| /).map((cell) => cell.replace(/`+/g, "").replaceAll("\\|", "|"));
  return { header: lines.length === 0 ? [] : cells(lines[0]!), rows: lines.slice(2).map(cells) };
}

const cellUnder = (column: string, { header, rows }: { readonly header: string[]; readonly rows: string[][] }, row = 0): string | undefined => rows[row]?.[header.indexOf(column)];

describe("a claim's cell for a kind shows whether it asked and how many ran", () => {
  it.each([
    ["CLM-RPT-129", "a unit Evidence Obligation, and two passing unit tests citing it", "@unit @CLM-ONE-001", [["unit", "passed", "ONE-001"], ["unit", "passed", "ONE-001"]], "U/2"],
    ["CLM-RPT-130", "a unit Evidence Obligation, and one failing unit test citing it", "@unit @CLM-ONE-001", [["unit", "failed", "ONE-001"]], "U/1"],
    ["CLM-RPT-133", "no unit Evidence Obligation, and one passing unit test citing it", "@e2e @CLM-ONE-001", [["unit", "passed", "ONE-001"]], "-/1"],
    ["CLM-RPT-134", "no unit Evidence Obligation, and no unit test citing it", "@e2e @CLM-ONE-001", [["unit", "passed", "ONE-002"]], ""],
  ] as const)("[%s] a claim with %s has its row read its cell under Unit", (_clm, _evidence, tags, evidence, cell) => {
    const table = claimTable([["one.feature", "ONE", [[tags, "adds one"]]]], evidence);

    expect(cellUnder("Unit", table)).toBe(cell);
  });

  // Each claim whose unit cell reads U/-: its tags, and the evidence citing it.
  const readingUnasked: Readonly<Record<string, readonly [string, readonly EvidenceHas[]]>> = {
    "asked for a unit test and none citing it": ["@unit @CLM-ONE-001", []],
    "one citing it that never ran": ["@unit @CLM-ONE-001", [["unit", "never-ran", "ONE-001"]]],
    "asked for a unit and an e2e test and none citing it": ["@unit @e2e @CLM-ONE-001", []],
  };

  it.each(variants["CLM-RPT-132"].variants)("[CLM-RPT-132] a claim's row reads U/- under Unit, for %j", (variant) => {
    const [tags, evidence] = readingUnasked[variant]!;

    expect(cellUnder("Unit", claimTable([["one.feature", "ONE", [[tags, "adds one"]]]], evidence))).toBe("U/-");
  });
});

describe("each row is named so a reader can find its claim", () => {
  it.each([
    ["CLM-RPT-135", "a scenario tagged @CLM-ONE-001 in one.feature", [["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds one"]]]], [], ["CLM-ONE-001"], false],
    ["CLM-RPT-136", "a scenario titled adds one with no code, in one.feature", [["one.feature", "ONE", [["@unit", "adds one"]]]], [], ["one.feature : adds one"], false],
    [
      "CLM-RPT-137",
      "two scenarios sharing @CLM-ONE-001, in one.feature and two.feature",
      [["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds one"]]], ["two.feature", "TWO", [["@unit @CLM-ONE-001", "adds one again"]]]],
      [],
      ["CLM-ONE-001 (one.feature)", "CLM-ONE-001 (two.feature)"],
      false,
    ],
    ["CLM-RPT-138", "a unit test citing @CLM-ONE-009, which no scenario has", [], [["unit", "passed", "ONE-009"]], ["CLM-ONE-009"], true],
    ["CLM-RPT-139", "a unit test citing no code", [], [["unit", "passed"]], ["(unnamed claim)"], true],
  ] as const)("[%s] a run with %s has its rows named", (_clm, _claim, files, evidence, names, dashed) => {
    const { header, rows } = claimTable(files, evidence);
    const kindColumns = header.slice(1, header.indexOf("Verdict"));

    expect({ names: rows.map((row) => row[0]), dashed: rows.every((row) => kindColumns.every((_column, at) => row[at + 1] === "—")) }).toEqual({ names, dashed });
  });
});

describe("the rows come in the order the claims were read, then the phantom claims, then the unnamed claim", () => {
  it("[CLM-RPT-140] a run with claims in one.feature then two.feature, a phantom claim and evidence on the unnamed claim has its rows in that order", () => {
    const { rows } = claimTable(
      [
        ["one.feature", "ONE", [["@unit @CLM-ONE-002", "second written first"], ["@unit @CLM-ONE-001", "first written second"]]],
        ["two.feature", "TWO", [["@unit @CLM-TWO-001", "in two"]]],
      ],
      [["unit", "passed"], ["unit", "passed", "ONE-009"]],
    );

    expect(rows.map((row) => row[0])).toEqual(["CLM-ONE-002", "CLM-ONE-001", "CLM-TWO-001", "CLM-ONE-009", "(unnamed claim)"]);
  });
});

describe("a row lists its reconciling items, each with where to look", () => {
  it.each([
    ["CLM-RPT-141", "a unit Evidence Obligation, and a passing unit test citing it", "@unit @CLM-CHK-001", [["unit", "passed", "CHK-001"]], ["—"]],
    [
      "CLM-RPT-142",
      "a unit Evidence Obligation, and its unit test that charges the card in src/checkout.test.ts failing",
      "@unit @CLM-CHK-002",
      [["unit", "failed", "CHK-002", "src/checkout.test.ts", "[CLM-CHK-002] charges the card"]],
      ["unit: failing (src/checkout.test.ts: [CLM-CHK-002] charges the card)"],
    ],
    ["CLM-RPT-143", "a unit and an e2e Evidence Obligation, and neither citing it", "@unit @e2e @CLM-CHK-003", [], ["e2e: missing", "unit: missing"]],
    ["CLM-RPT-154", "a fitness Evidence Obligation, and its step ci.yml:build:Lint failing", "@fitness @CLM-CHK-004", [["fitness", "failed", "CHK-004", "ci.yml:build:Lint"]], ["fitness: failing (ci.yml:build:Lint)"]],
    ["CLM-RPT-155", "a code and no kind-of-check tag", "@CLM-CHK-005", [], ["no-quality-check"]],
  ] as const)("[%s] a claim with %s lists its reconciling items", (_clm, _evidence, tags, evidence, items) => {
    expect(cellUnder("Reconciling items", claimTable([["checkout.feature", "CHK", [[tags, "checks out"]]]], evidence))?.split("; ").sort()).toEqual(items);
  });
});

describe("the table has a column only for a kind some claim has an Evidence Obligation or an Evidence Observation for", () => {
  it("[CLM-RPT-144] a run with only unit and fitness Evidence Obligations and Evidence Observations has a Fitness and a Unit column, and no other kind's", () => {
    const { header } = claimTable([["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds one"], ["@fitness @CLM-ONE-002", "lints"]]]], [["unit", "passed", "ONE-001"], ["fitness", "passed", "ONE-002"]]);

    expect(header.slice(1, header.indexOf("Verdict"))).toEqual(["Unit", "Fitness"]);
  });
});

describe("a section showing a never-ran test's message quotes its first line", () => {
  // The lines of the section under the heading that quote any of the message.
  const linesQuoting = (report: string, heading: string): string[] =>
    report
      .split("\n\n## ")
      .find((part) => `## ${part}`.startsWith(heading))!
      .split("\n")
      .filter((each) => each.includes("first line") || each.includes("second line"));

  const markdown = (message: string): string =>
    markdownReportOf(reconciledFrom([["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds one"]]]], [["unit", "never-ran", "ONE-001", "one.test.ts", "adds", message, "one note", "another note"]]));

  it.each([
    ["CLM-RPT-085", "a message of three lines", "first line\nsecond line\nthird line", "the Claim Reconciliations", "## Claim Reconciliations", "| CLM-ONE-001 | U/- | out-of-balance | unit: missing; unit: never-ran (`one.test.ts`: `adds`) — `first line`, `one note`, `another note` |"],
    ["CLM-RPT-146", "a message of three lines", "first line\nsecond line\nthird line", "run integrity", "## Run integrity", "- unit: `one.test.ts`, `adds` — `first line`"],
  ] as const)("[%s] a test that never ran with %s, and two notes balance added, has %s quote what it shows of them", (_clm, _described, message, _where, heading, line) => {
    expect(linesQuoting(markdown(message), heading)).toEqual([line]);
  });

  // The message whose first line is each blank line.
  const blankFirst: Readonly<Record<string, string>> = {
    "an empty line": "\nfirst line\nsecond line",
    "a line of spaces": "  \nfirst line\nsecond line",
  };

  it.each(variants["CLM-RPT-169"].variants)(
    "[CLM-RPT-169] a test that never ran with a message whose first line is %s, then two lines, and two notes balance added, has the Claim Reconciliations quote its first line that is not blank, and both notes",
    (variant) => {
      expect(linesQuoting(markdown(blankFirst[variant]!), "## Claim Reconciliations")).toEqual([
        "| CLM-ONE-001 | U/- | out-of-balance | unit: missing; unit: never-ran (`one.test.ts`: `adds`) — `first line`, `one note`, `another note` |",
      ]);
    },
  );
});

describe("a group will show its file or no file, any shared claim code, its counts and which failed", () => {
  it.each([
    [
      "CLM-RPT-110",
      'a unit group for a.test.ts, with 2 ran, 1 passed and 1 failed, the test "b" failing',
      [],
      [["unit", "passed", undefined, "a.test.ts", "a"], ["unit", "failed", undefined, "a.test.ts", "b"]],
      0,
      "unit: cites-no-claim (a.test.ts) — 2 ran, 1 passed, 1 failed: b",
    ],
    [
      "CLM-RPT-162",
      "a unit group for a.test.ts under the shared claim code CLM-ONE-001",
      [["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds"], ["@unit @CLM-ONE-001", "adds again"]]]],
      [["unit", "passed", "ONE-001", "a.test.ts", "adds"]],
      2,
      "unit: cites-no-claim (a.test.ts, CLM-ONE-001) — 1 ran, 1 passed, 0 failed",
    ],
    ["CLM-RPT-159", "a fitness group", [], [["fitness", "passed", undefined, "ci.yml:build:Lint"]], 0, "fitness: cites-no-claim — 1 ran, 1 passed, 0 failed"],
  ] as const)("[%s] the unnamed claim with %s shows the group", (_clm, _group, files, evidence, row, shown) => {
    expect(cellUnder("Reconciling items", claimTable(files, evidence), row)).toBe(shown);
  });
});
