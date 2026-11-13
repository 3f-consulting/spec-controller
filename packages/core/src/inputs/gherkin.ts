import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type Scenario } from "@cucumber/messages";
import type { FeatureAsWritten, ScenarioAsWritten } from "../domain/postEvidenceObligation.js";

const withoutAtSign = ({ name }: { readonly name: string }): string => name.slice(1);

function scenarioAsWritten({ tags, name, location }: Scenario): ScenarioAsWritten {
  return { tags: tags.map(withoutAtSign), title: name, line: location.line, examples: [] };
}

export function featureAsWrittenFrom(file: string, source: string): FeatureAsWritten {
  const document = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher()).parse(source);
  const scenarios = (document.feature?.children ?? []).flatMap(({ scenario }) => (scenario ? [scenarioAsWritten(scenario)] : []));
  return { file, fileTags: (document.feature?.tags ?? []).map(withoutAtSign), scenarios, wordsWrittenAsTags: [] };
}
