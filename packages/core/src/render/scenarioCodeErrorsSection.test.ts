import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown, renderReportFromJson } from "./markdown.js";
import { renderJson } from "./json.js";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { ScenarioCodeError } from "../domain/scenarioCodeError.js";
import { duplicateFeatureCodes, foreignScenarioCodes } from "../parse/scenarioCodeErrors.js";
import type { CorpusFile } from "../parse/scenarioCodeErrors.js";
import { codeErrorsCtx as ctx, FOREIGN } from "./scenarioCodeError.test-utils.js";

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
    [],
    true,
    false
  );
  return { ...reconciliation, scenarioCodeErrors };
}

describe("[SCN-STG-011] a foreign-scn-code is listed under Scenario code errors, and the run reds", () => {
  let md: string;
  beforeEach(() => {
    md = renderMarkdown(balancedWith([FOREIGN]), ctx);
  });

  it("lists the error by its handle and message, in a section of its own", () => {
    expect(md).toContain("## Scenario code errors");
    expect(md).toContain(`- \`foreign-scn-code\` — ${FOREIGN.message}`);
  });

  it("sits before the summary views, as a caveat on every cut beneath it", () => {
    const sections = md.split("\n").filter((line) => line.startsWith("## "));
    expect(sections.indexOf("## Scenario code errors")).toBe(sections.indexOf("## Summary views") - 1);
  });
});

const DUPLICATE_LINE =
  "A duplicated @SCN code is not listed here: it is reported on its account's rows, as `duplicate-scn-code`.";

const HEADING = CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeading];

function codedFeature(code: string): string {
  return `@${code}\nFeature: ${code.toLowerCase()}\n\n  @unit @SCN-${code}-001\n  Scenario: s\n    Given a thing\n`;
}

function judgedCorpus(codes: readonly string[], plain: number): EvidenceReconciliation {
  const plainSlugs = Array.from({ length: plain }, (_, i) => `plain${i + 1}`);
  return evidenceReconciliationFromSources({
    featureSources: [...codes.map(codedFeature), ...plainSlugs.map((slug) => `Feature: ${slug}\n`)],
    featureFiles: [
      ...codes.map((code) => ({ slug: code.toLowerCase(), featureCode: code })),
      ...plainSlugs.map((slug) => ({ slug, featureCode: null })),
    ],
    untaggedScenarios: [],
    packageJson: {},
    ciSources: [],
    behaviouralObservations: codes.map((code) => ({ qualityCheck: "unit", scnId: `SCN-${code}-001`, status: "passed" })),
    deferralTags: [],
  });
}

function cleanSectionOf(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(HEADING);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  return lines.slice(start, next === -1 ? lines.length : next);
}

describe("[SCN-STG-021] clean scenario codes are stated with the corpus's own count of feature files and of feature codes", () => {
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
    it(`states the codes clean over ${files} files carrying ${codes.length} codes, counted from the corpus`, () => {
      const statement = statements()[row];
      const judged = judgedCorpus(codes, plain);
      expect(judged.scenarioCodeErrors).toEqual([]);
      expect(judged.scenarioCodePopulation).toEqual({ featureFiles: files, featureCodes: codes.length });
      const md = renderMarkdown(judged, ctx);
      expect(cleanSectionOf(md)).toEqual([HEADING, "", statement, "", DUPLICATE_LINE, ""]);
      expect(md).not.toContain("**SCENARIO CODE ERRORS**");
      expect(cleanSectionOf(renderReportFromJson(renderJson(judged, ctx)))).toEqual(cleanSectionOf(md));
    });
  }

  it("states the codes clean with no count when re-rendering a report saved before the population was recorded", () => {
    const { scenarioCodePopulation: _counted, ...saved } = JSON.parse(renderJson(judgedCorpus(["ONE", "TWO"], 1), ctx));
    expect(saved).toHaveProperty("scenarioCodeErrors", []);
    const md = renderReportFromJson(JSON.stringify(saved));
    expect(cleanSectionOf(md)).toEqual([
      HEADING,
      "",
      CORE_MESSAGES[CoreMessage.ScenarioCodesClean],
      "",
      DUPLICATE_LINE,
      "",
    ]);
  });

  it("says nothing when no corpus was judged", () => {
    const { scenarioCodeErrors: _judged, ...unjudged } = balancedWith([]);
    expect(renderMarkdown(unjudged, ctx)).not.toContain("## Scenario code errors");
  });
});

describe("[SCN-STG-023] a corpus with no feature file is never stated clean", () => {
  let empty: EvidenceReconciliation;
  beforeEach(() => {
    empty = judgedCorpus([], 0);
  });
  const noFileSection = [
    HEADING,
    "",
    CORE_MESSAGES[CoreMessage.NoFeatureFileJudged],
    "",
    DUPLICATE_LINE,
    "",
  ];

  it("says no feature file was judged, in place of any clean statement", () => {
    const section = cleanSectionOf(renderMarkdown(empty, ctx));
    expect(section).toEqual(noFileSection);
    expect(section).not.toContain(CORE_MESSAGES[CoreMessage.ScenarioCodesClean]);
  });
});

describe("[SCN-STG-011] the scenario code errors section counts the errors the corpus holds and lists each by its kind", () => {
  function featureFile(slug: string, featureCode: string, scnIds: readonly string[]): CorpusFile {
    const scenarios = scnIds.map((id) => `  @unit @${id}\n  Scenario: ${id.toLowerCase()}\n    Given a thing\n`);
    return { slug, featureCode, source: `@${featureCode}\nFeature: ${slug}\n\n${scenarios.join("\n")}` };
  }

  function reconciled(files: readonly CorpusFile[]): EvidenceReconciliation {
    return evidenceReconciliationFromSources({
      featureSources: files.map((file) => file.source),
      featureFiles: files.map(({ slug, featureCode }) => ({ slug, featureCode })),
      untaggedScenarios: [],
      packageJson: {},
      ciSources: [],
      behaviouralObservations: [],
      deferralTags: [],
    });
  }

  function errorLine(error: ScenarioCodeError): string {
    return `- \`${error.kind}\` — ${error.message}`;
  }

  const framing = CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsFraming];

  describe("a file headed @TWO holding a scenario coded @SCN-ONE-002, beside a file headed @ONE", () => {
    let files: CorpusFile[];
    let parsed: ScenarioCodeError[];
    let md: string;
    beforeEach(() => {
      files = [featureFile("one", "ONE", ["SCN-ONE-001"]), featureFile("two", "TWO", ["SCN-ONE-002", "SCN-TWO-001"])];
      parsed = foreignScenarioCodes(files);
      md = renderMarkdown(reconciled(files), ctx);
    });

    it("counts one error in the singular, then lists it on one line by its kind and its parse message", () => {
      expect(cleanSectionOf(md)).toEqual([
        HEADING,
        "",
        framing(CORE_MESSAGES[CoreMessage.OneScenarioCodeError]),
        "",
        errorLine(parsed[0]!),
        "",
        DUPLICATE_LINE,
        "",
      ]);
      expect(md.split("\n").filter((line) => line.startsWith("- `foreign-scn-code` — "))).toEqual([errorLine(parsed[0]!)]);
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
      md = renderMarkdown(reconciled(files), ctx);
    });

    it("is judged one duplicate-feature-code and one foreign-scn-code", () => {
      expect(parsed.map((error) => error.kind)).toEqual(["duplicate-feature-code", "foreign-scn-code"]);
      expect(reconciled(files).scenarioCodeErrors).toEqual(parsed);
    });

    it("counts the errors in the plural with their number, then lists each on its own line in the order judged", () => {
      expect(cleanSectionOf(md)).toEqual([
        HEADING,
        "",
        framing(CORE_MESSAGES[CoreMessage.ScenarioCodeErrorCount](2)),
        "",
        errorLine(parsed[0]!),
        errorLine(parsed[1]!),
        "",
        DUPLICATE_LINE,
        "",
      ]);
    });
  });
});
