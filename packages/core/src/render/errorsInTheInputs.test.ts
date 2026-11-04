import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation, Summary } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import type { ScenarioCodeError } from "../domain/scnTags.js";
import { codeErrorsCtx as ctx, FOREIGN } from "./scenarioCodeError.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { isEntryOf } from "./inputErrorEntry.test-utils.js";

const SECTION = CORE_MESSAGES[CoreMessage.ErrorsInTheInputsHeading];
const SCENARIO_CODE_ERRORS = CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeading];
const CONFIGURATION_NOT_READ = CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading];
const RUN_PROVENANCE = CORE_MESSAGES[CoreMessage.RunProvenanceHeading];
const SUMMARY_VIEWS = CORE_MESSAGES[CoreMessage.SummaryViewsHeading];

const SCENARIOS: readonly Scenario[] = [{ scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }];

const PASSED: EvidenceObservation = { qualityCheckKind: "unit", scnId: "SCN-ONE-001", status: "passed" };

const NEVER_RAN: EvidenceObservation = {
  qualityCheckKind: "unit",
  scnId: null,
  status: "failed",
  locator: "src/collect.test.ts",
  broken: true,
};

const KEY_NOT_READ: Partial<Summary> = { configurationKeysNotRead: ["zzz"] };

interface Inputs {
  readonly codeErrors?: readonly ScenarioCodeError[];
  readonly configuration?: Partial<Summary>;
  readonly unsound?: boolean;
}

function reportLines({ codeErrors, configuration = {}, unsound = false }: Inputs): string[] {
  const ledger = reconcile(SCENARIOS, unsound ? [PASSED, NEVER_RAN] : [PASSED]);
  const reconciliation: EvidenceReconciliation = {
    summary: { ...summaryOf(ledger, false), ...configuration },
    ledger,
    ...(codeErrors === undefined ? {} : { scenarioCodeErrors: codeErrors }),
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
  const start = lines.indexOf(SECTION);
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
  const start = lines.indexOf(SECTION);
  return [...lines.slice(0, start), ...lines.slice(start + body.length)];
};

describe("[SCN-RPT-077] every fault in the inputs is stated under one Errors in the inputs section after the run provenance", () => {
  it("states scenario code errors alone under Scenario code errors, right after the run provenance and before the summary views", () => {
    const { before, body, after } = errorSectionOf(reportLines({ codeErrors: [FOREIGN] }));
    expect(before).toBe(RUN_PROVENANCE);
    expect(after).toBe(SUMMARY_VIEWS);
    expect(partsOf(body)).toEqual([SCENARIO_CODE_ERRORS]);
    expect(body.filter((line) => line.startsWith("- `foreign-scn-code` — "))).toHaveLength(1);
  });

  it("states configuration faults alone under Configuration not read, right after the run provenance and before the summary views", () => {
    const { before, body, after } = errorSectionOf(reportLines({ configuration: KEY_NOT_READ }));
    expect(before).toBe(RUN_PROVENANCE);
    expect(after).toBe(SUMMARY_VIEWS);
    expect(partsOf(body)).toEqual([CONFIGURATION_NOT_READ]);
    expect(body.filter(isEntryOf(coreMessage(CoreMessage.ConfigurationUnknownKey, { key: "`specController.zzz`" })))).toHaveLength(1);
  });

  it("states scenario code errors before configuration faults, in one section ahead of the run integrity stamp", () => {
    const lines = reportLines({ codeErrors: [FOREIGN], configuration: KEY_NOT_READ, unsound: true });
    const { before, body, after } = errorSectionOf(lines);
    expect(before).toBe(RUN_PROVENANCE);
    expect(after).toBe(CORE_MESSAGES[CoreMessage.RunIntegrityHeading]);
    expect(partsOf(body)).toEqual([SCENARIO_CODE_ERRORS, CONFIGURATION_NOT_READ]);
    expect(lines.filter((line) => line === SECTION)).toHaveLength(1);
  });

  it("prints no such section when the inputs hold no fault, and nothing in its place", () => {
    const clean = reportLines({});
    expect(clean).not.toContain(SECTION);
    const partWords = [SCENARIO_CODE_ERRORS, CONFIGURATION_NOT_READ].map((part) => part.replace(/^#+ /, ""));
    expect(clean.filter((line) => /^#+ /.test(line) && partWords.includes(line.replace(/^#+ /, "")))).toEqual([]);
    expect(withoutErrorSection(reportLines({ configuration: KEY_NOT_READ }))).toEqual(clean);
  });
});
