import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type Examples, type FeatureChild, type Scenario } from "@cucumber/messages";
import type { FeatureAsWritten, OutlineExamplesAsWritten, ScenarioAsWritten } from "../domain/postEvidenceObligation.js";

const withoutAtSign = ({ name }: { readonly name: string }): string => name.slice(1);

function examplesAsWritten({ tags, tableHeader, tableBody }: Examples): OutlineExamplesAsWritten {
  return {
    tags: tags.map(withoutAtSign),
    columns: (tableHeader?.cells ?? []).map(({ value }) => value),
    rows: tableBody.map(({ location, cells }) => ({ line: location.line, cells: cells.map(({ value }) => value) })),
  };
}

function scenarioAsWritten({ tags, name, location, examples }: Scenario): ScenarioAsWritten {
  return { tags: tags.map(withoutAtSign), title: name, line: location.line, examples: examples.map(examplesAsWritten) };
}

// A scenario sits under the Feature, or under one of its Rules.
const scenariosOf = ({ scenario, rule }: FeatureChild): Scenario[] => [
  ...(scenario ? [scenario] : []),
  ...(rule?.children ?? []).flatMap((child) => (child.scenario ? [child.scenario] : [])),
];

export function featureAsWrittenFrom(file: string, source: string): FeatureAsWritten {
  const document = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher()).parse(source);
  const scenarios = (document.feature?.children ?? []).flatMap(scenariosOf).map(scenarioAsWritten);
  return { file, fileTags: (document.feature?.tags ?? []).map(withoutAtSign), scenarios, wordsWrittenAsTags: [] };
}
