import { describe, expect, it } from "vitest";
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
    ["CLM-RPT-129", "asked for a unit test, and two passing unit tests citing it", "@unit @CLM-ONE-001", [["unit", "passed", "ONE-001"], ["unit", "passed", "ONE-001"]], "U/2"],
    ["CLM-RPT-130", "asked for a unit test, and one failing unit test citing it", "@unit @CLM-ONE-001", [["unit", "failed", "ONE-001"]], "U/1"],
    ["CLM-RPT-131", "asked for a unit test, and one unit test citing it that never ran", "@unit @CLM-ONE-001", [["unit", "never-ran", "ONE-001"]], "U/-"],
    ["CLM-RPT-132", "asked for a unit test, and no unit test citing it", "@unit @CLM-ONE-001", [], "U/-"],
    ["CLM-RPT-133", "asked for no unit test, and one passing unit test citing it", "@e2e @CLM-ONE-001", [["unit", "passed", "ONE-001"]], "-/1"],
    ["CLM-RPT-134", "asked for no unit test, and no unit test citing it", "@e2e @CLM-ONE-001", [["unit", "passed", "ONE-002"]], ""],
    ["CLM-RPT-158", "asked for a unit and an e2e test, and no test citing it", "@unit @e2e @CLM-ONE-001", [], "U/-"],
  ] as const)("[%s] a claim that %s reads its cell under Unit", (_clm, _evidence, tags, evidence, cell) => {
    const table = claimTable([["one.feature", "ONE", [[tags, "adds one"]]]], evidence);

    expect(cellUnder("Unit", table)).toBe(cell);
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
    ["CLM-RPT-141", "asked for a unit test, and a passing unit test citing it", "@unit @CLM-CHK-001", [["unit", "passed", "CHK-001"]], "—"],
    [
      "CLM-RPT-142",
      "asked for a unit test, and its unit test that charges the card in src/checkout.test.ts failing",
      "@unit @CLM-CHK-002",
      [["unit", "failed", "CHK-002", "src/checkout.test.ts", "[CLM-CHK-002] charges the card"]],
      "unit: failing (src/checkout.test.ts: [CLM-CHK-002] charges the card)",
    ],
    ["CLM-RPT-143", "asked for a unit and an e2e test, and neither citing it", "@unit @e2e @CLM-CHK-003", [], "unit: missing; e2e: missing"],
    ["CLM-RPT-154", "asked for a fitness function, and its step ci.yml:build:Lint failing", "@fitness @CLM-CHK-004", [["fitness", "failed", "CHK-004", "ci.yml:build:Lint"]], "fitness: failing (ci.yml:build:Lint)"],
    ["CLM-RPT-155", "had a code and no kind-of-check tag", "@CLM-CHK-005", [], "no-quality-check"],
    ["CLM-RPT-156", "had no scenario, and a passing unit test charges in a.test.ts citing it", undefined, [["unit", "passed", "CHK-009", "a.test.ts", "charges"]], "unit: cites-unknown-claim (a.test.ts: charges)"],
    ["CLM-RPT-157", "had no code, and asked for a unit test", "@unit", [], "unit: no-claim-code"],
  ] as const)("[%s] a claim that %s lists its reconciling items", (_clm, _evidence, tags, evidence, items) => {
    expect(cellUnder("Reconciling items", claimTable([["checkout.feature", "CHK", tags === undefined ? [] : [[tags, "checks out"]]]], evidence))).toBe(items);
  });
});

describe("the table has a column only for a kind some claim raises or answers", () => {
  it("[CLM-RPT-144] a run with only unit and fitness Evidence Obligations and Evidence Observations has a Fitness and a Unit column, and no other kind's", () => {
    const { header } = claimTable([["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds one"], ["@fitness @CLM-ONE-002", "lints"]]]], [["unit", "passed", "ONE-001"], ["fitness", "passed", "ONE-002"]]);

    expect(header.slice(1, header.indexOf("Verdict"))).toEqual(["Unit", "Fitness"]);
  });
});

describe("a section showing a never-ran test's message quotes its first line", () => {
  const markdown = (message: string): string =>
    markdownReportOf(reconciledFrom([["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds one"]]]], [["unit", "never-ran", "ONE-001", "one.test.ts", "adds", message, "one note", "another note"]]));

  it.each([
    ["CLM-RPT-085", "a message of three lines", "first line\nsecond line\nthird line", "the Claim Reconciliations", "## Claim Reconciliations", "| CLM-ONE-001 | U/- | out-of-balance | unit: missing; unit: never-ran (`one.test.ts`: `adds`) — `first line`, `one note`, `another note` |"],
    ["CLM-RPT-146", "a message of three lines", "first line\nsecond line\nthird line", "run integrity", "## Run integrity", "- unit: `one.test.ts`, `adds` — `first line`"],
    [
      "CLM-RPT-169",
      "a message whose first line is blank, then two lines",
      "\nfirst line\nsecond line",
      "the Claim Reconciliations",
      "## Claim Reconciliations",
      "| CLM-ONE-001 | U/- | out-of-balance | unit: missing; unit: never-ran (`one.test.ts`: `adds`) — `first line`, `one note`, `another note` |",
    ],
  ] as const)("[%s] a test that never ran with %s, and two notes balance added, has %s quote what it shows of them", (_clm, _described, message, _where, heading, line) => {
    const section = markdown(message).split("\n\n## ").find((part) => `## ${part}`.startsWith(heading))!;

    expect(section.split("\n").filter((each) => each.includes("first line") || each.includes("second line"))).toEqual([line]);
  });
});

describe("the report shows the unnamed claim's evidence one group per file", () => {
  it("[CLM-RPT-110] unit tests citing no claim in two files, one failing, show a group for each file with how many ran, passed and failed, and the failing test", () => {
    const items = cellUnder(
      "Reconciling items",
      claimTable([], [["unit", "passed", undefined, "a.test.ts", "adds"], ["unit", "passed", undefined, "a.test.ts", "subtracts"], ["unit", "passed", undefined, "b.test.ts", "charges"], ["unit", "failed", undefined, "b.test.ts", "refunds"]]),
    );

    expect(items).toBe("unit: cites-no-claim (a.test.ts) — 2 ran, 2 passed, 0 failed; unit: cites-no-claim (b.test.ts) — 2 ran, 1 passed, 1 failed: refunds");
  });
});

describe("a group of the unnamed claim's evidence with a shared claim code shows that code", () => {
  it("[CLM-RPT-162] a passing unit test in a.test.ts citing no code, and one citing CLM-ONE-001, which two scenarios share, show two unit groups for a.test.ts, one showing CLM-ONE-001", () => {
    const table = claimTable([["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds"], ["@unit @CLM-ONE-001", "adds again"]]]], [["unit", "passed", undefined, "a.test.ts", "subtracts"], ["unit", "passed", "ONE-001", "a.test.ts", "adds"]]);

    expect(cellUnder("Reconciling items", table, 2)).toBe("unit: cites-no-claim (a.test.ts) — 1 ran, 1 passed, 0 failed; unit: cites-no-claim (a.test.ts, CLM-ONE-001) — 1 ran, 1 passed, 0 failed");
  });
});

describe("the unnamed claim's fitness evidence shows as one group with no file", () => {
  it("[CLM-RPT-159] the step ci.yml:build:Lint passing, citing no claim, shows as one fitness group with no file, 1 ran, 1 passed and 0 failed", () => {
    expect(cellUnder("Reconciling items", claimTable([], [["fitness", "passed", undefined, "ci.yml:build:Lint"]]))).toBe("fitness: cites-no-claim — 1 ran, 1 passed, 0 failed");
  });
});
