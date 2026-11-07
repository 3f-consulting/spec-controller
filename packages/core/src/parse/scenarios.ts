import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type FeatureChild, type GherkinDocument } from "@cucumber/messages";
import { bareTerm } from "../lib/bareTerm.js";
import { headerFeatureCode, SCN_ID_SOURCE } from "../domain/featureCode.js";
import { scenarioCodesOf, type ScenarioTags } from "../domain/scnTags.js";
import { corpusCountsOf, type EvidenceObligations, type ParsedFeatureCounts } from "../domain/corpusCounts.js";
import { obligationsRaisedBy } from "../domain/scenarioObligations.js";
import type { Scenario } from "../model.js";
import { parseSources, type Parsed, type Source, type SourcesParse } from "./sourceParse.js";

const SCN_OCCURRENCE = new RegExp(`@${SCN_ID_SOURCE}`, "g");

export function countScnOccurrences(source: string): number {
  return (source.match(SCN_OCCURRENCE) ?? []).length;
}

interface FeatureFileContent {
  readonly featureCode: string | null;
  readonly scenarios: readonly ScenarioTags[];
  readonly scnOccurrences: number;
  readonly tagScnOccurrences: number;
}

export type ParsedFeatureFile = Parsed<FeatureFileContent>;

function gherkinDocumentOf(source: string): GherkinDocument {
  return new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher()).parse(source);
}

function contentOf({ feature }: GherkinDocument, source: string): FeatureFileContent {
  const scnOccurrences = countScnOccurrences(source);
  if (feature === undefined) return { featureCode: null, scenarios: [], scnOccurrences, tagScnOccurrences: 0 };

  const scenarios: ScenarioTags[] = [];
  let tagScnOccurrences = 0;
  const countTags = (tags: readonly { name: string }[]): void => {
    tagScnOccurrences += countScnOccurrences(tags.map((t) => t.name).join(" "));
  };
  const bare = (tags: readonly { name: string }[]): string[] => tags.map((t) => bareTerm(t.name));

  const collect = (children: readonly FeatureChild[], inherited: string[]): void => {
    for (const child of children) {
      if (child.rule) {
        countTags(child.rule.tags);
        collect(child.rule.children as FeatureChild[], [...inherited, ...bare(child.rule.tags)]);
        continue;
      }
      if (!child.scenario) continue;
      countTags(child.scenario.tags);
      for (const examples of child.scenario.examples) countTags(examples.tags);
      scenarios.push({ name: child.scenario.name, tags: [...bare(child.scenario.tags), ...inherited] });
    }
  };

  countTags(feature.tags);
  const featureTags = bare(feature.tags);
  collect(feature.children as FeatureChild[], featureTags);

  return { featureCode: headerFeatureCode(featureTags), scenarios, scnOccurrences, tagScnOccurrences };
}

export function parseFeatureCorpus(sources: readonly Source[]): SourcesParse<FeatureFileContent> {
  return parseSources(sources, gherkinDocumentOf, contentOf);
}

interface TaggedScenario {
  readonly claimCode: string;
  readonly tags: readonly string[];
  readonly name: string;
}

function scenariosByScnCodeOf({ scenarios }: ParsedFeatureFile): {
  taggedScenarios: TaggedScenario[];
  untaggedScenarios: string[];
} {
  const taggedScenarios: TaggedScenario[] = [];
  const untaggedScenarios: string[] = [];
  for (const { name, tags } of scenarios) {
    const { claimCode, severalCodes } = scenarioCodesOf(tags);
    if (severalCodes !== undefined) continue;
    if (claimCode === null) untaggedScenarios.push(name);
    else taggedScenarios.push({ claimCode, tags, name });
  }
  return { taggedScenarios, untaggedScenarios };
}

export function untaggedScenariosOf(feature: ParsedFeatureFile): string[] {
  return scenariosByScnCodeOf(feature).untaggedScenarios;
}

export function featureCountsOf(feature: ParsedFeatureFile): ParsedFeatureCounts {
  const { taggedScenarios, untaggedScenarios } = scenariosByScnCodeOf(feature);
  return {
    rawScnOccurrences: feature.scnOccurrences,
    tagScnOccurrences: feature.tagScnOccurrences,
    taggedScenarios,
    untaggedScenarios,
  };
}

export function corpusCountsOfFeatures(features: readonly ParsedFeatureFile[]): EvidenceObligations {
  return corpusCountsOf(features.map((parsed) => ({ feature: parsed.file, ...featureCountsOf(parsed) })));
}

export function scenariosOf(feature: ParsedFeatureFile, deferralTags: readonly string[] = []): Scenario[] {
  return namedScenariosOf(feature, deferralTags).map(({ claimCode, evidenceObligations }) => ({ claimCode, evidenceObligations }));
}

/** The corpus's scenarios, each naming its feature file and title. */
export function namedScenariosOf(feature: ParsedFeatureFile, deferralTags: readonly string[] = []): Scenario[] {
  return scenariosByScnCodeOf(feature).taggedScenarios.map((scenario) => ({
    claimCode: scenario.claimCode,
    evidenceObligations: obligationsRaisedBy(scenario.tags, deferralTags),
    feature: feature.file,
    title: scenario.name,
  }));
}
