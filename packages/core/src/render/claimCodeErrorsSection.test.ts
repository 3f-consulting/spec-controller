import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { renderReportAfresh } from "./reportRenderedAfresh.test-utils.js";
import { assembleRenderInput } from "../assemble/renderInput.js";
import type { RenderInput } from "../domain/renderInput.js";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CoreMessage } from "./messages.js";
import { markdownHeading } from "./heading.js";
import { coreMessage } from "./coreText.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import * as claimCodeScheme from "../domain/claimCodes.js";
import type { FeatureFileScenarios, ClaimCodeError } from "../domain/claimCodes.js";
import { parseScenarioTags } from "../parse/scenarioReaders.test-utils.js";
import { codeErrorsCtx as ctx, FOREIGN } from "./claimCodeError.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { claimCodesOnReport, withClaimCodesOnReport } from "../assemble/claimCodesOnReport.test-utils.js";
import { claimCodeErrorsOnReport } from "../assemble/reportErrors.test-utils.js";

interface CorpusFile {
  readonly slug: string;
  readonly featureCode: string | null;
  readonly source: string;
}

function scenariosOf(files: readonly CorpusFile[]): FeatureFileScenarios[] {
  return files.map(({ slug, featureCode, source }) => ({ file: `${slug}.feature`, featureCode, scenarios: parseScenarioTags(source) }));
}

const duplicateFeatureCodes = (files: readonly CorpusFile[]): ClaimCodeError[] =>
  claimCodeScheme.duplicateFeatureCodes(scenariosOf(files));
const foreignClaimCodes = (files: readonly CorpusFile[]): ClaimCodeError[] =>
  claimCodeScheme.foreignClaimCodes(scenariosOf(files));
const claimCodeErrorsOf = (files: readonly CorpusFile[]): ClaimCodeError[] =>
  claimCodeScheme.claimCodeErrorsOf(scenariosOf(files));

function balancedWith(claimCodeErrors: readonly ClaimCodeError[]): EvidenceReconciliation {
  const reconciliation = evidenceReconciliationOf(
    [
      { claimCode: "CLM-ONE-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      { claimCode: "CLM-ONE-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ],
    [
      { qualityCheckKind: "unit", claimCode: "CLM-ONE-001", status: "passed" },
      { qualityCheckKind: "unit", claimCode: "CLM-ONE-002", status: "passed" },
    ],
    []
  );
  return { ...reconciliation, claimCodeErrors };
}

describe("[CLM-RPT-055] a foreign-claim-code is listed under Claim code errors, and the run reds", () => {
  let md: string;
  beforeEach(() => {
    md = renderMarkdown(balancedWith([FOREIGN]), ctx, publishedExitCodeOf);
  });

  it("lists the error by its handle under the Claim code errors heading", () => {
    expect(md.split("\n")).toContain(HEADING());
    expect(md.split("\n").filter((line) => line.startsWith("- `foreign-claim-code` — "))).toHaveLength(1);
  });

  function foreignLines(files: readonly CorpusFile[]): string[] {
    return renderMarkdown(balancedWith(foreignClaimCodes(files)), ctx, publishedExitCodeOf)
      .split("\n")
      .filter((line) => line.startsWith("- `foreign-claim-code` — "));
  }

  it("words the error from its values, naming the one file that carries the named code", () => {
    expect(
      foreignLines([
        { slug: "one", featureCode: "ONE", source: "@ONE\nFeature: one\n" },
        { slug: "two", featureCode: "TWO", source: "@TWO\nFeature: two\n\n  @unit @CLM-ONE-002\n  Scenario: s\n    Given a thing\n" },
      ])
    ).toEqual([
      `- \`foreign-claim-code\` — ${coreMessage(CoreMessage.ForeignClaimCodeCarried, { file: "two.feature", featureCode: "TWO", claimCode: "CLM-ONE-002", named: "ONE", carrierCount: 1, carriers: "one.feature" })}`,
    ]);
  });

  it("words the error from its values, naming every file that carries the named code when several do", () => {
    expect(
      foreignLines([
        { slug: "one", featureCode: "ONE", source: "@ONE\nFeature: one\n" },
        { slug: "one-b", featureCode: "ONE", source: "@ONE\nFeature: one-b\n" },
        { slug: "two", featureCode: "TWO", source: "@TWO\nFeature: two\n\n  @unit @CLM-ONE-002\n  Scenario: s\n    Given a thing\n" },
      ])
    ).toEqual([
      `- \`foreign-claim-code\` — ${coreMessage(CoreMessage.ForeignClaimCodeCarried, { file: "two.feature", featureCode: "TWO", claimCode: "CLM-ONE-002", named: "ONE", carrierCount: 2, carriers: "one.feature, one-b.feature" })}`,
    ]);
  });

  it("sits before the Summary, as a caveat on every cut beneath it", () => {
    const lines = md.split("\n");
    const summary = lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.SummaryHeading)));
    expect(lines.indexOf(HEADING())).toBeGreaterThanOrEqual(0);
    expect(lines.indexOf(HEADING())).toBeLessThan(summary);
  });
});

describe("[CLM-RPT-056] a duplicate-feature-code is worded from the shared code and the files that carry it", () => {
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

describe("[CLM-RPT-057] a no-feature-code is worded from the file that carries no feature code", () => {
  it("lists the error by its handle and the catalogue's words for its file", () => {
    const md = renderMarkdown(balancedWith([{ kind: "no-feature-code", files: ["unc.feature"] }]), ctx, publishedExitCodeOf);
    expect(md.split("\n").filter((line) => line.startsWith("- `no-feature-code` — "))).toEqual([
      `- \`no-feature-code\` — ${coreMessage(CoreMessage.NoFeatureCode, { file: "unc.feature" })}`,
    ]);
  });
});

describe("[CLM-RPT-058] a foreign-claim-code whose named code no file carries is worded with no file to move to", () => {
  it("lists the error by its handle and the catalogue's words for no carrier, naming no header tag or file the corpus lacks", () => {
    const errors = foreignClaimCodes([
      { slug: "one", featureCode: "ONE", source: "@ONE\nFeature: one\n" },
      { slug: "two", featureCode: "TWO", source: "@TWO\nFeature: two\n\n  @unit @CLM-THR-002\n  Scenario: s\n    Given a thing\n" },
    ]);
    const lines = renderMarkdown(balancedWith(errors), ctx, publishedExitCodeOf)
      .split("\n")
      .filter((line) => line.startsWith("- `foreign-claim-code` — "));
    expect(lines).toEqual([
      `- \`foreign-claim-code\` — ${coreMessage(CoreMessage.ForeignClaimCodeNoCarrier, { file: "two.feature", featureCode: "TWO", claimCode: "CLM-THR-002", named: "THR" })}`,
    ]);
    expect(lines[0]).toContain("CLM-THR-002");
    expect(lines[0]).toContain("@TWO");
    expect(lines[0]).not.toMatch(/@THR\b/);
    expect([...new Set(lines[0]!.match(/[\w-]+\.feature/g))]).toEqual(["two.feature"]);
  });
});

describe("[CLM-RPT-059] a several-claim-codes error is worded from its file, its scenario and its codes", () => {
  it("lists the error by its handle and the catalogue's words for its file, scenario and codes", () => {
    const errors = claimCodeErrorsOf([
      {
        slug: "two",
        featureCode: "TWO",
        source: "@TWO\nFeature: two\n\n  @unit @CLM-TWO-002 @CLM-TWO-003\n  Scenario: carries codes\n    Given a thing\n",
      },
    ]);
    const md = renderMarkdown(balancedWith(errors), ctx, publishedExitCodeOf);
    expect(md.split("\n").filter((line) => line.startsWith("- `several-claim-codes` — "))).toEqual([
      `- \`several-claim-codes\` — ${coreMessage(CoreMessage.ScenarioSeveralClaimCodes, { file: "two.feature", scenario: "carries codes", codeCount: 2, codes: "CLM-TWO-002, CLM-TWO-003" })}`,
    ]);
  });
});

const duplicateLine = (): string =>
  coreMessage(CoreMessage.DuplicateClaimCodeNotListed, { outcome: coreMessage(CoreMessage.OutcomeDuplicateClaimCode) });

const HEADING = (): string => markdownHeading(3, coreMessage(CoreMessage.ClaimCodeErrorsHeading));

function codedFeature(code: string): string {
  return `@${code}\nFeature: ${code.toLowerCase()}\n\n  @unit @CLM-${code}-001\n  Scenario: s\n    Given a thing\n`;
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
    behaviouralObservations: codes.map((code) => ({ qualityCheckKind: "unit", claimCode: `CLM-${code}-001`, status: "passed" })),
    deferralTags: [],
  });
}

function newShapeReport(reconciliation: EvidenceReconciliation): RenderInput {
  return assembleRenderInput(reconciliation, ctx);
}

function errorsSectionOf(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(HEADING());
  expect(start).toBeGreaterThanOrEqual(0);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  return lines.slice(start, next === -1 ? lines.length : next);
}

const runVerdictHeading = (): string => markdownHeading(3, coreMessage(CoreMessage.RunVerdictHeading));
const RECONCILIATION_TOTALS_HEADING = (): string => markdownHeading(3, coreMessage(CoreMessage.ReconciliationTotalsHeading));

function afterRunVerdictOf(md: string): string[] {
  const lines = md.split("\n");
  const summary = lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.SummaryHeading)));
  const start = lines.indexOf(runVerdictHeading());
  expect(summary).toBeGreaterThanOrEqual(0);
  expect(start).toBeGreaterThan(summary);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  expect(lines[next]).toBe(RECONCILIATION_TOTALS_HEADING());
  expect(lines[start + 1]).toBe("");
  expect(lines[start + 2]).not.toBe("");
  return lines.slice(start + 3, next);
}

function statedAloneAfterRunVerdict(report: RenderInput, statement: string): string {
  const md = renderReportAfresh(report, ctx.inputs, publishedExitCodeOf);
  expect(afterRunVerdictOf(md)).toEqual(["", statement, ""]);
  expect(md.split("\n").filter((line) => line === statement)).toHaveLength(1);
  return md;
}

function printsNoClaimCodeErrorsSection(md: string): void {
  expect(md).not.toContain(HEADING());
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

describe("[CLM-RPT-062] clean claim codes are stated after the run verdict under the Summary, with the run's count of feature files and of feature codes", () => {
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
      expect(claimCodeErrorsOnReport(report)).toBeUndefined();
      expect(claimCodesOnReport(report)).toEqual({ featureFiles: files, featureCodes: codes.length });
      statedAloneAfterRunVerdict(report, statement);
    });
  }

  it("states no clean line when the corpus's facts carry no count of feature files", () => {
    const report = withClaimCodesOnReport(newShapeReport(judgedCorpus(["ONE", "TWO"], 1)), { excludedOccurrences: 0, untaggedScenarios: [] });
    expect(claimCodeErrorsOnReport(report)).toBeUndefined();
    const md = renderReportAfresh(report, ctx.inputs, publishedExitCodeOf);
    const cleanHead = `${cleanOpening()} over `;
    expect(cleanHead).not.toBe("");
    expect(md).not.toContain(HEADING());
    expect(md).not.toContain(cleanHead);
    expect(md).not.toContain(coreMessage(CoreMessage.NoFeatureFileJudged));
  });
});

describe("[CLM-RPT-093] no claim code errors section prints when the claim codes are clean", () => {
  for (const { codes, plain } of CLEAN_CORPORA) {
    it(`prints no claim code errors section over ${codes.length + plain} files carrying ${codes.length} codes`, () => {
      const report = newShapeReport(judgedCorpus(codes, plain));
      expect(claimCodeErrorsOnReport(report)).toBeUndefined();
      const md = renderReportAfresh(report, ctx.inputs, publishedExitCodeOf);
      printsNoClaimCodeErrorsSection(md);
      expect(md).not.toContain(coreMessage(CoreMessage.ClaimCodeErrorsHeadline));
    });
  }
});

describe("[CLM-RPT-094] nothing is stated about claim codes when no corpus was judged", () => {
  it("says nothing when no corpus was judged", () => {
    const { claimCodeErrors: _judged, ...unjudged } = balancedWith([]);
    const report = newShapeReport(unjudged);
    expect(claimCodeErrorsOnReport(report)).toBeUndefined();
    expect(claimCodesOnReport(report)).toBeUndefined();
    const md = renderReportAfresh(report, ctx.inputs, publishedExitCodeOf);
    expect(md).not.toContain(HEADING());
    expect(afterRunVerdictOf(md)).toEqual([""]);
  });
});

describe("[CLM-RPT-063] a corpus with no feature file is stated, after the run verdict, as no feature file judged, never as clean", () => {
  it("says no feature file was judged after the run verdict, prints no claim code errors section, and states nothing clean", () => {
    const statement = coreMessage(CoreMessage.NoFeatureFileJudged);
    const report = newShapeReport(judgedCorpus([], 0));
    expect(claimCodeErrorsOnReport(report)).toBeUndefined();
    expect(claimCodesOnReport(report)).toMatchObject({ featureFiles: 0, featureCodes: 0 });
    const md = statedAloneAfterRunVerdict(report, statement);
    printsNoClaimCodeErrorsSection(md);
    expect(md.split("\n").filter((line) => line.startsWith(cleanOpening()))).toEqual([]);
  });
});

describe("[CLM-RPT-060] the claim code errors section counts the errors the corpus holds and lists each by its kind", () => {
  function featureFile(slug: string, featureCode: string, claimCodes: readonly string[]): CorpusFile {
    const scenarios = claimCodes.map((id) => `  @unit @${id}\n  Scenario: ${id.toLowerCase()}\n    Given a thing\n`);
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

  function errorLine(kind: ClaimCodeError["kind"], words: string): string {
    return `- \`${kind}\` — ${words}`;
  }

  function foreignOneCarrier(): string {
    return coreMessage(CoreMessage.ForeignClaimCodeCarried, { file: "two.feature", featureCode: "TWO", claimCode: "CLM-ONE-002", named: "ONE", carrierCount: 1, carriers: "one.feature" });
  }

  const framing = (count: string): string => coreMessage(CoreMessage.ClaimCodeErrorsFraming, { count });

  describe("a file headed @TWO holding a scenario coded @CLM-ONE-002, beside a file headed @ONE", () => {
    let md: string;
    beforeEach(() => {
      md = renderMarkdown(reconciled([featureFile("one", "ONE", ["CLM-ONE-001"]), featureFile("two", "TWO", ["CLM-ONE-002", "CLM-TWO-001"])]), ctx, publishedExitCodeOf);
    });

    it("counts one error in the singular, then lists it on one line by its kind and the catalogue's words for it", () => {
      expect(errorsSectionOf(md)).toEqual([
        HEADING(),
        "",
        framing(coreMessage(CoreMessage.ClaimCodeErrorCount, { count: 1 })),
        "",
        errorLine("foreign-claim-code", foreignOneCarrier()),
        "",
        duplicateLine(),
        "",
      ]);
      expect(md.split("\n").filter((line) => line.startsWith("- `foreign-claim-code` — "))).toEqual([
        errorLine("foreign-claim-code", foreignOneCarrier()),
      ]);
    });
  });

  describe("a second file also headed @ONE, so the corpus holds a duplicate feature code and a foreign claim code", () => {
    let files: CorpusFile[];
    let parsed: ClaimCodeError[];
    let md: string;
    beforeEach(() => {
      files = [
        featureFile("one", "ONE", ["CLM-ONE-001"]),
        featureFile("two", "TWO", ["CLM-ONE-002", "CLM-TWO-001"]),
        featureFile("uno", "ONE", ["CLM-ONE-003"]),
      ];
      parsed = [...duplicateFeatureCodes(files), ...foreignClaimCodes(files)];
      md = renderMarkdown(reconciled(files), ctx, publishedExitCodeOf);
    });

    it("is judged one duplicate-feature-code and one foreign-claim-code", () => {
      expect(parsed.map((error) => error.kind)).toEqual(["duplicate-feature-code", "foreign-claim-code"]);
      expect(reconciled(files).claimCodeErrors).toEqual(parsed);
    });

    it("counts the errors in the plural with their number, then lists each on its own line in the order judged", () => {
      expect(errorsSectionOf(md)).toEqual([
        HEADING(),
        "",
        framing(coreMessage(CoreMessage.ClaimCodeErrorCount, { count: 2 })),
        "",
        errorLine("duplicate-feature-code", coreMessage(CoreMessage.DuplicateFeatureCode, { code: "ONE", fileCount: 2, files: "one.feature, uno.feature" })),
        errorLine(
          "foreign-claim-code",
          coreMessage(CoreMessage.ForeignClaimCodeCarried, { file: "two.feature", featureCode: "TWO", claimCode: "CLM-ONE-002", named: "ONE", carrierCount: 2, carriers: "one.feature, uno.feature" })
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
  "foreign-claim-code",
  "no-feature-code",
  "several-claim-codes",
];

const codesOn = (line: string): string[] => INPUT_ERROR_CODES.flatMap((code) => line.split(`\`${code}\``).slice(1).map(() => code));

const linesCarryingACode = (md: string): string[] => md.split("\n").filter((line) => codesOn(line).length > 0);

const DUPLICATE_ONE: ClaimCodeError = { kind: "duplicate-feature-code", featureCode: "ONE", files: ["one.feature", "uno.feature"] };

describe("[CLM-MSG-010] an error shows its reader the error code of what went wrong — a scenario carrying a code of another feature", () => {
  it("shows the misfiled code's entry with its code once, as the entry's lead", () => {
    const shown = linesCarryingACode(renderMarkdown(balancedWith([FOREIGN]), ctx, publishedExitCodeOf));
    expect(shown.map(codesOn)).toEqual([["foreign-claim-code"]]);
    expect(shown[0]!.startsWith("- `foreign-claim-code` — ")).toBe(true);
  });

  it("shows the code only on each entry when the inputs hold two errors, and none on the heading or the count line", () => {
    const md = renderMarkdown(balancedWith([DUPLICATE_ONE, FOREIGN]), ctx, publishedExitCodeOf);
    const shown = linesCarryingACode(md);
    expect(shown.map(codesOn)).toEqual([["duplicate-feature-code"], ["foreign-claim-code"]]);
    expect(shown.map((line) => line.split(" — ")[0])).toEqual(["- `duplicate-feature-code`", "- `foreign-claim-code`"]);
    expect(errorsSectionOf(md).filter((line) => !line.startsWith("- ")).flatMap(codesOn)).toEqual([]);
  });
});

describe("[CLM-RPT-096] the excluded claim code occurrences, the scenarios with no claim code and the codes several scenarios share are stated after the run verdict, whether the codes are clean, hold errors or come from no feature file", () => {
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
    expect(claimCodeErrorsOnReport(judged) === undefined).toBe(codes !== "holding an error");
    const report = withClaimCodesOnReport(judged, {
      ...claimCodesOnReport(judged),
      excludedOccurrences: excluded,
      untaggedScenarios: others ? [{ feature: "three.feature", title: "the scenario with no code" }] : [],
      ...(others
        ? { sharedClaimCodes: [{ claimCode: "CLM-ONE-001", scenarios: [{ feature: "one.feature", title: "the first" }, { feature: "two.feature", title: "the second" }] }] }
        : {}),
    });
    const facts = [
      `- ${coreMessage(CoreMessage.ExcludedClaimOccurrences, { count: excluded })}`,
      ...(others
        ? [
            `- ${coreMessage(CoreMessage.UntaggedScenarios, { count: 1 })}`,
            `- ${coreMessage(CoreMessage.SharedClaimCodes, { scenarios: CODES[codes].scenarios, codes: 1 })}`,
            "  - CLM-ONE-001: one.feature : the first; two.feature : the second",
          ]
        : []),
    ];
    const lines = renderReportAfresh(report, ctx.inputs, publishedExitCodeOf).split("\n");
    const verdict = lines.indexOf(runVerdictHeading());
    const next = lines.indexOf(RECONCILIATION_TOTALS_HEADING());
    expect(verdict).toBeGreaterThan(lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.SummaryHeading))));
    expect(lines.slice(verdict, verdict + 2)).toEqual([runVerdictHeading(), ""]);
    expect(lines[verdict + 2]).not.toBe("");
    expect(lines.slice(verdict + 3, next)).toEqual(["", ...codesStatement(codes), ...facts, ""]);
    const claimReconciliations = lines.slice(lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading))));
    expect(claimReconciliations.length).toBeGreaterThan(1);
    expect(claimReconciliations.filter((line) => facts.includes(line))).toEqual([]);
    expect(lines.filter((line) => facts.includes(line))).toEqual(facts);
  });
});

describe("[CLM-MSG-015] a counted noun agrees with its count — the clean statement's feature files and codes", () => {
  const DEFINED =
    "(a feature code is the tag heading a feature file, the `<FFF>` that each `@CLM-<FFF>-<NNN>` code in that file repeats)";
  const rows: [string, readonly string[], number, string][] = [
    [
      "1 feature file and 1 code",
      ["ONE"],
      0,
      `Claim codes are clean over 1 feature file carrying 1 feature code ${DEFINED}: each file carries a code of its own, and every coded scenario sits in the file its code names.`,
    ],
    [
      "3 feature files and 1 code",
      ["ONE"],
      2,
      `Claim codes are clean over 3 feature files carrying 1 feature code ${DEFINED}: each code is carried by exactly one file, every coded scenario sits in the file its code names, and the other 2 hold no coded scenario.`,
    ],
    [
      "2 feature files and 0 codes",
      [],
      2,
      `Claim codes are clean over 2 feature files carrying 0 feature codes ${DEFINED}: no scenario in them carries a claim code to misfile.`,
    ],
  ];

  it.each(rows)("%s", (_, codes, plain, line) => {
    const md = renderReportAfresh(newShapeReport(judgedCorpus(codes, plain)), ctx.inputs, publishedExitCodeOf);
    expect(afterRunVerdictOf(md)).toEqual(["", line, ""]);
  });
});
