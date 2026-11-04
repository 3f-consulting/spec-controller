import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { UNNAMED_CLAIM_ID } from "../model.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import { brokenEvidenceNameOf } from "./markdown.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { RECONCILING_ITEMS_COLUMN, claimReconciliationsTable } from "./claimReconciliationsTable.test-utils.js";

const ctx: RunContext = {
  target: "run-integrity-target",
  inputs: [{ ...FEATURES, path: "specs/features" }, { ...VITEST, path: "vitest-report.json" }, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "specs/features",
  runStart: new Date("2026-10-05T17:00:00.000Z"),
  sourceSha: "4084f00dc0ffeeba110000000000000000deadbe",
  toolSha: "4084aaaa71ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const COLLECTION_FAILED_LOCATOR = "src/collect.test.ts";
const COLLECTION_FAILED_MESSAGE = "  \n\t\nError:  Cannot   find | package\n    at packageResolve (node:internal)";

const collectionFailed = (locator: string | undefined, message?: string): EvidenceObservation => ({
  qualityCheckKind: "unit",
  scnId: null,
  status: "failed",
  ...(locator !== undefined ? { locator } : {}),
  broken: true,
  ...(message !== undefined ? { message } : {}),
});

const SKIPPED_CHECK: EvidenceObservation = {
  qualityCheckKind: "fitness",
  fitnessFunction: "SCN-RIN-001",
  scnId: "SCN-RIN-001",
  exists: false,
  enforcedOverRealSource: false,
  broken: true,
  notes: [{ kind: "check-step-did-not-run", code: "SCN-RIN-001", outcome: "skipped" }],
};

const SCENARIOS: readonly Scenario[] = [
  { scnId: "SCN-RIN-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { scnId: "SCN-RIN-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
];

function render(...broken: readonly EvidenceObservation[]): string {
  const ledger = reconcile(SCENARIOS, [...broken]);
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf);
}

function runIntegrityLines(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.RunIntegrityHeading)));
  const end = lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.SummaryHeading)));
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return lines.slice(start, end);
}

function reconcilingItemsCell(md: string, claim: string): string {
  return claimReconciliationsTable(md).rowOf(claim).cell(RECONCILING_ITEMS_COLUMN);
}

const whatBroke = (locator: string): string =>
  `- ${coreMessage(CoreMessage.BrokenEvidenceWhatBroke, { locator: `\`${locator}\`` })}`;

const brokenCell = (qualityCheckKind: string, where: string): string =>
  `${qualityCheckKind}: ${OUTCOME_DESCRIPTION.broken} (${where})`;

const unsoundStamp = (proofs: string): string => coreMessage(CoreMessage.RunUnsound, { proofs });

describe("[SCN-RPT-021] the markdown names the broken evidence and its error, and stamps the run unsound", () => {
  let checkDidNotRun: string;
  beforeEach(() => {
    checkDidNotRun = CORE_MESSAGES[CoreMessage.CheckStepSkipped]("SCN-RIN-001");
  });

  it.each([
    ["its error verbatim", COLLECTION_FAILED_MESSAGE, "```", COLLECTION_FAILED_MESSAGE],
    [
      "an error holding a line of three backticks verbatim, inside a fence one backtick longer",
      "Error: bad\n```\n# Heading after fence\nmore",
      "````",
      "Error: bad\n```\n# Heading after fence\nmore",
    ],
    ["an empty error as no message", "", "```", null],
    ["an error of whitespace only as no message", "  \n\t", "```", null],
  ])("one broken evidence: the stamp counts one proof, then names its file and prints %s, each block followed by a blank line", (_, message, fence, shown) => {
    const md = render(collectionFailed(COLLECTION_FAILED_LOCATOR, message));
    expect(runIntegrityLines(md)).toEqual([
      markdownHeading(2, coreMessage(CoreMessage.RunIntegrityHeading)),
      "",
      unsoundStamp(CORE_MESSAGES[CoreMessage.OneProofNeverRan]),
      "",
      whatBroke(COLLECTION_FAILED_LOCATOR),
      "",
      `${fence}text`,
      ...(shown ?? coreMessage(CoreMessage.BrokenEvidenceNoMessage)).split("\n"),
      fence,
      "",
    ]);
  });

  it("a broken item whose error is empty and which carries a note is printed with the note's words alone", () => {
    const md = render({ ...SKIPPED_CHECK, message: "" });
    expect(runIntegrityLines(md)).toEqual([
      markdownHeading(2, coreMessage(CoreMessage.RunIntegrityHeading)),
      "",
      unsoundStamp(CORE_MESSAGES[CoreMessage.OneProofNeverRan]),
      "",
      whatBroke(coreMessage(CoreMessage.BrokenEvidenceNotNamed)),
      "",
      "```text",
      checkDidNotRun,
      "```",
      "",
    ]);
  });

  it("two broken evidences: the stamp counts them in the plural, and the one the runner did not name is listed as unnamed", () => {
    const md = render(collectionFailed(COLLECTION_FAILED_LOCATOR, COLLECTION_FAILED_MESSAGE), SKIPPED_CHECK);
    expect(runIntegrityLines(md)).toEqual([
      markdownHeading(2, coreMessage(CoreMessage.RunIntegrityHeading)),
      "",
      unsoundStamp(CORE_MESSAGES[CoreMessage.ProofsNeverRan](2)),
      "",
      whatBroke(coreMessage(CoreMessage.BrokenEvidenceNotNamed)),
      "",
      "```text",
      checkDidNotRun,
      "```",
      "",
      whatBroke(COLLECTION_FAILED_LOCATOR),
      "",
      "```text",
      ...COLLECTION_FAILED_MESSAGE.split("\n"),
      "```",
      "",
    ]);
  });

  it("each row headlines its broken item by its error's first non-blank line, whitespace collapsed and the cell's pipe escaped, the skipped check's on the scenario it names", () => {
    const message = "  \n\t\nCannot   find | package\n    at packageResolve (node:internal)";
    const md = render(collectionFailed(COLLECTION_FAILED_LOCATOR, message), SKIPPED_CHECK);
    expect(reconcilingItemsCell(md, UNNAMED_CLAIM_ID)).toBe(
      brokenCell("unit", `${COLLECTION_FAILED_LOCATOR}: Cannot find \\| package`),
    );
    expect(reconcilingItemsCell(md, "SCN-RIN-001")).toBe(
      [`fitness: ${OUTCOME_DESCRIPTION.missing}`, brokenCell("fitness", checkDidNotRun)].join("; "),
    );
  });

  it("the unnamed claim's row trims a broken file's locator that begins with a space, when the runner reports no error", () => {
    const md = render(collectionFailed(" spaced/collect.test.ts"));
    expect(reconcilingItemsCell(md, UNNAMED_CLAIM_ID)).toBe(brokenCell("unit", "spaced/collect.test.ts"));
  });

  it("a broken file whose locator is whitespace only is listed as unnamed, as one with no locator is", () => {
    const md = render(collectionFailed("  ", COLLECTION_FAILED_MESSAGE));
    expect(runIntegrityLines(md)).toContain(whatBroke(coreMessage(CoreMessage.BrokenEvidenceNotNamed)));
  });

  it.each([
    { shape: "no locator", locator: undefined, name: { kind: "unnamed" } },
    { shape: "an empty locator", locator: "", name: { kind: "unnamed" } },
    { shape: "a locator of whitespace only", locator: " \t ", name: { kind: "unnamed" } },
    { shape: "a locator", locator: " spaced/collect.test.ts", name: { kind: "named", locator: " spaced/collect.test.ts" } },
  ])("a broken evidence observation with $shape is named by whether its locator names anything", ({ locator, name }) => {
    expect(brokenEvidenceNameOf(collectionFailed(locator))).toEqual(name);
  });
});

describe("[SCN-RPT-085] an item quoting what an evidence observation said states the first line of its message and every note, however many lines the message runs to", () => {
  const codes = ["SCN-RIN-001", "SCN-RIN-002"];
  const said = { locator: "src/x.test.ts", message: "\nexpected 1 to be 2\n    at foo (x.ts:1)", notes: [{ kind: "several-scn-codes", codes }] } as const;
  const rows: [string, EvidenceObservation][] = [
    ["a broken item", { qualityCheckKind: "unit", scnId: null, status: "failed", broken: true, ...said }],
    ["a file's group on the unnamed claim's row", { qualityCheckKind: "unit", scnId: null, status: "failed", testName: "t1", ...said }],
  ];
  it.each(rows)("%s", (_, observation) => {
    const item = reconcilingItemsCell(render(observation), UNNAMED_CLAIM_ID);
    expect(item).toContain(`(${said.locator}: expected 1 to be 2 ${CORE_MESSAGES[CoreMessage.SeveralScnCodes](codes)})`);
    expect(item).not.toContain("at foo");
  });

  it("a file's group states a headline once when its tests' messages differ only in their spacing", () => {
    const failing = (testName: string, message: string): EvidenceObservation =>
      ({ qualityCheckKind: "unit", scnId: null, status: "failed", locator: "x.test.ts", testName, message });
    const item = reconcilingItemsCell(render(failing("t1", "expected\t1  to be 2"), failing("t2", "expected 1 to be 2")), UNNAMED_CLAIM_ID);
    expect(item).toContain("(x.test.ts: expected 1 to be 2)");
    expect(item.split("expected 1 to be 2")).toHaveLength(2);
  });
});
