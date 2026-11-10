import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type Examples, type FeatureChild, type GherkinDocument, type RuleChild, type Scenario } from "@cucumber/messages";
import { bareTerm } from "../lib/bareTerm.js";
import type { RowAsWritten, ScenarioAsWritten } from "../domain/postEvidenceObligation.js";
import { parseSources, type Parsed, type Source, type SourcesParse } from "./sourceParse.js";

interface FeatureFileContent {
  readonly featureTags: readonly string[];
  readonly scenarios: readonly ScenarioAsWritten[];
  readonly tagFormWords: readonly string[];
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
  return examples.tableBody.map((row) => ({ cell: row.cells[column]?.value }));
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

function scenariosIn(children: readonly (FeatureChild | RuleChild)[]): ScenarioAsWritten[] {
  return children.flatMap((child) => {
    if ("rule" in child && child.rule) return scenariosIn(child.rule.children);
    return child.scenario ? [scenarioAsWrittenOf(child.scenario)] : [];
  });
}

const TAG_FORM_WORD = /@([\w-]+)/g;

const tagFormWordsIn = (source: string): string[] => [...source.matchAll(TAG_FORM_WORD)].map((match) => match[1]!);

function contentOf({ feature }: GherkinDocument, source: string): FeatureFileContent {
  return {
    featureTags: feature?.tags.map((tag) => bareTerm(tag.name)) ?? [],
    scenarios: scenariosIn(feature?.children ?? []),
    tagFormWords: tagFormWordsIn(source),
  };
}

export function parseFeatureCorpus(sources: readonly Source[]): SourcesParse<FeatureFileContent> {
  return parseSources(sources, gherkinDocumentOf, contentOf);
}
