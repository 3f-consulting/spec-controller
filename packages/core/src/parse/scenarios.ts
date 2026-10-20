import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type FeatureChild, type GherkinDocument } from "@cucumber/messages";
import { bareTerm } from "../lib/bareTerm.js";
import { headerFeatureCode, SCN_ID_SOURCE } from "../domain/featureCode.js";
import { scenarioCodesOf, type ScenarioTags } from "../domain/scnTags.js";
import type { ParsedFeatureCounts } from "../domain/corpusCounts.js";
import { obligationsRaisedBy } from "../domain/scenarioObligations.js";
import type { Scenario } from "../model.js";

const SCN_OCCURRENCE = new RegExp(`@${SCN_ID_SOURCE}`, "g");

export function countScnOccurrences(source: string): number {
  return (source.match(SCN_OCCURRENCE) ?? []).length;
}

export interface FeatureSource {
  readonly file: string;
  readonly source: string;
}

export interface ParsedFeatureFile {
  readonly featureCode: string | null;
  readonly scenarios: readonly ScenarioTags[];
  readonly scnOccurrences: number;
}

export interface FeatureSourceFault {
  readonly file: string;
  readonly message: string;
}

export type FeatureCorpusParse =
  | { readonly kind: "parsed"; readonly features: readonly ParsedFeatureFile[] }
  | { readonly kind: "unparseable"; readonly faults: readonly FeatureSourceFault[] };

type SourceParse = { readonly feature: ParsedFeatureFile } | { readonly fault: string };

function parseFeatureSource(source: string): SourceParse {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());
  let document: GherkinDocument;
  try {
    document = parser.parse(source);
  } catch (err) {
    return { fault: (err as Error).message };
  }
  return { feature: parsedFileOf(document, countScnOccurrences(source)) };
}

function parsedFileOf({ feature }: GherkinDocument, scnOccurrences: number): ParsedFeatureFile {
  if (feature === undefined) return { featureCode: null, scenarios: [], scnOccurrences };

  const scenarios: ScenarioTags[] = [];
  const bare = (tags: readonly { name: string }[]): string[] => tags.map((t) => bareTerm(t.name));

  const collect = (children: readonly FeatureChild[], inherited: string[]): void => {
    for (const child of children) {
      if (child.rule) {
        collect(child.rule.children as FeatureChild[], [...inherited, ...bare(child.rule.tags)]);
        continue;
      }
      if (!child.scenario) continue;
      scenarios.push({ name: child.scenario.name, tags: [...bare(child.scenario.tags), ...inherited] });
    }
  };

  const featureTags = bare(feature.tags);
  collect(feature.children as FeatureChild[], featureTags);

  return { featureCode: headerFeatureCode(featureTags), scenarios, scnOccurrences };
}

export function parseFeatureCorpus(sources: readonly FeatureSource[]): FeatureCorpusParse {
  const features: ParsedFeatureFile[] = [];
  const faults: FeatureSourceFault[] = [];
  for (const { file, source } of sources) {
    const parsed = parseFeatureSource(source);
    if ("fault" in parsed) faults.push({ file, message: parsed.fault });
    else features.push(parsed.feature);
  }
  return faults.length > 0 ? { kind: "unparseable", faults } : { kind: "parsed", features };
}

interface TaggedScenario {
  readonly scnId: string;
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
    const { scnId, severalCodes } = scenarioCodesOf(tags);
    if (severalCodes !== undefined) continue;
    if (scnId === null) untaggedScenarios.push(name);
    else taggedScenarios.push({ scnId, tags, name });
  }
  return { taggedScenarios, untaggedScenarios };
}

export function untaggedScenariosOf(feature: ParsedFeatureFile): string[] {
  return scenariosByScnCodeOf(feature).untaggedScenarios;
}

export function featureCountsOf(feature: ParsedFeatureFile): ParsedFeatureCounts {
  const { taggedScenarios, untaggedScenarios } = scenariosByScnCodeOf(feature);
  return { rawScnOccurrences: feature.scnOccurrences, taggedScenarios, untaggedScenarios };
}

export function scenariosOf(feature: ParsedFeatureFile, deferralTags: readonly string[] = []): Scenario[] {
  return scenariosByScnCodeOf(feature).taggedScenarios.map((scenario) => ({
    scnId: scenario.scnId,
    evidenceObligations: obligationsRaisedBy(scenario.tags, deferralTags),
  }));
}
