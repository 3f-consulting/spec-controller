import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type Examples, type FeatureChild, type GherkinDocument, type RuleChild, type Scenario } from "@cucumber/messages";
import type { RowAsWritten, ScenarioAsWritten } from "../domain/postEvidenceObligation.js";
import { parseSources, type Parsed, type Source, type SourcesParse } from "./sourceParse.js";

interface FeatureFileContent {
  readonly scenarios: readonly ScenarioAsWritten[];
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
  return examples.tableBody.map((row) => ({ line: row.location.line, cell: row.cells[column]?.value }));
}

function scenarioAsWrittenOf(scenario: Scenario): ScenarioAsWritten {
  const asWritten = { tags: scenario.tags.map((tag) => tag.name), title: scenario.name };
  if (!scenario.examples.some((examples) => clmColumnOf(examples) >= 0)) return asWritten;
  return { ...asWritten, rows: scenario.examples.flatMap(rowsOf) };
}

function scenariosIn(children: readonly (FeatureChild | RuleChild)[]): ScenarioAsWritten[] {
  return children.flatMap((child) => {
    if ("rule" in child && child.rule) return scenariosIn(child.rule.children);
    return child.scenario ? [scenarioAsWrittenOf(child.scenario)] : [];
  });
}

function contentOf({ feature }: GherkinDocument): FeatureFileContent {
  return { scenarios: scenariosIn(feature?.children ?? []) };
}

export function parseFeatureCorpus(sources: readonly Source[]): SourcesParse<FeatureFileContent> {
  return parseSources(sources, gherkinDocumentOf, contentOf);
}
