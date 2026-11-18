import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type Examples, type FeatureChild, type Scenario } from "@cucumber/messages";
import type { ExamplesBlock, FeatureFile, FeatureScenario } from "../domain/postEvidenceObligation.js";
import { parsedBy } from "./inputDoesNotParse.js";

const withoutAtSign = ({ name }: { readonly name: string }): string => name.slice(1);

// A part a document may leave out, such as its Feature, a scenario's Rule or an Examples table: none of it, or it.
const noneOrOne = <Part>(part: Part | undefined): Part[] => (part === undefined ? [] : [part]);

// The column whose cells name an Outline row's claim.
const CLM_COLUMN = "clm";

// A row has a clm cell when its block has the column and the row a cell in it.
function examplesBlockOf({ tags, tableHeader, tableBody }: Examples): ExamplesBlock {
  const at = noneOrOne(tableHeader).flatMap(({ cells }) => cells.map(({ value }) => value)).indexOf(CLM_COLUMN);
  return {
    tags: tags.map(withoutAtSign),
    hasClmColumn: at !== -1,
    rows: tableBody.map(({ location, cells }) => {
      const clmCell = cells[at]?.value;
      return { line: location.line, ...(clmCell !== undefined && { clmCell }) };
    }),
  };
}

function scenarioOf({ tags, name, location, examples }: Scenario, ruleTags: readonly string[]): FeatureScenario {
  return { tags: tags.map(withoutAtSign), ruleTags, title: name, line: location.line, examples: examples.map(examplesBlockOf) };
}

// A scenario sits under the Feature, or under one of its Rules, whose tags it carries.
function scenariosOf({ scenario, rule }: FeatureChild): FeatureScenario[] {
  const ruleTags = noneOrOne(rule).flatMap(({ tags }) => tags.map(withoutAtSign));
  const scenarios = rule === undefined ? noneOrOne(scenario) : rule.children.flatMap((child) => noneOrOne(child.scenario));
  return scenarios.map((each) => scenarioOf(each, ruleTags));
}

// Every word written with an at-sign, anywhere in the file: a tag, or in a title, a step, a description or a comment.
const WORD_AS_TAG = /@([^\s@]+)/g;

const wordsWrittenAsTagsIn = (source: string): string[] => [...source.matchAll(WORD_AS_TAG)].map((word) => word[1]!);

export function featureAsWrittenFrom(file: string, source: string): FeatureFile {
  const features = noneOrOne(parsedBy(() => new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher()).parse(source)).feature);
  return {
    file,
    fileTags: features.flatMap(({ tags }) => tags.map(withoutAtSign)),
    scenarios: features.flatMap(({ children }) => children.flatMap(scenariosOf)),
    wordsWrittenAsTags: wordsWrittenAsTagsIn(source),
  };
}
