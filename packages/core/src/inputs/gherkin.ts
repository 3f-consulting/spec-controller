import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type Examples, type FeatureChild, type Scenario } from "@cucumber/messages";
import type { FeatureAsWritten, OutlineExamplesAsWritten, ScenarioAsWritten } from "../domain/postEvidenceObligation.js";

const withoutAtSign = ({ name }: { readonly name: string }): string => name.slice(1);

// A part a document may leave out, such as its Feature, a scenario's Rule or an Examples table: none of it, or it.
const noneOrOne = <Part>(part: Part | undefined): Part[] => (part === undefined ? [] : [part]);

function examplesAsWritten({ tags, tableHeader, tableBody }: Examples): OutlineExamplesAsWritten {
  return {
    tags: tags.map(withoutAtSign),
    columns: noneOrOne(tableHeader).flatMap(({ cells }) => cells.map(({ value }) => value)),
    rows: tableBody.map(({ location, cells }) => ({ line: location.line, cells: cells.map(({ value }) => value) })),
  };
}

function scenarioAsWritten({ tags, name, location, examples }: Scenario, ruleTags: readonly string[]): ScenarioAsWritten {
  return { tags: tags.map(withoutAtSign), ruleTags, title: name, line: location.line, examples: examples.map(examplesAsWritten) };
}

// A scenario sits under the Feature, or under one of its Rules, whose tags it carries.
function scenariosOf({ scenario, rule }: FeatureChild): ScenarioAsWritten[] {
  const ruleTags = noneOrOne(rule).flatMap(({ tags }) => tags.map(withoutAtSign));
  const scenarios = rule === undefined ? noneOrOne(scenario) : rule.children.flatMap((child) => noneOrOne(child.scenario));
  return scenarios.map((each) => scenarioAsWritten(each, ruleTags));
}

// Every word written with an at-sign, anywhere in the file: a tag, or in a title, a step, a description or a comment.
const WORD_AS_TAG = /@([^\s@]+)/g;

const wordsWrittenAsTagsIn = (source: string): string[] => [...source.matchAll(WORD_AS_TAG)].map((word) => word[1]!);

export function featureAsWrittenFrom(file: string, source: string): FeatureAsWritten {
  const features = noneOrOne(new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher()).parse(source).feature);
  return {
    file,
    fileTags: features.flatMap(({ tags }) => tags.map(withoutAtSign)),
    scenarios: features.flatMap(({ children }) => children.flatMap(scenariosOf)),
    wordsWrittenAsTags: wordsWrittenAsTagsIn(source),
  };
}
