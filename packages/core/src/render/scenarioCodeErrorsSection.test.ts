import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { renderReportFromJson } from "../assemble/composers.js";
import { assembleRenderInput } from "../assemble/renderInput.js";
import type { RenderInput } from "../domain/renderInput.js";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import * as scnTags from "../domain/scnTags.js";
import type { FeatureFileScenarios, ScenarioCodeError } from "../domain/scnTags.js";
import { parseScenarioTags } from "../parse/scenarioReaders.test-utils.js";
import { codeErrorsCtx as ctx, FOREIGN } from "./scenarioCodeError.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

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
      { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-ONE-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-ONE-001", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-ONE-002", status: "passed" },
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
      `- \`foreign-scn-code\` — ${CORE_MESSAGES[CoreMessage.ForeignScnCodeOneCarrier]("two.feature", "TWO", "SCN-ONE-002", "ONE", "one.feature")}`,
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
      `- \`foreign-scn-code\` — ${CORE_MESSAGES[CoreMessage.ForeignScnCodeManyCarriers]("two.feature", "TWO", "SCN-ONE-002", "ONE", 2, "one.feature, one-b.feature")}`,
    ]);
  });

  it("sits before the summary views, as a caveat on every cut beneath it", () => {
    const lines = md.split("\n");
    const summaryViews = lines.indexOf(CORE_MESSAGES[CoreMessage.SummaryViewsHeading]);
    expect(lines.indexOf(HEADING)).toBeGreaterThanOrEqual(0);
    expect(lines.indexOf(HEADING)).toBeLessThan(summaryViews);
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
      `- \`duplicate-feature-code\` — ${CORE_MESSAGES[CoreMessage.DuplicateFeatureCode]("ONE", 2, "one.feature, one-b.feature")}`,
    ]);
  });
});

describe("[SCN-RPT-057] a no-feature-code is worded from the file that carries no feature code", () => {
  it("lists the error by its handle and the catalogue's words for its file", () => {
    const md = renderMarkdown(balancedWith([{ kind: "no-feature-code", files: ["unc.feature"] }]), ctx, publishedExitCodeOf);
    expect(md.split("\n").filter((line) => line.startsWith("- `no-feature-code` — "))).toEqual([
      `- \`no-feature-code\` — ${CORE_MESSAGES[CoreMessage.NoFeatureCode]("unc.feature")}`,
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
      `- \`foreign-scn-code\` — ${CORE_MESSAGES[CoreMessage.ForeignScnCodeNoCarrier]("two.feature", "TWO", "SCN-THR-002", "THR")}`,
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
      `- \`several-scn-codes\` — ${CORE_MESSAGES[CoreMessage.ScenarioSeveralScnCodes]("two.feature", "carries codes", ["SCN-TWO-002", "SCN-TWO-003"])}`,
    ]);
  });
});

const DUPLICATE_LINE = CORE_MESSAGES[CoreMessage.DuplicateScnCodeNotListed];

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
    behaviouralObservations: codes.map((code) => ({ qualityCheck: "unit", scnId: `SCN-${code}-001`, status: "passed" })),
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

const RUN_VERDICT_HEADING = CORE_MESSAGES[CoreMessage.RunVerdictHeading];
const EVIDENCE_RECONCILIATION_HEADING = CORE_MESSAGES[CoreMessage.EvidenceReconciliationHeading];

function afterRunVerdictOf(md: string): string[] {
  const lines = md.split("\n");
  const summary = lines.indexOf(CORE_MESSAGES[CoreMessage.SummaryViewsHeading]);
  const start = lines.indexOf(RUN_VERDICT_HEADING);
  expect(summary).toBeGreaterThanOrEqual(0);
  expect(start).toBeGreaterThan(summary);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  expect(lines[next]).toBe(EVIDENCE_RECONCILIATION_HEADING);
  expect(lines[start + 1]).toBe("");
  expect(lines[start + 2]).not.toBe("");
  return lines.slice(start + 3, next);
}

describe("[SCN-RPT-062] clean scenario codes are stated after the run verdict under the summary views, with the run's count of feature files and of feature codes, no scenario code errors section prints, and nothing is stated when no corpus was judged", () => {
  const F = CORE_MESSAGES[CoreMessage.FeatureFileNoun];
  const C = CORE_MESSAGES[CoreMessage.FeatureCodeNoun];
  const over = CORE_MESSAGES[CoreMessage.ScenarioCodesCleanOver];
  const ownCode = CORE_MESSAGES[CoreMessage.CleanEachFileOwnCode];
  const othersNoFeatureCode = CORE_MESSAGES[CoreMessage.CleanOthersNoFeatureCode];
  const noCoded = CORE_MESSAGES[CoreMessage.CleanNoCodedScenario];

  const cases = [
    { codes: ["ONE"], plain: 0 },
    { codes: ["ONE", "TWO"], plain: 0 },
    { codes: ["ONE", "TWO"], plain: 1 },
    { codes: ["ONE", "TWO"], plain: 2 },
    { codes: ["ONE"], plain: 1 },
    { codes: [], plain: 1 },
    { codes: [], plain: 2 },
  ];

  function statements(): string[] {
    return [
      ownCode(over(`1 ${F}`, `1 ${C}`)),
      ownCode(over(`2 ${F}s`, `2 ${C}s`)),
      othersNoFeatureCode(over(`3 ${F}s`, `2 ${C}s`), 1, CORE_MESSAGES[CoreMessage.HoldsVerb]),
      othersNoFeatureCode(over(`4 ${F}s`, `2 ${C}s`), 2, CORE_MESSAGES[CoreMessage.HoldVerb]),
      othersNoFeatureCode(over(`2 ${F}s`, `1 ${C}`), 1, CORE_MESSAGES[CoreMessage.HoldsVerb]),
      noCoded(over(`1 ${F}`, `0 ${C}s`), CORE_MESSAGES[CoreMessage.ItPronoun]),
      noCoded(over(`2 ${F}s`, `0 ${C}s`), CORE_MESSAGES[CoreMessage.ThemPronoun]),
    ];
  }

  for (let row = 0; row < cases.length; row++) {
    const { codes, plain } = cases[row]!;
    const files = codes.length + plain;
    it(`states the codes clean over ${files} files carrying ${codes.length} codes after the run verdict, and prints no scenario code errors section`, () => {
      const statement = statements()[row]!;
      const report = newShapeReport(judgedCorpus(codes, plain));
      expect(report.errors?.scenarioCodes).toBeUndefined();
      expect(report.scenarioCodes).toEqual({ featureFiles: files, featureCodes: codes.length });
      const md = renderReportFromJson(JSON.stringify(report), ctx.inputs, publishedExitCodeOf);
      expect(afterRunVerdictOf(md)).toEqual(["", statement, ""]);
      expect(md.split("\n").filter((line) => line === statement)).toHaveLength(1);
      expect(md).not.toContain(HEADING);
      expect(md).not.toContain(DUPLICATE_LINE);
      expect(md).not.toContain("**SCENARIO CODE ERRORS**");
    });
  }

  it("says nothing when no corpus was judged", () => {
    const { scenarioCodeErrors: _judged, ...unjudged } = balancedWith([]);
    const report = newShapeReport(unjudged);
    expect(report.errors?.scenarioCodes).toBeUndefined();
    expect(report.scenarioCodes).toBeUndefined();
    const md = renderReportFromJson(JSON.stringify(report), ctx.inputs, publishedExitCodeOf);
    expect(md).not.toContain(HEADING);
    expect(afterRunVerdictOf(md)).toEqual([""]);
  });

  it("says nothing when the corpus's facts carry no count of feature files", () => {
    const report = { ...newShapeReport(judgedCorpus(["ONE", "TWO"], 1)), scenarioCodes: { excludedOccurrences: 0, untaggedScenarios: [] } };
    expect(report.errors?.scenarioCodes).toBeUndefined();
    const md = renderReportFromJson(JSON.stringify(report), ctx.inputs, publishedExitCodeOf);
    expect(md).not.toContain(HEADING);
    expect(afterRunVerdictOf(md)).toEqual([""]);
  });
});

describe("[SCN-RPT-063] a corpus with no feature file is stated, after the run verdict, as no feature file judged, never as clean", () => {
  const statement = "No feature file was judged, so no scenario code is vouched for.";

  it("says no feature file was judged after the run verdict, prints no scenario code errors section, and states nothing clean", () => {
    const report = newShapeReport(judgedCorpus([], 0));
    expect(report.errors?.scenarioCodes).toBeUndefined();
    expect(report.scenarioCodes).toMatchObject({ featureFiles: 0, featureCodes: 0 });
    const md = renderReportFromJson(JSON.stringify(report), ctx.inputs, publishedExitCodeOf);
    expect(afterRunVerdictOf(md)).toEqual(["", statement, ""]);
    expect(md.split("\n").filter((line) => line === statement)).toHaveLength(1);
    expect(md).not.toContain(HEADING);
    expect(md).not.toContain(DUPLICATE_LINE);
    const cleanOpening = CORE_MESSAGES[CoreMessage.ScenarioCodesCleanOver]("", "").split(" over ")[0]!;
    expect(md.split("\n").filter((line) => line.startsWith(cleanOpening))).toEqual([]);
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
    return CORE_MESSAGES[CoreMessage.ForeignScnCodeOneCarrier]("two.feature", "TWO", "SCN-ONE-002", "ONE", "one.feature");
  }

  const framing = CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsFraming];

  describe("a file headed @TWO holding a scenario coded @SCN-ONE-002, beside a file headed @ONE", () => {
    let md: string;
    beforeEach(() => {
      md = renderMarkdown(reconciled([featureFile("one", "ONE", ["SCN-ONE-001"]), featureFile("two", "TWO", ["SCN-ONE-002", "SCN-TWO-001"])]), ctx, publishedExitCodeOf);
    });

    it("counts one error in the singular, then lists it on one line by its kind and the catalogue's words for it", () => {
      expect(errorsSectionOf(md)).toEqual([
        HEADING,
        "",
        framing(CORE_MESSAGES[CoreMessage.OneScenarioCodeError]),
        "",
        errorLine("foreign-scn-code", foreignOneCarrier()),
        "",
        DUPLICATE_LINE,
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
        framing(CORE_MESSAGES[CoreMessage.ScenarioCodeErrorCount](2)),
        "",
        errorLine("duplicate-feature-code", CORE_MESSAGES[CoreMessage.DuplicateFeatureCode]("ONE", 2, "one.feature, uno.feature")),
        errorLine(
          "foreign-scn-code",
          CORE_MESSAGES[CoreMessage.ForeignScnCodeManyCarriers]("two.feature", "TWO", "SCN-ONE-002", "ONE", 2, "one.feature, uno.feature")
        ),
        "",
        DUPLICATE_LINE,
        "",
      ]);
    });
  });
});
