import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type Examples, type FeatureChild, type GherkinDocument, type RuleChild, type Scenario } from "@cucumber/messages";
import { bareTerm } from "./tags.js";
import type { ScenarioAsWritten } from "../domain/postEvidenceObligation.js";
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

const bareTags = (tags: readonly { readonly name: string }[]): string[] => tags.map((tag) => bareTerm(tag.name));

// An Examples block as written: its tags, its header's cells, and each row's line and cells.
function examplesBlockOf(examples: Examples): ScenarioAsWritten["examples"][number] {
  return {
    tags: bareTags(examples.tags),
    columns: examples.tableHeader?.cells.map((cell) => cell.value) ?? [],
    rows: examples.tableBody.map((row) => ({ line: row.location.line, cells: row.cells.map((cell) => cell.value) })),
  };
}

// Cucumber reports a scenario at its own line, and each row of an Outline at the row's line.
function scenarioAsWrittenOf(scenario: Scenario): ScenarioAsWritten {
  return {
    tags: bareTags(scenario.tags),
    title: scenario.name,
    line: scenario.location.line,
    examples: scenario.examples.map(examplesBlockOf),
  };
}

function gherkinScenariosIn(children: readonly (FeatureChild | RuleChild)[]): Scenario[] {
  return children.flatMap((child) => {
    if ("rule" in child) return gherkinScenariosIn(child.rule!.children);
    return child.scenario ? [child.scenario] : [];
  });
}

const TAG_FORM_WORD = /@([\w-]+)/g;

const tagFormWordsIn = (source: string): string[] => [...source.matchAll(TAG_FORM_WORD)].map((match) => match[1]!);

function contentOf({ feature }: GherkinDocument, source: string): FeatureFileContent {
  return {
    featureTags: bareTags(feature?.tags ?? []),
    scenarios: gherkinScenariosIn(feature?.children ?? []).map(scenarioAsWrittenOf),
    tagFormWords: tagFormWordsIn(source),
  };
}

export function parseFeatureCorpus(sources: readonly Source[]): SourcesParse<FeatureFileContent> {
  return parseSources(sources, gherkinDocumentOf, contentOf);
}
