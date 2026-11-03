import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger } from "../model.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation, Summary } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

let ledger: Ledger;
beforeEach(() => {
  ledger = reconcile(
    [{ scnId: "SCN-USG-025", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
    [{ qualityCheckKind: "unit", scnId: "SCN-USG-025", status: "passed" }],
  );
});

const ctx: RunContext = {
  target: "config-target",
  inputs: [{ ...FEATURES, path: "features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, { ...PACKAGE_JSON, path: "package.json" }, CI_STEPS],
  corpus: "features",
  runStart: new Date("2026-09-28T12:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const render = (extra: Partial<Summary>): string => {
  const er: EvidenceReconciliation = { summary: { ...summaryOf(ledger, false), ...extra }, ledger };
  return renderMarkdown(er, ctx, publishedExitCodeOf);
};

const heading = CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading];
const wrongKind = CORE_MESSAGES[CoreMessage.ConfigurationWrongKind];
const unknownKey = CORE_MESSAGES[CoreMessage.ConfigurationUnknownKey];
const notChecksAsAString = (): string =>
  `- ${wrongKind("`specController.notChecks`", CORE_MESSAGES[CoreMessage.ManifestKindString], CORE_MESSAGES[CoreMessage.ManifestKindList])}`;

const section = (md: string): string[] => {
  const lines = md.split("\n");
  const start = lines.indexOf(heading);
  if (start === -1) return [];
  const end = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  return lines.slice(start, end);
};

describe("[SCN-RPT-045] the report names a specController entry of a kind its reader does not take", () => {
  it("renders one line per entry, after the run provenance and before any cut of the reconciliation", () => {
    const md = render({
      configurationOfWrongKind: [
        { entry: "specController.notChecks", is: "string", reads: "list" },
        { entry: "specController.runners.unit", is: "number", reads: "string-or-null" },
      ],
    });
    expect(section(md)).toEqual([
      heading,
      "",
      CORE_MESSAGES[CoreMessage.ConfigurationNotReadIntro],
      "",
      notChecksAsAString(),
      `- ${wrongKind("`specController.runners.unit`", CORE_MESSAGES[CoreMessage.ManifestKindOfType]("number"), CORE_MESSAGES[CoreMessage.ManifestKindStringOrNull])}`,
      "",
    ]);
    expect(md.indexOf(CORE_MESSAGES[CoreMessage.RunProvenanceHeading])).toBeLessThan(md.indexOf(heading));
    expect(md.indexOf(heading)).toBeLessThan(md.indexOf(CORE_MESSAGES[CoreMessage.SummaryViewsHeading]));
  });
});

describe("[SCN-RPT-046] the report names a key the specController block does not read, in one sentence for every key", () => {
  it("names each unread key after the entries of the wrong kind", () => {
    const md = render({
      configurationOfWrongKind: [{ entry: "specController.notChecks", is: "string", reads: "list" }],
      configurationKeysNotRead: ["fitnessChecks", "zzz"],
    });
    expect(section(md).filter((l) => l.startsWith("- "))).toEqual([
      notChecksAsAString(),
      `- ${unknownKey("`specController.fitnessChecks`")}`,
      `- ${unknownKey("`specController.zzz`")}`,
    ]);
  });
});

const codeSpansOf = (line: string): string[] => {
  const runs = [...line.matchAll(/`+/g)].map((run, i) => ({ fence: run[0], at: run.index, i }));
  const spans: string[] = [];
  let resumeAt = 0;
  for (const open of runs) {
    if (open.i < resumeAt) continue;
    const close = runs.find((run) => run.i > open.i && run.fence === open.fence);
    if (close === undefined) continue;
    const text = line.slice(open.at + open.fence.length, close.at);
    spans.push(/^ .*[^ ].* $/s.test(text) ? text.slice(1, -1) : text);
    resumeAt = close.i + 1;
  }
  return spans;
};

const counts = { stepsRead: 1, candidates: 1, runners: 0, reconciler: 0, nonChecks: 0, plumbing: 0 };

type StepAccountingRows = NonNullable<Summary["stepAccounting"]>;

const withNotApplied = (rows: Partial<StepAccountingRows>): Partial<Summary> => ({
  stepAccounting: {
    byJob: [{ workflow: "ci.yml", job: "quality", ...counts }],
    total: counts,
    steps: {},
    workflowsRead: ["ci.yml"],
    nonChecksNamingAWorkflowNotRead: ["other.yml:build:Test"],
    ...rows,
  },
});

describe("[SCN-RPT-088] each configuration entry and workflow name the report quotes is shown whole in its code span: a backtick as written, and a line break, spaces at both edges, nothing but spaces, an empty value or enclosing quotes as its quoted string", () => {
  it.each([
    { shown: "ci.yml:quality:Run `pnpm test`", extra: { nonChecksMatchingNoStep: ["ci.yml:quality:Run `pnpm test`"] } },
    { shown: "`Deploy`", extra: { nonChecksNotAStepName: ["`Deploy`"] } },
    { shown: "specController.zz``z`", extra: { configurationKeysNotRead: ["zz``z`"] } },
    { shown: "specController.runners.`unit", extra: { runnerKeysNotALayer: ["`unit"] } },
    { shown: "specController.runners.a`b", extra: { configurationOfWrongKind: [{ entry: "specController.runners.a`b", is: "number" as const, reads: "string-or-null" as const }] } },
    { shown: "`ci.yaml`:quality:Deploy", accounting: { nonChecksNamingAWorkflowNotRead: ["`ci.yaml`:quality:Deploy"] } },
    { shown: " ci.yml:build:Test", accounting: { nonChecksNamingAWorkflowNotRead: [" ci.yml:build:Test"] } },
    { shown: "ci.yml:build:Test ", accounting: { nonChecksNamingAWorkflowNotRead: ["ci.yml:build:Test "] } },
    { shown: '"ci.yml:build:Test', extra: { nonChecksMatchingNoStep: ['"ci.yml:build:Test'] } },
    { shown: 'ci.yml:build:Run "lint"', extra: { nonChecksMatchingNoStep: ['ci.yml:build:Run "lint"'] } },
    { shown: "c`i.yml", accounting: { workflowsRead: ["c`i.yml"] } },
  ])("shows $shown as written", ({ shown, extra, accounting }) => {
    const lines = render(accounting === undefined ? extra : withNotApplied(accounting)).split("\n");
    expect(lines.filter((line) => codeSpansOf(line).includes(shown))).toHaveLength(1);
  });

  it.each([
    { written: "", shown: '""', extra: { nonChecksNotAStepName: [""] } },
    { written: "   ", shown: '"   "', extra: { nonChecksNotAStepName: ["   "] } },
    { written: "a\nb", shown: '"a\\nb"', extra: { nonChecksMatchingNoStep: ["a\nb"] } },
    { written: "a\rb", shown: '"a\\rb"', extra: { nonChecksMatchingNoStep: ["a\rb"] } },
    { written: '"ci.yml:build:Test"', shown: '"\\"ci.yml:build:Test\\""', extra: { nonChecksMatchingNoStep: ['"ci.yml:build:Test"'] } },
    { written: " ci.yml:build:Test ", shown: '" ci.yml:build:Test "', accounting: { nonChecksNamingAWorkflowNotRead: [" ci.yml:build:Test "] } },
    { written: "c\ni.yml", shown: '"c\\ni.yml"', accounting: { workflowsRead: ["c\ni.yml"] } },
  ])("shows $written as its quoted string $shown", ({ written, shown, extra, accounting }) => {
    const lines = render(accounting === undefined ? extra : withNotApplied(accounting)).split("\n");
    expect(lines.filter((line) => codeSpansOf(line).includes(shown))).toHaveLength(1);
    expect(JSON.parse(shown)).toBe(written);
  });
});
