import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation, Summary } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import type { ClaimCodeError } from "../domain/scnTags.js";
import { codeErrorsCtx as ctx, FOREIGN } from "./claimCodeError.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CoreMessage } from "./messages.js";
import { markdownHeading } from "./heading.js";
import { coreMessage } from "./coreText.js";
import { isEntryOf } from "./inputErrorEntry.test-utils.js";

const SECTION = (): string => markdownHeading(2, coreMessage(CoreMessage.ErrorsInTheInputsHeading));
const CLAIM_CODE_ERRORS = (): string => markdownHeading(3, coreMessage(CoreMessage.ClaimCodeErrorsHeading));
const CONFIGURATION_NOT_READ = (): string => markdownHeading(3, coreMessage(CoreMessage.ConfigurationNotReadHeading));
const runProvenance = (): string => markdownHeading(2, coreMessage(CoreMessage.RunProvenanceHeading));
const summary = (): string => markdownHeading(2, coreMessage(CoreMessage.SummaryHeading));

const SCENARIOS: readonly Scenario[] = [{ claimCode: "SCN-ONE-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }];

const PASSED: EvidenceObservation = { qualityCheckKind: "unit", claimCode: "SCN-ONE-001", status: "passed" };

const NEVER_RAN: EvidenceObservation = {
  qualityCheckKind: "unit",
  claimCode: null,
  status: "failed",
  locator: "src/collect.test.ts",
  broken: true,
};

const KEY_NOT_READ: Partial<Summary> = { configurationKeysNotRead: ["zzz"] };

interface Inputs {
  readonly codeErrors?: readonly ClaimCodeError[];
  readonly configuration?: Partial<Summary>;
  readonly unsound?: boolean;
}

function reportLines({ codeErrors, configuration = {}, unsound = false }: Inputs): string[] {
  const ledger = reconcile(SCENARIOS, unsound ? [PASSED, NEVER_RAN] : [PASSED]);
  const reconciliation: EvidenceReconciliation = {
    summary: { ...summaryOf(ledger, false), ...configuration },
    ledger,
    ...(codeErrors === undefined ? {} : { claimCodeErrors: codeErrors }),
  };
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");
}

const isSectionHeading = (line: string): boolean => line.startsWith("## ");

interface ErrorSection {
  readonly before: string | undefined;
  readonly body: readonly string[];
  readonly after: string | undefined;
}

function errorSectionOf(lines: readonly string[]): ErrorSection {
  const start = lines.indexOf(SECTION());
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lines.findIndex((line, i) => i > start && isSectionHeading(line));
  return {
    before: lines.slice(0, start).filter(isSectionHeading).at(-1),
    body: lines.slice(start, end === -1 ? lines.length : end),
    after: end === -1 ? undefined : lines[end],
  };
}

const partsOf = (body: readonly string[]): string[] => body.filter((line) => line.startsWith("### "));

const withoutErrorSection = (lines: readonly string[]): string[] => {
  const { body } = errorSectionOf(lines);
  const start = lines.indexOf(SECTION());
  return [...lines.slice(0, start), ...lines.slice(start + body.length)];
};

describe("[SCN-RPT-077] every fault in the inputs is stated under one Errors in the inputs section after the run provenance", () => {
  it("states claim code errors alone under Claim code errors, right after the run provenance and before the Summary", () => {
    const { before, body, after } = errorSectionOf(reportLines({ codeErrors: [FOREIGN] }));
    expect(before).toBe(runProvenance());
    expect(after).toBe(summary());
    expect(partsOf(body)).toEqual([CLAIM_CODE_ERRORS()]);
    expect(body.filter((line) => line.startsWith("- `foreign-claim-code` — "))).toHaveLength(1);
  });

  it("states configuration faults alone under Configuration not read, right after the run provenance and before the Summary", () => {
    const { before, body, after } = errorSectionOf(reportLines({ configuration: KEY_NOT_READ }));
    expect(before).toBe(runProvenance());
    expect(after).toBe(summary());
    expect(partsOf(body)).toEqual([CONFIGURATION_NOT_READ()]);
    expect(body.filter(isEntryOf(coreMessage(CoreMessage.ConfigurationUnknownKey, { key: "`specController.zzz`" })))).toHaveLength(1);
  });

  it("states claim code errors before configuration faults, in one section ahead of the run integrity stamp", () => {
    const lines = reportLines({ codeErrors: [FOREIGN], configuration: KEY_NOT_READ, unsound: true });
    const { before, body, after } = errorSectionOf(lines);
    expect(before).toBe(runProvenance());
    expect(after).toBe(markdownHeading(2, coreMessage(CoreMessage.RunIntegrityHeading)));
    expect(partsOf(body)).toEqual([CLAIM_CODE_ERRORS(), CONFIGURATION_NOT_READ()]);
    expect(lines.filter((line) => line === SECTION())).toHaveLength(1);
  });

  it("prints no such section when the inputs hold no fault, and nothing in its place", () => {
    const clean = reportLines({});
    expect(clean).not.toContain(SECTION());
    const partWords = [CLAIM_CODE_ERRORS(), CONFIGURATION_NOT_READ()].map((part) => part.replace(/^#+ /, ""));
    expect(clean.filter((line) => /^#+ /.test(line) && partWords.includes(line.replace(/^#+ /, "")))).toEqual([]);
    expect(withoutErrorSection(reportLines({ configuration: KEY_NOT_READ }))).toEqual(clean);
  });
});
