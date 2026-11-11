import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type Examples, type FeatureChild, type GherkinDocument, type RuleChild, type Scenario } from "@cucumber/messages";
import { bareTerm } from "../lib/bareTerm.js";
import { claimCodeFrom } from "../domain/claimCodes.js";
import type { RowAsWritten, ScenarioAsWritten } from "../domain/postEvidenceObligation.js";
import type { ClaimCodesAt } from "./cucumber.js";
import { parseSources, type Parsed, type Source, type SourcesParse } from "./sourceParse.js";

interface CodesAtLine {
  readonly line: number;
  readonly codes: readonly string[];
}

interface FeatureFileContent {
  readonly featureTags: readonly string[];
  readonly scenarios: readonly ScenarioAsWritten[];
  readonly tagFormWords: readonly string[];
  readonly codesAtLines: readonly CodesAtLine[];
}

export type ParsedFeatureFile = Parsed<FeatureFileContent>;

function gherkinDocumentOf(source: string): GherkinDocument {
  return new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher()).parse(source);
}

const CLM_COLUMN = "clm";

function clmColumnOf(examples: Examples): number {
  return examples.tableHeader?.cells.findIndex((cell) => cell.value === CLM_COLUMN) ?? -1;
}

function rowsOf(examples: Examples): RowAsWritten[] {
  const column = clmColumnOf(examples);
  return examples.tableBody.map((row) => ({ cell: column < 0 ? "" : row.cells[column]!.value }));
}

function scenarioAsWrittenOf(scenario: Scenario): ScenarioAsWritten {
  const asWritten = {
    tags: scenario.tags.map((tag) => bareTerm(tag.name)),
    title: scenario.name,
    examplesTags: scenario.examples.flatMap((examples) => examples.tags.map((tag) => bareTerm(tag.name))),
  };
  if (!scenario.examples.some((examples) => clmColumnOf(examples) >= 0)) return asWritten;
  return { ...asWritten, rows: scenario.examples.flatMap(rowsOf) };
}

function gherkinScenariosIn(children: readonly (FeatureChild | RuleChild)[]): Scenario[] {
  return children.flatMap((child) => {
    if ("rule" in child) return gherkinScenariosIn(child.rule!.children);
    return child.scenario ? [child.scenario] : [];
  });
}

const codesIn = (words: readonly string[]): string[] => words.filter((word) => claimCodeFrom(word) !== undefined);

// Cucumber reports a scenario at its own line, and each row of an Outline at the row's line.
function codesAtLinesOf(scenario: Scenario): CodesAtLine[] {
  const atScenario = { line: scenario.location.line, codes: codesIn(scenario.tags.map((tag) => bareTerm(tag.name))) };
  const rows = scenario.examples.flatMap((examples) => {
    const column = clmColumnOf(examples);
    return column < 0 ? [] : examples.tableBody.map((row) => ({ line: row.location.line, codes: codesIn([row.cells[column]!.value]) }));
  });
  return [atScenario, ...rows];
}

const TAG_FORM_WORD = /@([\w-]+)/g;

const tagFormWordsIn = (source: string): string[] => [...source.matchAll(TAG_FORM_WORD)].map((match) => match[1]!);

function contentOf({ feature }: GherkinDocument, source: string): FeatureFileContent {
  const scenarios = gherkinScenariosIn(feature?.children ?? []);
  return {
    featureTags: feature?.tags.map((tag) => bareTerm(tag.name)) ?? [],
    scenarios: scenarios.map(scenarioAsWrittenOf),
    tagFormWords: tagFormWordsIn(source),
    codesAtLines: scenarios.flatMap(codesAtLinesOf),
  };
}

export function parseFeatureCorpus(sources: readonly Source[]): SourcesParse<FeatureFileContent> {
  return parseSources(sources, gherkinDocumentOf, contentOf);
}

// A report names a feature file by a path that ends in the file's path within the corpus.
export function claimCodesAtOf(features: readonly ParsedFeatureFile[]): ClaimCodesAt {
  const byLine = new Map<number, { readonly file: string; readonly codes: readonly string[] }[]>();
  for (const { file, codesAtLines } of features) {
    for (const { line, codes } of codesAtLines) byLine.set(line, [...(byLine.get(line) ?? []), { file: `/${file}`, codes }]);
  }
  return (path, line) => {
    const reported = `/${path}`;
    const matching = (byLine.get(line) ?? []).filter((at) => reported.endsWith(at.file));
    return matching[0]?.codes ?? [];
  };
}
