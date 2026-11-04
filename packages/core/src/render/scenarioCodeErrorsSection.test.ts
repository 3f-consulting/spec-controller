import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { renderReportFromJson } from "../assemble/composers.js";
import { assembleRenderInput } from "../assemble/renderInput.js";
import type { RenderInput } from "../domain/renderInput.js";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { markdownHeading } from "./heading.js";
import { coreMessage } from "./coreText.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import * as scnTags from "../domain/scnTags.js";
import type { FeatureFileScenarios, ScenarioCodeError } from "../domain/scnTags.js";
import { parseScenarioTags } from "../parse/scenarioReaders.test-utils.js";
import { codeErrorsCtx as ctx, FOREIGN } from "./scenarioCodeError.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { scenarioCodesOnReport, withScenarioCodesOnReport } from "../assemble/scenarioCodesOnReport.test-utils.js";
import { scenarioCodeErrorsOnReport } from "../assemble/reportErrors.test-utils.js";

interface CorpusFile {
  readonly slug: string;
  readonly featureCode: string | null;
  readonly source: string;
}

function scenariosOf(files: readonly CorpusFile[]): FeatureFileScenarios[] {
  return files.map(({ slug, featureCode, source }) => ({ file: `${slug}.feature`, featureCode, scenarios: parseScenarioTags(source) }));
}

const duplicateFeatureCodes = (files: readonly CorpusFile[]): ScenarioCodeError[] =>
  scnTags.duplicateFeatureCodes(scenariosOf(files));
const foreignScenarioCodes = (files: readonly CorpusFile[]): ScenarioCodeError[] =>
  scnTags.foreignScenarioCodes(scenariosOf(files));
const scenarioCodeErrorsOf = (files: readonly CorpusFile[]): ScenarioCodeError[] =>
  scnTags.scenarioCodeErrorsOf(scenariosOf(files));

function balancedWith(scenarioCodeErrors: readonly ScenarioCodeError[]): EvidenceReconciliation {
  const reconciliation = evidenceReconciliationOf(
    [
      { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      { scnId: "SCN-ONE-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ],
    [
      { qualityCheckKind: "unit", scnId: "SCN-ONE-001", status: "passed" },
      { qualityCheckKind: "unit", scnId: "SCN-ONE-002", status: "passed" },
    ],
    []
  );
  return { ...reconciliation, scenarioCodeErrors };
}

describe("[SCN-RPT-055] a foreign-scn-code is listed under Scenario code errors, and the run reds", () => {
  let md: string;
  beforeEach(() => {
    md = renderMarkdown(balancedWith([FOREIGN]), ctx, publishedExitCodeOf);
  });

  it("lists the error by its handle under the Scenario code errors heading", () => {
    expect(md.split("\n")).toContain(HEADING);
    expect(md.split("\n").filter((line) => line.startsWith("- `foreign-scn-code` — "))).toHaveLength(1);
  });

  function foreignLines(files: readonly CorpusFile[]): string[] {
    return renderMarkdown(balancedWith(foreignScenarioCodes(files)), ctx, publishedExitCodeOf)
      .split("\n")
      .filter((line) => line.startsWith("- `foreign-scn-code` — "));
  }

  it("words the error from its values, naming the one file that carries the named code", () => {
    expect(
      foreignLines([
        { slug: "one", featureCode: "ONE", source: "@ONE\nFeature: one\n" },
        { slug: "two", featureCode: "TWO", source: "@TWO\nFeature: two\n\n  @unit @SCN-ONE-002\n  Scenario: s\n    Given a thing\n" },
      ])
    ).toEqual([
      `- \`foreign-scn-code\` — ${coreMessage(CoreMessage.ForeignScnCodeCarried, { file: "two.feature", featureCode: "TWO", scnId: "SCN-ONE-002", named: "ONE", carrierCount: 1, carriers: "one.feature" })}`,
    ]);
  });

  it("words the error from its values, naming every file that carries the named code when several do", () => {
    expect(
      foreignLines([
        { slug: "one", featureCode: "ONE", source: "@ONE\nFeature: one\n" },
        { slug: "one-b", featureCode: "ONE", source: "@ONE\nFeature: one-b\n" },
        { slug: "two", featureCode: "TWO", source: "@TWO\nFeature: two\n\n  @unit @SCN-ONE-002\n  Scenario: s\n    Given a thing\n" },
      ])
    ).toEqual([
      `- \`foreign-scn-code\` — ${coreMessage(CoreMessage.ForeignScnCodeCarried, { file: "two.feature", featureCode: "TWO", scnId: "SCN-ONE-002", named: "ONE", carrierCount: 2, carriers: "one.feature, one-b.feature" })}`,
    ]);
  });

  it("sits before the Summary, as a caveat on every cut beneath it", () => {
    const lines = md.split("\n");
    const summary = lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.SummaryHeading)));
    expect(lines.indexOf(HEADING)).toBeGreaterThanOrEqual(0);
    expect(lines.indexOf(HEADING)).toBeLessThan(summary);
  });
});

describe("[SCN-RPT-056] a duplicate-feature-code is worded from the shared code and the files that carry it", () => {
  it("lists the error by its handle and the catalogue's words for its code and files", () => {
    const [duplicate] = duplicateFeatureCodes([
      { slug: "one", featureCode: "ONE", source: "@ONE\nFeature: one\n" },
      { slug: "one-b", featureCode: "ONE", source: "@ONE\nFeature: one-b\n" },
    ]);
    const md = renderMarkdown(balancedWith([duplicate!]), ctx, publishedExitCodeOf);
    expect(md.split("\n").filter((line) => line.startsWith("- `duplicate-feature-code` — "))).toEqual([
      `- \`duplicate-feature-code\` — ${coreMessage(CoreMessage.DuplicateFeatureCode, { code: "ONE", fileCount: 2, files: "one.feature, one-b.feature" })}`,
    ]);
  });
});

describe("[SCN-RPT-057] a no-feature-code is worded from the file that carries no feature code", () => {
  it("lists the error by its handle and the catalogue's words for its file", () => {
    const md = renderMarkdown(balancedWith([{ kind: "no-feature-code", files: ["unc.feature"] }]), ctx, publishedExitCodeOf);
    expect(md.split("\n").filter((line) => line.startsWith("- `no-feature-code` — "))).toEqual([
      `- \`no-feature-code\` — ${coreMessage(CoreMessage.NoFeatureCode, { file: "unc.feature" })}`,
    ]);
  });
});

describe("[SCN-RPT-058] a foreign-scn-code whose named code no file carries is worded with no file to move to", () => {
  it("lists the error by its handle and the catalogue's words for no carrier, naming no header tag or file the corpus lacks", () => {
    const errors = foreignScenarioCodes([
      { slug: "one", featureCode: "ONE", source: "@ONE\nFeature: one\n" },
      { slug: "two", featureCode: "TWO", source: "@TWO\nFeature: two\n\n  @unit @SCN-THR-002\n  Scenario: s\n    Given a thing\n" },
    ]);
    const lines = renderMarkdown(balancedWith(errors), ctx, publishedExitCodeOf)
      .split("\n")
      .filter((line) => line.startsWith("- `foreign-scn-code` — "));
    expect(lines).toEqual([
      `- \`foreign-scn-code\` — ${coreMessage(CoreMessage.ForeignScnCodeNoCarrier, { file: "two.feature", featureCode: "TWO", scnId: "SCN-THR-002", named: "THR" })}`,
    ]);
    expect(lines[0]).toContain("SCN-THR-002");
    expect(lines[0]).toContain("@TWO");
    expect(lines[0]).not.toMatch(/@THR\b/);
    expect([...new Set(lines[0]!.match(/[\w-]+\.feature/g))]).toEqual(["two.feature"]);
  });
});

describe("[SCN-RPT-059] a several-scn-codes error is worded from its file, its scenario and its codes", () => {
  it("lists the error by its handle and the catalogue's words for its file, scenario and codes", () => {
    const errors = scenarioCodeErrorsOf([
      {
        slug: "two",
        featureCode: "TWO",
        source: "@TWO\nFeature: two\n\n  @unit @SCN-TWO-002 @SCN-TWO-003\n  Scenario: carries codes\n    Given a thing\n",
      },
    ]);
    const md = renderMarkdown(balancedWith(errors), ctx, publishedExitCodeOf);
    expect(md.split("\n").filter((line) => line.startsWith("- `several-scn-codes` — "))).toEqual([
      `- \`several-scn-codes\` — ${coreMessage(CoreMessage.ScenarioSeveralScnCodes, { file: "two.feature", scenario: "carries codes", codeCount: 2, codes: "SCN-TWO-002, SCN-TWO-003" })}`,
    ]);
  });
});

const duplicateLine = (): string =>
  coreMessage(CoreMessage.DuplicateScnCodeNotListed, { outcome: CORE_MESSAGES[CoreMessage.OutcomeDuplicateScnCode] });

const HEADING = CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeading];

function codedFeature(code: string): string {
  return `@${code}\nFeature: ${code.toLowerCase()}\n\n  @unit @SCN-${code}-001\n  Scenario: s\n    Given a thing\n`;
}

function judgedCorpus(codes: readonly string[], plain: number): EvidenceReconciliation {
  const plainSlugs = Array.from({ length: plain }, (_, i) => `plain${i + 1}`);
  return evidenceReconciliationFromSources({
    features: parsedFeatures(
      [...codes.map(codedFeature), ...plainSlugs.map((slug) => `Feature: ${slug}\n`)],
      [...codes.map((code) => `${code.toLowerCase()}.feature`), ...plainSlugs.map((slug) => `${slug}.feature`)]
    ),
    packageJson: {},
    ciWorkflows: [],
    behaviouralObservations: codes.map((code) => ({ qualityCheckKind: "unit", scnId: `SCN-${code}-001`, status: "passed" })),
    deferralTags: [],
  });
}

function newShapeReport(reconciliation: EvidenceReconciliation): RenderInput {
  return assembleRenderInput(reconciliation, ctx);
}

function errorsSectionOf(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(HEADING);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  return lines.slice(start, next === -1 ? lines.length : next);
}

const runVerdictHeading = (): string => markdownHeading(3, coreMessage(CoreMessage.RunVerdictHeading));
const RECONCILIATION_TOTALS_HEADING = CORE_MESSAGES[CoreMessage.ReconciliationTotalsHeading];

function afterRunVerdictOf(md: string): string[] {
  const lines = md.split("\n");
  const summary = lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.SummaryHeading)));
  const start = lines.indexOf(runVerdictHeading());
  expect(summary).toBeGreaterThanOrEqual(0);
  expect(start).toBeGreaterThan(summary);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  expect(lines[next]).toBe(RECONCILIATION_TOTALS_HEADING);
  expect(lines[start + 1]).toBe("");
  expect(lines[start + 2]).not.toBe("");
  return lines.slice(start + 3, next);
}

function statedAloneAfterRunVerdict(report: RenderInput, statement: string): string {
  const md = renderReportFromJson(JSON.stringify(report), ctx.inputs, publishedExitCodeOf);
  expect(afterRunVerdictOf(md)).toEqual(["", statement, ""]);
  expect(md.split("\n").filter((line) => line === statement)).toHaveLength(1);
  return md;
}

function printsNoScenarioCodeErrorsSection(md: string): void {
  expect(md).not.toContain(HEADING);
  expect(md).not.toContain(duplicateLine());
}

function cleanOver(): string {
  return coreMessage(CoreMessage.CleanEachFileOwnCode, { featureFiles: 1, featureCodes: 1 }).split(": ")[0]!;
}

const cleanOpening = (): string => cleanOver().split(" over ")[0]!;

const cleanGloss = (): string => cleanOver().slice(cleanOver().indexOf(" ("));

const CLEAN_CORPORA = [
  { codes: ["ONE"], plain: 0 },
  { codes: ["ONE", "TWO"], plain: 0 },
  { codes: ["ONE", "TWO"], plain: 1 },
  { codes: ["ONE", "TWO"], plain: 2 },
  { codes: ["ONE"], plain: 1 },
  { codes: [], plain: 1 },
  { codes: [], plain: 2 },
];

describe("[SCN-RPT-062] clean scenario codes are stated after the run verdict under the Summary, with the run's count of feature files and of feature codes", () => {
  const ownCode = (featureFiles: number, featureCodes: number): string =>
    coreMessage(CoreMessage.CleanEachFileOwnCode, { featureFiles, featureCodes });
  const othersNoFeatureCode = (featureFiles: number, featureCodes: number, noFeatureCode: number): string =>
    coreMessage(CoreMessage.CleanOthersNoFeatureCode, { featureFiles, featureCodes, noFeatureCode });
  const noCoded = (featureFiles: number): string => coreMessage(CoreMessage.CleanNoCodedScenario, { featureFiles });

  function statements(): string[] {
    return [
      ownCode(1, 1),
      ownCode(2, 2),
      othersNoFeatureCode(3, 2, 1),
      othersNoFeatureCode(4, 2, 2),
      othersNoFeatureCode(2, 1, 1),
      noCoded(1),
      noCoded(2),
    ];
  }

  for (let row = 0; row < CLEAN_CORPORA.length; row++) {
    const { codes, plain } = CLEAN_CORPORA[row]!;
    const files = codes.length + plain;
    it(`states the codes clean over ${files} files carrying ${codes.length} codes after the run verdict`, () => {
      const statement = statements()[row]!;
      expect(statement).toContain(cleanGloss());
      const report = newShapeReport(judgedCorpus(codes, plain));
      expect(scenarioCodeErrorsOnReport(report)).toBeUndefined();
      expect(scenarioCodesOnReport(report)).toEqual({ featureFiles: files, featureCodes: codes.length });
      statedAloneAfterRunVerdict(report, statement);
    });
  }

  it("states no clean line when the corpus's facts carry no count of feature files", () => {
    const report = withScenarioCodesOnReport(newShapeReport(judgedCorpus(["ONE", "TWO"], 1)), { excludedOccurrences: 0, untaggedScenarios: [] });
    expect(scenarioCodeErrorsOnReport(report)).toBeUndefined();
    const md = renderReportFromJson(JSON.stringify(report), ctx.inputs, publishedExitCodeOf);
    const cleanHead = `${cleanOpening()} over `;
    expect(cleanHead).not.toBe("");
    expect(md).not.toContain(HEADING);
    expect(md).not.toContain(cleanHead);
    expect(md).not.toContain(coreMessage(CoreMessage.NoFeatureFileJudged));
  });
});

describe("[SCN-RPT-093] no scenario code errors section prints when the scenario codes are clean", () => {
  for (const { codes, plain } of CLEAN_CORPORA) {
    it(`prints no scenario code errors section over ${codes.length + plain} files carrying ${codes.length} codes`, () => {
      const report = newShapeReport(judgedCorpus(codes, plain));
      expect(scenarioCodeErrorsOnReport(report)).toBeUndefined();
      const md = renderReportFromJson(JSON.stringify(report), ctx.inputs, publishedExitCodeOf);
      printsNoScenarioCodeErrorsSection(md);
      expect(md).not.toContain(coreMessage(CoreMessage.ScenarioCodeErrorsHeadline));
    });
  }
});

describe("[SCN-RPT-094] nothing is stated about scenario codes when no corpus was judged", () => {
  it("says nothing when no corpus was judged", () => {
    const { scenarioCodeErrors: _judged, ...unjudged } = balancedWith([]);
    const report = newShapeReport(unjudged);
    expect(scenarioCodeErrorsOnReport(report)).toBeUndefined();
    expect(scenarioCodesOnReport(report)).toBeUndefined();
    const md = renderReportFromJson(JSON.stringify(report), ctx.inputs, publishedExitCodeOf);
    expect(md).not.toContain(HEADING);
    expect(afterRunVerdictOf(md)).toEqual([""]);
  });
});

describe("[SCN-RPT-063] a corpus with no feature file is stated, after the run verdict, as no feature file judged, never as clean", () => {
  it("says no feature file was judged after the run verdict, prints no scenario code errors section, and states nothing clean", () => {
    const statement = coreMessage(CoreMessage.NoFeatureFileJudged);
    const report = newShapeReport(judgedCorpus([], 0));
    expect(scenarioCodeErrorsOnReport(report)).toBeUndefined();
    expect(scenarioCodesOnReport(report)).toMatchObject({ featureFiles: 0, featureCodes: 0 });
    const md = statedAloneAfterRunVerdict(report, statement);
    printsNoScenarioCodeErrorsSection(md);
    expect(md.split("\n").filter((line) => line.startsWith(cleanOpening()))).toEqual([]);
  });
});

describe("[SCN-RPT-060] the scenario code errors section counts the errors the corpus holds and lists each by its kind", () => {
  function featureFile(slug: string, featureCode: string, scnIds: readonly string[]): CorpusFile {
    const scenarios = scnIds.map((id) => `  @unit @${id}\n  Scenario: ${id.toLowerCase()}\n    Given a thing\n`);
    return { slug, featureCode, source: `@${featureCode}\nFeature: ${slug}\n\n${scenarios.join("\n")}` };
  }

  function reconciled(files: readonly CorpusFile[]): EvidenceReconciliation {
    return evidenceReconciliationFromSources({
      features: parsedFeatures(files.map((file) => file.source), files.map(({ slug }) => `${slug}.feature`)),
      packageJson: {},
      ciWorkflows: [],
      behaviouralObservations: [],
      deferralTags: [],
    });
  }

  function errorLine(kind: ScenarioCodeError["kind"], words: string): string {
    return `- \`${kind}\` — ${words}`;
  }

  function foreignOneCarrier(): string {
    return coreMessage(CoreMessage.ForeignScnCodeCarried, { file: "two.feature", featureCode: "TWO", scnId: "SCN-ONE-002", named: "ONE", carrierCount: 1, carriers: "one.feature" });
  }

  const framing = (count: string): string => coreMessage(CoreMessage.ScenarioCodeErrorsFraming, { count });

  describe("a file headed @TWO holding a scenario coded @SCN-ONE-002, beside a file headed @ONE", () => {
    let md: string;
    beforeEach(() => {
      md = renderMarkdown(reconciled([featureFile("one", "ONE", ["SCN-ONE-001"]), featureFile("two", "TWO", ["SCN-ONE-002", "SCN-TWO-001"])]), ctx, publishedExitCodeOf);
    });

    it("counts one error in the singular, then lists it on one line by its kind and the catalogue's words for it", () => {
      expect(errorsSectionOf(md)).toEqual([
        HEADING,
        "",
        framing(coreMessage(CoreMessage.ScenarioCodeErrorCount, { count: 1 })),
        "",
        errorLine("foreign-scn-code", foreignOneCarrier()),
        "",
        duplicateLine(),
        "",
      ]);
      expect(md.split("\n").filter((line) => line.startsWith("- `foreign-scn-code` — "))).toEqual([
        errorLine("foreign-scn-code", foreignOneCarrier()),
      ]);
    });
  });

  describe("a second file also headed @ONE, so the corpus holds a duplicate feature code and a foreign scenario code", () => {
    let files: CorpusFile[];
    let parsed: ScenarioCodeError[];
    let md: string;
    beforeEach(() => {
      files = [
        featureFile("one", "ONE", ["SCN-ONE-001"]),
        featureFile("two", "TWO", ["SCN-ONE-002", "SCN-TWO-001"]),
        featureFile("uno", "ONE", ["SCN-ONE-003"]),
      ];
      parsed = [...duplicateFeatureCodes(files), ...foreignScenarioCodes(files)];
      md = renderMarkdown(reconciled(files), ctx, publishedExitCodeOf);
    });

    it("is judged one duplicate-feature-code and one foreign-scn-code", () => {
      expect(parsed.map((error) => error.kind)).toEqual(["duplicate-feature-code", "foreign-scn-code"]);
      expect(reconciled(files).scenarioCodeErrors).toEqual(parsed);
    });

    it("counts the errors in the plural with their number, then lists each on its own line in the order judged", () => {
      expect(errorsSectionOf(md)).toEqual([
        HEADING,
        "",
        framing(coreMessage(CoreMessage.ScenarioCodeErrorCount, { count: 2 })),
        "",
        errorLine("duplicate-feature-code", coreMessage(CoreMessage.DuplicateFeatureCode, { code: "ONE", fileCount: 2, files: "one.feature, uno.feature" })),
        errorLine(
          "foreign-scn-code",
          coreMessage(CoreMessage.ForeignScnCodeCarried, { file: "two.feature", featureCode: "TWO", scnId: "SCN-ONE-002", named: "ONE", carrierCount: 2, carriers: "one.feature, uno.feature" })
        ),
        "",
        duplicateLine(),
        "",
      ]);
    });
  });
});

const INPUT_ERROR_CODES = [
  "configuration-wrong-kind",
  "configuration-unknown-key",
  "runner-key-not-a-layer",
  "not-checks-entry-matches-no-step",
  "not-checks-entry-not-a-step-name",
  "duplicate-feature-code",
  "foreign-scn-code",
  "no-feature-code",
  "several-scn-codes",
];

const codesOn = (line: string): string[] => INPUT_ERROR_CODES.flatMap((code) => line.split(`\`${code}\``).slice(1).map(() => code));

const linesCarryingACode = (md: string): string[] => md.split("\n").filter((line) => codesOn(line).length > 0);

const DUPLICATE_ONE: ScenarioCodeError = { kind: "duplicate-feature-code", featureCode: "ONE", files: ["one.feature", "uno.feature"] };

describe("[SCN-MSG-010] an error shows its reader the error code of what went wrong — a scenario carrying a code of another feature", () => {
  it("shows the misfiled code's entry with its code once, as the entry's lead", () => {
    const shown = linesCarryingACode(renderMarkdown(balancedWith([FOREIGN]), ctx, publishedExitCodeOf));
    expect(shown.map(codesOn)).toEqual([["foreign-scn-code"]]);
    expect(shown[0]!.startsWith("- `foreign-scn-code` — ")).toBe(true);
  });

  it("shows the code only on each entry when the inputs hold two errors, and none on the heading or the count line", () => {
    const md = renderMarkdown(balancedWith([DUPLICATE_ONE, FOREIGN]), ctx, publishedExitCodeOf);
    const shown = linesCarryingACode(md);
    expect(shown.map(codesOn)).toEqual([["duplicate-feature-code"], ["foreign-scn-code"]]);
    expect(shown.map((line) => line.split(" — ")[0])).toEqual(["- `duplicate-feature-code`", "- `foreign-scn-code`"]);
    expect(errorsSectionOf(md).filter((line) => !line.startsWith("- ")).flatMap(codesOn)).toEqual([]);
  });
});

describe("[SCN-MSG-010] an error shows its reader the error code of what went wrong — a saved report holding an error in its inputs, re-rendered", () => {
  it("shows the saved misfiled code's entry with its code once, as the entry's lead", () => {
    const saved = JSON.stringify(newShapeReport(balancedWith([FOREIGN])));
    const shown = linesCarryingACode(renderReportFromJson(saved, ctx.inputs, publishedExitCodeOf));
    expect(shown.map(codesOn)).toEqual([["foreign-scn-code"]]);
    expect(shown[0]!.startsWith("- `foreign-scn-code` — ")).toBe(true);
  });
});

describe("[SCN-RPT-096] the excluded @SCN occurrences, the scenarios with no @SCN code and the codes several scenarios share are stated after the run verdict, whether the codes are clean, hold errors or come from no feature file", () => {
  const CODES = {
    clean: { judged: () => newShapeReport(judgedCorpus(["ONE", "TWO"], 0)), scenarios: 2 },
    "holding an error": { judged: () => newShapeReport(balancedWith([FOREIGN])), scenarios: 2 },
    "from no feature file": { judged: () => newShapeReport(judgedCorpus([], 0)), scenarios: 0 },
  } as const;

  function codesStatement(codes: keyof typeof CODES): string[] {
    if (codes === "holding an error") return [];
    if (codes === "from no feature file") return [coreMessage(CoreMessage.NoFeatureFileJudged), ""];
    return [coreMessage(CoreMessage.CleanEachFileOwnCode, { featureFiles: 2, featureCodes: 2 }), ""];
  }

  it.each([
    { codes: "clean", excluded: 0, others: false, lines: "the excluded line alone, at zero" },
    { codes: "clean", excluded: 3, others: true, lines: "the excluded, untagged and shared-code lines, in that order" },
    { codes: "holding an error", excluded: 0, others: false, lines: "the excluded line alone, at zero" },
    { codes: "holding an error", excluded: 3, others: true, lines: "the excluded, untagged and shared-code lines, in that order" },
    { codes: "from no feature file", excluded: 0, others: false, lines: "the excluded line alone, at zero" },
  ] as const)("states $lines after the run verdict when the codes are $codes", ({ codes, excluded, others }) => {
    const judged = CODES[codes].judged();
    expect(scenarioCodeErrorsOnReport(judged) === undefined).toBe(codes !== "holding an error");
    const report = withScenarioCodesOnReport(judged, {
      ...scenarioCodesOnReport(judged),
      excludedOccurrences: excluded,
      untaggedScenarios: others ? [{ feature: "three.feature", title: "the scenario with no code" }] : [],
      ...(others
        ? { sharedScnCodes: [{ scnId: "SCN-ONE-001", scenarios: [{ feature: "one.feature", title: "the first" }, { feature: "two.feature", title: "the second" }] }] }
        : {}),
    });
    const facts = [
      `- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](excluded)}`,
      ...(others
        ? [
            `- ${CORE_MESSAGES[CoreMessage.UntaggedScenarios](1)}`,
            `- ${CORE_MESSAGES[CoreMessage.SharedScnCodes](CODES[codes].scenarios, 1)}`,
            "  - SCN-ONE-001: one.feature : the first; two.feature : the second",
          ]
        : []),
    ];
    const lines = renderReportFromJson(JSON.stringify(report), ctx.inputs, publishedExitCodeOf).split("\n");
    const verdict = lines.indexOf(runVerdictHeading());
    const next = lines.indexOf(RECONCILIATION_TOTALS_HEADING);
    expect(verdict).toBeGreaterThan(lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.SummaryHeading))));
    expect(lines.slice(verdict, verdict + 2)).toEqual([runVerdictHeading(), ""]);
    expect(lines[verdict + 2]).not.toBe("");
    expect(lines.slice(verdict + 3, next)).toEqual(["", ...codesStatement(codes), ...facts, ""]);
    const claimReconciliations = lines.slice(lines.indexOf(CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading]));
    expect(claimReconciliations.length).toBeGreaterThan(1);
    expect(claimReconciliations.filter((line) => facts.includes(line))).toEqual([]);
    expect(lines.filter((line) => facts.includes(line))).toEqual(facts);
  });
});

describe("[SCN-MSG-015] a counted noun agrees with its count — the clean statement's feature files and codes", () => {
  const DEFINED =
    "(a feature code is the tag heading a feature file, the `<FFF>` that each `@SCN-<FFF>-<NNN>` code in that file repeats)";
  const rows: [string, readonly string[], number, string][] = [
    [
      "1 feature file and 1 code",
      ["ONE"],
      0,
      `Scenario codes are clean over 1 feature file carrying 1 feature code ${DEFINED}: each file carries a code of its own, and every coded scenario sits in the file its code names.`,
    ],
    [
      "3 feature files and 1 code",
      ["ONE"],
      2,
      `Scenario codes are clean over 3 feature files carrying 1 feature code ${DEFINED}: each code is carried by exactly one file, every coded scenario sits in the file its code names, and the other 2 hold no coded scenario.`,
    ],
    [
      "2 feature files and 0 codes",
      [],
      2,
      `Scenario codes are clean over 2 feature files carrying 0 feature codes ${DEFINED}: no scenario in them carries an @SCN code to misfile.`,
    ],
  ];

  it.each(rows)("%s", (_, codes, plain, line) => {
    const md = renderReportFromJson(JSON.stringify(newShapeReport(judgedCorpus(codes, plain))), ctx.inputs, publishedExitCodeOf);
    expect(afterRunVerdictOf(md)).toEqual(["", line, ""]);
  });
});
